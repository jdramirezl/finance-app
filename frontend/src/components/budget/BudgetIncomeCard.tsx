interface BudgetIncomeCardProps {
  initialAmount: number;
  onAmountChange: (value: number) => void;
  totalFixedExpenses: number;
  distributable: number;
  currency: string;
}

const fmt = (value: number, currency: string) =>
  value.toLocaleString(undefined, { style: 'currency', currency });

const BudgetIncomeCard = ({
  initialAmount,
  onAmountChange,
  totalFixedExpenses,
  distributable,
  currency,
}: BudgetIncomeCardProps) => {
  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col md:flex-row items-center gap-8">
      {/* Left: Income input */}
      <div className="flex-1 w-full">
        <label className="text-[11px] font-bold uppercase tracking-[0.06em] text-on-surface-variant mb-4 block">
          Monthly Income
        </label>
        <div className="relative flex items-baseline">
          <span className="text-primary text-4xl font-bold mr-4">$</span>
          <input
            type="text"
            inputMode="decimal"
            className="bg-transparent border-none focus:ring-0 text-4xl font-black text-on-surface w-full p-0"
            placeholder="0.00"
            value={initialAmount > 0 ? initialAmount.toLocaleString() : ''}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9.]/g, '');
              onAmountChange(parseFloat(raw) || 0);
            }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px md:h-16 w-full md:w-px bg-white/10" />

      {/* Right: Deductions + Distributable */}
      <div className="flex-1 w-full flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant text-sm">Fixed Expenses</span>
          <span className="font-mono text-sm text-error">- {fmt(totalFixedExpenses, currency)}</span>
        </div>
        <div className="flex justify-between items-center mt-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-primary font-bold text-sm">Distributable</span>
          <span className="font-mono text-lg font-semibold text-primary">
            {fmt(distributable, currency)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BudgetIncomeCard;
