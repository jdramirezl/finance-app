import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import CDAccountCard from '../CDAccountCard';
import type { CDInvestmentAccount } from '../../../types';

// SelectableValue depends on SelectionProvider, which is irrelevant to the
// CDAccountCard surface. Mirror the AccountCard test by replacing it with
// a passthrough that renders its children.
vi.mock('../../ui/SelectableValue', () => ({
    default: ({ children }: { children?: React.ReactNode }) => (
        <span data-testid="selectable-value">{children}</span>
    ),
}));

// CD calculations and currency formatting are exercised elsewhere; stub
// them so this test focuses on the action-button surface introduced by
// the archive/permanent-delete redesign.
vi.mock('../../../services/cdCalculationService', () => ({
    cdCalculationService: {
        calculateCurrentValue: () => ({
            currentValue: 1000,
            accruedInterest: 0,
            totalInterest: 0,
            daysToMaturity: 100,
            isMatured: false,
            effectiveYield: 0,
            withholdingTax: 0,
            netInterest: 0,
            netCurrentValue: 1000,
        }),
        isNearMaturity: () => false,
    },
}));

vi.mock('../../../services/currencyService', () => ({
    currencyService: {
        formatCurrency: (n: number) => `$${n}`,
    },
}));

const baseCD: CDInvestmentAccount = {
    id: 'cd1',
    name: 'My CD',
    color: '#F59E0B',
    currency: 'USD',
    balance: 0,
    type: 'cd',
    investmentType: 'cd',
    principal: 1000,
    interestRate: 4.5,
    termMonths: 12,
    maturityDate: '2025-01-01T00:00:00.000Z',
    compoundingFrequency: 'monthly',
};

const defaultProps = {
    account: baseCD,
    isSelected: false,
    onSelect: vi.fn(),
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onDeletePermanent: vi.fn(),
};

describe('CDAccountCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the CD name and Certificate of Deposit badge', () => {
        render(<CDAccountCard {...defaultProps} />);

        expect(screen.getByText('My CD')).toBeInTheDocument();
        expect(screen.getByText(/certificate of deposit/i)).toBeInTheDocument();
    });

    it('calls onArchive with the account id when the Archive button is clicked', async () => {
        const user = userEvent.setup();
        const onArchive = vi.fn();
        render(<CDAccountCard {...defaultProps} onArchive={onArchive} />);

        await user.click(screen.getByRole('button', { name: /^archive$/i }));

        expect(onArchive).toHaveBeenCalledTimes(1);
        expect(onArchive).toHaveBeenCalledWith('cd1');
    });

    it('calls onDeletePermanent with the account id when Delete Permanently is clicked', async () => {
        const user = userEvent.setup();
        const onDeletePermanent = vi.fn();
        render(
            <CDAccountCard {...defaultProps} onDeletePermanent={onDeletePermanent} />,
        );

        await user.click(screen.getByRole('button', { name: /delete permanently/i }));

        expect(onDeletePermanent).toHaveBeenCalledTimes(1);
        expect(onDeletePermanent).toHaveBeenCalledWith('cd1');
    });

    it('shows the loading state on the archive button when isArchiving is true', () => {
        render(<CDAccountCard {...defaultProps} isArchiving />);

        expect(screen.getByRole('button', { name: /^archive$/i })).toBeDisabled();
    });

    it('shows the loading state on the delete button when isDeleting is true', () => {
        render(<CDAccountCard {...defaultProps} isDeleting />);

        expect(
            screen.getByRole('button', { name: /delete permanently/i }),
        ).toBeDisabled();
    });

    it('does not propagate clicks on the action buttons up to the card', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        const onArchive = vi.fn();
        render(
            <CDAccountCard {...defaultProps} onSelect={onSelect} onArchive={onArchive} />,
        );

        await user.click(screen.getByRole('button', { name: /^archive$/i }));

        expect(onArchive).toHaveBeenCalledTimes(1);
        expect(onSelect).not.toHaveBeenCalled();
    });
});
