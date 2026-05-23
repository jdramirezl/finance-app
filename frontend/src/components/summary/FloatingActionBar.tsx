import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { currencyService } from '../../services/currencyService';
import type { Account, Currency, Movement } from '../../types';

interface FloatingActionBarProps {
  accounts: Account[];
  movements: Movement[];
  todaySpending: number;
  primaryCurrency: Currency;
}

const FloatingActionBar = ({
  accounts,
  movements,
  todaySpending,
  primaryCurrency,
}: FloatingActionBarProps) => {
  const navigate = useNavigate();

  // Total liquidity = sum of non-investment, non-CD account balances
  const totalLiquidity = useMemo(
    () =>
      accounts
        .filter((a) => a.type !== 'investment' && a.type !== 'cd')
        .reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );

  // Pending movements count
  const pendingCount = useMemo(
    () => movements.filter((m) => m.isPending).length,
    [movements]
  );

  return (
    <div className="hidden lg:flex fixed bottom-8 left-1/2 -translate-x-1/2 w-max gap-12 bg-gray-800/90 border border-gray-700 rounded-full px-10 py-4 shadow-2xl z-50 items-center">
      <div className="flex flex-col">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Total Liquidity
        </span>
        <span className="text-sm text-gray-100">
          {currencyService.formatCurrency(totalLiquidity, primaryCurrency)}
        </span>
      </div>

      <div className="h-8 w-px bg-gray-700" />

      <div className="flex flex-col">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Daily Burn Rate
        </span>
        <span className="text-sm text-red-400">
          {currencyService.formatCurrency(todaySpending, primaryCurrency)}
        </span>
      </div>

      <div className="h-8 w-px bg-gray-700" />

      <div className="flex flex-col">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Pending
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-100">
            {pendingCount} Movement{pendingCount !== 1 ? 's' : ''}
          </span>
          {pendingCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          )}
        </div>
      </div>

      <button
        onClick={() => navigate('/movements')}
        className="ml-4 bg-blue-500 px-6 py-2 rounded-full text-white font-bold text-sm hover:bg-blue-600 active:scale-95 transition-all flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        New Entry
      </button>
    </div>
  );
};

export default FloatingActionBar;
