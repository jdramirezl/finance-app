import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '../../test/testUtils';
import { useMovementSubmit } from '../actions/useMovementSubmit';
import type { UseMovementSubmitParams } from '../actions/useMovementSubmit';
import type { MovementFormData } from '../../components/movements/MovementForm';

const mockFormState = () => ({
  showForm: true,
  setShowForm: vi.fn(),
  editingMovement: null,
  setEditingMovement: vi.fn(),
  selectedTemplateId: '',
  setSelectedTemplateId: vi.fn(),
  defaultValues: {},
  setDefaultValues: vi.fn(),
  reminderId: null as string | null,
  setReminderId: vi.fn(),
  reminderDate: null as string | null,
  setReminderDate: vi.fn(),
  reminderRecurring: false,
  setReminderRecurring: vi.fn(),
  liveValues: { type: 'EgresoNormal' as const, accountId: '', pocketId: '', subPocketId: '', amount: '' },
  setLiveValues: vi.fn(),
  resetFormState: vi.fn(),
  openNewForm: vi.fn(),
  openEditForm: vi.fn(),
  handleTemplateSelect: vi.fn(),
});

const baseFormData: MovementFormData = {
  type: 'EgresoNormal',
  accountId: 'acc-1',
  pocketId: 'pkt-1',
  subPocketId: '',
  amount: '199',
  notes: 'Netflix',
  displayedDate: '2025-06-15',
  isPending: false,
  isTransfer: false,
  targetAccountId: '',
  targetPocketId: '',
  saveAsTemplate: false,
  templateName: '',
};

describe('useMovementSubmit — reminder linking', () => {
  let markAsPaidMutation: { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean };
  let createExceptionMutation: { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean };
  let createMovement: { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean };

  beforeEach(() => {
    vi.clearAllMocks();
    markAsPaidMutation = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
    createExceptionMutation = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
    createMovement = { mutateAsync: vi.fn().mockResolvedValue({ id: 'mov-new' }), isPending: false };
  });

  const setup = (formStateOverrides: Partial<ReturnType<typeof mockFormState>> = {}) => {
    const formState = { ...mockFormState(), ...formStateOverrides };
    const params: UseMovementSubmitParams = {
      formState,
      closeForms: vi.fn(),
      setShowBatchForm: vi.fn(),
      setError: vi.fn(),
      toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } as any,
      mutations: {
        // Strict typing on `UseMutationResult` requires a full mutation
        // surface. The minimal `{ mutateAsync, isPending }` mocks are
        // sufficient for the code paths exercised here, so cast away.
        createMovement: createMovement as any,
        createTransfer: { mutateAsync: vi.fn(), isPending: false } as any,
        updateMovement: { mutateAsync: vi.fn(), isPending: false } as any,
        createMovementTemplate: { mutateAsync: vi.fn(), isPending: false } as any,
        markAsPaidMutation: markAsPaidMutation as any,
        createExceptionMutation: createExceptionMutation as any,
      },
    };
    return renderHook(() => useMovementSubmit(params));
  };

  it('calls markAsPaidMutation for one-time reminders', async () => {
    const { result } = setup({
      reminderId: 'rem-1',
      reminderDate: '2025-06-15',
      reminderRecurring: false,
    });

    await act(async () => {
      await result.current.handleSubmit(baseFormData);
    });

    expect(markAsPaidMutation.mutateAsync).toHaveBeenCalledWith({
      id: 'rem-1',
      movementId: 'mov-new',
    });
    expect(createExceptionMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('calls createExceptionMutation for recurring reminders', async () => {
    const { result } = setup({
      reminderId: 'rem-1',
      reminderDate: '2025-06-15',
      reminderRecurring: true,
    });

    await act(async () => {
      await result.current.handleSubmit(baseFormData);
    });

    expect(createExceptionMutation.mutateAsync).toHaveBeenCalledWith({
      id: 'rem-1',
      data: {
        originalDate: '2025-06-15',
        action: 'modified',
        isPaid: true,
        linkedMovementId: 'mov-new',
      },
    });
    expect(markAsPaidMutation.mutateAsync).not.toHaveBeenCalled();
  });
});
