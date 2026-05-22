interface BudgetStatsCardsProps {
  totalIncome: number;
  totalFixedExpenses: number;
  distributable: number;
}

const BudgetStatsCards = ({ totalIncome, totalFixedExpenses, distributable }: BudgetStatsCardsProps) => {
  const savingsRate = totalIncome > 0 ? ((distributable / totalIncome) * 100).toFixed(1) : '0.0';
  const burnRate = totalIncome > 0 ? ((totalFixedExpenses / totalIncome) * 100).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
        <div className="text-[10px] text-gray-400 uppercase mb-1">Savings Rate</div>
        <div className="text-lg font-semibold text-blue-400">{savingsRate}%</div>
      </div>
      <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
        <div className="text-[10px] text-gray-400 uppercase mb-1">Burn Rate</div>
        <div className="text-lg font-semibold text-red-400">{burnRate}%</div>
      </div>
    </div>
  );
};

export default BudgetStatsCards;
