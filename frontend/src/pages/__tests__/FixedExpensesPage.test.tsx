import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../test/testUtils';
import userEvent from '@testing-library/user-event';
import type {
  Account,
  FixedExpenseGroup,
  Pocket,
  SubPocket,
} from '../../types';

// ---------------------------------------------------------------------------
// Module mocks
//
// The page is a thin orchestrator over a handful of query/mutation hooks
// plus useFixedExpenseActions. We mock them all at the module-specifier
// boundary so each test can drive the page into specific states without
// touching the real services or QueryClient cache.
// ---------------------------------------------------------------------------

const mockUseAccountsQuery = vi.fn();
const mockUsePocketsQuery = vi.fn();
const mockUseSubPocketsQuery = vi.fn();
const mockUseFixedExpenseGroupsQuery = vi.fn();
const mockUseMovementMutations = vi.fn();
const mockUseFixedExpenseGroupMutations = vi.fn();
const mockUseSubPocketMutations = vi.fn();

vi.mock('../../hooks/queries', () => ({
  useAccountsQuery: () => mockUseAccountsQuery(),
  usePocketsQuery: () => mockUsePocketsQuery(),
  useSubPocketsQuery: () => mockUseSubPocketsQuery(),
  useFixedExpenseGroupsQuery: () => mockUseFixedExpenseGroupsQuery(),
  useMovementMutations: () => mockUseMovementMutations(),
  useFixedExpenseGroupMutations: () => mockUseFixedExpenseGroupMutations(),
  useSubPocketMutations: () => mockUseSubPocketMutations(),
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

// FixedExpensesSummary renders <SelectableValue> which reads from
// SelectionContext. The shared test wrapper doesn't include SelectionProvider,
// so stub the hook to keep the page render self-contained.
vi.mock('../../contexts/SelectionContext', () => ({
  useSelection: () => ({
    selectedItems: new Map(),
    toggleSelection: vi.fn(),
    clearSelection: vi.fn(),
    isSelected: () => false,
  }),
  SelectionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseFixedExpenseActions = vi.fn();

vi.mock('../../hooks/actions/useFixedExpenseActions', () => ({
  useFixedExpenseActions: (params: unknown) =>
    mockUseFixedExpenseActions(params),
}));

// Stub heavy form components — they have their own data dependencies and
// aren't the subject under test here. Replacing them keeps each test focused
// on the page's own wiring (state, modal open/close, callback dispatch).
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

// SortableList wraps DnD-kit's DndContext, which doesn't add value at the
// page-level test layer and depends on browser APIs. Render its children
// directly so we can still assert on the resulting group/expense markup.
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

// Imported after mocks are registered so the page picks up the mocked modules.
// eslint-disable-next-line import/first
import FixedExpensesPage from '../FixedExpensesPage';

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
  {
    id: 'group-bills',
    name: 'Bills',
    color: '#EF4444',
    displayOrder: 1,
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
    enabled: true,
    groupId: 'group-default',
  },
  {
    id: 'sp-insurance',
    pocketId: 'pocket-fixed',
    name: 'Insurance',
    valueTotal: 2400,
    periodicityMonths: 12,
    balance: 300,
    enabled: true,
    groupId: 'group-bills',
  },
  {
    id: 'sp-gym',
    pocketId: 'pocket-fixed',
    name: 'Gym',
    valueTotal: 600,
    periodicityMonths: 6,
    balance: 0,
    enabled: false,
    groupId: 'group-default',
  },
];

type ActionsShape = ReturnType<
  typeof import('../../hooks/actions/useFixedExpenseActions').useFixedExpenseActions
>;

const buildActions = (overrides: Partial<ActionsShape> = {}): ActionsShape => ({
  handleDeleteSubPocket: vi.fn(),
  handleToggleSubPocket: vi.fn(),
  handleMoveToGroup: vi.fn(),
  deletingId: null,
  togglingId: null,
  handleDeleteGroup: vi.fn(),
  handleToggleGroup: vi.fn(),
  handleReorderGroups: vi.fn(),
  togglingGroupId: null,
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

// Minimal TanStack-Query-like envelope. The page only reads `data` and
// `isLoading` so we don't need to model the full UseQueryResult shape.
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FixedExpensesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccountsQuery.mockReturnValue(queryResult(accounts));
    mockUsePocketsQuery.mockReturnValue(queryResult([fixedPocket]));
    mockUseSubPocketsQuery.mockReturnValue(queryResult(subPockets));
    mockUseFixedExpenseGroupsQuery.mockReturnValue(queryResult(groups));
    mockUseMovementMutations.mockReturnValue(mutationsStub);
    mockUseFixedExpenseGroupMutations.mockReturnValue(mutationsStub);
    mockUseSubPocketMutations.mockReturnValue(mutationsStub);
    mockUseFixedExpenseActions.mockReturnValue(buildActions());
  });

  it('renders the page header without crashing', () => {
    render(<FixedExpensesPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /fixed expenses/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Monthly Fixed Expenses Total')).toBeInTheDocument();
  });

  it('shows the empty state when no fixed pocket exists', () => {
    mockUsePocketsQuery.mockReturnValue(queryResult([] as Pocket[]));
    render(<FixedExpensesPage />);

    expect(
      screen.getByText(/no fixed expenses pocket found/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/please create a fixed expenses pocket/i),
    ).toBeInTheDocument();
    // Header action buttons should not be rendered in the empty branch.
    expect(
      screen.queryByRole('button', { name: /new fixed expense/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the loading skeleton while groups are loading', () => {
    mockUseFixedExpenseGroupsQuery.mockReturnValue(
      queryResult([] as FixedExpenseGroup[], true),
    );
    const { container } = render(<FixedExpensesPage />);

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(
      0,
    );
    expect(
      screen.queryByRole('heading', { level: 1, name: /fixed expenses/i }),
    ).not.toBeInTheDocument();
  });

  it('lists each expense group by name', () => {
    render(<FixedExpensesPage />);

    expect(
      screen.getByRole('heading', { level: 3, name: /^default$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /^bills$/i }),
    ).toBeInTheDocument();
  });

  it('renders a card for each fixed expense', () => {
    render(<FixedExpensesPage />);

    expect(
      screen.getByRole('heading', { level: 4, name: /internet/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 4, name: /insurance/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 4, name: /gym/i }),
    ).toBeInTheDocument();
  });

  it('shows the empty list state when no fixed expenses exist yet', () => {
    mockUseSubPocketsQuery.mockReturnValue(queryResult([] as SubPocket[]));
    render(<FixedExpensesPage />);

    // FixedExpensesSummary also renders the title "No fixed expenses yet"
    // when its subPockets list is empty, so we anchor the assertion on the
    // description text which only appears in the list's EmptyState.
    expect(
      screen.getByText(/create your first fixed expense to get started/i),
    ).toBeInTheDocument();
  });

  it('toggles a group via its toggle control', async () => {
    const handleToggleGroup = vi.fn();
    mockUseFixedExpenseActions.mockReturnValue(
      buildActions({ handleToggleGroup }),
    );
    const user = userEvent.setup();
    render(<FixedExpensesPage />);

    // The Default group has one enabled (Internet) and one disabled (Gym),
    // so the toggle is currently in the "enable all" state.
    await user.click(
      screen.getByRole('button', { name: /enable all expenses in default/i }),
    );

    expect(handleToggleGroup).toHaveBeenCalledWith('group-default', true);
  });

  it('triggers bulk movement preparation from the Create Movements button', async () => {
    const prepareBatchFromEnabled = vi.fn();
    mockUseFixedExpenseActions.mockReturnValue(
      buildActions({ prepareBatchFromEnabled }),
    );
    const user = userEvent.setup();
    render(<FixedExpensesPage />);

    await user.click(
      screen.getByRole('button', { name: /create movements/i }),
    );

    expect(prepareBatchFromEnabled).toHaveBeenCalledTimes(1);
  });

  it('disables Create Movements when no enabled expenses exist', () => {
    mockUseSubPocketsQuery.mockReturnValue(
      queryResult(subPockets.map((sp) => ({ ...sp, enabled: false }))),
    );
    render(<FixedExpensesPage />);

    expect(
      screen.getByRole('button', { name: /create movements/i }),
    ).toBeDisabled();
  });

  it('opens the new fixed-expense modal from the header button', async () => {
    const user = userEvent.setup();
    render(<FixedExpensesPage />);

    expect(screen.queryByTestId('fixed-expense-form')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /new fixed expense/i }));

    expect(await screen.findByTestId('fixed-expense-form')).toBeInTheDocument();
    // Modal title is an <h2>, distinct from the button.
    expect(
      screen.getByRole('heading', { level: 2, name: /^new fixed expense$/i }),
    ).toBeInTheDocument();
  });

  it('opens the new group modal from the New Group button', async () => {
    const user = userEvent.setup();
    render(<FixedExpensesPage />);

    expect(
      screen.queryByTestId('fixed-expense-group-form'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /new group/i }));

    expect(
      await screen.findByTestId('fixed-expense-group-form'),
    ).toBeInTheDocument();
  });

  it('renders the batch movement modal when batchForm.isOpen is true', () => {
    mockUseFixedExpenseActions.mockReturnValue(
      buildActions({
        batchForm: {
          isOpen: true,
          rows: [],
          open: vi.fn(),
          close: vi.fn(),
          setRows: vi.fn(),
          save: vi.fn(),
        },
      }),
    );
    render(<FixedExpensesPage />);

    expect(screen.getByTestId('batch-movement-form')).toBeInTheDocument();
  });
});
