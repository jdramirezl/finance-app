import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import FloatingStatsBar from '../FloatingStatsBar';
import {
  SelectionProvider,
  useSelection,
} from '../../../contexts/SelectionContext';

vi.mock('../../../services/currencyService', () => ({
  currencyService: {
    formatCurrency: vi.fn(
      (amount: number, currency: string) => `${currency} ${amount.toFixed(2)}`,
    ),
  },
}));

const renderWithSelection = (ui: ReactNode) =>
  render(<SelectionProvider>{ui}</SelectionProvider>);

/**
 * Helper that exposes selection mutation buttons inside the same
 * SelectionProvider tree as FloatingStatsBar so tests can push values
 * into the context and verify the bar reacts.
 */
const SelectionTrigger = ({
  values,
}: {
  values: Array<{ id: string; value: number }>;
}) => {
  const { toggleSelection, clearSelection } = useSelection();
  return (
    <div>
      {values.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => toggleSelection(v.id, v.value)}
        >
          select-{v.id}
        </button>
      ))}
      <button type="button" onClick={clearSelection}>
        external-clear
      </button>
    </div>
  );
};

describe('FloatingStatsBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no items are selected', () => {
    renderWithSelection(<FloatingStatsBar />);

    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sum/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/average/i)).not.toBeInTheDocument();
  });

  it('renders count, sum, and average once at least one item is selected', async () => {
    const user = userEvent.setup();

    renderWithSelection(
      <>
        <SelectionTrigger
          values={[
            { id: 'a', value: 100 },
            { id: 'b', value: 50 },
          ]}
        />
        <FloatingStatsBar primaryCurrency="USD" />
      </>,
    );

    // Bar is hidden initially
    expect(screen.queryByText('Selected')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'select-a' }));
    await user.click(screen.getByRole('button', { name: 'select-b' }));

    // Labels render (uppercase via CSS but text content is title-case)
    expect(screen.getByText('Selected')).toBeInTheDocument();
    expect(screen.getByText('Sum')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();

    // Count, sum, average values
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('USD 150.00')).toBeInTheDocument();
    expect(screen.getByText('USD 75.00')).toBeInTheDocument();
  });

  it('uses the provided primary currency when formatting amounts', async () => {
    const user = userEvent.setup();

    renderWithSelection(
      <>
        <SelectionTrigger values={[{ id: 'a', value: 200 }]} />
        <FloatingStatsBar primaryCurrency="MXN" />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'select-a' }));

    // With a single selection, sum and average are equal — both render with MXN
    expect(screen.getAllByText('MXN 200.00').length).toBe(2);
  });

  it('defaults to USD when no primaryCurrency prop is provided', async () => {
    const user = userEvent.setup();

    renderWithSelection(
      <>
        <SelectionTrigger values={[{ id: 'a', value: 10 }]} />
        <FloatingStatsBar />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'select-a' }));

    // Sum and average both formatted with the default USD currency
    expect(screen.getAllByText('USD 10.00').length).toBeGreaterThanOrEqual(2);
  });

  it('clears the selection when the clear button is clicked', async () => {
    const user = userEvent.setup();

    renderWithSelection(
      <>
        <SelectionTrigger values={[{ id: 'a', value: 25 }]} />
        <FloatingStatsBar />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'select-a' }));
    expect(screen.getByText('Selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear selection/i }));

    expect(screen.queryByText('Selected')).not.toBeInTheDocument();
  });

  it('hides the bar after every selected item is unselected', async () => {
    const user = userEvent.setup();

    renderWithSelection(
      <>
        <SelectionTrigger values={[{ id: 'a', value: 5 }]} />
        <FloatingStatsBar />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'select-a' }));
    expect(screen.getByText('Selected')).toBeInTheDocument();

    // Toggling the same id again removes it from the selection map
    await user.click(screen.getByRole('button', { name: 'select-a' }));
    expect(screen.queryByText('Selected')).not.toBeInTheDocument();
  });

  it('computes the average from arbitrary selected values', async () => {
    const user = userEvent.setup();

    renderWithSelection(
      <>
        <SelectionTrigger
          values={[
            { id: 'a', value: 30 },
            { id: 'b', value: 60 },
            { id: 'c', value: 90 },
          ]}
        />
        <FloatingStatsBar primaryCurrency="USD" />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'select-a' }));
    await user.click(screen.getByRole('button', { name: 'select-b' }));
    await user.click(screen.getByRole('button', { name: 'select-c' }));

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('USD 180.00')).toBeInTheDocument();
    expect(screen.getByText('USD 60.00')).toBeInTheDocument();
  });

  it('exposes the clear button with an accessible label', async () => {
    const user = userEvent.setup();

    renderWithSelection(
      <>
        <SelectionTrigger values={[{ id: 'a', value: 1 }]} />
        <FloatingStatsBar />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'select-a' }));

    const clearButton = screen.getByRole('button', { name: /clear selection/i });
    expect(clearButton).toHaveAttribute('aria-label', 'Clear selection');
    expect(clearButton).toHaveAttribute('title', 'Clear selection');
  });
});
