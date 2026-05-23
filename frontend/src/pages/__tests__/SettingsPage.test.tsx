import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../test/testUtils';
import userEvent from '@testing-library/user-event';
import type { Settings } from '../../types';

// ---------------------------------------------------------------------------
// Module mocks
//
// SettingsPage composes a small set of hooks (useSettingsQuery,
// useUpdateSettings, useSettingsActions, useToast) and a list of section
// components. We mock the hooks at the module boundary so each test can drive
// the page into a specific state. The section components render with their
// real markup so we can assert on labels, headings, and form fields.
//
// AccountPocketSelector — used inside DefaultAccountsSection — has its own
// query dependencies, so we stub it out as a minimal placeholder rather than
// expanding the test surface to cover its data flow.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  useSettingsQuery: vi.fn(),
  useUpdateSettings: vi.fn(),
  useAccountsQuery: vi.fn(),
  usePocketsQuery: vi.fn(),
  useSubPocketsQuery: vi.fn(),
  useSettingsActions: vi.fn(),
}));

vi.mock('../../hooks/queries', () => ({
  useSettingsQuery: mocks.useSettingsQuery,
  useUpdateSettings: mocks.useUpdateSettings,
  useAccountsQuery: mocks.useAccountsQuery,
  usePocketsQuery: mocks.usePocketsQuery,
  useSubPocketsQuery: mocks.useSubPocketsQuery,
}));

vi.mock('../../hooks/actions/useSettingsActions', () => ({
  useSettingsActions: mocks.useSettingsActions,
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

// AccountPocketSelector pulls in its own queries and isn't the subject under
// test here; replace it with a placeholder so DefaultAccountsSection still
// renders cleanly.
vi.mock('../../components/movements/AccountPocketSelector', () => ({
  default: () => <div data-testid="account-pocket-selector" />,
}));

// Imported after mocks are registered so the page picks up the mocked modules.
import SettingsPage from '../SettingsPage';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleSettings: Settings = {
  primaryCurrency: 'USD',
  snapshotFrequency: 'weekly',
  accountCardDisplay: { normal: 'detailed', investment: 'detailed', cd: 'detailed' },
  dateFormat: 'MMM d, yyyy',
  movementsPerPage: 50,
  reminderAdvanceDays: 7,
  defaultCurrencyForNewAccounts: 'USD',
};

type ActionsShape = ReturnType<
  typeof import('../../hooks/actions/useSettingsActions').useSettingsActions
>;

const buildActions = (overrides: Partial<ActionsShape> = {}): ActionsShape => ({
  isExporting: false,
  handleExport: vi.fn(),
  handleCurrencyChange: vi.fn(),
  handleDisplayChange: vi.fn(),
  handleSnapshotFrequencyChange: vi.fn(),
  handleDefaultExpenseChange: vi.fn(),
  handleDefaultIncomeChange: vi.fn(),
  handleDateFormatChange: vi.fn(),
  handleMovementsPerPageChange: vi.fn(),
  handleReminderAdvanceDaysChange: vi.fn(),
  handleDefaultCurrencyChange: vi.fn(),
  ...overrides,
});

interface SetupOptions {
  settings?: Settings | undefined;
  isLoading?: boolean;
  isPending?: boolean;
  actions?: ActionsShape;
}

const setupHappyPath = (options: SetupOptions = {}) => {
  const settings = options.settings ?? sampleSettings;
  const isLoading = options.isLoading ?? false;
  const isPending = options.isPending ?? false;
  const actions = options.actions ?? buildActions();

  mocks.useSettingsQuery.mockReturnValue({
    data: settings,
    isLoading,
    isError: false,
    error: null,
  });
  mocks.useUpdateSettings.mockReturnValue({
    isPending,
    mutateAsync: vi.fn(),
  });
  mocks.useAccountsQuery.mockReturnValue({ data: [], isLoading: false });
  mocks.usePocketsQuery.mockReturnValue({ data: [], isLoading: false });
  mocks.useSubPocketsQuery.mockReturnValue({ data: [], isLoading: false });
  mocks.useSettingsActions.mockReturnValue(actions);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPath();
  });

  it('renders skeleton placeholders while settings are loading', () => {
    setupHappyPath({ settings: undefined, isLoading: true });
    const { container } = render(<SettingsPage />);

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('heading', { level: 3, name: /preferences/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the navigation buttons for every settings section', async () => {
    render(<SettingsPage />);

    expect(
      await screen.findByRole('button', { name: /preferences/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /default accounts/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /display/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /data & privacy/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /about/i })).toBeInTheDocument();
  });

  it('renders the Preferences section by default', async () => {
    render(<SettingsPage />);

    // Section heading and one of its labels — anchors confirm the right
    // section is mounted without coupling to internal layout.
    expect(
      await screen.findByRole('heading', { level: 3, name: /preferences/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/snapshot frequency/i)).toBeInTheDocument();
    expect(screen.getByText(/base currency/i)).toBeInTheDocument();
  });

  it('switches to Default Accounts when its nav button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: /default accounts/i }));

    expect(
      await screen.findByRole('heading', { level: 2, name: /default accounts/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /default for expenses/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /default for income/i }),
    ).toBeInTheDocument();
    // Preferences should no longer be visible when another section is active.
    expect(
      screen.queryByRole('heading', { level: 3, name: /preferences/i }),
    ).not.toBeInTheDocument();
  });

  it('switches to Display when its nav button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: /display/i }));

    expect(
      await screen.findByRole('heading', { level: 3, name: /display/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/regular accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/investment accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/certificate of deposit/i)).toBeInTheDocument();
  });

  it('switches to Data & Privacy and exposes the Export button', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: /data & privacy/i }));

    expect(
      await screen.findByRole('heading', { level: 3, name: /data & privacy/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('switches to the About section when its nav button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: /about/i }));

    expect(
      await screen.findByRole('heading', { level: 3, name: /about/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/financecommand/i)).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });

  it('dispatches handleExport when the Export button is clicked', async () => {
    const handleExport = vi.fn();
    setupHappyPath({ actions: buildActions({ handleExport }) });

    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: /data & privacy/i }));
    await user.click(await screen.findByRole('button', { name: /export/i }));

    expect(handleExport).toHaveBeenCalledTimes(1);
  });

  it('dispatches handleCurrencyChange when the base currency select is changed', async () => {
    const handleCurrencyChange = vi.fn();
    setupHappyPath({ actions: buildActions({ handleCurrencyChange }) });

    const user = userEvent.setup();
    render(<SettingsPage />);

    // The Base Currency select is located via its label text.
    const baseCurrencyLabel = await screen.findByText(/base currency/i);
    const baseCurrencySelect = baseCurrencyLabel.parentElement?.querySelector(
      'select',
    ) as HTMLSelectElement;
    expect(baseCurrencySelect).toBeInTheDocument();

    await user.selectOptions(baseCurrencySelect, 'MXN');

    expect(handleCurrencyChange).toHaveBeenCalledWith('MXN');
  });

  it('dispatches handleSnapshotFrequencyChange when frequency is changed', async () => {
    const handleSnapshotFrequencyChange = vi.fn();
    setupHappyPath({
      actions: buildActions({ handleSnapshotFrequencyChange }),
    });

    const user = userEvent.setup();
    render(<SettingsPage />);

    const snapshotLabel = await screen.findByText(/snapshot frequency/i);
    const snapshotSelect = snapshotLabel.parentElement?.querySelector(
      'select',
    ) as HTMLSelectElement;

    await user.selectOptions(snapshotSelect, 'monthly');

    expect(handleSnapshotFrequencyChange).toHaveBeenCalledWith('monthly');
  });
});
