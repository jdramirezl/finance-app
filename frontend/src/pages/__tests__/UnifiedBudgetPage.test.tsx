import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../test/testUtils';
import type {
  Account,
  FixedExpenseGroup,
  Pocket,
  SubPocket,
} from '../../types';

// ---------------------------------------------------------------------------
// Module mocks
//
// UnifiedBudgetPage composes a large number of query, action, and persistence
// hooks plus several heavy modal forms. We mock them all at the module
// boundary so the page rendering can be exercised in isolation without
// spinning up a real QueryClient cache, ConfirmDialog provider, currency
// conversion service, or movement mutation pipeline.
// ---------------------------------------------------------------------------

const mockUseAccountsQuery = vi.fn();
const mockUsePocketsQuery = vi.fn();
const mockUseSubPocketsQuery = vi.fn();
const mockUseFixedExpenseGroupsQuery = vi.fn();
const mockUseSettingsQuery = vi.fn();
const mockUseMovementMutations = vi.fn();
const mockUseFixedExpenseGroupMutations = vi.fn();
const mockUseSubPocketMutations = vi.fn();

vi.mock('../../hooks/queries', () => ({
  useAccountsQuery: () => mockUseAccountsQuery(),
  usePocketsQuery: () => mockUsePocketsQuery(),
  useSubPocketsQuery: () => mockUseSubPocketsQuery(),
  useFixedExpenseGroupsQuery: () => mockUseFixedExpenseGroupsQuery(),
  useSettingsQuery: () => mockUseSettingsQuery(),
  useMovementMutations: () => mockUseMovementMutations(),
  useFixedExpenseGroupMutations: () => mockUseFixedExpenseGroupMutations(),
  useSubPocketMutations: () => mockUseSubPocketMutations(),
}));

const mockUseBudgetActions = vi.fn();
const mockUseFixedExpenseActions = vi.fn();
const mockUseBudgetPersistence = vi.fn();

vi.mock('../../hooks/actions/useBudgetActions', () => ({
  useBudgetActions: (params: unknown) => mockUseBudgetActions(params),
}));

vi.mock('../../hooks/actions/useFixedExpenseActions', () => ({
  useFixedExpenseActions: (params: unknown) =>
    mockUseFixedExpenseActions(params),
}));

vi.mock('../../hooks/useBudgetPersistence', () => ({
  useBudgetPersistence: () => mockUseBudgetPersistence(),
}));

const toastStub = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  toasts: [] as never[],
  addToast: vi.fn(),
  removeToast: vi.fn(),
};

vi.mock('../../hooks/useToast', () => ({
  useToast: () => toastStub,
}));

const confirmStub = vi.fn();

vi.mock('../../contexts/ConfirmDialogContext', () => ({
  useConfirmDialog: () => ({ confirm: confirmStub }),
  ConfirmDialogProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Heavy form/modal components — replaced with light stubs so each test
// stays focused on the page's own wiring without booting these subtrees.
vi.mock('../../components/fixed-expenses', async () => {
  const actual = await vi.importActual<
    typeof import('../../components/fixed-expenses')
  >('../../components/fixed-expenses');
  return {
    ...actual,
    FixedExpenseForm: () => (
      <div data-testid="fixed-expense-form">FixedExpenseForm</div>
    ),
    FixedExpenseGroupForm: () => (
      <div data-testid="fixed-expense-group-form">FixedExpenseGroupForm</div>
    ),
  };
});

vi.mock('../../components/movements/BatchMovementForm', () => ({
  default: () => <div data-testid="batch-movement-form">BatchMovementForm</div>,
}));

vi.mock('../../components/budget/ScenarioForm', () => ({
  default: () => <div data-testid="scenario-form">ScenarioForm</div>,
}));

// SortableList wraps DnD-kit's DndContext, which adds nothing at the
// page-level test layer and depends on browser APIs the test environment
// doesn't fully provide. Render its children inline so we can still
// assert on the resulting group/expense markup.
vi.mock('../../components/ui/SortableList', () => ({
  default: <T,>({
    items,
    renderItem,
    getId,
  }: {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    getId: (item: T) => string;
  }) => (
    <div data-testid="sortable-list">
      {items.map((item, i) => (
        <div key={getId(item)}>{renderItem(item, i)}</div>
      ))}
    </div>
  ),
}));

vi.mock('../../components/ui/SortableItem', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// PortfolioDonutChart relies on Recharts' SVG layout, which is noisy in
// jsdom. Stub it with a marker the empty-state assertion can ignore.
vi.mock('../../components/budget/PortfolioDonutChart', () => ({
  default: () => <div data-testid="portfolio-donut-chart" />,
}));

// Imported after mocks are registered so the page picks up mocked modules.
import UnifiedBudgetPage from '../UnifiedBudgetPage';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const accounts: Account[] = [
  {
    id: 'acc-1',
    name: 'Bank Account',
    color: '#3B82F6',
    currency: 'USD',
    balance: 1000,
    type: 'normal',
  },
];

const fixedPocket: Pocket = {
  id: 'pocket-fixed',
  accountId: 'acc-1',
  name: 'Fixed Expenses',
  type: 'fixed',
  balance: 400,
  currency: 'USD',
};

const groups: FixedExpenseGroup[] = [
  {
    id: 'group-default',
    name: 'Default',
    color: '#6B7280',
    displayOrder: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

const subPockets: SubPocket[] = [
  {
    id: 'sp-internet',
    pocketId: 'pocket-fixed',
    name: 'Internet',
    valueTotal: 1200,
    periodicityMonths: 12,
    balance: 100,
    groupId: 'group-default',
  },
];

// Minimal TanStack-Query-like envelope. The page reads `data` and `isLoading`.
const queryResult = <T,>(data: T, isLoading = false) =>
  ({
    data,
    isLoading,
    isError: false,
    error: null,
    isFetching: false,
    isSuccess: !isLoading,
    refetch: vi.fn(),
  }) as unknown as ReturnType<typeof mockUseAccountsQuery>;

const mutationsStub = {} as never;

type FixedActionsShape = ReturnType<
  typeof import('../../hooks/actions/useFixedExpenseActions').useFixedExpenseActions
>;

const buildFixedActions = (
  overrides: Partial<FixedActionsShape> = {},
): FixedActionsShape => ({
  handleDeleteSubPocket: vi.fn(),
  handleMoveToGroup: vi.fn(),
  deletingId: null,
  handleDeleteGroup: vi.fn(),
  handleReorderGroups: vi.fn(),
  collapsedGroups: new Set<string>(),
  toggleGroupCollapse: vi.fn(),
  batchForm: {
    isOpen: false,
    rows: [],
    open: vi.fn(),
    close: vi.fn(),
    setRows: vi.fn(),
    save: vi.fn(),
  },
  prepareBatchFromEnabled: vi.fn(),
  ...overrides,
});

type BudgetActionsShape = ReturnType<
  typeof import('../../hooks/actions/useBudgetActions').useBudgetActions
>;

const buildBudgetActions = (
  overrides: Partial<BudgetActionsShape> = {},
): BudgetActionsShape => ({
  totalFijosMes: 0,
  remaining: 0,
  showConversion: false,
  convertedAmounts: new Map<string, number>(),
  convertedRemaining: undefined,
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
});

type PersistenceShape = ReturnType<
  typeof import('../../hooks/useBudgetPersistence').useBudgetPersistence
>;

const buildPersistence = (
  overrides: Partial<PersistenceShape> = {},
): PersistenceShape => ({
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
  budgetCurrency: '',
  setBudgetCurrency: vi.fn(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UnifiedBudgetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccountsQuery.mockReturnValue(queryResult(accounts));
    mockUsePocketsQuery.mockReturnValue(queryResult([fixedPocket]));
    mockUseSubPocketsQuery.mockReturnValue(queryResult(subPockets));
    mockUseFixedExpenseGroupsQuery.mockReturnValue(queryResult(groups));
    mockUseSettingsQuery.mockReturnValue(
      queryResult({ primaryCurrency: 'USD' }),
    );
    mockUseMovementMutations.mockReturnValue(mutationsStub);
    mockUseFixedExpenseGroupMutations.mockReturnValue(mutationsStub);
    mockUseSubPocketMutations.mockReturnValue(mutationsStub);
    mockUseFixedExpenseActions.mockReturnValue(buildFixedActions());
    mockUseBudgetActions.mockReturnValue(buildBudgetActions());
    mockUseBudgetPersistence.mockReturnValue(buildPersistence());
  });

  it('renders both panel headers when data is loaded', () => {
    render(<UnifiedBudgetPage />);

    // Left panel
    expect(
      screen.getByRole('heading', { name: /fixed obligations/i, level: 2 }),
    ).toBeInTheDocument();
    // Right panel
    expect(
      screen.getByRole('heading', {
        name: /available to distribute/i,
        level: 2,
      }),
    ).toBeInTheDocument();

    // Both panels are exposed via aria-label for assistive tech.
    expect(
      screen.getByRole('region', { name: /fixed obligations/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /distribution/i }),
    ).toBeInTheDocument();
  });

  it('renders the page title', () => {
    render(<UnifiedBudgetPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /^budget$/i }),
    ).toBeInTheDocument();
  });

  it('renders the income input on the left panel', () => {
    render(<UnifiedBudgetPage />);
    expect(screen.getByText(/monthly income/i)).toBeInTheDocument();
    // BudgetIncomeCard renders a <input type="text" inputMode="decimal"> for
    // the amount; locating it via placeholder keeps the test stable across
    // localized number formatting.
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  it('renders the scenario tabs empty-state hint when no scenarios persisted', () => {
    render(<UnifiedBudgetPage />);

    // Empty state shows a hint and the create button — no fake default tabs.
    expect(
      screen.getByText(/create your first scenario/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add scenario/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /normal month/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^holiday$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /crisis mode/i }),
    ).not.toBeInTheDocument();
  });

  it('renders distribution entries provided by persistence', () => {
    mockUseBudgetPersistence.mockReturnValue(
      buildPersistence({
        distributionEntries: [
          { id: 'e1', name: 'Savings', percentage: 50 },
          { id: 'e2', name: 'Investments', percentage: 30 },
        ],
      }),
    );
    mockUseBudgetActions.mockReturnValue(
      buildBudgetActions({ remaining: 1000 }),
    );

    render(<UnifiedBudgetPage />);

    // Each entry surfaces its name through an editable <input> rendered
    // inside AllocationSliderRow. Locating by display value keeps the
    // assertion decoupled from the surrounding label/aria structure.
    expect(screen.getByDisplayValue('Savings')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Investments')).toBeInTheDocument();
  });

  it('shows skeleton placeholders while settings or groups are loading', () => {
    mockUseSettingsQuery.mockReturnValue(queryResult(undefined, true));
    const { container } = render(<UnifiedBudgetPage />);

    // Skeletons all use the .animate-pulse utility class.
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(
      0,
    );
    expect(
      screen.queryByRole('heading', { level: 1, name: /^budget$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /fixed obligations/i }),
    ).not.toBeInTheDocument();
  });

  it('shows skeleton placeholders while fixed expense groups are loading', () => {
    mockUseFixedExpenseGroupsQuery.mockReturnValue(
      queryResult([] as FixedExpenseGroup[], true),
    );
    const { container } = render(<UnifiedBudgetPage />);

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(
      0,
    );
    expect(
      screen.queryByRole('region', { name: /fixed obligations/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the empty state when no fixed pocket exists', () => {
    mockUsePocketsQuery.mockReturnValue(queryResult([] as Pocket[]));
    render(<UnifiedBudgetPage />);

    expect(
      screen.getByRole('heading', {
        name: /no fixed expenses pocket found/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/create one in the accounts page/i),
    ).toBeInTheDocument();

    // The split panel layout should NOT be rendered in the empty branch.
    expect(
      screen.queryByRole('region', { name: /fixed obligations/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: /distribution/i }),
    ).not.toBeInTheDocument();
  });
});
