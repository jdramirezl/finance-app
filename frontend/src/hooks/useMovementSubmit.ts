import type { MovementType } from '../types';
import type { BatchMovementRow } from '../components/BatchMovementForm';
import type { useToast } from './useToast';
import type { useMovementMutations } from './queries/useMovementMutations';
import type { useMovementTemplateMutations } from './queries/useMovementTemplates';
import type { useReminderMutations } from './queries/useReminderQueries';
import type { MovementFormStateResult } from './useMovementFormState';

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
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleBatchSave: (rows: BatchMovementRow[]) => Promise<void>;
  isSaving: boolean;
}

/**
 * Encapsulates the imperative submit flow for the movements modal:
 * create / update / transfer (single) and batch create.
 *
 * Mutations are received from the caller so they share the same instance
 * the rest of the page uses (and so `isSaving` reflects the page state).
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const type = data.get('type') as MovementType;
    const accountId = data.get('accountId') as string;
    const pocketId = data.get('pocketId') as string;
    const subPocketId = (data.get('subPocketId') as string) || undefined;
    const amount = parseFloat(data.get('amount') as string);
    const notes = (data.get('notes') as string) || undefined;
    const displayedDate = new Date(
      (data.get('displayedDate') as string) + 'T00:00:00'
    ).toISOString();
    const isPending = data.get('isPending') === 'on';

    try {
      if (formState.editingMovement) {
        await updateMovement.mutateAsync({
          id: formState.editingMovement.id,
          updates: {
            type, accountId, pocketId, subPocketId,
            amount, notes, displayedDate, isPending,
          },
        });
        closeForms();
        toast.success('Movement updated successfully!');
        return;
      }

      // Capture template / reminder state before close clears them.
      const wasReminderId = formState.reminderId;
      const wasSaveAsTemplate = formState.saveAsTemplate;
      const wasTemplateName = formState.templateName;
      form.reset();
      closeForms();

      if (data.get('isTransfer') === 'true') {
        await createTransfer.mutateAsync({
          sourceAccountId: accountId,
          sourcePocketId: pocketId,
          targetAccountId: data.get('targetAccountId') as string,
          targetPocketId: data.get('targetPocketId') as string,
          amount, displayedDate, notes,
        });
        toast.success('Transfer created successfully!');
        return;
      }

      const newMovement = await createMovement.mutateAsync({
        type, accountId, pocketId, amount, notes,
        displayedDate, subPocketId, isPending,
      });

      if (wasReminderId) {
        await markAsPaidMutation.mutateAsync({
          id: wasReminderId,
          movementId: newMovement?.id,
        });
        formState.setReminderId(null);
      }

      if (wasSaveAsTemplate && wasTemplateName.trim()) {
        try {
          await createMovementTemplate.mutateAsync({
            name: wasTemplateName.trim(),
            type, accountId, pocketId,
            defaultAmount: amount, notes, subPocketId,
          });
          toast.success(
            `Movement created and saved as template "${wasTemplateName}"!`
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
      // Toast is shown by the mutation's onError handler.
      formState.setShowForm(true);
    }
  };

  const handleBatchSave = async (rows: BatchMovementRow[]) => {
    for (const row of rows) {
      await createMovement.mutateAsync({
        type: row.type,
        accountId: row.accountId,
        pocketId: row.pocketId,
        amount: parseFloat(row.amount),
        notes: row.notes || undefined,
        displayedDate: row.displayedDate,
        subPocketId: row.subPocketId,
        isPending: row.isPending || false,
      });
    }
    setShowBatchForm(false);
    const pendingText = rows[0]?.isPending ? ' as pending' : '';
    toast.success(
      `Successfully created ${rows.length} movement${rows.length > 1 ? 's' : ''}${pendingText}!`
    );
    // Errors propagate to callers; mutation onError shows the toast.
  };

  const isSaving = createMovement.isPending || updateMovement.isPending;

  return { handleSubmit, handleBatchSave, isSaving };
};
