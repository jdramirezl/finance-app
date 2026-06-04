import { useState } from 'react';
import { cdCalculationService } from '../../services/cdCalculationService';
import { useMovementMutations, useAccountMutations } from '../queries';
import { useToast } from '../useToast';
import { formatCurrency } from '../../utils/formatCurrency';
import type { CDInvestmentAccount } from '../../types';

export const useCDRelease = () => {
  const { createMovement } = useMovementMutations();
  const { archiveAccount } = useAccountMutations();
  const toast = useToast();
  const [isReleasing, setIsReleasing] = useState(false);

  const release = async (
    cdAccount: CDInvestmentAccount,
    destinationAccountId: string,
    destinationPocketId: string
  ) => {
    setIsReleasing(true);
    try {
      const calc = cdCalculationService.calculateCurrentValue(cdAccount);
      const amount = calc.netCurrentValue;
      const notes = `CD Released: ${cdAccount.name}\nTerm: ${cdAccount.termMonths}-month, ${cdAccount.interestRate}% APY\nPrincipal: ${formatCurrency(cdAccount.principal, cdAccount.currency)}\nNet Interest: ${formatCurrency(calc.netInterest, cdAccount.currency)}\nFinal Amount: ${formatCurrency(amount, cdAccount.currency)}`;

      await createMovement.mutateAsync({
        type: 'IngresoNormal',
        accountId: destinationAccountId,
        pocketId: destinationPocketId,
        amount,
        notes,
        displayedDate: new Date().toISOString().slice(0, 10),
      });

      await archiveAccount.mutateAsync(cdAccount.id);
      toast.success(`CD "${cdAccount.name}" released successfully!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to release CD');
    } finally {
      setIsReleasing(false);
    }
  };

  return { release, isReleasing };
};
