import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRef, useEffect } from 'react';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import SnapshotDetailsModal, {
    type SnapshotDetailsModalHandle,
} from '../SnapshotDetailsModal';
import type { NetWorthSnapshot } from '../../../services/netWorthSnapshotService';

/**
 * Tests for {@link SnapshotDetailsModal}. The modal exposes an
 * imperative `open(snapshot, previous)` handle, so each test renders
 * a thin wrapper that captures the ref and calls `open()` during
 * mount. This is the same pattern `NetWorthTimelineWidget` uses in
 * production.
 */

interface WrapperProps {
    snapshot: NetWorthSnapshot;
    previous: NetWorthSnapshot | null;
    onEdit?: (s: NetWorthSnapshot) => void;
    primaryCurrency?: string;
    autoOpen?: boolean;
}

const Wrapper = ({
    snapshot,
    previous,
    onEdit = vi.fn(),
    primaryCurrency = 'USD',
    autoOpen = true,
}: WrapperProps) => {
    const ref = useRef<SnapshotDetailsModalHandle>(null);
    useEffect(() => {
        if (autoOpen) ref.current?.open(snapshot, previous);
    }, [snapshot, previous, autoOpen]);
    return (
        <SnapshotDetailsModal
            ref={ref}
            onEdit={onEdit}
            primaryCurrency={primaryCurrency}
        />
    );
};

const buildSnapshot = (
    overrides: Partial<NetWorthSnapshot> = {},
): NetWorthSnapshot => ({
    id: 's1',
    userId: 'u1',
    snapshotDate: '2026-01-15',
    totalNetWorth: 250_000,
    baseCurrency: 'USD',
    breakdown: { USD: 30_000, MXN: 1_800_000, COP: 65_000_000 },
    createdAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
});

describe('SnapshotDetailsModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the snapshot total and per-currency breakdown in the modal body', () => {
        render(<Wrapper snapshot={buildSnapshot()} previous={null} />);

        const body = screen.getByTestId('snapshot-details-modal-body');
        // Every currency in the breakdown shows up as a row.
        expect(body).toHaveTextContent('USD');
        expect(body).toHaveTextContent('MXN');
        expect(body).toHaveTextContent('COP');
        const breakdownTable = screen.getByTestId('snapshot-details-breakdown');
        const rows = breakdownTable.querySelectorAll('tr');
        expect(rows.length).toBe(3);
    });

    it('shows the formatted date in the modal title', () => {
        render(<Wrapper snapshot={buildSnapshot({ snapshotDate: '2026-01-15' })} previous={null} />);

        // Modal title is rendered by the shared Modal component — we
        // assert the formatted date is present somewhere accessible.
        expect(screen.getByText(/Jan 15, 2026/)).toBeInTheDocument();
    });

    it('omits the delta row when there is no previous snapshot', () => {
        render(<Wrapper snapshot={buildSnapshot()} previous={null} />);
        expect(screen.queryByTestId('snapshot-details-delta')).not.toBeInTheDocument();
    });

    it('renders a positive delta in green when total grew vs previous', () => {
        const previous = buildSnapshot({
            id: 'prev',
            snapshotDate: '2025-12-15',
            totalNetWorth: 200_000,
        });
        render(<Wrapper snapshot={buildSnapshot()} previous={previous} />);

        const delta = screen.getByTestId('snapshot-details-delta');
        expect(delta.className).toMatch(/text-emerald/);
        // +25.0% ((250k - 200k) / 200k)
        expect(delta).toHaveTextContent('+25.0%');
    });

    it('renders a negative delta in rose when total shrank vs previous', () => {
        const previous = buildSnapshot({
            id: 'prev',
            snapshotDate: '2025-12-15',
            totalNetWorth: 400_000,
        });
        render(<Wrapper snapshot={buildSnapshot()} previous={previous} />);

        const delta = screen.getByTestId('snapshot-details-delta');
        expect(delta.className).toMatch(/text-rose/);
        // (250k - 400k) / 400k = -37.5%
        expect(delta).toHaveTextContent('−37.5%');
    });

    it('calls onEdit with the current snapshot when the Edit button is clicked', async () => {
        const onEdit = vi.fn();
        const snapshot = buildSnapshot();
        render(<Wrapper snapshot={snapshot} previous={null} onEdit={onEdit} />);

        const user = userEvent.setup();
        await user.click(screen.getByTestId('snapshot-details-edit'));

        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(onEdit).toHaveBeenCalledWith(snapshot);
    });

    it('closes the modal before calling onEdit so the focus trap releases', async () => {
        // Manual capture: track whether the modal body is still in the
        // DOM at the moment onEdit fires. The handler should run AFTER
        // setIsOpen(false), so the body should be gone.
        let bodyVisibleAtEditMoment: boolean | null = null;
        const onEdit = vi.fn(() => {
            bodyVisibleAtEditMoment =
                screen.queryByTestId('snapshot-details-modal-body') !== null;
        });

        render(<Wrapper snapshot={buildSnapshot()} previous={null} onEdit={onEdit} />);

        const user = userEvent.setup();
        await user.click(screen.getByTestId('snapshot-details-edit'));

        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(bodyVisibleAtEditMoment).toBe(false);
    });

    it('handles a snapshot with an empty breakdown by surfacing a graceful message', () => {
        const snapshot = buildSnapshot({ breakdown: {} });
        render(<Wrapper snapshot={snapshot} previous={null} />);

        expect(
            screen.getByText(/no per-currency breakdown stored/i),
        ).toBeInTheDocument();
        // No breakdown table is rendered.
        expect(screen.queryByTestId('snapshot-details-breakdown')).not.toBeInTheDocument();
    });

    it('sorts breakdown rows alphabetically by currency code', () => {
        const snapshot = buildSnapshot({
            breakdown: { MXN: 1_000_000, COP: 50_000_000, USD: 30_000 },
        });
        render(<Wrapper snapshot={snapshot} previous={null} />);

        const table = screen.getByTestId('snapshot-details-breakdown');
        const codes = Array.from(table.querySelectorAll('tr')).map(
            (tr) => tr.querySelector('td')?.textContent?.trim() ?? '',
        );
        expect(codes).toEqual(['COP', 'MXN', 'USD']);
    });
});
