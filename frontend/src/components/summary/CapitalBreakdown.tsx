import { Wallet, TrendingUp, Lock, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { format } from 'date-fns';
import { currencyService } from '../../services/currencyService';
import type { Account, Currency, Pocket } from '../../types';
import type { InvestmentData } from './InvestmentCard';
import EmptyState from '../ui/EmptyState';

interface CapitalBreakdownProps {
  accounts: Account[];
  pockets: Pocket[];
  investmentData: Map<string, InvestmentData>;
  primaryCurrency: Currency;
}

const InvestmentDetail = ({ account, data, currency }: { account: Account; data?: InvestmentData; currency: Currency }) => {
  const symbol = account.stockSymbol || '—';
  const shares = data?.shares ?? account.shares ?? 0;
  const invested = data?.montoInvertido ?? account.montoInvertido ?? 0;
  const price = data?.precioActual ?? 0;
  const totalValue = data?.totalValue ?? 0;
  const gainsPct = data?.gainsPct ?? 0;
  const gainsUSD = data?.gainsUSD ?? 0;
  const lastUpdated = data?.lastUpdated;

  const gainsColor = gainsPct >= 0 ? 'text-emerald-400' : 'text-red-400';
  const gainsSign = gainsPct >= 0 ? '+' : '';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400">{symbol}</span>
          <span className="text-xs text-gray-400">
            @ {currencyService.formatCurrency(price, currency)}
          </span>
        </div>
        <span className="text-sm font-bold text-gray-100">
          {currencyService.formatCurrency(totalValue, currency)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Invested</span>
          <span className="text-gray-100">{currencyService.formatCurrency(invested, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Shares</span>
          <span className="text-gray-100">{shares.toFixed(6)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Gains</span>
          <span className={`font-bold ${gainsColor}`}>
            {gainsSign}{gainsPct.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Gained</span>
          <span className={`${gainsColor}`}>
            {gainsSign}{currencyService.formatCurrency(Math.abs(gainsUSD), currency)}
          </span>
        </div>
      </div>
      {lastUpdated && (
        <p className="text-[10px] text-gray-400 text-right">
          Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
        </p>
      )}
    </div>
  );
};

const CDDetail = ({ account, currency }: { account: Account; currency: Currency }) => {
  const apy = account.interestRate ?? 0;
  const principal = account.principal ?? 0;
  const maturityDate = account.maturityDate;
  const taxRate = account.withholdingTaxRate;

  // Calculate days to maturity
  const daysToMaturity = maturityDate
    ? Math.max(0, Math.ceil((new Date(maturityDate).getTime() - Date.now()) / 86400000))
    : null;

  // Calculate net interest (simple approximation from balance - principal)
  const netInterest = account.balance - principal;

  // Status
  const isMatured = daysToMaturity === 0;
  const isNearMaturity = daysToMaturity !== null && daysToMaturity <= 30 && !isMatured;
  const statusText = isMatured ? 'Matured' : isNearMaturity ? 'Near Maturity' : 'Active';
  const statusColor = isMatured ? 'text-blue-300' : isNearMaturity ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Certificate of Deposit</span>
          <span className="text-xs font-bold text-blue-300">{apy}% APY</span>
        </div>
        <span className={`text-[10px] font-bold uppercase ${statusColor}`}>{statusText}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Principal</span>
          <span className="text-gray-100">{currencyService.formatCurrency(principal, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Net Interest</span>
          <span className="text-emerald-400">{currencyService.formatCurrency(netInterest, currency)}</span>
        </div>
        {maturityDate && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-400">Maturity</span>
              <span className="text-gray-100">{format(new Date(maturityDate), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Days Left</span>
              <span className="text-gray-100">{daysToMaturity}</span>
            </div>
          </>
        )}
      </div>
      {taxRate != null && taxRate > 0 && (
        <p className="text-[10px] text-gray-400 italic">
          {taxRate}% withholding tax will be deducted
        </p>
      )}
    </div>
  );
};

const NormalDetail = ({ account, pockets, currency }: { account: Account; pockets: Pocket[]; currency: Currency }) => {
  const accountPockets = pockets.filter((p) => p.accountId === account.id);
  if (accountPockets.length === 0) return null;

  return (
    <div className="space-y-1">
      {accountPockets.map((pocket) => (
        <div key={pocket.id} className="flex items-center justify-between pl-2 border-l border-gray-700">
          <span className="text-xs text-gray-400">{pocket.name}</span>
          <span className="text-xs text-gray-100">
            {currencyService.formatCurrency(pocket.balance, currency)}
          </span>
        </div>
      ))}
    </div>
  );
};

const CapitalBreakdown = ({ accounts, pockets, investmentData }: CapitalBreakdownProps) => {
  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No accounts yet"
        description="Create your first account to see your liquidity pools."
      />
    );
  }

  const groupedByCurrency = accounts.reduce<Record<string, Account[]>>((acc, account) => {
    const key = account.currency;
    if (!acc[key]) acc[key] = [];
    acc[key].push(account);
    return acc;
  }, {});

  const currencyGroups = Object.entries(groupedByCurrency).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl flex flex-col min-h-0 flex-1">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-100">Liquidity Pools</h3>
        <span className="text-xs text-gray-400">
          {accounts.length} ACCOUNTS
        </span>
      </div>

      <div className="overflow-y-auto flex-1 p-3 space-y-5">
        {currencyGroups.map(([currency, groupAccounts]) => (
          <div key={currency}>
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
              <div className="h-px flex-1 bg-gray-700" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {currency} Accounts
              </span>
              <div className="h-px flex-1 bg-gray-700" />
            </div>
            <div className="space-y-3">
              {groupAccounts.map((account) => {
                const type = account.type || 'normal';
                const invData = investmentData.get(account.id);
                const balance = type === 'investment' && invData ? invData.totalValue : account.balance;

                const Icon = type === 'investment' ? TrendingUp
                  : type === 'cd' ? Lock
                    : account.currency !== 'USD' ? Globe : Wallet;

                const borderColor = type === 'investment' ? 'border-l-amber-400'
                  : type === 'cd' ? 'border-l-blue-300'
                    : 'border-l-blue-400';

                const typeLabel = type === 'investment' ? 'Investment'
                  : type === 'cd' ? 'CD'
                    : 'Cash';

                return (
                  <div
                    key={account.id}
                    className={`p-4 bg-gray-700/50 rounded-lg border border-gray-700 border-l-2 ${borderColor} space-y-3`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-bold text-gray-100">{account.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">{typeLabel}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-100">
                        {currencyService.formatCurrency(balance, account.currency)}
                      </p>
                    </div>

                    {/* Type-specific detail */}
                    {type === 'investment' && (
                      <InvestmentDetail account={account} data={invData} currency={account.currency} />
                    )}
                    {type === 'cd' && (
                      <CDDetail account={account} currency={account.currency} />
                    )}
                    {type !== 'investment' && type !== 'cd' && (
                      <NormalDetail account={account} pockets={pockets} currency={account.currency} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CapitalBreakdown;
