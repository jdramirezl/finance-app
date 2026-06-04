import { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { useAccountsQuery, usePocketsQuery } from '../../hooks/queries';
import { cdCalculationService } from '../../services/cdCalculationService';
import { formatCurrency } from '../../utils/formatCurrency';
import type { CDInvestmentAccount } from '../../types';

interface CDReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  cdAccount: CDInvestmentAccount | null;
  onRelease: (data: { destinationAccountId: string; destinationPocketId: string; amount: number; notes: string }) => Promise<void>;
  isProcessing: boolean;
}

const CDReleaseModal = ({ isOpen, onClose, cdAccount, onRelease, isProcessing }: CDReleaseModalProps) => {
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedPocketId, setSelectedPocketId] = useState('');

  const { data: accounts } = useAccountsQuery();
  const { data: pockets } = usePocketsQuery();

  const eligibleAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.type !== 'cd' && a.type !== 'investment' && !a.archivedAt),
    [accounts]
  );

  const eligiblePockets = useMemo(
    () => (pockets ?? []).filter((p) => p.accountId === selectedAccountId && !p.archivedAt),
    [pockets, selectedAccountId]
  );

  const calc = useMemo(
    () => (cdAccount ? cdCalculationService.calculateCurrentValue(cdAccount) : null),
    [cdAccount]
  );

  const handleSubmit = async () => {
    if (!selectedAccountId || !selectedPocketId || !calc || !cdAccount) return;
    const notes = `CD Released: ${cdAccount.name}\nTerm: ${cdAccount.termMonths}-month, ${cdAccount.interestRate}% APY\nPrincipal: ${formatCurrency(cdAccount.principal, cdAccount.currency)}\nNet Interest: ${formatCurrency(calc.netInterest, cdAccount.currency)}\nFinal Amount: ${formatCurrency(calc.netCurrentValue, cdAccount.currency)}`;
    await onRelease({
      destinationAccountId: selectedAccountId,
      destinationPocketId: selectedPocketId,
      amount: calc.netCurrentValue,
      notes,
    });
    setSelectedAccountId('');
    setSelectedPocketId('');
  };

  if (!cdAccount || !calc) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Release CD Funds" size="md">
      <div className="space-y-4">
        {/* CD Summary */}
        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4 space-y-1 text-sm">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{cdAccount.name}</p>
          <p className="text-gray-600 dark:text-gray-400">
            Principal: {formatCurrency(cdAccount.principal, cdAccount.currency)}
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Rate: {cdAccount.interestRate}% APY · {cdAccount.termMonths}-month term
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Net Interest: {formatCurrency(calc.netInterest, cdAccount.currency)}
          </p>
          <p className="font-semibold text-green-700 dark:text-green-400">
            Final Value: {formatCurrency(calc.netCurrentValue, cdAccount.currency)}
          </p>
        </div>

        {/* Destination selectors */}
        <Select
          label="Destination Account"
          value={selectedAccountId}
          onChange={(e) => {
            setSelectedAccountId(e.target.value);
            setSelectedPocketId('');
          }}
          options={[
            { value: '', label: 'Select account...', disabled: true },
            ...eligibleAccounts.map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` })),
          ]}
        />

        <Select
          label="Destination Pocket"
          value={selectedPocketId}
          onChange={(e) => setSelectedPocketId(e.target.value)}
          disabled={!selectedAccountId}
          options={[
            { value: '', label: selectedAccountId ? 'Select pocket...' : 'Select an account first', disabled: true },
            ...eligiblePockets.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isProcessing}
            disabled={!selectedAccountId || !selectedPocketId}
          >
            Release Funds
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CDReleaseModal;
