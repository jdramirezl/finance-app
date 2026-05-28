import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, waitFor } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import BatchMovementForm, {
  type BatchMovementFormRef,
  type BatchMovementRow,
} from '../BatchMovementForm';

// Mock the row child so the suite focuses on the form's orchestration logic
// (add/remove rows, ref handle, submit shape) without dragging in
// AccountPocketSelector and its query dependencies.
vi.mock('../BatchMovementRow', () => ({
  default: ({
    index,
    canRemove,
    onRemove,
    onFocus,
  }: {
    index: number;
    canRemove: boolean;
    onRemove: () => void;
    onFocus: () => void;
  }) => (
    <div
      data-testid={`batch-row-${index}`}
      onFocus={onFocus}
      // Make the wrapper focusable so onFocus can be exercised in tests
      tabIndex={0}
    >
      Row {index + 1}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove row ${index + 1}`}
        >
          Remove
        </button>
      )}
    </div>
  ),
}));

vi.mock('../../../hooks/queries', () => ({
  usePocketsQuery: () => ({
    data: [
      { id: 'pkt1', accountId: 'acc1', name: 'General', balance: 0, type: 'normal', currency: 'USD' },
    ],
  }),
}));

vi.mock('../../../hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: vi.fn(),
}));

const defaultProps = {
  onSave: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
};

describe('BatchMovementForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders one default row when no initialRows are provided', () => {
    render(<BatchMovementForm {...defaultProps} />);

    expect(screen.getByTestId('batch-row-0')).toBeInTheDocument();
    expect(screen.queryByTestId('batch-row-1')).not.toBeInTheDocument();
  });

  it('renders all initial rows when provided', () => {
    const initialRows: BatchMovementRow[] = [
      { id: 'r1', type: 'IngresoNormal', accountId: 'acc1', pocketId: 'pkt1', amount: '10', notes: '', displayedDate: '2026-01-15' },
      { id: 'r2', type: 'EgresoNormal', accountId: 'acc1', pocketId: 'pkt1', amount: '20', notes: '', displayedDate: '2026-01-16' },
    ];

    render(<BatchMovementForm {...defaultProps} initialRows={initialRows} />);

    expect(screen.getByTestId('batch-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('batch-row-1')).toBeInTheDocument();
  });

  it('appends a new row when "Add Row" is clicked', async () => {
    const user = userEvent.setup();
    render(<BatchMovementForm {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add row/i }));

    expect(screen.getByTestId('batch-row-1')).toBeInTheDocument();
  });

  it('removes a row when its remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<BatchMovementForm {...defaultProps} />);

    // Need at least 2 rows before remove buttons appear (last row cannot be removed)
    await user.click(screen.getByRole('button', { name: /add row/i }));
    expect(screen.getByTestId('batch-row-1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove row 2/i }));

    expect(screen.queryByTestId('batch-row-1')).not.toBeInTheDocument();
  });

  it('hides the remove button on the last remaining row', () => {
    render(<BatchMovementForm {...defaultProps} />);

    expect(screen.queryByRole('button', { name: /remove row 1/i })).not.toBeInTheDocument();
  });

  it('reflects the row count in the submit button label', async () => {
    const user = userEvent.setup();
    render(<BatchMovementForm {...defaultProps} />);

    expect(screen.getByRole('button', { name: /save all \(1\)/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add row/i }));
    expect(screen.getByRole('button', { name: /save all \(2\)/i })).toBeInTheDocument();
  });

  it('toggles the markAsPending checkbox', async () => {
    const user = userEvent.setup();
    render(<BatchMovementForm {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox', { name: /mark all as pending/i });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('calls onCancel when the header close (X) button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<BatchMovementForm {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByLabelText(/close batch movement form/i));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<BatchMovementForm {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with rows tagged with the markAsPending value', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const initialRows: BatchMovementRow[] = [
      { id: 'r1', type: 'IngresoNormal', accountId: 'acc1', pocketId: 'pkt1', amount: '10', notes: '', displayedDate: '2026-01-15' },
    ];

    render(<BatchMovementForm {...defaultProps} initialRows={initialRows} onSave={onSave} />);

    await user.click(screen.getByRole('checkbox', { name: /mark all as pending/i }));
    await user.click(screen.getByRole('button', { name: /save all \(1\)/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'r1', amount: '10', isPending: true }),
    ]);
  });

  it('exposes updateAmount on the imperative ref', () => {
    const ref = createRef<BatchMovementFormRef>();
    const initialRows: BatchMovementRow[] = [
      { id: 'r1', type: 'IngresoNormal', accountId: 'acc1', pocketId: 'pkt1', amount: '10', notes: '', displayedDate: '2026-01-15' },
    ];

    render(<BatchMovementForm {...defaultProps} ref={ref} initialRows={initialRows} />);

    expect(typeof ref.current?.updateAmount).toBe('function');
    // Calling it on a known id should not throw
    expect(() => ref.current?.updateAmount('r1', '99')).not.toThrow();
    // Unknown ids are ignored, not thrown
    expect(() => ref.current?.updateAmount('does-not-exist', '5')).not.toThrow();
  });

  it('fires onRowsChange when rows are added', async () => {
    const onRowsChange = vi.fn();
    const user = userEvent.setup();

    render(<BatchMovementForm {...defaultProps} onRowsChange={onRowsChange} />);

    onRowsChange.mockClear();
    await user.click(screen.getByRole('button', { name: /add row/i }));

    // The effect that fires onRowsChange runs once fields.length changes; the
    // exact rows array snapshot at that tick depends on react-hook-form's
    // watch propagation. We only assert that the consumer is notified.
    await waitFor(() => {
      expect(onRowsChange).toHaveBeenCalled();
    });
  });

  it('copies type, account, pocket, sub-pocket, and date from the previous row when adding a new row', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const initialRows: BatchMovementRow[] = [
      {
        id: 'r1',
        type: 'EgresoNormal',
        accountId: 'acc1',
        pocketId: 'pkt1',
        subPocketId: 'sub1',
        amount: '10',
        notes: 'first',
        
        displayedDate: '2026-03-12',
      },
    ];

    render(<BatchMovementForm {...defaultProps} initialRows={initialRows} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /add row/i }));
    await user.click(screen.getByRole('button', { name: /save all \(2\)/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    const rows = onSave.mock.calls[0][0] as BatchMovementRow[];
    expect(rows).toHaveLength(2);
    // Inherited contextual settings
    expect(rows[1]).toMatchObject({
      type: 'EgresoNormal',
      accountId: 'acc1',
      pocketId: 'pkt1',
      subPocketId: 'sub1',
      displayedDate: '2026-03-12',
    });
    // Money-shaped fields intentionally left blank for fresh input
    expect(rows[1].amount).toBe('');
    expect(rows[1].notes).toBe('');
    // New row gets its own id
    expect(rows[1].id).not.toBe('r1');
  });

  it('uses the default blank row when adding the very first row (no previous row)', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    // initialRows=[] forces defaultValues to fall back to a single default row,
    // but we also exercise the empty-array branch by removing all rows first
    // is not possible (last row cannot be removed). Instead, this test
    // documents that the default-row path is taken when no rows exist by
    // confirming the first rendered row has the createDefaultRow() shape.
    render(<BatchMovementForm {...defaultProps} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /save all \(1\)/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    const rows = onSave.mock.calls[0][0] as BatchMovementRow[];
    expect(rows[0]).toMatchObject({
      type: 'IngresoNormal',
      accountId: '',
      pocketId: '',
      amount: '',
      notes: '',
    });
  });
});
