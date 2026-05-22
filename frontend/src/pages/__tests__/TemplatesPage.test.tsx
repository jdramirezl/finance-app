import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import userEvent from '@testing-library/user-event';
import type { Account, MovementTemplate, Pocket } from '../../types';

// ---------------------------------------------------------------------------
// Module mocks
//
// TemplatesPage composes a handful of query/mutation hooks plus a list/form
// modal pair. We mock the hooks at the module-specifier boundary so each test
// can drive the page into specific states without touching real services.
//
// MovementTemplateForm has its own data dependencies (AccountPocketSelector,
// queries, etc.) — we replace it with a placeholder so the modal-open flow
// can be asserted without dragging in those concerns.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  useMovementTemplatesQuery: vi.fn(),
  useAccountsQuery: vi.fn(),
  usePocketsQuery: vi.fn(),
  useMovementTemplateMutations: vi.fn(),
  // Confirmation dialog
  confirm: vi.fn().mockResolvedValue(true),
  // Mutation handlers (populated per test)
  createMutateAsync: vi.fn(),
  updateMutateAsync: vi.fn(),
  deleteMutateAsync: vi.fn(),
}));

vi.mock('../../hooks/queries', () => ({
  useMovementTemplatesQuery: mocks.useMovementTemplatesQuery,
  useAccountsQuery: mocks.useAccountsQuery,
  usePocketsQuery: mocks.usePocketsQuery,
  useMovementTemplateMutations: mocks.useMovementTemplateMutations,
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

vi.mock('../../contexts/ConfirmDialogContext', () => ({
  useConfirmDialog: () => ({ confirm: mocks.confirm }),
  ConfirmDialogProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// MovementTemplateForm has its own queries/state — replace it with a
// placeholder so we can assert the modal open/close flow without exercising
// the form's internals here.
vi.mock('../../components/movements/MovementTemplateForm', () => ({
  default: ({ initialData }: { initialData?: MovementTemplate | null }) => (
    <div data-testid="movement-template-form">
      mode={initialData ? 'edit' : 'create'};name={initialData?.name ?? ''}
    </div>
  ),
}));

// Imported after mocks are registered so the page picks up the mocked modules.
// eslint-disable-next-line import/first
import TemplatesPage from '../TemplatesPage';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'Checking',
    color: '#3B82F6',
    currency: 'USD',
    balance: 1000,
    type: 'normal',
  },
];

const samplePockets: Pocket[] = [
  {
    id: 'pocket-1',
    accountId: 'acc-1',
    name: 'Savings',
    type: 'normal',
    balance: 600,
    currency: 'USD',
  },
];

const sampleTemplates: MovementTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Monthly Rent',
    type: 'EgresoNormal',
    accountId: 'acc-1',
    pocketId: 'pocket-1',
    defaultAmount: 1200,
    notes: 'Apartment rent',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'tmpl-2',
    name: 'Weekly Groceries',
    type: 'EgresoNormal',
    accountId: 'acc-1',
    pocketId: 'pocket-1',
    defaultAmount: 100,
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

interface SetupOptions {
  templates?: MovementTemplate[];
  accounts?: Account[];
  pockets?: Pocket[];
  loading?: boolean;
}

const setupHappyPath = (options: SetupOptions = {}) => {
  const templates = options.templates ?? sampleTemplates;
  const accounts = options.accounts ?? sampleAccounts;
  const pockets = options.pockets ?? samplePockets;
  const loading = options.loading ?? false;

  mocks.useMovementTemplatesQuery.mockReturnValue({
    data: templates,
    isLoading: loading,
  });
  mocks.useAccountsQuery.mockReturnValue({ data: accounts, isLoading: false });
  mocks.usePocketsQuery.mockReturnValue({ data: pockets, isLoading: false });
  mocks.useMovementTemplateMutations.mockReturnValue({
    createMovementTemplate: { mutateAsync: mocks.createMutateAsync },
    updateMovementTemplate: { mutateAsync: mocks.updateMutateAsync },
    deleteMovementTemplate: { mutateAsync: mocks.deleteMutateAsync },
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.createMutateAsync.mockResolvedValue(undefined);
    mocks.updateMutateAsync.mockResolvedValue(undefined);
    mocks.deleteMutateAsync.mockResolvedValue(undefined);
    setupHappyPath();
  });

  it('renders skeleton placeholders while templates are loading', () => {
    setupHappyPath({ loading: true });
    const { container } = render(<TemplatesPage />);

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('heading', { level: 1, name: /movement templates/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the page header and "New Template" button when loaded', async () => {
    render(<TemplatesPage />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /movement templates/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /new template/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /manage your saved transaction templates for quick entry/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders the template list with each template name and account/pocket', async () => {
    render(<TemplatesPage />);

    expect(await screen.findByText('Monthly Rent')).toBeInTheDocument();
    expect(screen.getByText('Weekly Groceries')).toBeInTheDocument();
    // Each card surfaces account + pocket names; "Checking" and "Savings"
    // appear once per card so we use getAllByText to assert count.
    expect(screen.getAllByText('Checking').length).toBe(sampleTemplates.length);
    expect(screen.getAllByText('Savings').length).toBe(sampleTemplates.length);
  });

  it('shows the empty state when there are no templates', async () => {
    setupHappyPath({ templates: [] });

    render(<TemplatesPage />);

    expect(
      await screen.findByRole('heading', { level: 3, name: /no templates yet/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/create your first template to speed up transaction entry/i),
    ).toBeInTheDocument();
    // Empty state CTA is its own button with literal "Create Template" label.
    expect(
      screen.getByRole('button', { name: /^create template$/i }),
    ).toBeInTheDocument();
  });

  it('opens the create modal when the header "New Template" button is clicked', async () => {
    const user = userEvent.setup();
    render(<TemplatesPage />);

    await user.click(
      await screen.findByRole('button', { name: /new template/i }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(document.getElementById('modal-title')).toHaveTextContent(
      /^new template$/i,
    );

    const form = await screen.findByTestId('movement-template-form');
    expect(form).toHaveTextContent('mode=create');
  });

  it('opens the create modal from the empty-state CTA', async () => {
    setupHappyPath({ templates: [] });

    const user = userEvent.setup();
    render(<TemplatesPage />);

    await user.click(
      await screen.findByRole('button', { name: /^create template$/i }),
    );

    expect(await screen.findByTestId('movement-template-form')).toHaveTextContent(
      'mode=create',
    );
  });

  it('opens the edit modal pre-populated with the template when Edit is clicked', async () => {
    const user = userEvent.setup();
    render(<TemplatesPage />);

    await user.click(
      await screen.findByRole('button', { name: /edit template monthly rent/i }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(document.getElementById('modal-title')).toHaveTextContent(
      /^edit template$/i,
    );

    const form = await screen.findByTestId('movement-template-form');
    expect(form).toHaveTextContent('mode=edit');
    expect(form).toHaveTextContent('name=Monthly Rent');
    // The template-form mock receives the template as initialData, so the
    // dialog's title should be the edit-mode label.
    expect(dialog).toHaveTextContent(/edit template/i);
  });

  it('confirms then deletes a template when Delete is clicked', async () => {
    const user = userEvent.setup();
    render(<TemplatesPage />);

    await user.click(
      await screen.findByRole('button', {
        name: /delete template monthly rent/i,
      }),
    );

    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete Template',
        message: expect.stringContaining('Monthly Rent'),
        variant: 'danger',
      }),
    );

    await waitFor(() => {
      expect(mocks.deleteMutateAsync).toHaveBeenCalledWith('tmpl-1');
    });
  });

  it('does not delete a template when the confirmation is cancelled', async () => {
    mocks.confirm.mockResolvedValueOnce(false);

    const user = userEvent.setup();
    render(<TemplatesPage />);

    await user.click(
      await screen.findByRole('button', {
        name: /delete template monthly rent/i,
      }),
    );

    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.deleteMutateAsync).not.toHaveBeenCalled();
  });
});
