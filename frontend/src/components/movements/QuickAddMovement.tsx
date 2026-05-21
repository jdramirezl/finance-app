import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { useMovementMutations } from '../../hooks/queries/useMovementMutations';
import { useAccountsQuery, usePocketsQuery } from '../../hooks/queries';
import { resolveLastUsedPocket, toSimpleType } from '../../store/useLastUsedPocket';
import { format } from 'date-fns';
import type { MovementType } from '../../types';

type SimpleType = 'expense' | 'income';

export interface QuickAddMovementProps {
  variant: 'inline' | 'modal';
  onExpandToFull?: (prefill: { amount?: number; notes?: string; type?: MovementType }) => void;
  onClose?: () => void;
  onSuccess?: () => void;
}

const toMovementType = (simple: SimpleType): MovementType =>
  simple === 'income' ? 'IngresoNormal' : 'EgresoNormal';

const QuickAddMovement = ({ variant, onExpandToFull, onClose, onSuccess }: QuickAddMovementProps) => {
  const [type, setType] = useState<SimpleType>('expense');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const { data: accounts = [] } = useAccountsQuery();
  const { data: pockets = [] } = usePocketsQuery();
  const { createMovement } = useMovementMutations();

  const resolved = resolveLastUsedPocket(type, accounts, pockets);
  const accountName = accounts.find((a) => a.id === resolved?.accountId)?.name;
  const pocketName = pockets.find((p) => p.id === resolved?.pocketId)?.name;

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  // Escape closes modal
  useEffect(() => {
    if (variant !== 'modal') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [variant, onClose]);

  const isValid = parseFloat(amount) > 0;

  const handleSubmit = useCallback(async () => {
    if (!isValid || !resolved) return;
    setError(null);
    try {
      await createMovement.mutateAsync({
        type: toMovementType(type),
        accountId: resolved.accountId,
        pocketId: resolved.pocketId,
        amount: parseFloat(amount),
        notes: notes || undefined,
        displayedDate: format(new Date(), 'yyyy-MM-dd'),
      });
      setAmount('');
      setNotes('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create movement');
    }
  }, [isValid, resolved, type, amount, notes, createMovement, onSuccess]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleExpand = () => {
    onExpandToFull?.({
      amount: parseFloat(amount) || undefined,
      notes: notes || undefined,
      type: toMovementType(type),
    });
    if (variant === 'modal') onClose?.();
  };

  const form = (
    <div
      role="form"
      aria-label="Quick add movement"
      className={
        variant === 'inline'
          ? 'flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl'
          : 'flex flex-col gap-3'
      }
    >
      {/* Type toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
        <button
          type="button"
          aria-pressed={type === 'expense'}
          onClick={() => setType('expense')}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            type === 'expense'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
              : 'bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          Expense
        </button>
        <button
          type="button"
          aria-pressed={type === 'income'}
          onClick={() => setType('income')}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            type === 'income'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          Income
        </button>
      </div>

      {/* Amount */}
      <input
        ref={amountRef}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        placeholder="0.00"
        aria-label="Quick add amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-28 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Notes */}
      <input
        type="text"
        placeholder="What for?"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Submit */}
      <button
        type="button"
        disabled={!isValid || createMovement.isPending}
        onClick={handleSubmit}
        className="p-2 rounded-lg bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors shrink-0"
        aria-label="Submit quick add"
      >
        <Check className="w-4 h-4" />
      </button>

      {/* Success indicator */}
      {showSuccess && (
        <span className="text-green-600 dark:text-green-400 text-sm font-medium animate-pulse">
          ✓
        </span>
      )}

      {/* More options */}
      {onExpandToFull && (
        <button
          type="button"
          onClick={handleExpand}
          className="flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
        >
          More <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );

  // Destination label
  const destination = resolved && accountName && pocketName ? (
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
      → {accountName} / {pocketName}
    </p>
  ) : null;

  // Error display
  const errorEl = error ? (
    <p className="text-xs text-red-600 dark:text-red-400 mt-1 ml-1">{error}</p>
  ) : null;

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Quick Add</h3>
          {form}
          {destination}
          {errorEl}
        </div>
      </div>
    );
  }

  return (
    <div>
      {form}
      {destination}
      {errorEl}
    </div>
  );
};

export default QuickAddMovement;
