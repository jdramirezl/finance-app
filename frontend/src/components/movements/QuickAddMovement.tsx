import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send } from 'lucide-react';
import { useMovementMutations } from '../../hooks/queries/useMovementMutations';
import { useAccountsQuery, usePocketsQuery } from '../../hooks/queries';
import { format } from 'date-fns';
import type { MovementType } from '../../types';

type SimpleType = 'expense' | 'income' | 'transfer';

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
  const [accountId, setAccountId] = useState('');
  const [pocketId, setPocketId] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const { data: accounts = [] } = useAccountsQuery();
  const { data: pockets = [] } = usePocketsQuery();
  const { createMovement } = useMovementMutations();

  // Auto-select first account/pocket
  useEffect(() => {
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const filteredPockets = useMemo(
    () => pockets.filter((p) => p.accountId === accountId),
    [pockets, accountId]
  );

  useEffect(() => {
    if (accountId && filteredPockets.length > 0 && !filteredPockets.find((p) => p.id === pocketId)) {
      setPocketId(filteredPockets[0].id);
    }
  }, [accountId, filteredPockets, pocketId]);

  useEffect(() => { amountRef.current?.focus(); }, []);

  useEffect(() => {
    if (variant !== 'modal') return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [variant, onClose]);

  const isValid = parseFloat(amount) > 0 && accountId && pocketId;

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;
    setError(null);
    try {
      await createMovement.mutateAsync({
        type: toMovementType(type),
        accountId,
        pocketId,
        amount: parseFloat(amount),
        displayedDate: format(new Date(), 'yyyy-MM-dd'),
      });
      setAmount('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create movement');
    }
  }, [isValid, type, accountId, pocketId, amount, createMovement, onSuccess]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) { e.preventDefault(); handleSubmit(); }
  };

  const typeButtons: { value: SimpleType; label: string }[] = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfer' },
  ];

  const form = (
    <div
      role="form"
      aria-label="Quick add movement"
      className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6"
    >
      <div className="flex flex-wrap items-center gap-4">
        {/* $ amount input */}
        <div className="flex-1 min-w-[180px]">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              ref={amountRef}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-gray-900 border border-gray-600 focus:border-blue-500 rounded px-8 py-2 text-sm text-gray-100 outline-none transition-all"
            />
          </div>
        </div>

        {/* 3-button type toggle */}
        <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-600">
          {typeButtons.map((btn) => (
            <button
              key={btn.value}
              type="button"
              aria-pressed={type === btn.value}
              onClick={() => setType(btn.value)}
              className={`px-4 py-1.5 rounded text-xs font-bold transition-colors ${
                type === btn.value
                  ? btn.value === 'expense'
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-500/20 text-blue-400'
                  : 'hover:bg-gray-700/50 text-gray-400'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Account select */}
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          aria-label="Account"
          className="bg-gray-900 border border-gray-600 rounded px-4 py-2 text-sm text-gray-100 outline-none"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>

        {/* Pocket select */}
        <select
          value={pocketId}
          onChange={(e) => setPocketId(e.target.value)}
          aria-label="Pocket"
          className="bg-gray-900 border border-gray-600 rounded px-4 py-2 text-sm text-gray-100 outline-none"
        >
          {filteredPockets.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Send button */}
        <button
          type="button"
          disabled={!isValid || createMovement.isPending}
          onClick={handleSubmit}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all disabled:opacity-40"
          aria-label="Submit quick add"
        >
          {showSuccess ? (
            <span className="text-green-400 font-bold">✓</span>
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
        <div className="relative w-full max-w-lg bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Quick Add</h3>
          {form}
        </div>
      </div>
    );
  }

  return form;
};

export default QuickAddMovement;
