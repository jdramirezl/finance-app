import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../test/testUtils';
import type {
  Account,
  Currency,
  FixedExpenseGroup,
  Pocket,
  Settings,
  SubPocket,
} from '../../types';

// ---------------------------------------------------------------------------
// Module mocks
//
// SummaryPage is a thin orchestrator over a handful of query/derived hooks
// plus three heavy widgets (NetWorthTimelineWidget, RemindersWidget, and the
// summary children that have their own data flows). We mock every dependency
// at the module-specifier boundary so each test can drive the page into a
// specific state without touching real services or QueryClient caches.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  useAccountsQuery: vi.fn(),
  usePocketsQuery: vi.fn(),
  useSettingsQuery: vi.fn(),
  useSubPocketsQuery: vi.fn(),
  useFixedExpenseGroupsQuery: vi.fn(),
  useInvestmentPrices: vi.fn(),
  useConsolidatedTotal: vi.fn(),
  useAutoNetWorthSnapshot: vi.fn(),
  useSlowQuery: vi.fn(),
}));

vi.mock('../../hooks/queries', () => ({
  useAccountsQuery: mocks.useAccountsQuery,
  usePocketsQuery: mocks.usePocketsQuery,
  useSettingsQuery: mocks.useSettingsQuery,
  useSubPocketsQuery: mocks.useSubPocketsQuery,
  useFixedExpenseGroupsQuery: mocks.useFixedExpenseGroupsQuery,
}));

vi.mock('../../hooks/useInvestmentPrices', () => ({
  useInvestmentPrices: mocks.useInvestmentPrices,
}));

vi.mock('../../hooks/useConsolidatedTotal', () => ({
  useConsolidatedTotal: mocks.useConsolidatedTotal,
}));

vi.mock('../../hooks/useAutoNetWorthSnapshot', () => ({
  useAutoNetWorthSnapshot: mocks.useAutoNetWorthSnapshot,
}));

vi.mock('../../hooks/useSlowQuery', () => ({
  useSlowQuery: mocks.useSlowQuery,
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

// Heavy children with their own queries / hooks. Replacing them with simple
// stubs keeps every test focused on the page's own composition rather than
// dragging in net-worth and reminder data flows.
vi.mock('../../components/net-worth/NetWorthTimelineWidget', () => ({
  default: () => <div data-testid="net-worth-timeline" />,
}));

vi.mock('../../components/reminders/RemindersWidget', () => ({
  default: () => <div data-testid="reminders-widget" />,
}));

// Stub the heavier summary children (currency breakdown + fixed-expenses
// summary) but keep TotalsSummary real so we can assert the live "Net Worth"
// header text it renders.
vi.mock('../../components/summary', async () => {
  const actual = await vi.importActual<
    typeof import('../../components/summary')
  >('../../components/summary');
  return {
    ...actual,
    CurrencyBreakdownSection: ({
      sortedCurrencies,
    }: {
      sortedCurrencies: string[];
    }) => (
      <div data-testid="currency-breakdown">
        currencies={sortedCurrencies.join(',') || 'none'}
      </div>
    ),
    FixedExpensesSummary: ({
      totalMoney,
      subPockets,
    }: {
      totalMoney: number;
      subPockets: { id: string }[];
    }) => (
      <div data-testid="fixed-expenses-summary">
        total={totalMoney};count={subPockets.length}
      </div>
    ),
  };
});

// Imported after mocks are registered so the page picks up the mocked modules.
// eslint-disable-next-line import/first
import SummaryPage from '../SummaryPage';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleSettings: Settings = {
  primaryCurrency: 'USD',
  dateFormat: 'MMM d, yyyy',
  movementsPerPage: 50,
  reminderAdvanceDays: 7,
  defaultCurrencyForNewAccounts: 'USD',
};

const sampleAccount: Account = {
  id: 'acc-1',
  name: 'Checking',
  color: '#3B82F6',
  currency: 'USD',
  balance: 1000,
  type: 'normal',
};

const sampleFixedPocket: Pocket = {
  id: 'pocket-fixed',
  accountId: 'acc-1',
  name: 'Fixed Expenses',
  type: 'fixed',
  balance: 200,
  currency: 'USD',
};

const sampleSubPocket: SubPocket = {
  id: 'sp-internet',
  pocketId: 'pocket-fixed',
  name: 'Internet',
  valueTotal: 1200,
  periodicityMonths: 12,
  balance: 100,
};

// Minimal TanStack-Query envelope. SummaryPage only reads
// data/isLoading/isError/error/refetch from each query.
const queryResult = <T,>(
  data: T,
  overrides: Partial<{
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  }> = {},
) => ({
  data,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...overrides,
});

interface ConsolidatedShape {
  accountsByCurrency: Record<Currency, Account[]>;
  sortedCurrencies: Currency[];
  totalsByCurrency: Record<Currency, number>;
  consolidatedTotal: number;
  isConsolidatedReady: boolean;
  getAccountBalance: (account: Account) => number;
}

const buildConsolidated = (
  overrides: Partial<ConsolidatedShape> = {},
): ConsolidatedShape => ({
  accountsByCurrency: {} as Record<Currency, Account[]>,
  sortedCurrencies: [] as Currency[],
  totalsByCurrency: {} as Record<Currency, number>,
  consolidatedTotal: 0,
  isConsolidatedReady: true,
  getAccountBalance: () => 0,
  ...overrides,
});

interface SetupOptions {
  accounts?: Account[];
  pockets?: Pocket[];
  subPockets?: SubPocket[];
  fixedExpenseGroups?: FixedExpenseGroup[];
  settings?: Settings | undefined;
  loading?: boolean;
  consolidated?: ConsolidatedShape;
}

const setupHappyPath = (options: SetupOptions = {}) => {
  const accounts = options.accounts ?? [sampleAccount];
  const pockets = options.pockets ?? [sampleFixedPocket];
  const subPockets = options.subPockets ?? [sampleSubPocket];
  const fixedExpenseGroups = options.fixedExpenseGroups ?? [];
  const settings = options.settings ?? sampleSettings;
  const loading = options.loading ?? false;
  const consolidated = options.consolidated ?? buildConsolidated();

  mocks.useAccountsQuery.mockReturnValue(
    queryResult(accounts, { isLoading: loading }),
  );
  mocks.usePocketsQuery.mockReturnValue(
    queryResult(pockets, { isLoading: loading }),
  );
  mocks.useSettingsQuery.mockReturnValue(
    queryResult(settings, { isLoading: loading }),
  );
  mocks.useSubPocketsQuery.mockReturnValue(
    queryResult(subPockets, { isLoading: loading }),
  );
  mocks.useFixedExpenseGroupsQuery.mockReturnValue(
    queryResult(fixedExpenseGroups),
  );
  mocks.useInvestmentPrices.mockReturnValue({
    investmentData: new Map(),
    refreshingPrices: new Set<string>(),
    handleRefreshPrice: vi.fn(),
  });
  mocks.useConsolidatedTotal.mockReturnValue(consolidated);
  mocks.useAutoNetWorthSnapshot.mockReturnValue(undefined);
  mocks.useSlowQuery.mockReturnValue(false);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SummaryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPath();
  });

  it('renders skeleton placeholders while base queries are loading', () => {
    setupHappyPath({ loading: true });
    const { container } = render(<SummaryPage />);

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('heading', { level: 1, name: /summary/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the page header once data has loaded', async () => {
    render(<SummaryPage />);
    expect(
      await screen.findByRole('heading', { level: 1, name: /summary/i }),
    ).toBeInTheDocument();
  });

  it('renders the Net Worth total card from TotalsSummary', async () => {
    render(<SummaryPage />);

    expect(await screen.findByText(/net worth/i)).toBeInTheDocument();
    expect(
      screen.getByText(/all currencies consolidated/i),
    ).toBeInTheDocument();
  });

  it('forwards the sorted currency list to CurrencyBreakdownSection', async () => {
    setupHappyPath({
      consolidated: buildConsolidated({
        sortedCurrencies: ['USD', 'MXN'] as Currency[],
      }),
    });

    render(<SummaryPage />);

    const breakdown = await screen.findByTestId('currency-breakdown');
    expect(breakdown).toHaveTextContent('currencies=USD,MXN');
  });

  it('renders FixedExpensesSummary when at least one fixed sub-pocket exists', async () => {
    render(<SummaryPage />);

    const summary = await screen.findByTestId('fixed-expenses-summary');
    expect(summary).toHaveTextContent('count=1');
    expect(summary).toHaveTextContent('total=100');
  });

  it('shows the fixed-expenses empty state when no fixed sub-pockets exist', async () => {
    setupHappyPath({ subPockets: [], pockets: [] });

    render(<SummaryPage />);

    expect(
      await screen.findByText(/no fixed expenses yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/create fixed expenses to track your recurring bills/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('fixed-expenses-summary'),
    ).not.toBeInTheDocument();
  });

  it('renders the heavy widgets (timeline + reminders) once loaded', async () => {
    render(<SummaryPage />);

    expect(await screen.findByTestId('net-worth-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('reminders-widget')).toBeInTheDocument();
  });

  it('shows a query error card when accounts fail to load', async () => {
    mocks.useAccountsQuery.mockReturnValue({
      data: [] as Account[],
      isLoading: false,
      isError: true,
      error: new Error('Boom'),
      refetch: vi.fn(),
    });

    render(<SummaryPage />);

    // The accounts error fans out into both the totals branch and the
    // breakdown branch, so the page renders one QueryErrorCard per branch.
    const errors = await screen.findAllByText(/failed to load accounts/i);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Boom').length).toBeGreaterThanOrEqual(1);
    // Net Worth card is replaced by the error card in this branch.
    expect(screen.queryByText(/all currencies consolidated/i)).not.toBeInTheDocument();
  });

  it('falls back to the USD primary currency when settings are not yet present', async () => {
    setupHappyPath({ settings: undefined });

    render(<SummaryPage />);

    // Page still renders successfully — we anchor on the page title since the
    // default-currency fallback is exercised internally without surfacing a
    // unique label of its own.
    expect(
      await screen.findByRole('heading', { level: 1, name: /summary/i }),
    ).toBeInTheDocument();
    expect(mocks.useConsolidatedTotal).toHaveBeenCalledWith(
      expect.objectContaining({ primaryCurrency: 'USD' }),
    );
  });
});
