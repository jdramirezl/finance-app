import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import userEvent from '@testing-library/user-event';
import type { Account, Pocket } from '../../types';

// Hoisted mocks: declared before any vi.mock factory runs so the mocks
// returned from those factories share these references across modules.
const mocks = vi.hoisted(() => ({
  useAccountsQuery: vi.fn(),
  usePocketsQuery: vi.fn(),
  useSettingsQuery: vi.fn(),
  useAccountMutations: vi.fn(),
  usePocketMutations: vi.fn(),
  useAccountActions: vi.fn(),
  // Action handlers returned from the mocked useAccountActions.
  handleCreateAccount: vi.fn(),
  handleUpdateAccount: vi.fn(),
  handleCreateCD: vi.fn(),
  handleUpdateCD: vi.fn(),
  handleDeleteAccount: vi.fn(),
  cascadeOpen: vi.fn(),
  cascadeClose: vi.fn(),
  cascadeConfirm: vi.fn(),
  setDeleteMovements: vi.fn(),
  reorderMutate: vi.fn(),
  // ConfirmDialog
  confirm: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../hooks/queries', () => ({
  useAccountsQuery: mocks.useAccountsQuery,
  usePocketsQuery: mocks.usePocketsQuery,
  useSettingsQuery: mocks.useSettingsQuery,
  useAccountMutations: mocks.useAccountMutations,
  usePocketMutations: mocks.usePocketMutations,
}));

vi.mock('../../hooks/actions/useAccountActions', () => ({
  useAccountActions: mocks.useAccountActions,
}));

vi.mock('../../contexts/ConfirmDialogContext', () => ({
  useConfirmDialog: () => ({ confirm: mocks.confirm }),
  ConfirmDialogProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// AccountCard renders <SelectableValue> which reads from SelectionContext.
// The page test wrapper doesn't include SelectionProvider, so stub the hook.
vi.mock('../../contexts/SelectionContext', () => ({
  useSelection: () => ({
    selectedItems: new Map(),
    toggleSelection: vi.fn(),
    clearSelection: vi.fn(),
    isSelected: () => false,
  }),
  SelectionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Imported after vi.mock so the mocked modules are wired up.
import AccountsPage from '../AccountsPage';

const sampleAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'Checking Account',
    color: '#3B82F6',
    currency: 'USD',
    balance: 1500,
    type: 'normal',
    displayOrder: 0,
  },
  {
    id: 'acc-2',
    name: 'Savings Account',
    color: '#10B981',
    currency: 'USD',
    balance: 5000,
    type: 'normal',
    displayOrder: 1,
  },
];

const samplePockets: Pocket[] = [];

const buildAccountActions = () => ({
  handleCreateAccount: mocks.handleCreateAccount,
  handleUpdateAccount: mocks.handleUpdateAccount,
  handleCreateCD: mocks.handleCreateCD,
  handleUpdateCD: mocks.handleUpdateCD,
  handleDeleteAccount: mocks.handleDeleteAccount,
  isAccountFormSaving: false,
  isCDFormSaving: false,
  cascadeDelete: {
    isOpen: false,
    accountId: null as string | null,
    isDeleting: false,
    deleteMovements: false,
    setDeleteMovements: mocks.setDeleteMovements,
    open: mocks.cascadeOpen,
    close: mocks.cascadeClose,
    confirm: mocks.cascadeConfirm,
  },
});

interface SetupOptions {
  accounts?: Account[];
  pockets?: Pocket[];
  loading?: boolean;
}

const setupHappyPath = (options: SetupOptions = {}) => {
  const accounts = options.accounts ?? sampleAccounts;
  const pockets = options.pockets ?? samplePockets;
  const loading = options.loading ?? false;

  mocks.useAccountsQuery.mockReturnValue({ data: accounts, isLoading: loading });
  mocks.usePocketsQuery.mockReturnValue({ data: pockets, isLoading: loading });
  mocks.useSettingsQuery.mockReturnValue({
    data: { defaultCurrencyForNewAccounts: 'USD' },
  });
  mocks.useAccountMutations.mockReturnValue({
    createAccount: { isPending: false, mutateAsync: vi.fn() },
    updateAccount: { isPending: false, mutateAsync: vi.fn() },
    deleteAccount: { isPending: false, mutateAsync: vi.fn() },
    deleteAccountCascade: { isPending: false, mutateAsync: vi.fn() },
    reorderAccounts: { mutate: mocks.reorderMutate },
  });
  mocks.usePocketMutations.mockReturnValue({});
  mocks.useAccountActions.mockReturnValue(buildAccountActions());
};

describe('AccountsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPath();
  });

  it('renders skeleton placeholders while accounts or pockets are loading', () => {
    setupHappyPath({ loading: true });
    const { container } = render(<AccountsPage />);

    // Skeletons all use the .animate-pulse utility class
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('heading', { level: 1, name: /accounts/i })
    ).not.toBeInTheDocument();
  });

  it('renders the page header, search input and filter buttons when loaded', async () => {
    render(<AccountsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /accounts/i })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /create new account/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search accounts\.\.\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^investment$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^normal$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cd$/i })).toBeInTheDocument();
  });

  it('renders the account list with names from the query', async () => {
    render(<AccountsPage />);

    expect(await screen.findByText('Checking Account')).toBeInTheDocument();
    expect(screen.getByText('Savings Account')).toBeInTheDocument();
  });

  it('shows the empty state when there are no accounts', async () => {
    setupHappyPath({ accounts: [] });
    render(<AccountsPage />);

    expect(await screen.findByText(/no accounts yet/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^create account$/i })
    ).toBeInTheDocument();
    expect(screen.queryByText('Checking Account')).not.toBeInTheDocument();
  });

  it('opens the create modal when the header "New Account" button is clicked', async () => {
    const user = userEvent.setup();
    render(<AccountsPage />);

    await user.click(
      await screen.findByRole('button', { name: /create new account/i })
    );

    expect(
      await screen.findByRole('heading', { name: /create new account/i, level: 2 })
    ).toBeInTheDocument();
    // The form should render its required Account Name input
    expect(screen.getByLabelText(/account name/i)).toBeInTheDocument();
  });

  it('opens the create modal from the empty state CTA', async () => {
    setupHappyPath({ accounts: [] });
    const user = userEvent.setup();
    render(<AccountsPage />);

    await user.click(
      await screen.findByRole('button', { name: /^create account$/i })
    );

    expect(
      await screen.findByRole('heading', { name: /create new account/i, level: 2 })
    ).toBeInTheDocument();
  });

  it('opens the edit modal pre-populated with the account when Edit is clicked', async () => {
    const user = userEvent.setup();
    render(<AccountsPage />);

    const editButtons = await screen.findAllByRole('button', { name: /^edit$/i });
    expect(editButtons.length).toBe(sampleAccounts.length);

    await user.click(editButtons[0]);

    expect(
      await screen.findByRole('heading', { name: /^edit account$/i, level: 2 })
    ).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/account name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Checking Account');
  });

  it('calls handleDeleteAccount with the account id when Delete is clicked', async () => {
    const user = userEvent.setup();
    render(<AccountsPage />);

    const deleteButtons = await screen.findAllByRole('button', { name: /^delete$/i });
    await user.click(deleteButtons[0]);

    expect(mocks.handleDeleteAccount).toHaveBeenCalledTimes(1);
    expect(mocks.handleDeleteAccount).toHaveBeenCalledWith('acc-1');
  });

  it('filters accounts by name when typing in the search input', async () => {
    const user = userEvent.setup();
    render(<AccountsPage />);

    expect(await screen.findByText('Savings Account')).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(/search accounts\.\.\./i),
      'Checking'
    );

    expect(screen.getByText('Checking Account')).toBeInTheDocument();
    expect(screen.queryByText('Savings Account')).not.toBeInTheDocument();
  });

  it('filters accounts by type when a type filter button is clicked', async () => {
    const cdAccount: Account = {
      id: 'acc-cd',
      name: 'My CD',
      color: '#F59E0B',
      currency: 'USD',
      balance: 0,
      type: 'cd',
      displayOrder: 2,
    };
    setupHappyPath({ accounts: [...sampleAccounts, cdAccount] });

    const user = userEvent.setup();
    render(<AccountsPage />);

    expect(await screen.findByText('Checking Account')).toBeInTheDocument();
    expect(screen.getByText('My CD')).toBeInTheDocument();

    // CD filter should hide non-CD accounts and keep the CD one.
    await user.click(screen.getByRole('button', { name: /^cd$/i }));

    expect(screen.getByText('My CD')).toBeInTheDocument();
    expect(screen.queryByText('Checking Account')).not.toBeInTheDocument();
    expect(screen.queryByText('Savings Account')).not.toBeInTheDocument();
  });

  it('passes accounts and mutations to useAccountActions so deletion flows are wired up', () => {
    render(<AccountsPage />);

    expect(mocks.useAccountActions).toHaveBeenCalled();
    const params = mocks.useAccountActions.mock.calls[0][0] as {
      accounts: Account[];
      mutations: unknown;
    };
    expect(params.accounts).toEqual(sampleAccounts);
    expect(params.mutations).toBeDefined();
  });
});
