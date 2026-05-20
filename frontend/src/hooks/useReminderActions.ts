import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { toDateOnly } from '../utils/dateUtils';
import type { ReminderWithProjection } from '../utils/reminderProjections';
import type {
  CreateReminderDTO,
  UpdateReminderDTO,
} from '../services/reminderService';
import type { useReminderMutations } from './queries/useReminderQueries';

type ReminderMutations = ReturnType<typeof useReminderMutations>;

interface RecurrenceModalState {
  isOpen: boolean;
  type: 'edit' | 'delete';
  reminder: ReminderWithProjection | null;
}

export interface UseReminderActionsParams {
  reminders: ReminderWithProjection[];
  mutations: ReminderMutations;
}

export interface UseReminderActionsResult {
  // Form modal state + controls
  isFormOpen: boolean;
  editingReminder: ReminderWithProjection | null;
  isEditingException: boolean;
  openCreateForm: () => void;
  closeForm: () => void;

  // Recurrence-action modal state + controls
  recurrenceModal: RecurrenceModalState;
  closeRecurrenceModal: () => void;

  // Mark-as-paid modal state + controls
  markAsPaidReminder: ReminderWithProjection | null;
  closeMarkAsPaid: () => void;

  // Row-level handlers passed to memoized children
  handlePayNow: (reminder: ReminderWithProjection) => void;
  handleEdit: (reminder: ReminderWithProjection) => void;
  handleDelete: (reminder: ReminderWithProjection) => Promise<void>;
  handleMarkAsPaid: (reminder: ReminderWithProjection) => void;

  // Modal-driven handlers
  handleConfirmMarkAsPaid: (movementId?: string) => Promise<void>;
  handleRecurrenceAction: (scope: 'this' | 'all' | 'future') => Promise<void>;
  handleCreate: (data: CreateReminderDTO | UpdateReminderDTO) => Promise<void>;
  handleUpdate: (data: CreateReminderDTO | UpdateReminderDTO) => Promise<void>;

  // Aggregated saving flag for the form
  isSaving: boolean;
}

/**
 * Encapsulates all user-driven actions for the reminders widget: create,
 * update (including exception + split-series flows), delete (with recurrence
 * scope handling), mark-as-paid, pay-now navigation, and the modal state
 * that drives the form, recurrence-action, and mark-as-paid dialogs.
 *
 * Mutations and the reminder list are passed in so the hook stays
 * decoupled from the query layer's cache key conventions and so callers
 * can share a single TanStack-Query subscription with the rendering
 * component.
 */
export const useReminderActions = ({
  reminders,
  mutations,
}: UseReminderActionsParams): UseReminderActionsResult => {
  const navigate = useNavigate();
  const { confirm } = useConfirmDialog();

  const {
    deleteMutation,
    createMutation,
    updateMutation,
    createExceptionMutation,
    splitMutation,
  } = mutations;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReminder, setEditingReminder] =
    useState<ReminderWithProjection | null>(null);
  const [isEditingException, setIsEditingException] = useState(false);
  const [splitDate, setSplitDate] = useState<string | null>(null);

  const [recurrenceModal, setRecurrenceModal] = useState<RecurrenceModalState>({
    isOpen: false,
    type: 'edit',
    reminder: null,
  });

  const [markAsPaidReminder, setMarkAsPaidReminder] =
    useState<ReminderWithProjection | null>(null);

  const openCreateForm = useCallback(() => {
    setEditingReminder(null);
    setIsEditingException(false);
    setSplitDate(null);
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingReminder(null);
    setIsEditingException(false);
    setSplitDate(null);
  }, []);

  const closeRecurrenceModal = useCallback(() => {
    setRecurrenceModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const closeMarkAsPaid = useCallback(() => {
    setMarkAsPaidReminder(null);
  }, []);

  // Stable handlers passed to memoized MonthSection -> ReminderCard. Without
  // useCallback these would be re-created on every keystroke in the modal.
  const handlePayNow = useCallback(
    (reminder: ReminderWithProjection) => {
      const params = new URLSearchParams();
      params.set('action', 'new');
      params.set('amount', reminder.amount.toString());
      params.set('notes', reminder.title);
      params.set('date', reminder.dueDate);

      if (reminder.templateId) params.set('templateId', reminder.templateId);
      if (reminder.fixedExpenseId)
        params.set('fixedExpenseId', reminder.fixedExpenseId);

      // Use the original reminder ID for projected occurrences so the
      // movements page can correlate the linked reminder.
      const reminderId = reminder.originalReminderId || reminder.id;
      params.set('reminderId', reminderId);

      navigate(`/movements?${params.toString()}`);
    },
    [navigate]
  );

  const handleEdit = useCallback((reminder: ReminderWithProjection) => {
    if (reminder.recurrence.type !== 'once') {
      setRecurrenceModal({ isOpen: true, type: 'edit', reminder });
    } else {
      setEditingReminder(reminder);
      setIsEditingException(false);
      setSplitDate(null);
      setIsFormOpen(true);
    }
  }, []);

  const handleDelete = useCallback(
    async (reminder: ReminderWithProjection) => {
      if (reminder.recurrence.type !== 'once') {
        setRecurrenceModal({ isOpen: true, type: 'delete', reminder });
        return;
      }

      const ok = await confirm({
        title: 'Delete Reminder',
        message: 'Are you sure you want to delete this reminder?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
      });
      if (!ok) return;

      deleteMutation.mutate(reminder.id);
    },
    [confirm, deleteMutation]
  );

  const handleMarkAsPaid = useCallback((reminder: ReminderWithProjection) => {
    setMarkAsPaidReminder(reminder);
  }, []);

  const handleConfirmMarkAsPaid = useCallback(
    async (movementId?: string) => {
      if (!markAsPaidReminder) return;

      const originalId =
        markAsPaidReminder.originalReminderId || markAsPaidReminder.id;

      try {
        if (markAsPaidReminder.recurrence.type === 'once') {
          await updateMutation.mutateAsync({
            id: originalId,
            data: {
              isPaid: true,
              linkedMovementId: movementId,
            },
          });
        } else {
          // Recurring: store the paid state as a per-occurrence exception so
          // the rest of the series stays intact.
          await createExceptionMutation.mutateAsync({
            id: originalId,
            data: {
              originalDate: toDateOnly(markAsPaidReminder.dueDate),
              action: 'modified',
              isPaid: true,
              linkedMovementId: movementId,
            },
          });
        }
      } catch {
        // Toast is shown by the mutation's onError handler.
      } finally {
        setMarkAsPaidReminder(null);
      }
    },
    [markAsPaidReminder, updateMutation, createExceptionMutation]
  );

  const handleRecurrenceAction = useCallback(
    async (scope: 'this' | 'all' | 'future') => {
      const { type, reminder } = recurrenceModal;
      if (!reminder) return;

      const originalId = reminder.originalReminderId || reminder.id;

      if (type === 'delete') {
        try {
          if (scope === 'this') {
            // Delete this occurrence only (create deletion exception).
            await createExceptionMutation.mutateAsync({
              id: originalId,
              data: {
                originalDate: toDateOnly(reminder.dueDate),
                action: 'deleted',
              },
            });
          } else if (scope === 'future') {
            // Delete this and future occurrences (split the series).
            const ok = await confirm({
              title: 'Delete Future Reminders',
              message:
                'Are you sure you want to delete this and all following reminders?',
              confirmText: 'Delete',
              cancelText: 'Cancel',
              variant: 'danger',
            });
            if (!ok) {
              closeRecurrenceModal();
              return;
            }
            await splitMutation.mutateAsync({
              id: originalId,
              splitDate: reminder.dueDate,
            });
          } else {
            // Delete the entire series.
            const ok = await confirm({
              title: 'Delete Recurring Series',
              message:
                'Are you sure you want to delete this recurring reminder series?',
              confirmText: 'Delete Series',
              cancelText: 'Cancel',
              variant: 'danger',
            });
            if (!ok) {
              closeRecurrenceModal();
              return;
            }
            await deleteMutation.mutateAsync(originalId);
          }
          // Only close on success — on error the underlying mutation's
          // onError shows a toast (see useReminderQueries) and the modal
          // remains open so the user can retry.
          closeRecurrenceModal();
        } catch {
          // Mutation hooks display the toast via onError. Keep the
          // recurrence modal open so the user can retry the action.
        }
      } else if (type === 'edit') {
        // Edit branches are synchronous: they hand off to the form modal.
        closeRecurrenceModal();
        if (scope === 'this') {
          // Edit this occurrence only.
          setEditingReminder(reminder);
          setIsEditingException(true);
          setSplitDate(null);
          setIsFormOpen(true);
        } else if (scope === 'future') {
          // Edit this and future occurrences.
          setEditingReminder(reminder);
          setIsEditingException(false);
          setSplitDate(reminder.dueDate);
          setIsFormOpen(true);
        } else {
          // Edit the entire series — load the original (non-projected) row.
          const original = reminders.find((r) => r.id === originalId);
          if (original) {
            setEditingReminder(original);
            setIsEditingException(false);
            setSplitDate(null);
            setIsFormOpen(true);
          }
        }
      }
    },
    [
      recurrenceModal,
      reminders,
      confirm,
      closeRecurrenceModal,
      createExceptionMutation,
      splitMutation,
      deleteMutation,
    ]
  );

  const handleCreate = useCallback(
    async (data: CreateReminderDTO | UpdateReminderDTO) => {
      await createMutation.mutateAsync(data as CreateReminderDTO);
      setIsFormOpen(false);
    },
    [createMutation]
  );

  const handleUpdate = useCallback(
    async (data: CreateReminderDTO | UpdateReminderDTO) => {
      if (!editingReminder) return;

      const originalId = editingReminder.originalReminderId ?? editingReminder.id;

      if (isEditingException) {
        // editingReminder.dueDate holds the initial date of the occurrence we
        // clicked — that's the originalDate the exception keys off, NOT the
        // (possibly edited) date in the form payload.
        await createExceptionMutation.mutateAsync({
          id: originalId,
          data: {
            originalDate: toDateOnly(editingReminder.dueDate),
            action: 'modified',
            newTitle: data.title,
            newAmount: data.amount,
            newDate: data.dueDate,
          },
        });
      } else if (splitDate) {
        // Split series (Edit This and Future).
        await splitMutation.mutateAsync({
          id: originalId,
          splitDate,
          newDetails: data as CreateReminderDTO,
        });
      } else {
        await updateMutation.mutateAsync({
          id: editingReminder.id,
          data: data as UpdateReminderDTO,
        });
      }
      setEditingReminder(null);
      setIsEditingException(false);
      setSplitDate(null);
      setIsFormOpen(false);
    },
    [
      editingReminder,
      isEditingException,
      splitDate,
      createExceptionMutation,
      splitMutation,
      updateMutation,
    ]
  );

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    createExceptionMutation.isPending;

  return {
    isFormOpen,
    editingReminder,
    isEditingException,
    openCreateForm,
    closeForm,
    recurrenceModal,
    closeRecurrenceModal,
    markAsPaidReminder,
    closeMarkAsPaid,
    handlePayNow,
    handleEdit,
    handleDelete,
    handleMarkAsPaid,
    handleConfirmMarkAsPaid,
    handleRecurrenceAction,
    handleCreate,
    handleUpdate,
    isSaving,
  };
};
