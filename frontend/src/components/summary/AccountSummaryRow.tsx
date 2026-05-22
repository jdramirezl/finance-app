import { Wallet, TrendingUp, Lock, Globe } from 'lucide-react';
import { currencyService } from '../../services/currencyService';
import { cdCalculationService } from '../../services/cdCalculationService';
import type { Account, CDInvestmentAccount, Pocket } from '../../types';
import type { InvestmentData } from './InvestmentCard';

interface AccountSummaryRowProps {
  account: Account;
  pockets: Pocket[];
  investmentData?: InvestmentData;
}

const isCDAccount = (account: Account): account is CDInvestmentAccount =>
  account.type === 'cd' && !!account.principal && !!account.interestRate && !!account.maturityDate;

const AccountSummaryRow = ({ account, pockets, investmentData }: AccountSummaryRowProps) => {
  const accountPockets = pockets.filter((p) => p.accountId === account.id);
  const type = account.type || 'normal';

  const borderColor = type === 'investment'
    ? 'border-l-amber-400'
    : type === 'cd'
      ? 'border-l-blue-300'
      : 'border-l-blue-400';

  const iconBg = type === 'investment'
    ? 'bg-amber-400/10 text-amber-400'
    : type === 'cd'
      ? 'bg-blue-300/10 text-blue-300'
      : 'bg-blue-500/10 text-blue-400';

  const Icon = type === 'investment' ? TrendingUp
    : type === 'cd' ? Lock
      : account.currency !== 'USD' ? Globe
        : Wallet;

  // Compute balance and type-specific data
  const balance = type === 'investment' && investmentData
    ? investmentData.totalValue
    : account.balance;

  const cdCalc = type === 'cd' && isCDAccount(account)
    ? cdCalculationService.calculateCurrentValue(account)
    : null;

  // Subtitle per type
  const subtitle = type === 'investment' && account.stockSymbol
    ? `${account.stockSymbol} • ${investmentData?.shares ?? account.shares ?? 0} shares`
    : type === 'cd' && account.interestRate
      ? `${account.interestRate}% APY • CD`
      : `${accountPockets.length} pocket${accountPockets.length !== 1 ? 's' : ''} • ${account.currency}`;

  // Status badge per type
  const statusBadge = (() => {
    if (type === 'investment' && investmentData) {
      const pct = investmentData.gainsPct;
      return {
        text: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
        className: pct >= 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10',
      };
    }
    if (type === 'cd' && cdCalc) {
      const days = cdCalc.daysToMaturity;
      const isUrgent = days <= 30;
      return {
        text: days === 0 ? 'MATURED' : `DUE IN ${days}D`,
        className: isUrgent ? 'text-amber-400 bg-amber-400/10' : 'text-blue-300 bg-blue-300/10',
      };
    }
    return { text: 'AVAILABLE', className: 'text-blue-400 bg-blue-500/10' };
  })();

  // Additional info line
  const additionalInfo = (() => {
    if (type === 'investment' && investmentData) {
      return `Invested ${currencyService.formatCurrency(investmentData.montoInvertido ?? 0, account.currency)} • ${currencyService.formatCurrency(investmentData.precioActual, account.currency)}/share`;
    }
    if (type === 'cd' && cdCalc && isCDAccount(account)) {
      const matDate = new Date(account.maturityDate).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
      return `Principal: ${currencyService.formatCurrency(account.principal, account.currency)} • Net interest: ${currencyService.formatCurrency(cdCalc.netInterest, account.currency)} • Matures: ${matDate} (${cdCalc.daysToMaturity}d)`;
    }
    return null;
  })();

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl p-5 border-l-4 ${borderColor} flex flex-col gap-3 group hover:bg-gray-700/50 transition-all`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-100">{account.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-lg text-gray-100">
            {currencyService.formatCurrency(balance, account.currency)}
          </p>
          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 ${statusBadge.className}`}>
            {statusBadge.text}
          </span>
        </div>
      </div>

      {additionalInfo && (
        <p className="text-[10px] text-gray-400 pl-16">{additionalInfo}</p>
      )}

      {/* CD maturity progress bar */}
      {type === 'cd' && cdCalc && account.cdCreatedAt && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            <span>Maturity Progress</span>
            <span>
              {Math.min(100, Math.round(
                ((Date.now() - new Date(account.cdCreatedAt).getTime()) /
                  (new Date(account.maturityDate!).getTime() - new Date(account.cdCreatedAt).getTime())) * 100
              ))}%
            </span>
          </div>
          <div className="bg-gray-700 h-1 rounded-full overflow-hidden">
            <div
              className="bg-blue-300 h-full"
              style={{
                width: `${Math.min(100, Math.round(
                  ((Date.now() - new Date(account.cdCreatedAt).getTime()) /
                    (new Date(account.maturityDate!).getTime() - new Date(account.cdCreatedAt).getTime())) * 100
                ))}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSummaryRow;
