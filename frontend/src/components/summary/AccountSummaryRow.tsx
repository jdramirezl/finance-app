import { Wallet, TrendingUp, Lock, Globe } from 'lucide-react';
import { currencyService } from '../../services/currencyService';
import type { Account, Pocket } from '../../types';
import type { InvestmentData } from './InvestmentCard';

interface AccountSummaryRowProps {
  account: Account;
  pockets: Pocket[];
  investmentData?: InvestmentData;
}

const AccountSummaryRow = ({ account, pockets, investmentData }: AccountSummaryRowProps) => {
  const accountPockets = pockets.filter((p) => p.accountId === account.id);
  const type = account.type || 'normal';

  const borderColor = type === 'investment'
    ? 'border-l-tertiary'
    : type === 'cd'
      ? 'border-l-secondary'
      : 'border-l-primary';

  const iconBg = type === 'investment'
    ? 'bg-tertiary/10 text-tertiary'
    : type === 'cd'
      ? 'bg-secondary/10 text-secondary'
      : 'bg-primary/10 text-primary';

  const Icon = type === 'investment' ? TrendingUp
    : type === 'cd' ? Lock
      : account.currency !== 'USD' ? Globe
        : Wallet;

  const balance = type === 'investment' && investmentData
    ? investmentData.totalValue
    : account.balance;

  return (
    <div className={`glass-card rounded-xl p-5 border-l-4 ${borderColor} flex flex-col gap-3 group hover:bg-white/5 transition-all`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface">{account.name}</p>
            {type === 'investment' && account.stockSymbol && (
              <div className="flex gap-2 mt-1">
                <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-bold text-on-surface-variant">
                  {account.stockSymbol}: {account.shares ?? 0} sh
                </span>
              </div>
            )}
            {type === 'cd' && account.maturityDate && (
              <p className="font-mono text-xs text-on-surface-variant">
                Matures {new Date(account.maturityDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </p>
            )}
            {type === 'normal' && (
              <p className="font-mono text-xs text-on-surface-variant">
                {account.currency}
              </p>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="font-mono text-lg text-on-surface">
            {currencyService.formatCurrency(balance, account.currency)}
          </p>
          {type === 'investment' && investmentData && (
            <p className={`text-[10px] font-bold ${investmentData.gainsPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {investmentData.gainsPct >= 0 ? '+' : ''}{investmentData.gainsPct.toFixed(1)}% Overall Gain
            </p>
          )}
          {type === 'cd' && account.interestRate && (
            <p className="text-[10px] text-on-surface-variant">{account.interestRate}% APY</p>
          )}
          {type === 'normal' && accountPockets.length > 0 && (
            <p className="text-[10px] text-on-surface-variant flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {accountPockets.length} Sub-pocket{accountPockets.length !== 1 ? 's' : ''} active
            </p>
          )}
        </div>
      </div>

      {/* CD maturity progress bar */}
      {type === 'cd' && account.maturityDate && account.cdCreatedAt && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
            <span>Maturity Progress</span>
            <span>
              {Math.min(100, Math.round(
                ((Date.now() - new Date(account.cdCreatedAt).getTime()) /
                  (new Date(account.maturityDate).getTime() - new Date(account.cdCreatedAt).getTime())) * 100
              ))}%
            </span>
          </div>
          <div className="bg-surface-container-highest h-1 rounded-full overflow-hidden">
            <div
              className="bg-secondary h-full"
              style={{
                width: `${Math.min(100, Math.round(
                  ((Date.now() - new Date(account.cdCreatedAt).getTime()) /
                    (new Date(account.maturityDate).getTime() - new Date(account.cdCreatedAt).getTime())) * 100
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
