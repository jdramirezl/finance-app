import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../test/testUtils';
import userEvent from '@testing-library/user-event';
import BudgetPlanningPage from '../BudgetPlanningPage';

// ---------------------------------------------------------------------------
// Hook mocks
//
// BudgetPlanningPage composes a large number of query, action, and
// persistence hooks. We mock them all at the module boundary so the page's
// rendering can be exercised in isolation without spinning up a real
// QueryClient cache, ConfirmDialog provider, currency conversion service,
// or movement mutation pipeline. Children components (BudgetIncomeSection,
// ScenarioSection, BudgetSummaryCard, BudgetDistribution, EmptyState,
// PageHeader, AccountPocketSelector) render with the controlled data we
// inject through these mocks.
// ---------------------------------------------------------------------------

vi.mock('../../hooks/queries', () => ({
  useAccountsQuery: vi.fn(),
  usePocketsQuery: vi.fn(),
  useSubPocketsQuery: vi.fn(),
  useFixedExpenseGroupsQuery: vi.fn(),
  useSettingsQuery: vi.fn(),
  useMovementMutations: vi.fn(),
}));

vi.mock('../../hooks/actions/useBudgetActions', () => ({
  useBudgetActions: vi.fn(),
}));

vi.mock('../../hooks/useBudgetPersistence', () => ({
  useBudgetPersistence: vi.fn(),
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: Object.assign(vi.fn(), {
    getState: vi.fn(),
  }),
}));

import {
  useAccountsQuery,
  useFixedExpenseGroupsQuery,
  useMovementMutations,
  usePocketsQuery,
  useSettingsQuery,
  useSubPocketsQuery,
} from '../../hooks/queries';
import { useBudgetActions } from '../../hooks/actions/useBudgetActions';
import { useBudgetPersistence } from '../../hooks/useBudgetPersistence';

const mockedUseAccountsQuery = vi.mocked(useAccountsQuery);
const mockedUsePocketsQuery = vi.mocked(usePocketsQuery);
const mockedUseSubPocketsQuery = vi.mocked(useSubPocketsQuery);
const mockedUseFixedExpenseGroupsQuery = vi.mocked(useFixedExpenseGroupsQuery);
const mockedUseSettingsQuery = vi.mocked(useSettingsQuery);
const mockedUseMovementMutations = vi.mocked(useMovementMutations);
const mockedUseBudgetActions = vi.mocked(useBudgetActions);
const mockedUseBudgetPersistence = vi.mocked(useBudgetPersistence);

// ---------------------------------------------------------------------------
// Default fixtures
// ---------------------------------------------------------------------------

const buildSettingsResult = (
  overrides: Partial<ReturnType<typeof useSettingsQuery>> = {},
) =>
  ({
    data: { primaryCurrency: 'USD' },
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  }) as unknown as ReturnType<typeof useSettingsQuery>;

const buildQueryResult = <T,>(data: T) =>
  ({
    data,
    isLoading: false,
    isError: false,
    error: null,
  }) as unknown as ReturnType<typeof useAccountsQuery>;

const baseAccount = {
  id: 'acc-1',
  name: 'Checking',
  color: '#3b82f6',
  currency: 'USD' as const,
  balance: 1000,
};

const baseFixedPocket = {
  id: 'pocket-fixed',
  accountId: 'acc-1',
  name: 'Fixed Expenses',
  type: 'fixed' as const,
  currency: 'USD' as const,
  balance: 0,
  order: 0,
};

const buildPersistence = (
  overrides: Partial<ReturnType<typeof useBudgetPersistence>> = {},
) =>
  ({
    initialAmount: 0,
    setInitialAmount: vi.fn(),
    distributionEntries: [],
    setDistributionEntries: vi.fn(),
    scenarios: [],
    setScenarios: vi.fn(),
    defaultAccountId: '',
    setDefaultAccountId: vi.fn(),
    defaultPocketId: '',
    setDefaultPocketId: vi.fn(),
    ...overrides,
  }) as unknown as ReturnType<typeof useBudgetPersistence>;

const buildActions = (
  overrides: Partial<ReturnType<typeof useBudgetActions>> = {},
) =>
  ({
    totalFijosMes: 0,
    remaining: 0,
    showConversion: false,
    convertedAmounts: new Map<string, number>(),
    activeScenarioIds: new Set<string>(),
    toggleScenario: vi.fn(),
    saveScenario: vi.fn(),
    deleteScenario: vi.fn(),
    prepareBatchFromDistribution: vi.fn(),
    batch: {
      isOpen: false,
      rows: [],
      close: vi.fn(),
      save: vi.fn(),
    },
    ...overrides,
  }) as unknown as ReturnType<typeof useBudgetActions>;

const setMocks = ({
  accounts = [],
  pockets = [],
  subPockets = [],
  fixedExpenseGroups = [],
  settings = buildSettingsResult(),
  persistence = buildPersistence(),
  actions = buildActions(),
}: {
  accounts?: unknown[];
  pockets?: unknown[];
  subPockets?: unknown[];
  fixedExpenseGroups?: unknown[];
  settings?: ReturnType<typeof useSettingsQuery>;
  persistence?: ReturnType<typeof useBudgetPersistence>;
  actions?: ReturnType<typeof useBudgetActions>;
} = {}) => {
  mockedUseAccountsQuery.mockReturnValue(buildQueryResult(accounts));
  mockedUsePocketsQuery.mockReturnValue(buildQueryResult(pockets));
  mockedUseSubPocketsQuery.mockReturnValue(buildQueryResult(subPockets));
  mockedUseFixedExpenseGroupsQuery.mockReturnValue(
    buildQueryResult(fixedExpenseGroups),
  );
  mockedUseSettingsQuery.mockReturnValue(settings);
  mockedUseMovementMutations.mockReturnValue({
    createMovement: { mutateAsync: vi.fn() },
    updateMovement: { mutateAsync: vi.fn() },
    deleteMovement: { mutateAsync: vi.fn() },
  } as unknown as ReturnType<typeof useMovementMutations>);
  mockedUseBudgetPersistence.mockReturnValue(persistence);
  mockedUseBudgetActions.mockReturnValue(actions);
};

describe('BudgetPlanningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMocks();
  });

  it('renders the page header without crashing', () => {
    render(<BudgetPlanningPage />);

    expect(
      screen.getByRole('heading', { name: /budget planning/i, level: 1 }),
    ).toBeInTheDocument();
  });

  it('renders the income input section with the persisted initial amount', () => {
    setMocks({
      persistence: buildPersistence({ initialAmount: 1500 }),
    });

    render(<BudgetPlanningPage />);

    const input = screen.getByLabelText(/initial amount/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(1500);
  });

  it('renders the scenario section with planning header and create button', () => {
    render(<BudgetPlanningPage />);

    expect(
      screen.getByRole('heading', { name: /planning scenarios/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /new scenario/i }),
    ).toBeInTheDocument();
  });

  it('lists scenarios as togglable cards', async () => {
    const toggleScenario = vi.fn();
    setMocks({
      pockets: [baseFixedPocket],
      persistence: buildPersistence({
        scenarios: [
          { id: 's1', name: 'Bare Minimum', expenseIds: [] },
          { id: 's2', name: 'Ideal', expenseIds: [] },
        ],
      }),
      actions: buildActions({ toggleScenario }),
    });

    const user = userEvent.setup();
    render(<BudgetPlanningPage />);

    const bareMinimum = screen.getByRole('button', {
      name: /activate scenario bare minimum/i,
    });
    expect(bareMinimum).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /activate scenario ideal/i }),
    ).toBeInTheDocument();

    await user.click(bareMinimum);
    expect(toggleScenario).toHaveBeenCalledWith('s1');
  });

  it('shows the budget summary and distribution sections when there is income to plan', () => {
    setMocks({
      accounts: [baseAccount],
      pockets: [baseFixedPocket],
      persistence: buildPersistence({
        initialAmount: 2000,
        distributionEntries: [
          { id: 'e1', name: 'Savings', percentage: 25 },
        ],
      }),
      actions: buildActions({
        totalFijosMes: 500,
        remaining: 1500,
      }),
    });

    render(<BudgetPlanningPage />);

    // Summary card surfaces the labels populated by the budget actions.
    expect(screen.getByText(/initial amount:/i)).toBeInTheDocument();
    expect(screen.getByText(/fixed expenses:/i)).toBeInTheDocument();

    // Distribution section is rendered (its first heading is "Distribution").
    expect(
      screen.getByRole('heading', { name: /distribution/i }),
    ).toBeInTheDocument();
  });

  it('omits summary and distribution sections when no income has been entered', () => {
    setMocks({
      pockets: [baseFixedPocket],
      persistence: buildPersistence({ initialAmount: 0 }),
      actions: buildActions({ totalFijosMes: 0, remaining: 0 }),
    });

    render(<BudgetPlanningPage />);

    expect(screen.queryByText(/initial amount:/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /^distribution$/i }),
    ).not.toBeInTheDocument();
  });

  it('disables Create Movements when initial amount is zero', () => {
    setMocks({
      persistence: buildPersistence({ initialAmount: 0 }),
    });

    render(<BudgetPlanningPage />);

    expect(
      screen.getByRole('button', { name: /create movements/i }),
    ).toBeDisabled();
  });

  it('triggers batch movement generation when Create Movements is clicked', async () => {
    const prepareBatchFromDistribution = vi.fn();
    setMocks({
      pockets: [baseFixedPocket],
      persistence: buildPersistence({ initialAmount: 1000 }),
      actions: buildActions({
        totalFijosMes: 0,
        remaining: 1000,
        prepareBatchFromDistribution,
      }),
    });

    const user = userEvent.setup();
    render(<BudgetPlanningPage />);

    const button = screen.getByRole('button', { name: /create movements/i });
    expect(button).toBeEnabled();

    await user.click(button);
    expect(prepareBatchFromDistribution).toHaveBeenCalledTimes(1);
  });

  it('renders skeletons while settings are loading and hides the income section', () => {
    setMocks({
      settings: buildSettingsResult({
        data: undefined,
        isLoading: true,
      }),
    });

    render(<BudgetPlanningPage />);

    // Page header / income input do not render in the loading state.
    expect(
      screen.queryByRole('heading', { name: /budget planning/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/initial amount/i)).not.toBeInTheDocument();
  });

  it('shows the empty state when no fixed expenses pocket exists', () => {
    setMocks({ pockets: [] });

    render(<BudgetPlanningPage />);

    expect(
      screen.getByRole('heading', {
        name: /no fixed expenses pocket found/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/create one in the accounts page/i),
    ).toBeInTheDocument();
  });

  it('hides the empty state when a fixed pocket is present', () => {
    setMocks({ pockets: [baseFixedPocket] });

    render(<BudgetPlanningPage />);

    expect(
      screen.queryByRole('heading', {
        name: /no fixed expenses pocket found/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('opens the scenario form modal when New Scenario is clicked', async () => {
    setMocks({ pockets: [baseFixedPocket] });

    const user = userEvent.setup();
    render(<BudgetPlanningPage />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /new scenario/i }));

    // Modal mounts a role="dialog" element; its title is exposed via
    // aria-labelledby pointing at the rendered <h2>.
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(document.getElementById('modal-title')).toHaveTextContent(
      /^new scenario$/i,
    );
  });
});
