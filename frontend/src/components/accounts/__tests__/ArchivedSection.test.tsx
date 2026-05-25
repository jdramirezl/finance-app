import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import ArchivedSection from '../ArchivedSection';
import type { Account, Pocket } from '../../../types';

const archivedAccount = (overrides: Partial<Account> = {}): Account => ({
    id: 'arc1',
    name: 'Old Checking',
    color: '#FF0000',
    currency: 'USD',
    balance: 0,
    type: 'normal',
    archivedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
});

const activeAccount = (overrides: Partial<Account> = {}): Account => ({
    id: 'acc-active',
    name: 'Nubank MXN',
    color: '#FF1493',
    currency: 'MXN',
    balance: 0,
    type: 'normal',
    ...overrides,
});

const archivedPocket = (overrides: Partial<Pocket> = {}): Pocket => ({
    id: 'pkt1',
    accountId: 'acc-active',
    name: 'Fijos',
    type: 'normal',
    balance: 0,
    currency: 'MXN',
    archivedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
});

const defaultProps = {
    accounts: [archivedAccount()],
    onRestore: vi.fn(),
    onDeletePermanent: vi.fn(),
};

describe('ArchivedSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when there are no archived accounts', () => {
        const { container } = render(
            <ArchivedSection {...defaultProps} accounts={[]} />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders a collapsed header with the archived count', () => {
        render(
            <ArchivedSection
                {...defaultProps}
                accounts={[
                    archivedAccount({ id: 'a1' }),
                    archivedAccount({ id: 'a2', name: 'Other' }),
                ]}
            />,
        );

        const toggle = screen.getByRole('button', { name: /^archived \(2\)$/i });
        expect(toggle).toBeInTheDocument();
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        // List is hidden until expanded.
        expect(screen.queryByRole('list', { name: /archived accounts/i })).not.toBeInTheDocument();
    });

    it('expands the list when the header is clicked', async () => {
        const user = userEvent.setup();
        render(<ArchivedSection {...defaultProps} />);

        await user.click(screen.getByRole('button', { name: /archived/i }));

        expect(screen.getByRole('list', { name: /archived accounts/i })).toBeInTheDocument();
        expect(screen.getByText('Old Checking')).toBeInTheDocument();
        expect(screen.getByText('USD')).toBeInTheDocument();
    });

    it('calls onRestore with the account id when Restore is clicked', async () => {
        const user = userEvent.setup();
        const onRestore = vi.fn();
        render(<ArchivedSection {...defaultProps} onRestore={onRestore} />);

        await user.click(screen.getByRole('button', { name: /^archived/i }));
        await user.click(screen.getByRole('button', { name: /restore old checking/i }));

        expect(onRestore).toHaveBeenCalledTimes(1);
        expect(onRestore).toHaveBeenCalledWith('arc1');
    });

    it('calls onDeletePermanent with the account id when Delete is clicked', async () => {
        const user = userEvent.setup();
        const onDeletePermanent = vi.fn();
        render(
            <ArchivedSection {...defaultProps} onDeletePermanent={onDeletePermanent} />,
        );

        await user.click(screen.getByRole('button', { name: /^archived/i }));
        await user.click(
            screen.getByRole('button', { name: /permanently delete old checking/i }),
        );

        expect(onDeletePermanent).toHaveBeenCalledTimes(1);
        expect(onDeletePermanent).toHaveBeenCalledWith('arc1');
    });

    it('disables the restore button while a restore is in flight for that row', async () => {
        const user = userEvent.setup();
        render(<ArchivedSection {...defaultProps} restoringId="arc1" />);

        await user.click(screen.getByRole('button', { name: /^archived/i }));

        // The row whose id is in flight has its restore disabled, and we
        // also disable delete on that row to prevent a queued double-action.
        expect(
            screen.getByRole('button', { name: /restore old checking/i }),
        ).toBeDisabled();
        expect(
            screen.getByRole('button', {
                name: /permanently delete old checking/i,
            }),
        ).toBeDisabled();
    });

    it('does not disable rows other than the one being restored', async () => {
        const user = userEvent.setup();
        render(
            <ArchivedSection
                {...defaultProps}
                accounts={[
                    archivedAccount({ id: 'arc1' }),
                    archivedAccount({ id: 'arc2', name: 'Other' }),
                ]}
                restoringId="arc1"
            />,
        );

        await user.click(screen.getByRole('button', { name: /^archived/i }));

        // The other row's buttons remain enabled — global flags would have
        // disabled them too, which is the regression this guards against.
        expect(
            screen.getByRole('button', { name: /restore other/i }),
        ).toBeEnabled();
        expect(
            screen.getByRole('button', { name: /permanently delete other/i }),
        ).toBeEnabled();
    });

    it('disables the delete button while a permanent delete is in flight for that row', async () => {
        const user = userEvent.setup();
        render(<ArchivedSection {...defaultProps} deletingId="arc1" />);

        await user.click(screen.getByRole('button', { name: /^archived/i }));

        expect(
            screen.getByRole('button', {
                name: /permanently delete old checking/i,
            }),
        ).toBeDisabled();
    });

    it('renders the color swatch with the account color', async () => {
        const user = userEvent.setup();
        const { container } = render(<ArchivedSection {...defaultProps} />);

        await user.click(screen.getByRole('button', { name: /^archived/i }));

        const swatch = container.querySelector(
            'div.rounded-full[style*="background-color"]',
        ) as HTMLElement | null;
        expect(swatch).not.toBeNull();
        expect(swatch?.style.backgroundColor).toBeTruthy();
    });

    describe('archived pockets', () => {
        it('includes archived pockets in the header count', () => {
            render(
                <ArchivedSection
                    {...defaultProps}
                    accounts={[archivedAccount()]}
                    archivedPockets={[archivedPocket(), archivedPocket({ id: 'pkt2', name: 'Viajes' })]}
                    accountsForPocketLookup={[activeAccount()]}
                />,
            );

            // 1 archived account + 2 archived pockets = 3 items in the disclosure header.
            expect(
                screen.getByRole('button', { name: /^archived \(3\)$/i }),
            ).toBeInTheDocument();
        });

        it('renders the section even when there are no archived accounts but archived pockets exist', () => {
            // The section should appear whenever any archived item exists —
            // this guards the empty-state regression where pockets-only
            // archives would have been silently hidden.
            const { container } = render(
                <ArchivedSection
                    {...defaultProps}
                    accounts={[]}
                    archivedPockets={[archivedPocket()]}
                    accountsForPocketLookup={[activeAccount()]}
                />,
            );

            expect(container.firstChild).not.toBeNull();
            expect(
                screen.getByRole('button', { name: /^archived \(1\)$/i }),
            ).toBeInTheDocument();
        });

        it('renders archived pockets with "Account › Pocket" label when expanded', async () => {
            const user = userEvent.setup();
            render(
                <ArchivedSection
                    {...defaultProps}
                    accounts={[]}
                    archivedPockets={[archivedPocket()]}
                    accountsForPocketLookup={[activeAccount()]}
                />,
            );

            await user.click(screen.getByRole('button', { name: /^archived/i }));

            // Both halves of the breadcrumb appear next to each other in the
            // pocket row, separated by the "›" separator.
            const pocketsList = screen.getByRole('list', { name: /archived pockets/i });
            expect(pocketsList).toBeInTheDocument();
            expect(pocketsList).toHaveTextContent(/Nubank MXN/);
            expect(pocketsList).toHaveTextContent(/›/);
            expect(pocketsList).toHaveTextContent(/Fijos/);
        });

        it('falls back to just the pocket name when the parent account is not in the lookup', async () => {
            const user = userEvent.setup();
            render(
                <ArchivedSection
                    {...defaultProps}
                    accounts={[]}
                    archivedPockets={[archivedPocket({ accountId: 'unknown-acc' })]}
                    accountsForPocketLookup={[]}
                />,
            );

            await user.click(screen.getByRole('button', { name: /^archived/i }));

            const pocketsList = screen.getByRole('list', { name: /archived pockets/i });
            expect(pocketsList).toHaveTextContent(/Fijos/);
            expect(pocketsList).not.toHaveTextContent(/›/);
        });

        it('calls onRestorePocket with the pocket id when Restore is clicked', async () => {
            const user = userEvent.setup();
            const onRestorePocket = vi.fn();
            render(
                <ArchivedSection
                    {...defaultProps}
                    accounts={[]}
                    archivedPockets={[archivedPocket()]}
                    accountsForPocketLookup={[activeAccount()]}
                    onRestorePocket={onRestorePocket}
                />,
            );

            await user.click(screen.getByRole('button', { name: /^archived/i }));
            await user.click(
                screen.getByRole('button', { name: /restore fijos \(in nubank mxn\)/i }),
            );

            expect(onRestorePocket).toHaveBeenCalledTimes(1);
            expect(onRestorePocket).toHaveBeenCalledWith('pkt1');
        });

        it('calls onDeletePocket with the pocket id when Delete is clicked', async () => {
            const user = userEvent.setup();
            const onDeletePocket = vi.fn();
            render(
                <ArchivedSection
                    {...defaultProps}
                    accounts={[]}
                    archivedPockets={[archivedPocket()]}
                    accountsForPocketLookup={[activeAccount()]}
                    onDeletePocket={onDeletePocket}
                />,
            );

            await user.click(screen.getByRole('button', { name: /^archived/i }));
            await user.click(
                screen.getByRole('button', { name: /permanently delete fijos \(in nubank mxn\)/i }),
            );

            expect(onDeletePocket).toHaveBeenCalledTimes(1);
            expect(onDeletePocket).toHaveBeenCalledWith('pkt1');
        });

        it('disables both buttons on the pocket row currently being restored', async () => {
            const user = userEvent.setup();
            render(
                <ArchivedSection
                    {...defaultProps}
                    accounts={[]}
                    archivedPockets={[
                        archivedPocket({ id: 'pkt1' }),
                        archivedPocket({ id: 'pkt2', name: 'Viajes' }),
                    ]}
                    accountsForPocketLookup={[activeAccount()]}
                    onRestorePocket={vi.fn()}
                    onDeletePocket={vi.fn()}
                    restoringPocketId="pkt1"
                />,
            );

            await user.click(screen.getByRole('button', { name: /^archived/i }));

            // The row whose id is in flight has both buttons disabled — same
            // per-row pattern as the accounts list above guards against.
            expect(
                screen.getByRole('button', { name: /restore fijos \(in nubank mxn\)/i }),
            ).toBeDisabled();
            expect(
                screen.getByRole('button', { name: /permanently delete fijos \(in nubank mxn\)/i }),
            ).toBeDisabled();
            // The other pocket row remains interactive.
            expect(
                screen.getByRole('button', { name: /restore viajes \(in nubank mxn\)/i }),
            ).toBeEnabled();
        });

        it('disables both buttons on the pocket row currently being deleted', async () => {
            const user = userEvent.setup();
            render(
                <ArchivedSection
                    {...defaultProps}
                    accounts={[]}
                    archivedPockets={[archivedPocket()]}
                    accountsForPocketLookup={[activeAccount()]}
                    onRestorePocket={vi.fn()}
                    onDeletePocket={vi.fn()}
                    deletingPocketId="pkt1"
                />,
            );

            await user.click(screen.getByRole('button', { name: /^archived/i }));

            expect(
                screen.getByRole('button', { name: /permanently delete fijos \(in nubank mxn\)/i }),
            ).toBeDisabled();
            expect(
                screen.getByRole('button', { name: /restore fijos \(in nubank mxn\)/i }),
            ).toBeDisabled();
        });

        it('renders both archived accounts and archived pockets when both are present', async () => {
            const user = userEvent.setup();
            render(
                <ArchivedSection
                    {...defaultProps}
                    accounts={[archivedAccount()]}
                    archivedPockets={[archivedPocket()]}
                    accountsForPocketLookup={[activeAccount()]}
                    onRestorePocket={vi.fn()}
                    onDeletePocket={vi.fn()}
                />,
            );

            await user.click(screen.getByRole('button', { name: /^archived/i }));

            expect(
                screen.getByRole('list', { name: /archived accounts/i }),
            ).toBeInTheDocument();
            expect(
                screen.getByRole('list', { name: /archived pockets/i }),
            ).toBeInTheDocument();
        });
    });
});
