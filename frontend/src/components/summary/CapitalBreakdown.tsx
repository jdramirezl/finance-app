import { Wallet, TrendingUp, Lock, Globe } from 'lucide-react';
import { currencyService } from '../../services/currencyService';
import type { Account, Pocket } from '../../types';
import type { InvestmentData } from './InvestmentCard';
import EmptyState from '../ui/EmptyState';

interface CapitalBreakdownProps {
  accounts: Account[];
  pockets: Pocket[];
  investmentData: Map<string, InvestmentData>;
}

function getStatusLabel(account: Account, investmentData?: InvestmentData) {
  if (account.type === 'investment' && investmentData) {
    const sign = investmentData.gainsPct >= 0 ? '+' : '';
    return { text: `${sign}${investmentData.gainsPct.toFixed(1)}%`, color: investmentData.gainsPct >= 0 ? 'text-emerald-400' : 'text-error' };
  }
  if (account.type === 'cd' && account.maturityDate) {
    const days = Math.max(0, Math.ceil((new Date(account.maturityDate).getTime() - Date.now()) / 86400000));
    if (days === 0) return { text: 'MATURED', color: 'text-secondary' };
    return { text: `DUE IN ${days}D`, color: 'text-error' };
  }
  return { text: 'AVAILABLE', color: 'text-secondary' };
}

function getSubtitle(account: Account, pockets: Pocket[]) {
  if (account.type === 'investment' && account.stockSymbol) {
    return `${account.stockSymbol} • ${account.shares ?? 0} shares`;
  }
  if (account.type === 'cd' && account.interestRate) {
    return `${account.interestRate}% APY • CD`;
  }
  const pocketCount = pockets.filter((p) => p.accountId === account.id).length;
  if (pocketCount > 0) return `${pocketCount} pocket${pocketCount !== 1 ? 's' : ''} • ${account.currency}`;
  return account.currency;
}

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

  const activeCount = accounts.filter((a) => a.balance !== 0 || a.type === 'investment').length;

  return (
    <div className="glass-card rounded-xl flex flex-col min-h-0 flex-1">
      <div className="p-4 border-b border-white/5 flex justify-between items-center">
        <h3 className="text-xl font-semibold text-on-surface">Liquidity Pools</h3>
        <span className="font-mono text-xs text-on-surface-variant">
          {activeCount} ACCOUNTS ACTIVE
        </span>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-2">
        {accounts.map((account) => {
          const type = account.type || 'normal';
          const invData = investmentData.get(account.id);
          const balance = type === 'investment' && invData ? invData.totalValue : account.balance;
          const status = getStatusLabel(account, invData);
          const subtitle = getSubtitle(account, pockets);

          const Icon = type === 'investment' ? TrendingUp
            : type === 'cd' ? Lock
              : account.currency !== 'USD' ? Globe
                : Wallet;

          const iconColor = type === 'investment' ? 'bg-tertiary/10 text-tertiary'
            : type === 'cd' ? 'bg-secondary/10 text-secondary'
              : 'bg-primary/10 text-primary';

          return (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors rounded-lg border border-white/5"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">{account.name}</p>
                  <p className="font-mono text-xs text-on-surface-variant">{subtitle}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-bold text-on-surface">
                  {currencyService.formatCurrency(balance, account.currency)}
                </p>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${status.color}`}>
                  {status.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CapitalBreakdown;
