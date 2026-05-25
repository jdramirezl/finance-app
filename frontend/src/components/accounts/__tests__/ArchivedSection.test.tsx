import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import ArchivedSection from '../ArchivedSection';
import type { Account } from '../../../types';

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
});
