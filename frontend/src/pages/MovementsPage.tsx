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
import { useMovementSubmit } from '../hooks/useMovementSubmit';
import { useMovementRowActions } from '../hooks/useMovementRowActions';
import { useMovementBulkActions } from '../hooks/useMovementBulkActions';
import { useBalanceDeltas } from '../hooks/useBalanceDeltas';
import { useOrphanedRestore } from '../hooks/useOrphanedRestore';
import type { Movement, MovementTemplate, Pocket, SubPocket } from '../types';
import Button from '../components/ui/Button';
import { Skeleton, SkeletonTable } from '../components/ui/Skeleton';
import type { BatchMovementFormRef, BatchMovementRow } from '../components/BatchMovementForm';
import type { MovementFormRef } from '../components/movements/MovementForm';
import MovementFilters from '../components/movements/MovementFilters';
import MovementList from '../components/movements/MovementList';
import OrphanedMovementsPanel from '../components/movements/OrphanedMovementsPanel';
import BulkActionsToolbar from '../components/movements/BulkActionsToolbar';
import MovementFormPanel from '../components/movements/MovementFormPanel';
import RestoreOrphanedModal from '../components/movements/RestoreOrphanedModal';

const EMPTY_POCKETS: Pocket[] = [];
const EMPTY_SUBPOCKETS: SubPocket[] = [];
const EMPTY_MOVEMENTS: Movement[] = [];
const EMPTY_TEMPLATES: MovementTemplate[] = [];

const MovementsPage = () => {
  // Data + mutations
  const { data: pockets = EMPTY_POCKETS } = usePocketsQuery();
  const { data: subPockets = EMPTY_SUBPOCKETS } = useSubPocketsQuery();

  // Movements are loaded incrementally via an infinite query. The first
  // page is fetched on mount; further pages are pulled in by the user
  // via the Load More button below the list.
  const {
    data: infiniteMovements,
    isLoading: movementsLoading,
    hasNextPage: hasMoreMovements,
    fetchNextPage: fetchMoreMovements,
    isFetchingNextPage: isLoadingMoreMovements,
  } = useInfiniteMovementsQuery();

  // Flatten the page list into a single Movement[] for the existing
  // filter/sort hooks, dropping orphaned entries (which are surfaced
  // separately by useOrphanedMovementsQuery / OrphanedMovementsPanel).
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

  // Total movement count (across all pages, server-reported). Falls
  // back to what we've loaded so far if the first page hasn't returned.
  const totalMovements = infiniteMovements?.pages[0]?.total ?? movements.length;

  const { data: movementTemplates = EMPTY_TEMPLATES, isLoading: templatesLoading } = useMovementTemplatesQuery();
  const { data: orphanedMovements = EMPTY_MOVEMENTS } = useOrphanedMovementsQuery();
  const movementMutations = useMovementMutations();
  const { createMovementTemplate } = useMovementTemplateMutations();
  const { markAsPaidMutation } = useReminderMutations();
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  // Filter / sort / selection / form state
  const { filteredMovements, filters, setFilters } = useMovementsFilter({ movements });
  const { sortedMovementsByMonth, sortField, sortOrder, setSortField, setSortOrder } =
    useMovementsSort({ movements: filteredMovements });
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
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    () => new Set([format(new Date(), 'yyyy-MM')])
  );
  const toggleMonth = useCallback((month: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  }, []);
  const expandMonth = useCallback((monthKey: string) => {
    setExpandedMonths((prev) =>
      prev.has(monthKey) ? prev : new Set(prev).add(monthKey)
    );
  }, []);

  // URL-driven filters and form opens
  useURLActions({
    pockets, subPockets, movementTemplates, templatesLoading,
    formState, setFilters, expandMonth,
  });

  // Modal lifecycle: closing tears down both single + batch forms
  const closeForms = useCallback(() => {
    formState.resetFormState();
    setShowBatchForm(false);
    setActiveBatchRowId(null);
    setBatchActiveAccountId('');
    setBatchActivePocketId('');
  }, [formState]);

  // Action hooks (submit / per-row / bulk / restore)
  const { handleSubmit, handleBatchSave, isSaving } = useMovementSubmit({
    formState, closeForms, setShowBatchForm, setError, toast,
    mutations: {
      createMovement: movementMutations.createMovement,
      createTransfer: movementMutations.createTransfer,
      updateMovement: movementMutations.updateMovement,
      createMovementTemplate,
      markAsPaidMutation,
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
    useMovementBulkActions({
      bulk, movements, confirm, toast,
    });
  const restore = useOrphanedRestore({
    restoreMutation: movementMutations.restoreOrphanedMovements,
    toast,
  });

  // Stable handlers passed to memoized MovementList row.
  const handleEditMovement = useCallback(
    (movement: Movement) => {
      formState.openEditForm(
        movement,
        pockets.find((p) => p.id === movement.pocketId)
      );
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

  // Stable handler for the Load More button. Wrapped so we can safely
  // pass it to the Button without leaking the synthetic event into
  // fetchNextPage (which expects no arguments).
  const handleLoadMore = useCallback(() => {
    fetchMoreMovements();
  }, [fetchMoreMovements]);

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
        filters={filters} setFilters={setFilters}
      />

      <BulkActionsToolbar
        selectedCount={bulk.selectedCount}
        onClearSelection={bulk.deselectAll}
        onApplyPending={handleBulkApplyPending}
        onMarkAsPending={handleBulkMarkAsPending}
        onDelete={handleBulkDelete}
      />

      <MovementList
        movementsByMonth={sortedMovementsByMonth}
        sortField={sortField} sortOrder={sortOrder}
        setSortField={setSortField} setSortOrder={setSortOrder}
        expandedMonths={expandedMonths} toggleMonth={toggleMonth}
        selectedMovementIds={bulk.selectedIds}
        toggleSelection={bulk.toggleSelection}
        onEdit={handleEditMovement}
        onDelete={handleDelete}
        onApplyPending={handleApplyPending}
        deletingId={deletingId} applyingId={applyingId}
      />

      {/*
        Load More section: only rendered when the server has more pages.
        Shows the loaded-vs-total count so users understand what's been
        fetched, and disables itself while a page is in flight.
      */}
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
