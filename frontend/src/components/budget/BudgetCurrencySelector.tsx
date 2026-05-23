import type { Currency } from '../../types';

const CURRENCIES: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

interface BudgetCurrencySelectorProps {
  value: string; // '' means auto
  onChange: (currency: string) => void;
  inferredCurrency: string; // what we'd use if value is ''
}

const BudgetCurrencySelector = ({ value, onChange, inferredCurrency }: BudgetCurrencySelectorProps) => {
  const effective = value || inferredCurrency;
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500">Currency:</label>
      <select
        value={effective}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        aria-label="Budget currency"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
};

export default BudgetCurrencySelector;
