import { useCallback, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  usePocketsQuery,
  useMovementTemplatesQuery,
  useOrphanedMovementsQuery,
  useSubPocketsQuery,
  useMovementMutations,
  useMovementTemplateMutations,
  useReminderMutations,
  useMovementYearsQuery,
  useMonthlyMovementsQuery,
} from '../hooks/queries';
import { useSettingsQuery } from '../hooks/queries/useSettingsQuery';
import { useToast } from '../hooks/useToast';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { useMovementFormState } from '../hooks/useMovementFormState';
import { useURLActions } from '../hooks/useURLActions';
import { useMovementsFilter } from '../hooks/useMovementsFilter';
import { useMovementsSort } from '../hooks/useMovementsSort';
import { useMovementSubmit } from '../hooks/actions/useMovementSubmit';
import { useMovementRowActions } from '../hooks/actions/useMovementRowActions';
import { useMovementBulkActions } from '../hooks/actions/useMovementBulkActions';
import { useBalanceDeltas } from '../hooks/useBalanceDeltas';
import { useOrphanedRestore } from '../hooks/useOrphanedRestore';
import type { Movement, MovementTemplate, MovementType, Pocket, SubPocket } from '../types';
import Button from '../components/ui/Button';
import { Skeleton, SkeletonTable } from '../components/ui/Skeleton';
import type { BatchMovementFormRef, BatchMovementRow } from '../components/movements/BatchMovementForm';
import type { MovementFormRef } from '../components/movements/MovementForm';
import MovementFilters from '../components/movements/MovementFilters';
import MovementList from '../components/movements/MovementList';
import OrphanedMovementsPanel from '../components/movements/OrphanedMovementsPanel';
import BulkActionsToolbar from '../components/movements/BulkActionsToolbar';
import MovementFormPanel from '../components/movements/MovementFormPanel';
import RestoreOrphanedModal from '../components/movements/RestoreOrphanedModal';
import QuickAddMovement from '../components/movements/QuickAddMovement';
import YearMonthNav from '../components/movements/YearMonthNav';
import FloatingStatsBar from '../components/summary/FloatingStatsBar';
import { SelectionProvider } from '../contexts/SelectionContext';

const EMPTY_POCKETS: Pocket[] = [];
const EMPTY_SUBPOCKETS: SubPocket[] = [];
const EMPTY_MOVEMENTS: Movement[] = [];
const EMPTY_TEMPLATES: MovementTemplate[] = [];
const DEFAULT_PAGE_SIZE = 50;

const MovementsPage = () => {
  // Data + mutations
  const { data: pockets = EMPTY_POCKETS } = usePocketsQuery();
  const { data: subPockets = EMPTY_SUBPOCKETS } = useSubPocketsQuery();
  const { data: settings } = useSettingsQuery();

  // Year/month/page state
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [currentPage, setCurrentPage] = useState(1);

  // Server-side filter state for category/tags
  const [apiCategory, setApiCategory] = useState<string>('all');
  const [apiTags, setApiTags] = useState<string[]>([]);

  const pageSize = settings?.movementsPerPage ?? DEFAULT_PAGE_SIZE;

  // Fetch years for nav
  const { data: yearsData } = useMovementYearsQuery();
  const years = useMemo(() => yearsData?.years.map((y) => y.year) ?? [], [yearsData]);
  const monthsWithData = useMemo(
    () => yearsData?.years.find((y) => y.year === selectedYear)?.months ?? [],
    [yearsData, selectedYear],
  );

  // Fetch movements for selected month + page (accumulate all pages up to currentPage)
  const {
    data: monthlyData,
    isLoading: movementsLoading,
    isFetching,
  } = useMonthlyMovementsQuery(selectedYear, selectedMonth, 1, currentPage * pageSize, {
    category: apiCategory !== 'all' ? apiCategory : undefined,
    tags: apiTags.length > 0 ? apiTags : undefined,
  });

  const movements = useMemo<Movement[]>(
    () => monthlyData?.data.filter((m) => !m.isOrphaned) ?? EMPTY_MOVEMENTS,
    [monthlyData],
  );
  const totalMovements = monthlyData?.total ?? 0;
  const allLoaded = movements.length >= totalMovements;

  const { data: movementTemplates = EMPTY_TEMPLATES, isLoading: templatesLoading } = useMovementTemplatesQuery();
  const { data: orphanedMovements = EMPTY_MOVEMENTS } = useOrphanedMovementsQuery();
  const movementMutations = useMovementMutations();
  const { createMovementTemplate } = useMovementTemplateMutations();
  const { markAsPaidMutation, createExceptionMutation } = useReminderMutations();
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  // Filter / sort / selection / form state
  const { filteredMovements, filters, setFilters } = useMovementsFilter({ movements });
  const { sortedMovementsByMonth, sortField, sortOrder, setSortField, setSortOrder } =
    useMovementsSort({ movements: filteredMovements });

  // Flatten sorted output (all movements are for one month)
  const sortedMovements = useMemo(
    () => sortedMovementsByMonth.flatMap(([, ms]) => ms),
    [sortedMovementsByMonth],
  );

  const formState = useMovementFormState(movementTemplates);
  const bulk = useBulkSelection();

  // Page-local UI state
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showOrphaned, setShowOrphaned] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const batchFormRef = useRef<BatchMovementFormRef>(null);
  const movementFormRef = useRef<MovementFormRef>(null);
  const [activeBatchRowId, setActiveBatchRowId] = useState<string | null>(null);
  const [batchActiveAccountId, setBatchActiveAccountId] = useState<string>('');
  const [batchActivePocketId, setBatchActivePocketId] = useState<string>('');
  const [batchRows, setBatchRows] = useState<BatchMovementRow[]>([]);

  // Year/month selection handler — resets page to 1, auto-selects available month
  const handleYearMonthSelect = useCallback((year: number, month: number) => {
    setSelectedYear(year);
    const yearEntry = yearsData?.years.find((y) => y.year === year);
    const available = yearEntry?.months ?? [];
    const newMonth = available.includes(month) ? month : (available[0] || month);
    setSelectedMonth(newMonth);
    setCurrentPage(1);
  }, [yearsData]);

  const handleShowMore = useCallback(() => {
    setCurrentPage((p) => p + 1);
  }, []);

  // URL-driven filters and form opens (expandMonth is no-op now)
  useURLActions({
    pockets, subPockets, movementTemplates, templatesLoading,
    formState, setFilters, expandMonth: () => {},
  });

  // Modal lifecycle
  const closeForms = useCallback(() => {
    formState.resetFormState();
    setShowBatchForm(false);
    setActiveBatchRowId(null);
    setBatchActiveAccountId('');
    setBatchActivePocketId('');
  }, [formState]);

  // Action hooks
  const { handleSubmit, handleBatchSave, isSaving } = useMovementSubmit({
    formState, closeForms, setShowBatchForm, setError, toast,
    mutations: {
      createMovement: movementMutations.createMovement,
      createTransfer: movementMutations.createTransfer,
      updateMovement: movementMutations.updateMovement,
      createMovementTemplate,
      markAsPaidMutation,
      createExceptionMutation,
    },
  });
  const { handleDelete, handleApplyPending, deletingId, applyingId } = useMovementRowActions({
    movements, confirm, toast, setError,
    mutations: {
      deleteMovement: movementMutations.deleteMovement,
      applyPendingMovement: movementMutations.applyPendingMovement,
    },
  });
  const { handleBulkApplyPending, handleBulkMarkAsPending, handleBulkDelete } =
    useMovementBulkActions({ bulk, movements, confirm, toast });
  const restore = useOrphanedRestore({
    restoreMutation: movementMutations.restoreOrphanedMovements,
    toast,
  });

  const handleEditMovement = useCallback(
    (movement: Movement) => {
      formState.openEditForm(
        movement,
        pockets.find((p) => p.id === movement.pocketId),
      );
    },
    [formState, pockets],
  );

  // Side panel data
  const activeAccountId = showBatchForm ? batchActiveAccountId : formState.liveValues.accountId;
  const activePocketId = showBatchForm ? batchActivePocketId : formState.liveValues.pocketId;
  const activeSubPocketId = showBatchForm ? '' : formState.liveValues.subPocketId;
  const selectedPocketBalance = useMemo(() => {
    const pocket = pockets.find((p) => p.id === activePocketId);
    return pocket ? pocket.balance : null;
  }, [pockets, activePocketId]);
  const balanceDeltas = useBalanceDeltas({ formState, showBatchForm, batchRows });

  const handleValuesChange = useCallback(
    (values: Pick<import('../components/movements/MovementForm').MovementFormData, 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'amount'>) => {
      formState.setLiveValues(values);
    },
    [formState],
  );

  const handleUseCalculatorAmount = (calculatedAmount: number) => {
    const formatted = calculatedAmount.toFixed(2);
    if (showBatchForm && activeBatchRowId) {
      batchFormRef.current?.updateAmount(activeBatchRowId, formatted);
    } else {
      movementFormRef.current?.setAmount(formatted);
    }
  };
  const handleBatchRowFocus = (row: BatchMovementRow) => {
    setActiveBatchRowId(row.id);
    setBatchActiveAccountId(row.accountId);
    setBatchActivePocketId(row.pocketId);
  };

  const handleQuickAddExpand = useCallback(
    (prefill: { amount?: number; notes?: string; type?: MovementType }) => {
      formState.setDefaultValues(prefill);
      formState.openNewForm();
    },
    [formState],
  );

  if (movementsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <SkeletonTable rows={8} />
      </div>
    );
  }

  const orphanedCount = orphanedMovements.length;

  const primaryCurrency = settings?.primaryCurrency || 'USD';

  return (
    <SelectionProvider>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Movements</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowBatchForm(true)}
            className="px-2 sm:px-4"
            aria-label="Batch add movements"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            <span className="hidden sm:inline ml-2">Batch Add</span>
          </Button>
          <Button variant="primary" onClick={() => formState.openNewForm()} className="hidden md:flex">
            <Plus className="w-5 h-5" aria-hidden="true" />
            New Movement
          </Button>
        </div>
      </div>

      <YearMonthNav
        years={years}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        monthsWithData={monthsWithData}
        onSelect={handleYearMonthSelect}
      />

      <QuickAddMovement variant="inline" onExpandToFull={handleQuickAddExpand} />

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <MovementFilters
        showFilters={showFilters} setShowFilters={setShowFilters}
        movements={movements}
        filters={filters}
        setFilters={{
          ...setFilters,
          setCategory: (v: string) => { setFilters.setCategory(v); setApiCategory(v); setCurrentPage(1); },
          setTags: (v: string[]) => { setFilters.setTags(v); setApiTags(v); setCurrentPage(1); },
        }}
      />

      <BulkActionsToolbar
        selectedCount={bulk.selectedCount}
        onClearSelection={bulk.deselectAll}
        onApplyPending={handleBulkApplyPending}
        onMarkAsPending={handleBulkMarkAsPending}
        onDelete={handleBulkDelete}
      />

      <MovementList
        movements={sortedMovements}
        sortField={sortField} sortOrder={sortOrder}
        setSortField={setSortField} setSortOrder={setSortOrder}
        selectedMovementIds={bulk.selectedIds}
        toggleSelection={bulk.toggleSelection}
        onEdit={handleEditMovement}
        onDelete={handleDelete}
        onApplyPending={handleApplyPending}
        onUpdateAmount={async (id, amount) => { await movementMutations.updateMovement.mutateAsync({ id, updates: { amount } }); }}
        deletingId={deletingId} applyingId={applyingId}
      />

      {!allLoaded && (
        <div className="flex flex-col items-center gap-2 py-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {movements.length} of {totalMovements} movements
          </span>
          <Button variant="secondary" onClick={handleShowMore} disabled={isFetching}>
            {isFetching ? 'Loading...' : 'Show More'}
          </Button>
        </div>
      )}

      {orphanedCount > 0 && !showOrphaned && (
        <div className="text-center py-3 mt-4">
          <button
            onClick={() => setShowOrphaned(true)}
            className="text-xs text-gray-500 dark:text-gray-500 hover:text-gray-300 transition-colors"
          >
            {orphanedCount} movements from deleted accounts • Manage
          </button>
        </div>
      )}

      <OrphanedMovementsPanel
        isOpen={showOrphaned}
        orphanedMovements={orphanedMovements}
        onClose={() => setShowOrphaned(false)}
        onRestoreClick={restore.open}
      />

      <MovementFormPanel
        formState={formState} isSaving={isSaving}
        onSubmit={handleSubmit} onClose={closeForms}
        batch={{
          showBatchForm, batchFormRef,
          onBatchSave: handleBatchSave,
          onBatchRowFocus: handleBatchRowFocus,
          onBatchRowsChange: setBatchRows,
        }}
        sidePanel={{
          activeAccountId, activePocketId, activeSubPocketId, balanceDeltas, selectedPocketBalance,
          onUseCalculatorAmount: handleUseCalculatorAmount,
        }}
        movementFormRef={movementFormRef}
        onValuesChange={handleValuesChange}
      />

      <RestoreOrphanedModal
        isOpen={restore.modalState.isOpen}
        onClose={restore.close}
        movementCount={restore.modalState.movementIds.length}
        sourceLabel={restore.modalState.sourceLabel}
        isSubmitting={restore.isSubmitting}
        onConfirm={restore.confirmRestore}
      />

      <FloatingStatsBar primaryCurrency={primaryCurrency} />
    </div>
    </SelectionProvider>
  );
};

export default MovementsPage;
