import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import userEvent from '@testing-library/user-event';

/**
 * MovementsPage is a heavy orchestrator: it composes ~20 hooks and as many
 * child components. Rather than try to render the entire dependency tree, we
 * mock every hook and heavy child at the boundary so the test focuses on the
 * page's own wiring: which props it forwards, which callbacks it triggers,
 * and which branches it takes.
 *
 * Mock state is created with `vi.hoisted` so it's available inside `vi.mock`
 * factories (which Vitest hoists above regular imports). Component mocks
 * capture their props into shared "captor" objects that tests can inspect.
 */

const mocks = vi.hoisted(() => ({
  // Hook mocks
  usePocketsQuery: vi.fn(),
  useSubPocketsQuery: vi.fn(),
  useSettingsQuery: vi.fn(),
  useMovementYearsQuery: vi.fn(),
  useMonthlyMovementsQuery: vi.fn(),
  useMovementTemplatesQuery: vi.fn(),
  useOrphanedMovementsQuery: vi.fn(),
  useMovementMutations: vi.fn(),
  useMovementTemplateMutations: vi.fn(),
  useReminderMutations: vi.fn(),
  useToast: vi.fn(),
  useConfirmDialog: vi.fn(),
  useBulkSelection: vi.fn(),
  useMovementFormState: vi.fn(),
  useURLActions: vi.fn(),
  useMovementsFilter: vi.fn(),
  useMovementsSort: vi.fn(),
  useMovementSubmit: vi.fn(),
  useMovementRowActions: vi.fn(),
  useMovementBulkActions: vi.fn(),
  useBalanceDeltas: vi.fn(),
  useOrphanedRestore: vi.fn(),

  // Prop captors for child components
  yearMonthNavProps: { current: null as Record<string, unknown> | null },
  movementFiltersProps: { current: null as Record<string, unknown> | null },
  bulkActionsToolbarProps: { current: null as Record<string, unknown> | null },
  movementListProps: { current: null as Record<string, unknown> | null },
  movementFormPanelProps: { current: null as Record<string, unknown> | null },
  orphanedPanelProps: { current: null as Record<string, unknown> | null },
  restoreModalProps: { current: null as Record<string, unknown> | null },
  floatingStatsBarProps: { current: null as Record<string, unknown> | null },
  quickAddProps: { current: null as Record<string, unknown> | null },
}));

vi.mock('../../hooks/queries', () => ({
  usePocketsQuery: mocks.usePocketsQuery,
  useSubPocketsQuery: mocks.useSubPocketsQuery,
  useMovementYearsQuery: mocks.useMovementYearsQuery,
  useMonthlyMovementsQuery: mocks.useMonthlyMovementsQuery,
  useMovementTemplatesQuery: mocks.useMovementTemplatesQuery,
  useOrphanedMovementsQuery: mocks.useOrphanedMovementsQuery,
  useMovementMutations: mocks.useMovementMutations,
  useMovementTemplateMutations: mocks.useMovementTemplateMutations,
  useReminderMutations: mocks.useReminderMutations,
}));

vi.mock('../../hooks/queries/useSettingsQuery', () => ({
  useSettingsQuery: mocks.useSettingsQuery,
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: mocks.useToast,
}));

vi.mock('../../contexts/ConfirmDialogContext', () => ({
  useConfirmDialog: mocks.useConfirmDialog,
}));

vi.mock('../../hooks/useBulkSelection', () => ({
  useBulkSelection: mocks.useBulkSelection,
}));

vi.mock('../../hooks/useMovementFormState', () => ({
  useMovementFormState: mocks.useMovementFormState,
}));

vi.mock('../../hooks/useURLActions', () => ({
  useURLActions: mocks.useURLActions,
}));

vi.mock('../../hooks/useMovementsFilter', () => ({
  useMovementsFilter: mocks.useMovementsFilter,
}));

vi.mock('../../hooks/useMovementsSort', () => ({
  useMovementsSort: mocks.useMovementsSort,
}));

vi.mock('../../hooks/actions/useMovementSubmit', () => ({
  useMovementSubmit: mocks.useMovementSubmit,
}));

vi.mock('../../hooks/actions/useMovementRowActions', () => ({
  useMovementRowActions: mocks.useMovementRowActions,
}));

vi.mock('../../hooks/actions/useMovementBulkActions', () => ({
  useMovementBulkActions: mocks.useMovementBulkActions,
}));

vi.mock('../../hooks/useBalanceDeltas', () => ({
  useBalanceDeltas: mocks.useBalanceDeltas,
}));

vi.mock('../../hooks/useOrphanedRestore', () => ({
  useOrphanedRestore: mocks.useOrphanedRestore,
}));

// Heavy children: replaced with prop-captors so we can assert on what the
// page passes them without rendering their internal logic (which itself
// pulls in more hooks and would defeat the boundary).
vi.mock('../../components/movements/YearMonthNav', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.yearMonthNavProps.current = props;
    return <div data-testid="year-month-nav" />;
  },
}));

vi.mock('../../components/movements/QuickAddMovement', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.quickAddProps.current = props;
    return <div data-testid="quick-add" />;
  },
}));

vi.mock('../../components/movements/MovementFilters', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.movementFiltersProps.current = props;
    const setFilters = props.setFilters as {
      setCategory: (v: string) => void;
      setTags: (v: string[]) => void;
    };
    return (
      <div data-testid="movement-filters">
        <button type="button" onClick={() => setFilters.setCategory('food')}>
          set-category
        </button>
        <button type="button" onClick={() => setFilters.setTags(['t1'])}>
          set-tags
        </button>
      </div>
    );
  },
}));

vi.mock('../../components/movements/BulkActionsToolbar', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.bulkActionsToolbarProps.current = props;
    if ((props.selectedCount as number) === 0) return null;
    return (
      <div data-testid="bulk-actions">{props.selectedCount as number} selected</div>
    );
  },
}));

vi.mock('../../components/movements/MovementList', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.movementListProps.current = props;
    return <div data-testid="movement-list" />;
  },
}));

vi.mock('../../components/movements/MovementFormPanel', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.movementFormPanelProps.current = props;
    const batch = props.batch as { showBatchForm: boolean };
    return (
      <div
        data-testid="movement-form-panel"
        data-show-batch={String(batch.showBatchForm)}
      />
    );
  },
}));

vi.mock('../../components/movements/OrphanedMovementsPanel', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.orphanedPanelProps.current = props;
    return null;
  },
}));

vi.mock('../../components/movements/RestoreOrphanedModal', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.restoreModalProps.current = props;
    return null;
  },
}));

vi.mock('../../components/summary/FloatingStatsBar', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.floatingStatsBarProps.current = props;
    return <div data-testid="floating-stats-bar" />;
  },
}));

// Import the page AFTER all vi.mock calls are registered. (vi.mock is hoisted,
// but keeping the import here mirrors the pattern in the other page tests.)
import MovementsPage from '../MovementsPage';

// Builders for the larger mock return shapes, so individual tests can override
// only the fields they care about.
const buildFormState = (overrides: Record<string, unknown> = {}) => ({
  showForm: false,
  setShowForm: vi.fn(),
  editingMovement: null,
  setEditingMovement: vi.fn(),
  selectedTemplateId: '',
  setSelectedTemplateId: vi.fn(),
  defaultValues: {},
  setDefaultValues: vi.fn(),
  reminderId: null,
  setReminderId: vi.fn(),
  reminderDate: null,
  setReminderDate: vi.fn(),
  reminderRecurring: false,
  setReminderRecurring: vi.fn(),
  liveValues: {
    type: 'EgresoNormal' as const,
    accountId: '',
    pocketId: '',
    subPocketId: '',
    amount: '',
  },
  setLiveValues: vi.fn(),
  resetFormState: vi.fn(),
  openNewForm: vi.fn(),
  openEditForm: vi.fn(),
  handleTemplateSelect: vi.fn(),
  ...overrides,
});

const buildBulkSelection = (overrides: Record<string, unknown> = {}) => ({
  selectedIds: new Set<string>(),
  selectedCount: 0,
  isSelected: () => false,
  toggleSelection: vi.fn(),
  selectAll: vi.fn(),
  deselectAll: vi.fn(),
  ...overrides,
});

const buildSetFilters = (overrides: Record<string, unknown> = {}) => ({
  setAccount: vi.fn(),
  setPocket: vi.fn(),
  setType: vi.fn(),
  setDateRange: vi.fn(),
  setDateFrom: vi.fn(),
  setDateTo: vi.fn(),
  setSearch: vi.fn(),
  setMinAmount: vi.fn(),
  setMaxAmount: vi.fn(),
  setShowPending: vi.fn(),
  setCategory: vi.fn(),
  setTags: vi.fn(),
  ...overrides,
});

const buildFilterReturn = (overrides: Record<string, unknown> = {}) => ({
  filteredMovements: [],
  filters: {
    account: 'all',
    pocket: 'all',
    type: 'all',
    dateRange: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
    minAmount: '',
    maxAmount: '',
    showPending: 'all',
    category: 'all',
    tags: [],
  },
  setFilters: buildSetFilters(),
  ...overrides,
});

describe('MovementsPage', () => {
  let formStateValue: ReturnType<typeof buildFormState>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset captors so each test starts from a clean slate.
    mocks.yearMonthNavProps.current = null;
    mocks.movementFiltersProps.current = null;
    mocks.bulkActionsToolbarProps.current = null;
    mocks.movementListProps.current = null;
    mocks.movementFormPanelProps.current = null;
    mocks.orphanedPanelProps.current = null;
    mocks.restoreModalProps.current = null;
    mocks.floatingStatsBarProps.current = null;
    mocks.quickAddProps.current = null;

    // Default hook return values.
    mocks.usePocketsQuery.mockReturnValue({ data: [] });
    mocks.useSubPocketsQuery.mockReturnValue({ data: [] });
    mocks.useSettingsQuery.mockReturnValue({
      data: { primaryCurrency: 'USD', movementsPerPage: 50 },
    });
    mocks.useMovementYearsQuery.mockReturnValue({
      data: {
        years: [
          { year: 2026, months: [1, 2, 3, 4, 5] },
          { year: 2025, months: [12] },
        ],
      },
    });
    mocks.useMonthlyMovementsQuery.mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      isFetching: false,
    });
    mocks.useMovementTemplatesQuery.mockReturnValue({ data: [], isLoading: false });
    mocks.useOrphanedMovementsQuery.mockReturnValue({ data: [] });

    mocks.useMovementMutations.mockReturnValue({
      createMovement: { mutateAsync: vi.fn(), isPending: false },
      createTransfer: { mutateAsync: vi.fn(), isPending: false },
      updateMovement: { mutateAsync: vi.fn(), isPending: false },
      deleteMovement: { mutateAsync: vi.fn(), isPending: false },
      applyPendingMovement: { mutateAsync: vi.fn(), isPending: false },
      markAsPending: { mutateAsync: vi.fn(), isPending: false },
      restoreOrphanedMovements: { mutateAsync: vi.fn(), isPending: false },
    });
    mocks.useMovementTemplateMutations.mockReturnValue({
      createMovementTemplate: { mutateAsync: vi.fn(), isPending: false },
    });
    mocks.useReminderMutations.mockReturnValue({
      markAsPaidMutation: { mutateAsync: vi.fn(), isPending: false },
      createExceptionMutation: { mutateAsync: vi.fn(), isPending: false },
    });

    mocks.useToast.mockReturnValue({
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    });
    mocks.useConfirmDialog.mockReturnValue({
      confirm: vi.fn().mockResolvedValue(true),
    });

    mocks.useBulkSelection.mockReturnValue(buildBulkSelection());

    formStateValue = buildFormState();
    mocks.useMovementFormState.mockReturnValue(formStateValue);

    mocks.useURLActions.mockReturnValue(undefined);

    mocks.useMovementsFilter.mockReturnValue(buildFilterReturn());

    mocks.useMovementsSort.mockReturnValue({
      sortedMovementsByMonth: [],
      sortField: 'displayedDate',
      sortOrder: 'desc',
      setSortField: vi.fn(),
      setSortOrder: vi.fn(),
    });

    mocks.useMovementSubmit.mockReturnValue({
      handleSubmit: vi.fn(),
      handleBatchSave: vi.fn(),
      isSaving: false,
    });
    mocks.useMovementRowActions.mockReturnValue({
      handleDelete: vi.fn(),
      handleApplyPending: vi.fn(),
      deletingId: null,
      applyingId: null,
    });
    mocks.useMovementBulkActions.mockReturnValue({
      handleBulkApplyPending: vi.fn(),
      handleBulkMarkAsPending: vi.fn(),
      handleBulkDelete: vi.fn(),
    });
    mocks.useBalanceDeltas.mockReturnValue({
      accountDeltas: {},
      pocketDeltas: {},
      subPocketDeltas: {},
    });
    mocks.useOrphanedRestore.mockReturnValue({
      modalState: { isOpen: false, movementIds: [], sourceLabel: '' },
      isSubmitting: false,
      open: vi.fn(),
      close: vi.fn(),
      confirmRestore: vi.fn(),
    });
  });

  it('renders the Movements heading and primary buttons without crashing', async () => {
    render(<MovementsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /^movements$/i, level: 1 }),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /batch add movements/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^new movement$/i })).toBeInTheDocument();
  });

  it('renders the major child sections', async () => {
    render(<MovementsPage />);

    await waitFor(() => expect(screen.getByTestId('year-month-nav')).toBeInTheDocument());
    expect(screen.getByTestId('quick-add')).toBeInTheDocument();
    expect(screen.getByTestId('movement-filters')).toBeInTheDocument();
    expect(screen.getByTestId('movement-list')).toBeInTheDocument();
    expect(screen.getByTestId('movement-form-panel')).toBeInTheDocument();
    expect(screen.getByTestId('floating-stats-bar')).toBeInTheDocument();
  });

  it('passes the years from useMovementYearsQuery into YearMonthNav', async () => {
    render(<MovementsPage />);

    await waitFor(() => {
      expect(mocks.yearMonthNavProps.current).not.toBeNull();
    });
    const props = mocks.yearMonthNavProps.current!;
    expect(props.years).toEqual([2026, 2025]);
    expect(typeof props.selectedYear).toBe('number');
    expect(typeof props.selectedMonth).toBe('number');
    expect(typeof props.onSelect).toBe('function');
  });

  it('shows skeletons and hides the heading while movements are loading', async () => {
    mocks.useMonthlyMovementsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
    });

    render(<MovementsPage />);

    // Let the AuthProvider's initial async session resolve so we don't trip
    // the "wrap in act" warning for an unrelated state update.
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /^movements$/i, level: 1 }),
      ).not.toBeInTheDocument();
    });
    // None of the major child sections should render in the loading branch.
    expect(screen.queryByTestId('year-month-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('movement-list')).not.toBeInTheDocument();
  });

  it('opens the new movement form when the New Movement button is clicked', async () => {
    const user = userEvent.setup();
    render(<MovementsPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^new movement$/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /^new movement$/i }));

    expect(formStateValue.openNewForm).toHaveBeenCalledTimes(1);
  });

  it('toggles the batch form on when the Batch Add button is clicked', async () => {
    const user = userEvent.setup();
    render(<MovementsPage />);

    await waitFor(() =>
      expect(mocks.movementFormPanelProps.current).not.toBeNull(),
    );
    expect(
      (mocks.movementFormPanelProps.current!.batch as { showBatchForm: boolean })
        .showBatchForm,
    ).toBe(false);

    await user.click(screen.getByRole('button', { name: /batch add movements/i }));

    await waitFor(() => {
      expect(
        (mocks.movementFormPanelProps.current!.batch as { showBatchForm: boolean })
          .showBatchForm,
      ).toBe(true);
    });
  });

  it('renders the bulk actions toolbar with the selected count when items are selected', async () => {
    mocks.useBulkSelection.mockReturnValue(
      buildBulkSelection({
        selectedIds: new Set(['m1', 'm2', 'm3']),
        selectedCount: 3,
        isSelected: (id: string) => ['m1', 'm2', 'm3'].includes(id),
      }),
    );

    render(<MovementsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('bulk-actions')).toHaveTextContent('3 selected');
    });
    expect(mocks.bulkActionsToolbarProps.current!.selectedCount).toBe(3);
  });

  it('does not render the bulk actions toolbar when nothing is selected', async () => {
    render(<MovementsPage />);

    await waitFor(() => expect(screen.getByTestId('movement-list')).toBeInTheDocument());
    expect(screen.queryByTestId('bulk-actions')).not.toBeInTheDocument();
    expect(mocks.bulkActionsToolbarProps.current!.selectedCount).toBe(0);
  });

  it('forwards filter category and tag changes to the underlying setters', async () => {
    const setCategory = vi.fn();
    const setTags = vi.fn();
    mocks.useMovementsFilter.mockReturnValue(
      buildFilterReturn({ setFilters: buildSetFilters({ setCategory, setTags }) }),
    );

    const user = userEvent.setup();
    render(<MovementsPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'set-category' })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'set-category' }));
    expect(setCategory).toHaveBeenCalledWith('food');

    await user.click(screen.getByRole('button', { name: 'set-tags' }));
    expect(setTags).toHaveBeenCalledWith(['t1']);
  });

  it('renders the Show More button with progress when more pages are available', async () => {
    mocks.useMonthlyMovementsQuery.mockReturnValue({
      data: {
        data: [
          { id: 'a', isOrphaned: false },
          { id: 'b', isOrphaned: false },
        ],
        total: 100,
      },
      isLoading: false,
      isFetching: false,
    });

    render(<MovementsPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /show more/i })).toBeInTheDocument(),
    );
    expect(screen.getByText(/showing 2 of 100 movements/i)).toBeInTheDocument();
  });

  it('hides the Show More button when all movements are loaded', async () => {
    mocks.useMonthlyMovementsQuery.mockReturnValue({
      data: { data: [{ id: 'a', isOrphaned: false }], total: 1 },
      isLoading: false,
      isFetching: false,
    });

    render(<MovementsPage />);

    await waitFor(() => expect(screen.getByTestId('movement-list')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument();
  });

  it('shows the orphaned movements link when orphans exist', async () => {
    mocks.useOrphanedMovementsQuery.mockReturnValue({
      data: [{ id: 'o1' }, { id: 'o2' }],
    });

    render(<MovementsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /2 movements from deleted accounts/i }),
      ).toBeInTheDocument();
    });
  });

  it('passes the primary currency from settings to FloatingStatsBar', async () => {
    mocks.useSettingsQuery.mockReturnValue({
      data: { primaryCurrency: 'MXN', movementsPerPage: 50 },
    });

    render(<MovementsPage />);

    await waitFor(() =>
      expect(mocks.floatingStatsBarProps.current).not.toBeNull(),
    );
    expect(mocks.floatingStatsBarProps.current!.primaryCurrency).toBe('MXN');
  });
});
