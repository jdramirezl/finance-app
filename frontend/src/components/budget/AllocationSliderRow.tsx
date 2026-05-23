import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { DistributionEntry } from './BudgetEntryRow';

interface AllocationSliderRowProps {
  entry: DistributionEntry;
  color: string;
  amount: number;
  distributable: number;
  currency: string;
  onPercentageChange: (id: string, percentage: number) => void;
  onNameChange: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  /** Amount converted into the primary currency, used for the legend. */
  convertedAmount?: number;
  /** Primary currency code for the converted-amount legend. */
  primaryCurrency?: string;
  /** When true and `convertedAmount` is provided, render the conversion legend. */
  showConversion?: boolean;
}

const fmt = (value: number, currency: string) =>
  value.toLocaleString(undefined, { style: 'currency', currency });

const clampPct = (v: number) => Math.max(0, Math.min(100, Math.round(v * 100) / 100));

const AllocationSliderRow = ({
  entry,
  color,
  amount,
  distributable,
  currency,
  onPercentageChange,
  onNameChange,
  onDelete,
  convertedAmount,
  primaryCurrency,
  showConversion,
}: AllocationSliderRowProps) => {
  const [editingPct, setEditingPct] = useState(false);
  const [editingAmt, setEditingAmt] = useState(false);
  const [pctInput, setPctInput] = useState('');
  const [amtInput, setAmtInput] = useState('');
  const pctRef = useRef<HTMLInputElement>(null);
  const amtRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingPct) pctRef.current?.select(); }, [editingPct]);
  useEffect(() => { if (editingAmt) amtRef.current?.select(); }, [editingAmt]);

  const startEditPct = useCallback(() => {
    setPctInput(String(entry.percentage));
    setEditingPct(true);
  }, [entry.percentage]);

  const startEditAmt = useCallback(() => {
    setAmtInput(String(Math.round(amount * 100) / 100));
    setEditingAmt(true);
  }, [amount]);

  const savePct = useCallback(() => {
    const parsed = parseFloat(pctInput);
    if (!isNaN(parsed) && parsed >= 0) {
      onPercentageChange(entry.id, clampPct(parsed));
    }
    setEditingPct(false);
  }, [pctInput, entry.id, onPercentageChange]);

  const saveAmt = useCallback(() => {
    const parsed = parseFloat(amtInput);
    if (!isNaN(parsed) && parsed >= 0 && distributable > 0) {
      onPercentageChange(entry.id, clampPct((parsed / distributable) * 100));
    }
    setEditingAmt(false);
  }, [amtInput, distributable, entry.id, onPercentageChange]);

  const cancelPct = useCallback(() => setEditingPct(false), []);
  const cancelAmt = useCallback(() => setEditingAmt(false), []);

  const handlePctKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); savePct(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelPct(); }
  }, [savePct, cancelPct]);

  const handleAmtKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveAmt(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelAmt(); }
  }, [saveAmt, cancelAmt]);

  return (
    <div className="group">
      <div className="flex justify-between items-end mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <input
            type="text"
            value={entry.name}
            onChange={(e) => onNameChange(entry.id, e.target.value)}
            placeholder="Unnamed"
            aria-label="Allocation name"
            className="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-gray-700 focus:border-blue-400 outline-none text-sm font-semibold text-gray-100 placeholder:italic placeholder:text-gray-500 px-1 py-0.5 transition-colors"
          />
        </div>
        <div className="flex items-baseline gap-4">
          {editingPct ? (
            <input
              ref={pctRef}
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={pctInput}
              onChange={(e) => setPctInput(e.target.value)}
              onKeyDown={handlePctKey}
              onBlur={savePct}
              className="w-16 bg-transparent border-b border-blue-400 outline-none text-sm text-gray-400 text-right"
              aria-label="Edit percentage"
            />
          ) : (
            <span
              className="text-sm text-gray-400 cursor-pointer hover:underline"
              onClick={startEditPct}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') startEditPct(); }}
              aria-label={`Edit percentage: ${entry.percentage}%`}
            >
              {entry.percentage}%
            </span>
          )}
          {editingAmt ? (
            <div className="flex flex-col items-end">
              <input
                ref={amtRef}
                type="number"
                step="0.01"
                min="0"
                value={amtInput}
                onChange={(e) => setAmtInput(e.target.value)}
                onKeyDown={handleAmtKey}
                onBlur={saveAmt}
                className="w-28 bg-transparent border-b border-blue-400 outline-none text-lg text-gray-100 text-right"
                aria-label="Edit amount"
              />
              {showConversion && convertedAmount !== undefined && primaryCurrency && (
                <span className="text-xs text-gray-500">
                  ≈ {new Intl.NumberFormat('en-US', { style: 'currency', currency: primaryCurrency }).format(convertedAmount)}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <span
                className="text-lg text-gray-100 cursor-pointer hover:underline"
                onClick={startEditAmt}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') startEditAmt(); }}
                aria-label={`Edit amount: ${fmt(amount, currency)}`}
              >
                {fmt(amount, currency)}
              </span>
              {showConversion && convertedAmount !== undefined && primaryCurrency && (
                <span className="text-xs text-gray-500">
                  ≈ {new Intl.NumberFormat('en-US', { style: 'currency', currency: primaryCurrency }).format(convertedAmount)}
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => onDelete(entry.id)}
            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-400/10 rounded transition-opacity"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={entry.percentage}
        onChange={(e) => onPercentageChange(entry.id, parseInt(e.target.value, 10))}
        className="range-slider w-full"
      />
    </div>
  );
};

export default memo(AllocationSliderRow);
