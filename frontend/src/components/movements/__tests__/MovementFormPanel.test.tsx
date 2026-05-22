import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import MovementFormPanel, { type MovementFormPanelProps } from '../MovementFormPanel';
import type { MovementFormStateResult } from '../../../hooks/useMovementFormState';

// Stub out the heavy children — this suite focuses on which panel renders,
// the modal header/title, and close-button wiring.
vi.mock('../BatchMovementForm', () => ({
  default: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="batch-form">
      Batch Form
      <button type="button" onClick={onCancel}>cancel-batch</button>
    </div>
  ),
}));

vi.mock('../MovementForm', () => ({
  default: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="single-form">
      Single Form
      <button type="button" onClick={onCancel}>cancel-single</button>
    </div>
  ),
}));

vi.mock('../AccountContextPanel', () => ({
  default: () => <div data-testid="account-panel" />,
}));

vi.mock('../QuickCalculator', () => ({
  default: () => <div data-testid="calculator" />,
}));

const baseFormState: MovementFormStateResult = {
  showForm: false,
  setShowForm: vi.fn(),
  editingMovement: null,
  setEditingMovement: vi.fn(),
  selectedTemplateId: '',
  setSelectedTemplateId: vi.fn(),
  defaultValues: {},
  setDefaultValues: vi.fn(),
  reminderId: null,
  setReminderId: vi.fn(),
  reminderDate: null,
  setReminderDate: vi.fn(),
  reminderRecurring: false,
  setReminderRecurring: vi.fn(),
  liveValues: {
    type: 'EgresoNormal',
    accountId: '',
    pocketId: '',
    subPocketId: '',
    amount: '',
  },
  setLiveValues: vi.fn(),
  resetFormState: vi.fn(),
  openNewForm: vi.fn(),
  openEditForm: vi.fn(),
  handleTemplateSelect: vi.fn(),
};

const buildProps = (overrides: Partial<MovementFormPanelProps> = {}): MovementFormPanelProps => ({
  formState: { ...baseFormState },
  isSaving: false,
  onSubmit: vi.fn().mockResolvedValue(undefined),
  onClose: vi.fn(),
  batch: {
    showBatchForm: false,
    batchFormRef: createRef(),
    onBatchSave: vi.fn().mockResolvedValue(undefined),
    onBatchRowFocus: vi.fn(),
    onBatchRowsChange: vi.fn(),
  },
  sidePanel: {
    activeAccountId: '',
    activePocketId: '',
    balanceDeltas: { accountDeltas: {}, pocketDeltas: {}, subPocketDeltas: {} },
    selectedPocketBalance: null,
    onUseCalculatorAmount: vi.fn(),
  },
  movementFormRef: createRef(),
  onValuesChange: vi.fn(),
  ...overrides,
});

describe('MovementFormPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing when neither form is shown', () => {
    const { container } = render(<MovementFormPanel {...buildProps()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the single MovementForm with the "New Movement" header when showForm is true', () => {
    render(
      <MovementFormPanel
        {...buildProps({
          formState: { ...baseFormState, showForm: true },
        })}
      />,
    );

    expect(screen.getByTestId('single-form')).toBeInTheDocument();
    expect(screen.queryByTestId('batch-form')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /new movement/i })).toBeInTheDocument();
  });

  it('shows the "Edit Movement" header when an existing movement is being edited', () => {
    render(
      <MovementFormPanel
        {...buildProps({
          formState: {
            ...baseFormState,
            showForm: true,
            editingMovement: {
              id: 'mov1',
              type: 'EgresoNormal',
              accountId: 'acc1',
              pocketId: 'pkt1',
              amount: 100,
              displayedDate: '2026-01-15T00:00:00.000Z',
              createdAt: '2026-01-15T00:00:00.000Z',
            },
          },
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: /edit movement/i })).toBeInTheDocument();
  });

  it('renders the BatchMovementForm and the batch header when showBatchForm is true', () => {
    render(
      <MovementFormPanel
        {...buildProps({
          batch: {
            showBatchForm: true,
            batchFormRef: createRef(),
            onBatchSave: vi.fn().mockResolvedValue(undefined),
            onBatchRowFocus: vi.fn(),
            onBatchRowsChange: vi.fn(),
          },
        })}
      />,
    );

    expect(screen.getByTestId('batch-form')).toBeInTheDocument();
    expect(screen.queryByTestId('single-form')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /batch add movements/i })).toBeInTheDocument();
  });

  it('prefers the batch header when both forms are flagged visible', () => {
    // Defensive — the panel checks `showBatch` first when picking the title
    render(
      <MovementFormPanel
        {...buildProps({
          formState: { ...baseFormState, showForm: true },
          batch: {
            showBatchForm: true,
            batchFormRef: createRef(),
            onBatchSave: vi.fn().mockResolvedValue(undefined),
            onBatchRowFocus: vi.fn(),
            onBatchRowsChange: vi.fn(),
          },
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: /batch add movements/i })).toBeInTheDocument();
    // Only the batch form renders — showSingle is suppressed when showBatch is true
    expect(screen.getByTestId('batch-form')).toBeInTheDocument();
    expect(screen.queryByTestId('single-form')).not.toBeInTheDocument();
  });

  it('calls onClose when the header X button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <MovementFormPanel
        {...buildProps({
          formState: { ...baseFormState, showForm: true },
          onClose,
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { container } = render(
      <MovementFormPanel
        {...buildProps({
          formState: { ...baseFormState, showForm: true },
          onClose,
        })}
      />,
    );

    // The backdrop is the absolute-positioned aria-hidden overlay
    const backdrop = container.querySelector('[aria-hidden="true"]') as HTMLElement | null;
    expect(backdrop).not.toBeNull();

    await user.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the persistent right-hand panels (account context + calculator)', () => {
    render(
      <MovementFormPanel
        {...buildProps({
          formState: { ...baseFormState, showForm: true },
        })}
      />,
    );

    expect(screen.getByTestId('account-panel')).toBeInTheDocument();
    expect(screen.getByTestId('calculator')).toBeInTheDocument();
  });
});
