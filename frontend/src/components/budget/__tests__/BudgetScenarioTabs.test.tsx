import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import BudgetScenarioTabs from '../BudgetScenarioTabs';
import type { PlanningScenario } from '../ScenarioForm';

const mockScenarios: PlanningScenario[] = [
  { id: 's1', name: 'Vacation', expenseIds: ['exp-1'] },
  { id: 's2', name: 'Tight Budget', expenseIds: [] },
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
    it('renders the three default tabs', () => {
      render(<BudgetScenarioTabs {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: 'Normal Month' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Holiday' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Crisis Mode' }),
      ).toBeInTheDocument();
    });

    it('calls onToggle with the default tab id when a default tab is clicked', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();
      render(<BudgetScenarioTabs {...defaultProps} onToggle={onToggle} />);

      await user.click(screen.getByRole('button', { name: 'Holiday' }));

      expect(onToggle).toHaveBeenCalledWith('__holiday');
    });
  });

  describe('with scenarios', () => {
    it('renders one tab per scenario instead of defaults', () => {
      render(<BudgetScenarioTabs {...defaultProps} scenarios={mockScenarios} />);

      expect(
        screen.getByRole('button', { name: 'Vacation' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Tight Budget' }),
      ).toBeInTheDocument();
      // Default tabs should not appear when scenarios are provided
      expect(
        screen.queryByRole('button', { name: 'Normal Month' }),
      ).not.toBeInTheDocument();
    });

    it('calls onToggle with the scenario id when a scenario tab is clicked', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();
      render(
        <BudgetScenarioTabs
          {...defaultProps}
          scenarios={mockScenarios}
          onToggle={onToggle}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Vacation' }));

      expect(onToggle).toHaveBeenCalledWith('s1');
    });

    it('applies active styling only to tabs whose id is in activeIds', () => {
      render(
        <BudgetScenarioTabs
          {...defaultProps}
          scenarios={mockScenarios}
          activeIds={['s1']}
        />,
      );

      const activeTab = screen.getByRole('button', { name: 'Vacation' });
      const inactiveTab = screen.getByRole('button', { name: 'Tight Budget' });

      expect(activeTab.className).toMatch(/bg-blue-500\/10/);
      expect(activeTab.className).toMatch(/text-blue-400/);
      expect(inactiveTab.className).not.toMatch(/bg-blue-500\/10/);
    });
  });

  it('renders the add scenario button with title', () => {
    render(<BudgetScenarioTabs {...defaultProps} />);

    expect(screen.getByTitle('Add scenario')).toBeInTheDocument();
  });

  it('calls onCreate when the add scenario button is clicked', async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(<BudgetScenarioTabs {...defaultProps} onCreate={onCreate} />);

    await user.click(screen.getByTitle('Add scenario'));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('does not call onToggle when the add scenario button is clicked', async () => {
    const onToggle = vi.fn();
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(
      <BudgetScenarioTabs
        {...defaultProps}
        onToggle={onToggle}
        onCreate={onCreate}
      />,
    );

    await user.click(screen.getByTitle('Add scenario'));

    expect(onToggle).not.toHaveBeenCalled();
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
