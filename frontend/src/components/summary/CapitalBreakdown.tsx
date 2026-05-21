import { ExternalLink, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Account, Pocket } from '../../types';
import type { InvestmentData } from './InvestmentCard';
import AccountSummaryRow from './AccountSummaryRow';
import EmptyState from '../ui/EmptyState';

interface CapitalBreakdownProps {
  accounts: Account[];
  pockets: Pocket[];
  investmentData: Map<string, InvestmentData>;
}

const CapitalBreakdown = ({ accounts, pockets, investmentData }: CapitalBreakdownProps) => {
  const navigate = useNavigate();

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No accounts yet"
        description="Create your first account to see your capital breakdown."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-2">
        <h3 className="text-xl font-semibold text-on-surface">Capital Breakdown</h3>
        <button
          onClick={() => navigate('/accounts')}
          className="text-primary text-[11px] font-bold uppercase tracking-[0.06em] flex items-center gap-1 hover:underline"
        >
          View All Accounts <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-4">
        {accounts.map((account) => (
          <AccountSummaryRow
            key={account.id}
            account={account}
            pockets={pockets}
            investmentData={investmentData.get(account.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default CapitalBreakdown;
