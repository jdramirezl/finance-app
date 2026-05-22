import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '../../test/testUtils';

// react-router-dom and the confirm dialog context are mocked at the
// module level so the hook can be exercised without provider setup.
const navigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

const confirm = vi.fn();
vi.mock('../../contexts/ConfirmDialogContext', () => ({
  useConfirmDialog: () => ({ confirm }),
}));

import { useReminderActions } from '../actions/useReminderActions';
import type { UseReminderActionsParams } from '../actions/useReminderActions';
import type { ReminderWithProjection } from '../../utils/reminderProjections';

const oneTime = (overrides: Partial<ReminderWithProjection> = {}): ReminderWithProjection => ({
  id: 'rem-once-1',
  userId: 'user-1',
  title: 'Internet bill',
  amount: 50,
  dueDate: '2025-06-15',
  isPaid: false,
  recurrence: { type: 'once', interval: 1, endType: 'never' },
  createdAt: '2025-06-01T10:00:00.000Z',
  updatedAt: '2025-06-01T10:00:00.000Z',
  ...overrides,
});

const recurring = (overrides: Partial<ReminderWithProjection> = {}): ReminderWithProjection => ({
  id: 'rem-rec-1',
  userId: 'user-1',
  title: 'Rent',
  amount: 1000,
  dueDate: '2025-06-01',
  isPaid: false,
  recurrence: { type: 'monthly', interval: 1, endType: 'never' },
  createdAt: '2025-05-01T10:00:00.000Z',
  updatedAt: '2025-05-01T10:00:00.000Z',
  ...overrides,
});

const projected = (overrides: Partial<ReminderWithProjection> = {}): ReminderWithProjection => ({
  ...recurring({
    id: 'rem-rec-1_projected_2025-07-01',
    dueDate: '2025-07-01',
  }),
  isProjected: true,
  originalReminderId: 'rem-rec-1',
  ...overrides,
});

const makeMutation = () => ({
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  mutate: vi.fn(),
  isPending: false,
});

describe('useReminderActions', () => {
  let createMutation: ReturnType<typeof makeMutation>;
  let updateMutation: ReturnType<typeof makeMutation>;
  let deleteMutation: ReturnType<typeof makeMutation>;
  let createExceptionMutation: ReturnType<typeof makeMutation>;
  let splitMutation: ReturnType<typeof makeMutation>;

  beforeEach(() => {
    vi.clearAllMocks();
    createMutation = makeMutation();
    updateMutation = makeMutation();
    deleteMutation = makeMutation();
    createExceptionMutation = makeMutation();
    splitMutation = makeMutation();
  });

  const setup = (reminders: ReminderWithProjection[] = []) => {
    const params: UseReminderActionsParams = {
      reminders,
      mutations: {
        createMutation,
        updateMutation,
        deleteMutation,
        createExceptionMutation,
        splitMutation,
      } as unknown as UseReminderActionsParams['mutations'],
    };
    return renderHook(() => useReminderActions(params));
  };

  describe('form modal state', () => {
    it('starts with the form closed and no editing context', () => {
      const { result } = setup();
      expect(result.current.isFormOpen).toBe(false);
      expect(result.current.editingReminder).toBeNull();
      expect(result.current.isEditingException).toBe(false);
    });

    it('openCreateForm opens a fresh create form', () => {
      const { result } = setup();
      act(() => result.current.openCreateForm());
      expect(result.current.isFormOpen).toBe(true);
      expect(result.current.editingReminder).toBeNull();
      expect(result.current.isEditingException).toBe(false);
    });

    it('closeForm clears the form context', () => {
      const { result } = setup();
      act(() => result.current.openCreateForm());
      act(() => result.current.closeForm());
      expect(result.current.isFormOpen).toBe(false);
    });
  });

  describe('handlePayNow', () => {
    it('navigates to /movements with reminder query params', () => {
      const { result } = setup();
      const reminder = oneTime({ id: 'rem-once-1', amount: 50, title: 'Internet', dueDate: '2025-06-15' });

      act(() => result.current.handlePayNow(reminder));

      expect(navigate).toHaveBeenCalledTimes(1);
      const url = navigate.mock.calls[0][0] as string;
      expect(url.startsWith('/movements?')).toBe(true);
      expect(url).toContain('action=new');
      expect(url).toContain('amount=50');
      expect(url).toContain('reminderId=rem-once-1');
      expect(url).not.toContain('reminderRecurring=true');
    });

    it('uses originalReminderId for projected occurrences and flags as recurring', () => {
      const { result } = setup();
      const reminder = projected({ id: 'rem-rec-1_projected_2025-07-01', originalReminderId: 'rem-rec-1' });

      act(() => result.current.handlePayNow(reminder));

      const url = navigate.mock.calls[0][0] as string;
      expect(url).toContain('reminderId=rem-rec-1');
      expect(url).toContain('reminderRecurring=true');
    });
  });

  describe('handleEdit', () => {
    it('opens the form directly for one-time reminders', () => {
      const { result } = setup();
      const reminder = oneTime();

      act(() => result.current.handleEdit(reminder));

      expect(result.current.isFormOpen).toBe(true);
      expect(result.current.editingReminder).toEqual(reminder);
      expect(result.current.recurrenceModal.isOpen).toBe(false);
    });

    it('opens the recurrence modal for recurring reminders', () => {
      const { result } = setup();
      const reminder = recurring();

      act(() => result.current.handleEdit(reminder));

      expect(result.current.recurrenceModal.isOpen).toBe(true);
      expect(result.current.recurrenceModal.type).toBe('edit');
      expect(result.current.recurrenceModal.reminder).toEqual(reminder);
      expect(result.current.isFormOpen).toBe(false);
    });
  });

  describe('handleDelete', () => {
    it('asks for confirmation and deletes one-time reminders', async () => {
      confirm.mockResolvedValueOnce(true);
      const { result } = setup();
      const reminder = oneTime();

      await act(async () => {
        await result.current.handleDelete(reminder);
      });

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Delete Reminder', variant: 'danger' })
      );
      expect(deleteMutation.mutate).toHaveBeenCalledWith(reminder.id);
    });

    it('does not delete one-time reminders when cancelled', async () => {
      confirm.mockResolvedValueOnce(false);
      const { result } = setup();

      await act(async () => {
        await result.current.handleDelete(oneTime());
      });

      expect(deleteMutation.mutate).not.toHaveBeenCalled();
    });

    it('opens the recurrence modal for recurring reminders without confirming', async () => {
      const { result } = setup();
      const reminder = recurring();

      await act(async () => {
        await result.current.handleDelete(reminder);
      });

      expect(confirm).not.toHaveBeenCalled();
      expect(result.current.recurrenceModal.isOpen).toBe(true);
      expect(result.current.recurrenceModal.type).toBe('delete');
      expect(result.current.recurrenceModal.reminder).toEqual(reminder);
    });
  });

  describe('handleConfirmMarkAsPaid', () => {
    it('does nothing when no reminder is selected', async () => {
      const { result } = setup();
      await act(async () => {
        await result.current.handleConfirmMarkAsPaid('mov-1');
      });
      expect(updateMutation.mutateAsync).not.toHaveBeenCalled();
      expect(createExceptionMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it('updates the reminder for one-time reminders', async () => {
      const { result } = setup();
      const reminder = oneTime();

      act(() => result.current.handleMarkAsPaid(reminder));

      await act(async () => {
        await result.current.handleConfirmMarkAsPaid('mov-1');
      });

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        id: reminder.id,
        data: { isPaid: true, linkedMovementId: 'mov-1' },
      });
      expect(result.current.markAsPaidReminder).toBeNull();
    });

    it('creates a per-occurrence exception for recurring reminders', async () => {
      const { result } = setup();
      const reminder = projected({ dueDate: '2025-07-01T00:00:00.000Z' });

      act(() => result.current.handleMarkAsPaid(reminder));

      await act(async () => {
        await result.current.handleConfirmMarkAsPaid('mov-2');
      });

      expect(createExceptionMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'rem-rec-1',
        data: {
          originalDate: '2025-07-01',
          action: 'modified',
          isPaid: true,
          linkedMovementId: 'mov-2',
        },
      });
      expect(result.current.markAsPaidReminder).toBeNull();
    });

    it('still clears markAsPaidReminder if the mutation rejects', async () => {
      updateMutation.mutateAsync.mockRejectedValueOnce(new Error('boom'));
      const { result } = setup();

      act(() => result.current.handleMarkAsPaid(oneTime()));

      await act(async () => {
        await result.current.handleConfirmMarkAsPaid('mov-1');
      });

      expect(result.current.markAsPaidReminder).toBeNull();
    });
  });

  describe('handleRecurrenceAction — delete', () => {
    // handleDelete is async, so the act wrapping must be awaited — otherwise
    // the state update that opens the recurrence modal isn't flushed before
    // the next assertion and React leaks the unawaited update into the next
    // test, leaving `result.current` null.
    const openDelete = async (
      result: ReturnType<typeof setup>['result'],
      reminder: ReminderWithProjection = projected()
    ) => {
      await act(async () => {
        await result.current.handleDelete(reminder);
      });
    };

    it('"this" creates a deletion exception on the original date', async () => {
      const { result } = setup();
      const reminder = projected({ dueDate: '2025-07-01T00:00:00.000Z' });
      await openDelete(result, reminder);

      await act(async () => {
        await result.current.handleRecurrenceAction('this');
      });

      expect(createExceptionMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'rem-rec-1',
        data: { originalDate: '2025-07-01', action: 'deleted' },
      });
      expect(result.current.recurrenceModal.isOpen).toBe(false);
    });

    it('"future" confirms then splits the series', async () => {
      const { result } = setup();
      const reminder = projected();
      await openDelete(result, reminder);
      confirm.mockResolvedValueOnce(true);

      await act(async () => {
        await result.current.handleRecurrenceAction('future');
      });

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Delete Future Reminders', variant: 'danger' })
      );
      expect(splitMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'rem-rec-1',
        splitDate: reminder.dueDate,
      });
    });

    it('"future" aborts and closes the modal when confirmation is cancelled', async () => {
      const { result } = setup();
      await openDelete(result);
      confirm.mockResolvedValueOnce(false);

      await act(async () => {
        await result.current.handleRecurrenceAction('future');
      });

      expect(splitMutation.mutateAsync).not.toHaveBeenCalled();
      expect(result.current.recurrenceModal.isOpen).toBe(false);
    });

    it('"all" confirms then deletes the series via deleteMutation', async () => {
      const { result } = setup();
      await openDelete(result);
      confirm.mockResolvedValueOnce(true);

      await act(async () => {
        await result.current.handleRecurrenceAction('all');
      });

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Delete Recurring Series' })
      );
      expect(deleteMutation.mutateAsync).toHaveBeenCalledWith('rem-rec-1');
    });

    it('keeps the recurrence modal open if the underlying mutation rejects', async () => {
      createExceptionMutation.mutateAsync.mockRejectedValueOnce(new Error('boom'));
      const { result } = setup();
      await openDelete(result);

      await act(async () => {
        await result.current.handleRecurrenceAction('this');
      });

      expect(result.current.recurrenceModal.isOpen).toBe(true);
    });
  });

  describe('handleRecurrenceAction — edit', () => {
    const openEdit = (result: ReturnType<typeof setup>['result'], reminder: ReminderWithProjection) => {
      act(() => result.current.handleEdit(reminder));
    };

    it('"this" closes the recurrence modal and opens the form as an exception edit', async () => {
      const { result } = setup();
      const reminder = projected();
      openEdit(result, reminder);

      await act(async () => {
        await result.current.handleRecurrenceAction('this');
      });

      expect(result.current.recurrenceModal.isOpen).toBe(false);
      expect(result.current.isFormOpen).toBe(true);
      expect(result.current.editingReminder).toEqual(reminder);
      expect(result.current.isEditingException).toBe(true);
    });

    it('"future" opens the form for a split-from-this-date edit', async () => {
      const { result } = setup();
      const reminder = projected();
      openEdit(result, reminder);

      await act(async () => {
        await result.current.handleRecurrenceAction('future');
      });

      expect(result.current.isFormOpen).toBe(true);
      expect(result.current.isEditingException).toBe(false);
    });

    it('"all" loads the original reminder row when editing the entire series', async () => {
      const original = recurring({ id: 'rem-rec-1' });
      const proj = projected({ originalReminderId: 'rem-rec-1' });
      const { result } = setup([original]);
      openEdit(result, proj);

      await act(async () => {
        await result.current.handleRecurrenceAction('all');
      });

      expect(result.current.editingReminder).toEqual(original);
      expect(result.current.isEditingException).toBe(false);
      expect(result.current.isFormOpen).toBe(true);
    });
  });

  describe('handleCreate / handleUpdate', () => {
    it('handleCreate calls createMutation and closes the form', async () => {
      const { result } = setup();
      const dto = {
        title: 'Phone',
        amount: 30,
        dueDate: '2025-06-20',
        recurrence: { type: 'once', interval: 1, endType: 'never' } as const,
      };

      act(() => result.current.openCreateForm());

      await act(async () => {
        await result.current.handleCreate(dto);
      });

      expect(createMutation.mutateAsync).toHaveBeenCalledWith(dto);
      expect(result.current.isFormOpen).toBe(false);
    });

    it('handleUpdate routes to updateMutation for plain edits', async () => {
      const { result } = setup();
      const reminder = oneTime();
      act(() => result.current.handleEdit(reminder));

      const data = { title: 'New title', amount: 75, dueDate: '2025-06-20' };
      await act(async () => {
        await result.current.handleUpdate(data);
      });

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({ id: reminder.id, data });
      expect(result.current.isFormOpen).toBe(false);
      expect(result.current.editingReminder).toBeNull();
    });

    it('handleUpdate creates an exception when editing a single occurrence', async () => {
      const { result } = setup();
      const reminder = projected({ dueDate: '2025-07-01T00:00:00.000Z' });
      // Open the recurrence-action modal for an edit, then pick "this".
      act(() => result.current.handleEdit(reminder));
      await act(async () => {
        await result.current.handleRecurrenceAction('this');
      });

      const data = {
        title: 'Updated',
        amount: 1100,
        dueDate: '2025-07-02',
        recurrence: { type: 'monthly', interval: 1, endType: 'never' } as const,
      };
      await act(async () => {
        await result.current.handleUpdate(data);
      });

      expect(createExceptionMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'rem-rec-1',
        data: {
          originalDate: '2025-07-01',
          action: 'modified',
          newTitle: 'Updated',
          newAmount: 1100,
          newDate: '2025-07-02',
        },
      });
    });

    it('handleUpdate splits the series when editing this and future', async () => {
      const { result } = setup();
      const reminder = projected({ dueDate: '2025-07-01' });
      act(() => result.current.handleEdit(reminder));
      await act(async () => {
        await result.current.handleRecurrenceAction('future');
      });

      const data = {
        title: 'Updated',
        amount: 1100,
        dueDate: '2025-07-15',
        recurrence: { type: 'monthly', interval: 1, endType: 'never' } as const,
      };
      await act(async () => {
        await result.current.handleUpdate(data);
      });

      expect(splitMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'rem-rec-1',
        splitDate: '2025-07-01',
        newDetails: data,
      });
    });

    it('handleUpdate is a no-op when no reminder is being edited', async () => {
      const { result } = setup();
      await act(async () => {
        await result.current.handleUpdate({
          title: 'X',
          amount: 1,
          dueDate: '2025-06-20',
          recurrence: { type: 'once', interval: 1, endType: 'never' },
        });
      });
      expect(updateMutation.mutateAsync).not.toHaveBeenCalled();
      expect(createExceptionMutation.mutateAsync).not.toHaveBeenCalled();
      expect(splitMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('isSaving flag', () => {
    it('is true when any of create/update/exception mutations are pending', () => {
      createMutation.isPending = true;
      const { result } = setup();
      expect(result.current.isSaving).toBe(true);
    });

    it('is false when no save mutation is pending', () => {
      const { result } = setup();
      expect(result.current.isSaving).toBe(false);
    });
  });
});
