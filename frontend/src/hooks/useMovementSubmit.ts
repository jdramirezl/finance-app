import type { MovementFormData } from '../components/movements/MovementForm';
import type { BatchMovementRow } from '../components/BatchMovementForm';
import type { useToast } from './useToast';
import type { useMovementMutations } from './queries/useMovementMutations';
import type { useMovementTemplateMutations } from './queries/useMovementTemplates';
import type { useReminderMutations } from './queries/useReminderQueries';
import type { MovementFormStateResult } from './useMovementFormState';
import { parseDate } from '../utils/dateUtils';
import { movementService } from '../services/movementService';

type MovementMutations = Pick<
  ReturnType<typeof useMovementMutations>,
  'createMovement' | 'createTransfer' | 'updateMovement'
>;

type TemplateMutations = Pick<
  ReturnType<typeof useMovementTemplateMutations>,
  'createMovementTemplate'
>;

type ReminderMutations = Pick<
  ReturnType<typeof useReminderMutations>,
  'markAsPaidMutation'
>;

export interface UseMovementSubmitParams {
  formState: MovementFormStateResult;
  closeForms: () => void;
  setShowBatchForm: (value: boolean) => void;
  setError: (value: string | null) => void;
  toast: ReturnType<typeof useToast.getState>;
  mutations: MovementMutations & TemplateMutations & ReminderMutations;
}

export interface UseMovementSubmitResult {
  handleSubmit: (data: MovementFormData) => Promise<void>;
  handleBatchSave: (rows: BatchMovementRow[]) => Promise<void>;
  isSaving: boolean;
}

/**
 * Encapsulates the imperative submit flow for the movements modal:
 * create / update / transfer (single) and batch create.
 *
 * Receives validated MovementFormData from react-hook-form instead of
 * extracting values from FormData.
 */
export const useMovementSubmit = ({
  formState,
  closeForms,
  setShowBatchForm,
  setError,
  toast,
  mutations,
}: UseMovementSubmitParams): UseMovementSubmitResult => {
  const {
    createMovement,
    createTransfer,
    updateMovement,
    createMovementTemplate,
    markAsPaidMutation,
  } = mutations;

  const handleSubmit = async (data: MovementFormData) => {
    setError(null);
    const {
      type, accountId, pocketId, subPocketId,
      amount: amountStr, notes, displayedDate: dateStr,
      isPending, isTransfer, targetAccountId, targetPocketId,
      saveAsTemplate, templateName,
    } = data;

    const amount = parseFloat(amountStr);
    const displayedDate = parseDate(dateStr).toISOString();

    try {
      if (formState.editingMovement) {
        await updateMovement.mutateAsync({
          id: formState.editingMovement.id,
          updates: {
            type, accountId, pocketId,
            subPocketId: subPocketId || undefined,
            amount, notes: notes || undefined, displayedDate, isPending,
          },
        });
        closeForms();
        toast.success('Movement updated successfully!');
        return;
      }

      // Capture reminder state before close clears it.
      const wasReminderId = formState.reminderId;
      closeForms();

      if (isTransfer) {
        await createTransfer.mutateAsync({
          sourceAccountId: accountId,
          sourcePocketId: pocketId,
          targetAccountId,
          targetPocketId,
          amount, displayedDate, notes: notes || undefined,
        });
        toast.success('Transfer created successfully!');
        return;
      }

      const newMovement = await createMovement.mutateAsync({
        type, accountId, pocketId, amount,
        notes: notes || undefined,
        displayedDate, subPocketId: subPocketId || undefined, isPending,
      });

      if (wasReminderId) {
        await markAsPaidMutation.mutateAsync({
          id: wasReminderId,
          movementId: newMovement?.id,
        });
        formState.setReminderId(null);
      }

      if (saveAsTemplate && templateName.trim()) {
        try {
          await createMovementTemplate.mutateAsync({
            name: templateName.trim(),
            type, accountId, pocketId,
            defaultAmount: amount, notes: notes || undefined,
            subPocketId: subPocketId || undefined,
          });
          toast.success(
            `Movement created and saved as template "${templateName}"!`
          );
        } catch (templateErr) {
          const msg =
            templateErr instanceof Error ? templateErr.message : 'Unknown error';
          toast.warning(
            `Movement created but template save failed: ${msg}`
          );
        }
      } else {
        toast.success(
          isPending
            ? 'Pending movement created successfully!'
            : 'Movement created successfully!'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save movement';
      setError(msg);
      formState.setShowForm(true);
    }
  };

  const handleBatchSave = async (rows: BatchMovementRow[]) => {
    await movementService.batchCreateMovements(
      rows.map(row => ({
        type: row.type,
        accountId: row.accountId,
        pocketId: row.pocketId,
        subPocketId: row.subPocketId,
        amount: parseFloat(row.amount),
        notes: row.notes || undefined,
        displayedDate: row.displayedDate,
        isPending: row.isPending || false,
      }))
    );
    setShowBatchForm(false);
    const pendingText = rows[0]?.isPending ? ' as pending' : '';
    toast.success(
      `Successfully created ${rows.length} movement${rows.length > 1 ? 's' : ''}${pendingText}!`
    );
  };

  const isSaving = createMovement.isPending || updateMovement.isPending;

  return { handleSubmit, handleBatchSave, isSaving };
};
