import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import QuickCalculator from '../QuickCalculator';
import {
  SelectionProvider,
  useSelection,
} from '../../../contexts/SelectionContext';

const renderWithSelection = (ui: ReactNode) =>
  render(<SelectionProvider>{ui}</SelectionProvider>);

/**
 * Test helper that exposes selection mutation buttons inside the same
 * SelectionProvider tree as QuickCalculator. Used to push values into
 * the context and verify the calculator picks them up via useEffect.
 */
const SelectionTrigger = ({
  values,
}: {
  values: Array<{ id: string; value: number }>;
}) => {
  const { toggleSelection } = useSelection();
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
    </div>
  );
};

describe('QuickCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both operand inputs, the operator toggle and the result display', () => {
    renderWithSelection(
      <QuickCalculator
        selectedPocketBalance={null}
        onUseAmount={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/first operand/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/second operand/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/switch to addition/i)).toBeInTheDocument();
    // Result starts at the placeholder value
    expect(screen.getByText('0.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('renders the helper instruction', () => {
    renderWithSelection(
      <QuickCalculator
        selectedPocketBalance={null}
        onUseAmount={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/click a field, then click a balance to fill it/i),
    ).toBeInTheDocument();
  });

  it('does not render the Use button until both operands produce a result', () => {
    renderWithSelection(
      <QuickCalculator
        selectedPocketBalance={null}
        onUseAmount={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /use .* as amount/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /result must be positive/i })).not.toBeInTheDocument();
  });

  it('subtracts the second operand from the first by default', async () => {
    const user = userEvent.setup();
    renderWithSelection(
      <QuickCalculator
        selectedPocketBalance={null}
        onUseAmount={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/first operand/i), '100');
    await user.type(screen.getByLabelText(/second operand/i), '40');

    expect(screen.getByText('60.00')).toBeInTheDocument();
  });

  it('adds the operands when the operator is toggled to addition', async () => {
    const user = userEvent.setup();
    renderWithSelection(
      <QuickCalculator
        selectedPocketBalance={null}
        onUseAmount={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText(/switch to addition/i));
    await user.type(screen.getByLabelText(/first operand/i), '10');
    await user.type(screen.getByLabelText(/second operand/i), '5');

    expect(screen.getByText('15.00')).toBeInTheDocument();
    // After toggling, the toggle button now offers to switch back
    expect(screen.getByLabelText(/switch to subtraction/i)).toBeInTheDocument();
  });

  it('disables the Use button when the result is negative', async () => {
    const user = userEvent.setup();
    const onUseAmount = vi.fn();

    renderWithSelection(
      <QuickCalculator
        selectedPocketBalance={null}
        onUseAmount={onUseAmount}
      />,
    );

    await user.type(screen.getByLabelText(/first operand/i), '10');
    await user.type(screen.getByLabelText(/second operand/i), '50');

    const button = screen.getByRole('button', {
      name: /result must be positive/i,
    });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onUseAmount).not.toHaveBeenCalled();
  });

  it('calls onUseAmount with the rounded result when the Use button is clicked', async () => {
    const user = userEvent.setup();
    const onUseAmount = vi.fn();

    renderWithSelection(
      <QuickCalculator
        selectedPocketBalance={null}
        onUseAmount={onUseAmount}
      />,
    );

    await user.type(screen.getByLabelText(/first operand/i), '50.5');
    await user.type(screen.getByLabelText(/second operand/i), '0.5');

    const useButton = screen.getByRole('button', {
      name: /use 50\.00 as amount/i,
    });
    expect(useButton).toBeEnabled();

    await user.click(useButton);

    expect(onUseAmount).toHaveBeenCalledTimes(1);
    expect(onUseAmount).toHaveBeenCalledWith(50);
  });

  it('clears both operands and the result when Clear is clicked', async () => {
    const user = userEvent.setup();
    renderWithSelection(
      <QuickCalculator
        selectedPocketBalance={null}
        onUseAmount={vi.fn()}
      />,
    );

    const operand1 = screen.getByLabelText(/first operand/i);
    const operand2 = screen.getByLabelText(/second operand/i);

    await user.type(operand1, '10');
    await user.type(operand2, '5');
    expect(screen.getByText('5.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(operand1).toHaveValue(null);
    expect(operand2).toHaveValue(null);
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });

  it('populates the active field with the first selected value from SelectionContext', async () => {
    const user = userEvent.setup();
    renderWithSelection(
      <>
        <QuickCalculator
          selectedPocketBalance={null}
          onUseAmount={vi.fn()}
        />
        <SelectionTrigger values={[{ id: 'bal1', value: 250 }]} />
      </>,
    );

    // 1) Focus the second operand to mark it as active
    await user.click(screen.getByLabelText(/second operand/i));
    // 2) Push a value into the SelectionContext — the calculator's effect
    //    should pick it up and write it into the active field
    await user.click(screen.getByRole('button', { name: /select-bal1/i }));

    expect(screen.getByLabelText(/second operand/i)).toHaveValue(250);
  });

  it('routes selected values to operand1 when operand1 is the active field', async () => {
    const user = userEvent.setup();
    renderWithSelection(
      <>
        <QuickCalculator
          selectedPocketBalance={null}
          onUseAmount={vi.fn()}
        />
        <SelectionTrigger values={[{ id: 'bal1', value: 42 }]} />
      </>,
    );

    await user.click(screen.getByLabelText(/first operand/i));
    await user.click(screen.getByRole('button', { name: /select-bal1/i }));

    expect(screen.getByLabelText(/first operand/i)).toHaveValue(42);
  });

  it('ignores selections when no operand is the active field', async () => {
    const user = userEvent.setup();
    renderWithSelection(
      <>
        <QuickCalculator
          selectedPocketBalance={null}
          onUseAmount={vi.fn()}
        />
        <SelectionTrigger values={[{ id: 'bal1', value: 99 }]} />
      </>,
    );

    // Click the helper to push a value WITHOUT focusing an operand first
    await user.click(screen.getByRole('button', { name: /select-bal1/i }));

    expect(screen.getByLabelText(/first operand/i)).toHaveValue(null);
    expect(screen.getByLabelText(/second operand/i)).toHaveValue(null);
  });
});
