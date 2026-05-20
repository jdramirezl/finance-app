import { useMemo } from 'react';
import type { MovementType } from '../types';
import type { BatchMovementRow } from '../components/BatchMovementForm';
import type { MovementFormStateResult } from './useMovementFormState';

export interface BalanceDeltas {
  accountDeltas: Record<string, number>;
  pocketDeltas: Record<string, number>;
  subPocketDeltas: Record<string, number>;
}

export interface UseBalanceDeltasParams {
  formState: MovementFormStateResult;
  showBatchForm: boolean;
  batchRows: BatchMovementRow[];
}

/**
 * Computes per-account / pocket / sub-pocket balance deltas for the current
 * form input — used by the side panel to preview the effect of the in-flight
 * movement(s) before submission.
 */
export const useBalanceDeltas = ({
  formState,
  showBatchForm,
  batchRows,
}: UseBalanceDeltasParams): BalanceDeltas => {
  return useMemo(() => {
    const accountDeltas: Record<string, number> = {};
    const pocketDeltas: Record<string, number> = {};
    const subPocketDeltas: Record<string, number> = {};

    const apply = (
      type: MovementType,
      accId: string,
      pockId: string,
      subPockId: string | undefined,
      amtStr: string
    ) => {
      if (!accId || !pockId || !amtStr) return;
      const amt = parseFloat(amtStr) || 0;
      if (amt === 0) return;
      const isCredit = type === 'IngresoNormal' || type === 'IngresoFijo';
      const delta = isCredit ? amt : -amt;
      accountDeltas[accId] = (accountDeltas[accId] || 0) + delta;
      pocketDeltas[pockId] = (pocketDeltas[pockId] || 0) + delta;
      if (subPockId) {
        subPocketDeltas[subPockId] = (subPocketDeltas[subPockId] || 0) + delta;
      }
    };

    if (showBatchForm) {
      batchRows.forEach((r) =>
        apply(r.type, r.accountId, r.pocketId, r.subPocketId, r.amount)
      );
    } else if (formState.showForm) {
      apply(
        formState.selectedType,
        formState.selectedAccountId,
        formState.selectedPocketId,
        formState.selectedSubPocketId,
        formState.amount
      );
    }

    return { accountDeltas, pocketDeltas, subPocketDeltas };
  }, [
    showBatchForm,
    batchRows,
    formState.showForm,
    formState.selectedType,
    formState.selectedAccountId,
    formState.selectedPocketId,
    formState.selectedSubPocketId,
    formState.amount,
  ]);
};
