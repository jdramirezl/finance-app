import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import SnapshotsTableModal from '../SnapshotsTableModal';
import type { NetWorthSnapshot } from '../../../services/netWorthSnapshotService';

const buildSnapshot = (
    overrides: Partial<NetWorthSnapshot> = {},
): NetWorthSnapshot => ({
    id: 's1',
    userId: 'u1',
    snapshotDate: '2025-01-15',
    totalNetWorth: 100_000,
    baseCurrency: 'USD',
    breakdown: { USD: 100_000 },
    createdAt: '2025-01-15T00:00:00.000Z',
    ...overrides,
});

const renderModal = (
    overrides: Partial<{
        isOpen: boolean;
        snapshots: NetWorthSnapshot[];
        primaryCurrency: string;
        onClose: () => void;
        onEdit: (s: NetWorthSnapshot) => void;
    }> = {},
) => {
    const onClose = overrides.onClose ?? vi.fn();
    const onEdit = overrides.onEdit ?? vi.fn();
    const result = render(
        <SnapshotsTableModal
            isOpen={overrides.isOpen ?? true}
            onClose={onClose}
            snapshots={overrides.snapshots ?? []}
            onEdit={onEdit}
            primaryCurrency={overrides.primaryCurrency ?? 'USD'}
        />,
    );
    return { onClose, onEdit, ...result };
};

describe('SnapshotsTableModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing meaningful when isOpen is false', () => {
        renderModal({ isOpen: false, snapshots: [buildSnapshot()] });
        // Modal is closed → no table body.
        expect(screen.queryByTestId('snapshots-table-modal-body')).not.toBeInTheDocument();
    });

    it('renders an empty state when there are no snapshots', () => {
        renderModal({ snapshots: [] });
        expect(screen.getByText(/no snapshots yet/i)).toBeInTheDocument();
        expect(screen.queryByTestId('snapshots-table')).not.toBeInTheDocument();
    });

    it('renders one row per snapshot with the date in YYYY-MM-DD form', () => {
        const snapshots = [
            buildSnapshot({ id: 'a', snapshotDate: '2025-01-15' }),
            buildSnapshot({ id: 'b', snapshotDate: '2025-06-30' }),
            buildSnapshot({ id: 'c', snapshotDate: '2026-02-01' }),
        ];
        renderModal({ snapshots });

        const rows = screen.getAllByTestId(/^snapshots-table-row-/);
        expect(rows).toHaveLength(3);
        // Each row's date column is rendered as YYYY-MM-DD.
        expect(rows[0]).toHaveTextContent(/2026-02-01|2025-06-30|2025-01-15/);
    });

    it('defaults to newest-first ordering and toggles to oldest-first on click', async () => {
        const snapshots = [
            buildSnapshot({ id: 'old', snapshotDate: '2024-01-01' }),
            buildSnapshot({ id: 'mid', snapshotDate: '2025-01-01' }),
            buildSnapshot({ id: 'new', snapshotDate: '2026-01-01' }),
        ];
        renderModal({ snapshots });

        // Default: newest first.
        let rows = screen.getAllByTestId(/^snapshots-table-row-/);
        expect(rows[0].getAttribute('data-testid')).toBe('snapshots-table-row-new');
        expect(rows[2].getAttribute('data-testid')).toBe('snapshots-table-row-old');

        // Toggle.
        const user = userEvent.setup();
        await user.click(screen.getByText(/newest first/i));

        rows = screen.getAllByTestId(/^snapshots-table-row-/);
        expect(rows[0].getAttribute('data-testid')).toBe('snapshots-table-row-old');
        expect(rows[2].getAttribute('data-testid')).toBe('snapshots-table-row-new');
    });

    it('renders one column per currency that actually appears in the breakdowns', () => {
        const snapshots = [
            buildSnapshot({
                id: 'a',
                breakdown: { USD: 100, MXN: 1_800 },
            }),
            buildSnapshot({
                id: 'b',
                snapshotDate: '2025-02-01',
                breakdown: { USD: 200, COP: 800_000 },
            }),
        ];
        renderModal({ snapshots, primaryCurrency: 'USD' });

        const table = screen.getByTestId('snapshots-table');
        const headers = Array.from(table.querySelectorAll('thead th')).map(
            (th) => th.textContent ?? '',
        );
        // Total column uses the primary currency; per-currency columns
        // follow with USD pinned to the front.
        expect(headers).toEqual(
            expect.arrayContaining(['Date', 'Total (USD)', 'USD', 'MXN', 'COP']),
        );
    });

    it('renders an em-dash for currencies missing from a row', () => {
        const snapshots = [
            buildSnapshot({
                id: 'partial',
                breakdown: { USD: 100 },
            }),
            buildSnapshot({
                id: 'full',
                snapshotDate: '2025-02-01',
                breakdown: { USD: 200, MXN: 4_000 },
            }),
        ];
        renderModal({ snapshots, primaryCurrency: 'USD' });

        // The MXN column exists; the `partial` row has no MXN value
        // and should show an em-dash (—).
        const partialRow = screen.getByTestId('snapshots-table-row-partial');
        expect(partialRow.textContent).toContain('—');
    });

    it('calls onEdit and closes when the per-row Edit button is clicked', async () => {
        const onClose = vi.fn();
        const onEdit = vi.fn();
        const target = buildSnapshot({ id: 'target' });
        renderModal({ snapshots: [target], onClose, onEdit });

        const user = userEvent.setup();
        await user.click(
            screen.getByLabelText(/edit snapshot for 2025-01-15/i),
        );

        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(onEdit).toHaveBeenCalledWith(target);
        // The modal closes itself before bubbling so the parent can
        // immediately open the edit modal without focus-trap conflicts.
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the Close action is clicked', async () => {
        const onClose = vi.fn();
        renderModal({ snapshots: [buildSnapshot()], onClose });

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /^close$/i }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('reports the snapshot count in the header', () => {
        renderModal({
            snapshots: [
                buildSnapshot({ id: 'a' }),
                buildSnapshot({ id: 'b', snapshotDate: '2025-02-01' }),
                buildSnapshot({ id: 'c', snapshotDate: '2025-03-01' }),
            ],
        });
        const body = screen.getByTestId('snapshots-table-modal-body');
        expect(body).toHaveTextContent(/3 snapshots/i);
    });
});
