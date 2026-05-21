import type { DistributionEntry } from './BudgetEntryRow';
import PortfolioDonutChart from './PortfolioDonutChart';
import BudgetStatsCards from './BudgetStatsCards';
import { ALLOCATION_COLORS } from './AllocationStrategy';

interface BudgetSidebarProps {
  entries: DistributionEntry[];
  distributable: number;
  totalIncome: number;
  totalFixedExpenses: number;
  currency: string;
}

const BudgetSidebar = ({
  entries,
  distributable,
  totalIncome,
  totalFixedExpenses,
  currency,
}: BudgetSidebarProps) => {
  return (
    <div className="flex flex-col gap-4">
      <PortfolioDonutChart
        entries={entries}
        distributable={distributable}
        currency={currency}
        colors={ALLOCATION_COLORS}
      />
      <BudgetStatsCards
        totalIncome={totalIncome}
        totalFixedExpenses={totalFixedExpenses}
        distributable={distributable}
      />
    </div>
  );
};

export default BudgetSidebar;
