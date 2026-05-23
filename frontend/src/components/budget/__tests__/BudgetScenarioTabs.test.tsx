import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import BudgetScenarioTabs from '../BudgetScenarioTabs';
import type { PlanningScenario } from '../ScenarioForm';
import type { SubPocket } from '../../../types';

const makeSubPocket = (overrides: Partial<SubPocket>): SubPocket => ({
  id: 'sp-default',
  pocketId: 'pocket-fixed',
  name: 'Default Expense',
  valueTotal: 1200,
  periodicityMonths: 12,
  balance: 0,
  ...overrides,
});

const mockScenarios: PlanningScenario[] = [
  { id: 's1', name: 'Vacation', expenseIds: ['exp-1', 'exp-2'] },
  { id: 's2', name: 'Tight Budget', expenseIds: ['exp-3'] },
];

// 1200 / 12 = 100 per month, two enabled expenses → 200/mo for s1.
// Single 600/12 = 50/mo for s2.
const mockSubPockets: SubPocket[] = [
  makeSubPocket({ id: 'exp-1', valueTotal: 1200, periodicityMonths: 12 }),
  makeSubPocket({ id: 'exp-2', valueTotal: 1200, periodicityMonths: 12 }),
  makeSubPocket({ id: 'exp-3', valueTotal: 600, periodicityMonths: 12 }),
];

const defaultProps = {
  scenarios: [] as PlanningScenario[],
  activeIds: [] as string[],
  onToggle: vi.fn(),
  onCreate: vi.fn(),
};

describe('BudgetScenarioTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with no scenarios', () => {
    it('renders the empty-state hint instead of fake default tabs', () => {
      render(<BudgetScenarioTabs {...defaultProps} />);

      expect(
        screen.getByText('Create your first scenario'),
      ).toBeInTheDocument();
      // No fake default tabs should leak through.
      expect(
        screen.queryByRole('button', { name: 'Normal Month' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Holiday' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Crisis Mode' }),
      ).not.toBeInTheDocument();
    });

    it('renders the add scenario button and calls onCreate when clicked', async () => {
      const onCreate = vi.fn();
      const user = userEvent.setup();
      render(<BudgetScenarioTabs {...defaultProps} onCreate={onCreate} />);

      await user.click(screen.getByRole('button', { name: 'Add scenario' }));

      expect(onCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('with scenarios', () => {
    it('renders one tab per scenario', () => {
      render(
        <BudgetScenarioTabs
          {...defaultProps}
          scenarios={mockScenarios}
          fixedSubPockets={mockSubPockets}
        />,
      );

      expect(screen.getByText('Vacation')).toBeInTheDocument();
      expect(screen.getByText('Tight Budget')).toBeInTheDocument();
    });

    it('calls onToggle with the scenario id when a tab is clicked', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();
      render(
        <BudgetScenarioTabs
          {...defaultProps}
          scenarios={mockScenarios}
          fixedSubPockets={mockSubPockets}
          onToggle={onToggle}
        />,
      );

      await user.click(screen.getByText('Vacation'));

      expect(onToggle).toHaveBeenCalledWith('s1');
    });

    it('shows the monthly total as the sum of all scenario expenses', () => {
      render(
        <BudgetScenarioTabs
          {...defaultProps}
          scenarios={mockScenarios}
          fixedSubPockets={mockSubPockets}
        />,
      );

      // Vacation: exp-1 (100/mo) + exp-2 (100/mo) = $200/mo
      expect(screen.getByText('$200/mo')).toBeInTheDocument();
      // Tight Budget: exp-3 (50/mo) = $50/mo
      expect(screen.getByText('$50/mo')).toBeInTheDocument();
    });

    it('includes disabled expenses in the monthly total preview', () => {
      // The scenario preview is "what would this cost if I enabled it",
      // so a currently-disabled sub-pocket still contributes to the total
      // when it's listed in the scenario.
      const disabledSubPockets: SubPocket[] = [
        makeSubPocket({ id: 'exp-1', valueTotal: 1200, periodicityMonths: 12 }),
        makeSubPocket({
          id: 'exp-2',
          valueTotal: 1200,
          periodicityMonths: 12,
        }),
        makeSubPocket({ id: 'exp-3', valueTotal: 600, periodicityMonths: 12 }),
      ];

      render(
        <BudgetScenarioTabs
          {...defaultProps}
          scenarios={mockScenarios}
          fixedSubPockets={disabledSubPockets}
        />,
      );

      // Vacation: exp-1 (100/mo, enabled) + exp-2 (100/mo, disabled) = $200/mo
      expect(screen.getByText('$200/mo')).toBeInTheDocument();
      // Tight Budget: exp-3 (50/mo, enabled) = $50/mo
      expect(screen.getByText('$50/mo')).toBeInTheDocument();
    });

    it('shows $0/mo when no fixedSubPockets are provided', () => {
      render(
        <BudgetScenarioTabs {...defaultProps} scenarios={mockScenarios} />,
      );

      const zeroTotals = screen.getAllByText('$0/mo');
      expect(zeroTotals).toHaveLength(2);
    });

    it('applies active styling only to tabs whose id is in activeIds', () => {
      render(
        <BudgetScenarioTabs
          {...defaultProps}
          scenarios={mockScenarios}
          fixedSubPockets={mockSubPockets}
          activeIds={['s1']}
        />,
      );

      const activeWrapper = screen.getByText('Vacation').closest('div.group');
      const inactiveWrapper = screen
        .getByText('Tight Budget')
        .closest('div.group');

      expect(activeWrapper?.className).toMatch(/bg-blue-500\/10/);
      expect(activeWrapper?.className).toMatch(/border-blue-500\/30/);
      expect(inactiveWrapper?.className).not.toMatch(/bg-blue-500\/10/);
    });

    it('calls onEdit with the scenario when the edit icon is clicked', async () => {
      const onEdit = vi.fn();
      const user = userEvent.setup();
      render(
        <BudgetScenarioTabs
          {...defaultProps}
          scenarios={mockScenarios}
          fixedSubPockets={mockSubPockets}
          onEdit={onEdit}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Edit Vacation' }));

      expect(onEdit).toHaveBeenCalledWith(mockScenarios[0]);
    });

    it('calls onDelete with the scenario id when the delete icon is clicked', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(
        <BudgetScenarioTabs
          {...defaultProps}
          scenarios={mockScenarios}
          fixedSubPockets={mockSubPockets}
          onDelete={onDelete}
        />,
      );

      await user.click(
        screen.getByRole('button', { name: 'Delete Vacation' }),
      );

      expect(onDelete).toHaveBeenCalledWith('s1');
    });

    it('does not toggle when an action icon is clicked', async () => {
      const onToggle = vi.fn();
      const onEdit = vi.fn();
      const user = userEvent.setup();
      render(
        <BudgetScenarioTabs
          {...defaultProps}
          scenarios={mockScenarios}
          fixedSubPockets={mockSubPockets}
          onToggle={onToggle}
          onEdit={onEdit}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Edit Vacation' }));

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('omits action icons when onEdit and onDelete are not provided', () => {
      render(
        <BudgetScenarioTabs
          {...defaultProps}
          scenarios={mockScenarios}
          fixedSubPockets={mockSubPockets}
        />,
      );

      expect(
        screen.queryByRole('button', { name: 'Edit Vacation' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Delete Vacation' }),
      ).not.toBeInTheDocument();
    });
  });

  it('renders the add scenario button when scenarios exist', async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(
      <BudgetScenarioTabs
        {...defaultProps}
        scenarios={mockScenarios}
        fixedSubPockets={mockSubPockets}
        onCreate={onCreate}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add scenario' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
