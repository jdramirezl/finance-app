import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import NetWorthRangeControls from '../NetWorthRangeControls';

/**
 * Tests for {@link NetWorthRangeControls}. The component renders four
 * pill chips and an optional From/To popover for the `custom` preset.
 * These tests cover:
 *  - chip selection routes through onRangeChange with the expected args,
 *  - the active chip styling is driven by `activeRange`,
 *  - the Custom chip toggles a dialog popover with month inputs,
 *  - Apply forwards both selected months and closes the popover,
 *  - Apply is a no-op until both From and To are set,
 *  - clicking outside the popover closes it.
 */

describe('NetWorthRangeControls', () => {
    const onRangeChange = vi.fn();

    beforeEach(() => {
        onRangeChange.mockReset();
    });

    it('renders the four chips with the expected labels', () => {
        render(
            <NetWorthRangeControls
                activeRange="1y"
                onRangeChange={onRangeChange}
            />,
        );

        expect(screen.getByRole('button', { name: '1Y' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '2Y' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Custom' }),
        ).toBeInTheDocument();
    });

    it('marks only the active chip with aria-pressed=true', () => {
        render(
            <NetWorthRangeControls
                activeRange="2y"
                onRangeChange={onRangeChange}
            />,
        );

        expect(screen.getByRole('button', { name: '1Y' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
        expect(screen.getByRole('button', { name: '2Y' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
        expect(screen.getByRole('button', { name: 'Custom' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
    });

    it('calls onRangeChange with the selected preset for non-custom chips', async () => {
        const user = userEvent.setup();
        render(
            <NetWorthRangeControls
                activeRange="1y"
                onRangeChange={onRangeChange}
            />,
        );

        await user.click(screen.getByRole('button', { name: '2Y' }));
        expect(onRangeChange).toHaveBeenLastCalledWith('2y');

        await user.click(screen.getByRole('button', { name: 'All' }));
        expect(onRangeChange).toHaveBeenLastCalledWith('all');

        // Non-custom chips emit only the range argument, no custom dates.
        expect(onRangeChange.mock.calls[0]).toEqual(['2y']);
        expect(onRangeChange.mock.calls[1]).toEqual(['all']);
    });

    it('does not invoke onRangeChange immediately when Custom is clicked', async () => {
        const user = userEvent.setup();
        render(
            <NetWorthRangeControls
                activeRange="1y"
                onRangeChange={onRangeChange}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Custom' }));

        expect(onRangeChange).not.toHaveBeenCalled();
        expect(
            screen.getByRole('dialog', { name: /custom date range/i }),
        ).toBeInTheDocument();
    });

    it('toggles the popover on repeated Custom clicks', async () => {
        const user = userEvent.setup();
        render(
            <NetWorthRangeControls
                activeRange="1y"
                onRangeChange={onRangeChange}
            />,
        );

        const chip = screen.getByRole('button', { name: 'Custom' });

        await user.click(chip);
        expect(
            screen.getByRole('dialog', { name: /custom date range/i }),
        ).toBeInTheDocument();
        expect(chip).toHaveAttribute('aria-expanded', 'true');

        await user.click(chip);
        expect(
            screen.queryByRole('dialog', { name: /custom date range/i }),
        ).not.toBeInTheDocument();
        expect(chip).toHaveAttribute('aria-expanded', 'false');
    });

    it('disables Apply until both From and To are set', async () => {
        const user = userEvent.setup();
        render(
            <NetWorthRangeControls
                activeRange="1y"
                onRangeChange={onRangeChange}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Custom' }));

        const apply = screen.getByRole('button', { name: 'Apply' });
        expect(apply).toBeDisabled();

        // Use fireEvent.change so React's synthetic-event system picks
        // up the controlled-input value change (manual `.value =`
        // assignments don't propagate to React).
        const fromInput = screen.getByLabelText('From');
        fireEvent.change(fromInput, { target: { value: '2025-01' } });
        expect(apply).toBeDisabled();

        const toInput = screen.getByLabelText('To');
        fireEvent.change(toInput, { target: { value: '2025-06' } });
        expect(apply).not.toBeDisabled();
    });

    it('emits the custom range and closes the popover on Apply', async () => {
        const user = userEvent.setup();
        render(
            <NetWorthRangeControls
                activeRange="1y"
                onRangeChange={onRangeChange}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Custom' }));

        // fireEvent.change drives React's controlled-input update path
        // — userEvent.type doesn't reliably set `<input type="month">`
        // values in jsdom.
        fireEvent.change(screen.getByLabelText('From'), {
            target: { value: '2025-01' },
        });
        fireEvent.change(screen.getByLabelText('To'), {
            target: { value: '2025-06' },
        });

        await user.click(screen.getByRole('button', { name: 'Apply' }));

        expect(onRangeChange).toHaveBeenCalledTimes(1);
        expect(onRangeChange).toHaveBeenCalledWith(
            'custom',
            '2025-01',
            '2025-06',
        );
        expect(
            screen.queryByRole('dialog', { name: /custom date range/i }),
        ).not.toBeInTheDocument();
    });

    it('seeds the popover inputs from the initialCustomFrom / initialCustomTo props', async () => {
        const user = userEvent.setup();
        render(
            <NetWorthRangeControls
                activeRange="custom"
                onRangeChange={onRangeChange}
                initialCustomFrom="2024-06"
                initialCustomTo="2024-12"
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Custom' }));

        expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe(
            '2024-06',
        );
        expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe(
            '2024-12',
        );
    });

    it('closes the popover when the user clicks outside it', async () => {
        const user = userEvent.setup();
        render(
            <div>
                <NetWorthRangeControls
                    activeRange="1y"
                    onRangeChange={onRangeChange}
                />
                <button type="button" data-testid="outside">
                    outside
                </button>
            </div>,
        );

        await user.click(screen.getByRole('button', { name: 'Custom' }));
        expect(
            screen.getByRole('dialog', { name: /custom date range/i }),
        ).toBeInTheDocument();

        await user.click(screen.getByTestId('outside'));
        expect(
            screen.queryByRole('dialog', { name: /custom date range/i }),
        ).not.toBeInTheDocument();
    });

    it('closes the popover and emits the new range when a different chip is clicked', async () => {
        const user = userEvent.setup();
        render(
            <NetWorthRangeControls
                activeRange="1y"
                onRangeChange={onRangeChange}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Custom' }));
        expect(
            screen.getByRole('dialog', { name: /custom date range/i }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'All' }));

        expect(onRangeChange).toHaveBeenCalledWith('all');
        expect(
            screen.queryByRole('dialog', { name: /custom date range/i }),
        ).not.toBeInTheDocument();
    });
});
