import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import ScenarioForm, { type PlanningScenario } from '../ScenarioForm';
import type { SubPocket, FixedExpenseGroup } from '../../../types';

const mockGroups: FixedExpenseGroup[] = [
  {
    id: 'g1',
    name: 'Utilities',
    color: '#3B82F6',
    displayOrder: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'g2',
    name: 'Subscriptions',
    color: '#10B981',
    displayOrder: 2,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

const mockSubPockets: SubPocket[] = [
  {
    id: 'sp1',
    pocketId: 'pkt-fixed',
    name: 'Internet',
    valueTotal: 1200,
    periodicityMonths: 12,
    balance: 0,
    groupId: 'g1',
  },
  {
    id: 'sp2',
    pocketId: 'pkt-fixed',
    name: 'Electricity',
    valueTotal: 2400,
    periodicityMonths: 12,
    balance: 0,
    groupId: 'g1',
  },
  {
    id: 'sp3',
    pocketId: 'pkt-fixed',
    name: 'Streaming',
    valueTotal: 600,
    periodicityMonths: 12,
    balance: 0,
    groupId: 'g2',
  },
  {
    id: 'sp4',
    pocketId: 'pkt-fixed',
    name: 'Misc',
    valueTotal: 360,
    periodicityMonths: 12,
    balance: 0,
    // no groupId — should appear in the "Default" group
  },
];

const baseProps = {
  fixedSubPockets: mockSubPockets,
  fixedExpenseGroups: mockGroups,
  currency: 'USD' as const,
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

describe('ScenarioForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the new-scenario heading and an empty name input', () => {
    render(<ScenarioForm {...baseProps} />);

    expect(screen.getByRole('heading', { name: 'New Scenario' })).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/Scenario Name/i) as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();
    expect(nameInput.value).toBe('');
  });

  it('renders the edit-scenario heading and populates name when editing', () => {
    const initialData: PlanningScenario = {
      id: 'scn-1',
      name: 'Bare Minimum',
      expenseIds: ['sp1'],
    };

    render(<ScenarioForm {...baseProps} initialData={initialData} />);

    expect(screen.getByRole('heading', { name: 'Edit Scenario' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Scenario Name/i)).toHaveValue('Bare Minimum');
  });

  it('lists groups and their expenses, including a Default section for ungrouped', () => {
    render(<ScenarioForm {...baseProps} />);

    expect(screen.getByText('Utilities')).toBeInTheDocument();
    expect(screen.getByText('Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();

    expect(screen.getByText('Internet')).toBeInTheDocument();
    expect(screen.getByText('Electricity')).toBeInTheDocument();
    expect(screen.getByText('Streaming')).toBeInTheDocument();
    expect(screen.getByText('Misc')).toBeInTheDocument();
  });

  it('disables the Save button when name is empty', () => {
    render(<ScenarioForm {...baseProps} />);

    const saveBtn = screen.getByRole('button', { name: /Save Scenario/i });
    expect(saveBtn).toBeDisabled();
  });

  it('enables the Save button after typing a name', async () => {
    const user = userEvent.setup();
    render(<ScenarioForm {...baseProps} />);

    await user.type(screen.getByLabelText(/Scenario Name/i), 'My Scenario');
    expect(screen.getByRole('button', { name: /Save Scenario/i })).not.toBeDisabled();
  });

  it('toggling an individual expense updates its checkbox', async () => {
    const user = userEvent.setup();
    render(<ScenarioForm {...baseProps} />);

    const internetRow = screen.getByText('Internet').closest('label');
    expect(internetRow).not.toBeNull();
    const checkbox = within(internetRow!).getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('clicking a group header selects every expense in that group', async () => {
    const user = userEvent.setup();
    render(<ScenarioForm {...baseProps} />);

    // Click the Utilities group header to bulk-select Internet + Electricity
    await user.click(screen.getByText('Utilities'));

    const internet = within(screen.getByText('Internet').closest('label')!).getByRole('checkbox');
    const electricity = within(screen.getByText('Electricity').closest('label')!).getByRole('checkbox');
    expect(internet).toBeChecked();
    expect(electricity).toBeChecked();
  });

  it('clicking a fully-selected group header deselects every expense in that group', async () => {
    const user = userEvent.setup();
    const initialData: PlanningScenario = {
      id: 'scn-1',
      name: 'All Utilities',
      expenseIds: ['sp1', 'sp2'],
    };

    render(<ScenarioForm {...baseProps} initialData={initialData} />);

    // Sanity: both items start checked
    const internet = within(screen.getByText('Internet').closest('label')!).getByRole('checkbox');
    const electricity = within(screen.getByText('Electricity').closest('label')!).getByRole('checkbox');
    expect(internet).toBeChecked();
    expect(electricity).toBeChecked();

    await user.click(screen.getByText('Utilities'));

    expect(internet).not.toBeChecked();
    expect(electricity).not.toBeChecked();
  });

  it('clicking the Default group toggles ungrouped expenses', async () => {
    const user = userEvent.setup();
    render(<ScenarioForm {...baseProps} />);

    await user.click(screen.getByText('Default'));

    const misc = within(screen.getByText('Misc').closest('label')!).getByRole('checkbox');
    expect(misc).toBeChecked();
  });

  it('Cancel button calls onCancel without submitting', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSave = vi.fn();

    render(<ScenarioForm {...baseProps} onCancel={onCancel} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submitting with valid data calls onSave with the selected expense ids', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<ScenarioForm {...baseProps} onSave={onSave} />);

    await user.type(screen.getByLabelText(/Scenario Name/i), 'My Scenario');

    const internet = within(screen.getByText('Internet').closest('label')!).getByRole('checkbox');
    const streaming = within(screen.getByText('Streaming').closest('label')!).getByRole('checkbox');
    await user.click(internet);
    await user.click(streaming);

    await user.click(screen.getByRole('button', { name: /Save Scenario/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as PlanningScenario;
    expect(saved.name).toBe('My Scenario');
    expect(saved.id).toEqual(expect.any(String));
    expect(saved.expenseIds.sort()).toEqual(['sp1', 'sp3'].sort());
  });

  it('preserves the id from initialData when editing', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const initialData: PlanningScenario = {
      id: 'scn-existing',
      name: 'Original',
      expenseIds: ['sp1'],
    };

    render(<ScenarioForm {...baseProps} initialData={initialData} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /Save Scenario/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'scn-existing',
        name: 'Original',
        expenseIds: ['sp1'],
      }),
    );
  });

  it('displays Total Monthly that updates as expenses are toggled', async () => {
    const user = userEvent.setup();
    render(<ScenarioForm {...baseProps} />);

    const totalContainer = () => screen.getByText('Total Monthly').parentElement!;

    // No selection => total is 0
    expect(within(totalContainer()).getByText('$0.00')).toBeInTheDocument();

    // Select Internet (1200/12 = $100/month)
    const internet = within(screen.getByText('Internet').closest('label')!).getByRole('checkbox');
    await user.click(internet);

    expect(within(totalContainer()).getByText('$100.00')).toBeInTheDocument();

    // Add Electricity (2400/12 = $200/month) => $300 total
    const electricity = within(screen.getByText('Electricity').closest('label')!).getByRole('checkbox');
    await user.click(electricity);

    expect(within(totalContainer()).getByText('$300.00')).toBeInTheDocument();
  });

  it('renders groups in displayOrder ascending', () => {
    const reorderedGroups: FixedExpenseGroup[] = [
      { ...mockGroups[1], displayOrder: 1 }, // Subscriptions first
      { ...mockGroups[0], displayOrder: 2 }, // Utilities second
    ];

    render(<ScenarioForm {...baseProps} fixedExpenseGroups={reorderedGroups} />);

    const headers = screen.getAllByText(/^(Utilities|Subscriptions)$/);
    expect(headers[0]).toHaveTextContent('Subscriptions');
    expect(headers[1]).toHaveTextContent('Utilities');
  });

  it('omits a group when it has no expenses', () => {
    const subPocketsWithoutG2 = mockSubPockets.filter((sp) => sp.groupId !== 'g2');

    render(<ScenarioForm {...baseProps} fixedSubPockets={subPocketsWithoutG2} />);

    expect(screen.queryByText('Subscriptions')).not.toBeInTheDocument();
    expect(screen.getByText('Utilities')).toBeInTheDocument();
  });

  it('does not render the Default section when every expense belongs to a group', () => {
    const onlyGrouped = mockSubPockets.filter((sp) => sp.groupId !== undefined);

    render(<ScenarioForm {...baseProps} fixedSubPockets={onlyGrouped} />);

    expect(screen.queryByText('Default')).not.toBeInTheDocument();
  });
});
