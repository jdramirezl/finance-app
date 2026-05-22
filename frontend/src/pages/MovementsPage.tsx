import { useCallback, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import {
  usePocketsQuery,
  useInfiniteMovementsQuery,
  useMovementTemplatesQuery,
  useOrphanedMovementsQuery,
  useSubPocketsQuery,
  useMovementMutations,
  useMovementTemplateMutations,
  useReminderMutations,
} from '../hooks/queries';
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

const EMPTY_POCKETS: Pocket[] = [];
const EMPTY_SUBPOCKETS: SubPocket[] = [];
const EMPTY_MOVEMENTS: Movement[] = [];
const EMPTY_TEMPLATES: MovementTemplate[] = [];
const PAGE_SIZE = 25;

const MovementsPage = () => {
  // Data + mutations
  const { data: pockets = EMPTY_POCKETS } = usePocketsQuery();
  const { data: subPockets = EMPTY_SUBPOCKETS } = useSubPocketsQuery();

  // Server-side filter state for category/tags — drives the API query.
  const [apiCategory, setApiCategory] = useState<string>('all');
  const [apiTags, setApiTags] = useState<string[]>([]);

  const {
    data: infiniteMovements,
    isLoading: movementsLoading,
    hasNextPage: hasMoreMovements,
    fetchNextPage: fetchMoreMovements,
    isFetchingNextPage: isLoadingMoreMovements,
  } = useInfiniteMovementsQuery(undefined, {
    category: apiCategory !== 'all' ? apiCategory : undefined,
    tags: apiTags.length > 0 ? apiTags : undefined,
  });

  const movements = useMemo<Movement[]>(() => {
    if (!infiniteMovements) return EMPTY_MOVEMENTS;
    const flattened: Movement[] = [];
    for (const page of infiniteMovements.pages) {
      for (const m of page.data) {
        if (!m.isOrphaned) flattened.push(m);
      }
    }
    return flattened;
  }, [infiniteMovements]);

  const totalMovements = infiniteMovements?.pages[0]?.total ?? movements.length;

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
  const formState = useMovementFormState(movementTemplates);
  const bulk = useBulkSelection();

  // Pagination state
  const [page, setPage] = useState(1);
  const flatSortedMovements = useMemo(() => {
    return sortedMovementsByMonth.flatMap(([, ms]) => ms);
  }, [sortedMovementsByMonth]);
  const paginatedMovements = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return flatSortedMovements.slice(start, start + PAGE_SIZE);
  }, [flatSortedMovements, page]);
  const filteredCount = flatSortedMovements.length;
  const handlePageChange = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, Math.ceil(filteredCount / PAGE_SIZE))));
  }, [filteredCount]);

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

  // URL-driven filters and form opens
  const expandMonth = useCallback((_monthKey: string) => {}, []);
  useURLActions({
    pockets, subPockets, movementTemplates, templatesLoading,
    formState, setFilters, expandMonth,
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
      formState.openEditForm(movement, pockets.find((p) => p.id === movement.pocketId));
    },
    [formState, pockets]
  );

  // Side panel data
  const activeAccountId = showBatchForm ? batchActiveAccountId : formState.liveValues.accountId;
  const activePocketId = showBatchForm ? batchActivePocketId : formState.liveValues.pocketId;
  const selectedPocketBalance = useMemo(() => {
    const pocket = pockets.find((p) => p.id === activePocketId);
    return pocket ? pocket.balance : null;
  }, [pockets, activePocketId]);
  const balanceDeltas = useBalanceDeltas({ formState, showBatchForm, batchRows });

  const handleValuesChange = useCallback(
    (values: Pick<import('../components/movements/MovementForm').MovementFormData, 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'amount'>) => {
      formState.setLiveValues(values);
    },
    [formState]
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

  const handleLoadMore = useCallback(() => { fetchMoreMovements(); }, [fetchMoreMovements]);

  const handleQuickAddExpand = useCallback(
    (prefill: { amount?: number; notes?: string; type?: MovementType }) => {
      formState.setDefaultValues(prefill);
      formState.openNewForm();
    },
    [formState]
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
  const loadedCount = movements.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Movements</h1>
        <div className="flex gap-2">
          {orphanedCount > 0 && (
            <Button
              variant="secondary"
              onClick={() => setShowOrphaned((v) => !v)}
              className="px-2 sm:px-4"
              aria-label={`${showOrphaned ? 'Hide' : 'Show'} orphaned movements (${orphanedCount})`}
              aria-expanded={showOrphaned}
            >
              <Trash2 className="w-5 h-5" aria-hidden="true" />
              <span className="hidden sm:inline ml-2">Orphaned ({orphanedCount})</span>
            </Button>
          )}
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

      <QuickAddMovement variant="inline" onExpandToFull={handleQuickAddExpand} />

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <OrphanedMovementsPanel
        isOpen={showOrphaned}
        orphanedMovements={orphanedMovements}
        onClose={() => setShowOrphaned(false)}
        onRestoreClick={restore.open}
      />

      <MovementFilters
        showFilters={showFilters} setShowFilters={setShowFilters}
        movements={movements}
        filters={filters}
        setFilters={{
          ...setFilters,
          setCategory: (v: string) => { setFilters.setCategory(v); setApiCategory(v); setPage(1); },
          setTags: (v: string[]) => { setFilters.setTags(v); setApiTags(v); setPage(1); },
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
        movements={paginatedMovements}
        totalCount={filteredCount}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
        sortField={sortField}
        sortOrder={sortOrder}
        setSortField={setSortField}
        setSortOrder={setSortOrder}
        onEdit={handleEditMovement}
        onDelete={handleDelete}
        onApplyPending={handleApplyPending}
        onUpdateAmount={async (id, amount) => { await movementMutations.updateMovement.mutateAsync({ id, updates: { amount } }); }}
        deletingId={deletingId}
        applyingId={applyingId}
        isSelected={bulk.isSelected}
        onToggleSelection={bulk.toggleSelection}
        onSelectAll={bulk.selectAll}
        selectedCount={bulk.selectedCount}
      />

      {hasMoreMovements && (
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {loadedCount} of {totalMovements} movements
          </p>
          <Button
            variant="secondary"
            onClick={handleLoadMore}
            loading={isLoadingMoreMovements}
            disabled={isLoadingMoreMovements}
          >
            {isLoadingMoreMovements ? 'Loading…' : 'Load More'}
          </Button>
        </div>
      )}

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
          activeAccountId, activePocketId, balanceDeltas, selectedPocketBalance,
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
    </div>
  );
};

export default MovementsPage;
