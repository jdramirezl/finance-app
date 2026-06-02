import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowLeftRight } from 'lucide-react';
import Modal from '../ui/Modal';
import { formatCurrency } from '../../utils/formatCurrency';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useAccountsQuery } from '../../hooks/queries/useAccountsQuery';
import { usePocketsQuery } from '../../hooks/queries/usePocketsQuery';

interface TransferInitialData {
  sourceAccountId: string;
  sourcePocketId: string;
  targetAccountId: string;
  targetPocketId: string;
  amount: number;
  notes: string;
  displayedDate: string;
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransferInitialData) => Promise<void>;
  isSaving: boolean;
  initialData?: TransferInitialData;
}

const today = () => new Date().toISOString().slice(0, 10);

const TransferModal = ({ isOpen, onClose, onSubmit, isSaving, initialData }: TransferModalProps) => {
  const { data: accounts = [] } = useAccountsQuery();
  const { data: pockets = [] } = usePocketsQuery();

  const [sourceAccountId, setSourceAccountId] = useState('');
  const [sourcePocketId, setSourcePocketId] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [targetPocketId, setTargetPocketId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [displayedDate, setDisplayedDate] = useState(today);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setSourceAccountId(initialData.sourceAccountId);
        setSourcePocketId(initialData.sourcePocketId);
        setTargetAccountId(initialData.targetAccountId);
        setTargetPocketId(initialData.targetPocketId);
        setAmount(String(initialData.amount));
        setNotes(initialData.notes);
        setDisplayedDate(initialData.displayedDate);
      } else {
        setSourceAccountId('');
        setSourcePocketId('');
        setTargetAccountId('');
        setTargetPocketId('');
        setAmount('');
        setNotes('');
        setDisplayedDate(today());
      }
    }
  }, [isOpen, initialData]);

  const accountOptions = useMemo(
    () => [{ value: '', label: 'Select account' }, ...accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` }))],
    [accounts],
  );

  const sourcePocketOptions = useMemo(
    () => [{ value: '', label: 'Select pocket' }, ...pockets.filter((p) => p.accountId === sourceAccountId).map((p) => ({ value: p.id, label: p.name }))],
    [pockets, sourceAccountId],
  );

  const targetPocketOptions = useMemo(
    () => [{ value: '', label: 'Select pocket' }, ...pockets.filter((p) => p.accountId === targetAccountId).map((p) => ({ value: p.id, label: p.name }))],
    [pockets, targetAccountId],
  );

  // Auto-fill notes when both pockets are selected
  useEffect(() => {
    const srcPocket = pockets.find((p) => p.id === sourcePocketId);
    const tgtPocket = pockets.find((p) => p.id === targetPocketId);
    if (srcPocket && tgtPocket) {
      setNotes(`Transfer from ${srcPocket.name} to ${tgtPocket.name}`);
    }
  }, [sourcePocketId, targetPocketId, pockets]);

  const handleSwap = useCallback(() => {
    setSourceAccountId(targetAccountId);
    setSourcePocketId(targetPocketId);
    setTargetAccountId(sourceAccountId);
    setTargetPocketId(sourcePocketId);
  }, [sourceAccountId, sourcePocketId, targetAccountId, targetPocketId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceAccountId || !sourcePocketId || !targetAccountId || !targetPocketId || !amount) return;
    await onSubmit({
      sourceAccountId,
      sourcePocketId,
      targetAccountId,
      targetPocketId,
      amount: parseFloat(amount),
      notes,
      displayedDate,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Transfer' : 'Transfer Funds'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source / Arrow / Target row */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
          {/* Source */}
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-red-400">From</p>
            <Select
              label="Account"
              options={accountOptions}
              value={sourceAccountId}
              onChange={(e) => { setSourceAccountId(e.target.value); setSourcePocketId(''); }}
              required
            />
            <Select
              label="→ Pocket"
              options={sourcePocketOptions}
              value={sourcePocketId}
              onChange={(e) => setSourcePocketId(e.target.value)}
              disabled={!sourceAccountId}
              required
            />
            {(() => {
              const pocket = pockets.find(p => p.id === sourcePocketId);
              const amt = parseFloat(amount) || 0;
              if (!pocket || amt <= 0) return null;
              return (
                <p className="text-xs text-gray-400">
                  {formatCurrency(pocket.balance, pocket.currency)}
                  <span className="mx-1">→</span>
                  <span className="text-red-400 font-medium">{formatCurrency(pocket.balance - amt, pocket.currency)}</span>
                </p>
              );
            })()}
          </div>

          {/* Center arrow + swap */}
          <div className="flex flex-col items-center justify-center gap-2">
            <ArrowRight className="w-6 h-6 text-blue-400" />
            <button
              type="button"
              onClick={handleSwap}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors text-gray-500 hover:text-white"
              aria-label="Swap source and target"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* Target */}
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-400">To</p>
            <Select
              label="Account"
              options={accountOptions}
              value={targetAccountId}
              onChange={(e) => { setTargetAccountId(e.target.value); setTargetPocketId(''); }}
              required
            />
            <Select
              label="→ Pocket"
              options={targetPocketOptions}
              value={targetPocketId}
              onChange={(e) => setTargetPocketId(e.target.value)}
              disabled={!targetAccountId}
              required
            />
            {(() => {
              const pocket = pockets.find(p => p.id === targetPocketId);
              const amt = parseFloat(amount) || 0;
              if (!pocket || amt <= 0) return null;
              return (
                <p className="text-xs text-gray-400">
                  {formatCurrency(pocket.balance, pocket.currency)}
                  <span className="mx-1">→</span>
                  <span className="text-emerald-400 font-medium">{formatCurrency(pocket.balance + amt, pocket.currency)}</span>
                </p>
              );
            })()}
          </div>
        </div>

        {/* Amount + Date */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
          <Input
            label="Date"
            type="date"
            value={displayedDate}
            onChange={(e) => setDisplayedDate(e.target.value)}
            required
          />
        </div>

        {/* Notes */}
        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Transfer from X to Y"
        />

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : (initialData ? 'Update Transfer' : 'Transfer')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TransferModal;
