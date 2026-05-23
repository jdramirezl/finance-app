interface BudgetIncomeCardProps {
  initialAmount: number;
  onAmountChange: (value: number) => void;
  totalFixedExpenses: number;
  currency: string;
  className?: string;
}

const fmt = (value: number, currency: string) =>
  value.toLocaleString(undefined, { style: 'currency', currency });

const BudgetIncomeCard = ({
  initialAmount,
  onAmountChange,
  totalFixedExpenses,
  currency,
  className,
}: BudgetIncomeCardProps) => {
  const rootClass = [
    'bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-8',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      {/* Left: Income input */}
      <div className="flex-1 w-full">
        <label className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-400 mb-4 block">
          Monthly Income
        </label>
        <div className="relative flex items-baseline">
          <span className="text-blue-400 text-4xl font-bold mr-4">$</span>
          <input
            type="text"
            inputMode="decimal"
            className="bg-transparent border-none focus:ring-0 text-4xl font-black text-gray-100 w-full p-0"
            placeholder="0.00"
            value={initialAmount > 0 ? initialAmount.toLocaleString() : ''}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9.]/g, '');
              onAmountChange(parseFloat(raw) || 0);
            }}
          />
          <span className="ml-2 text-gray-400 text-sm font-semibold uppercase tracking-wide">
            {currency}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px md:h-16 w-full md:w-px bg-gray-600" />

      {/* Right: Fixed expenses deduction */}
      <div className="flex-1 w-full flex items-center justify-between">
        <span className="text-gray-400 text-sm">Fixed Expenses</span>
        <span className="text-sm text-red-400">- {fmt(totalFixedExpenses, currency)}</span>
      </div>
    </div>
  );
};

export default BudgetIncomeCard;
