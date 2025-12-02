import { useEffect, useState, useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import type { Movement, MovementType, Account, Pocket, SubPocket } from '../types';
import { Plus, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Input from '../components/Input';
import { Skeleton, SkeletonTable } from '../components/Skeleton';
import Select from '../components/Select';
import Card from '../components/Card';
import ConfirmDialog from '../components/ConfirmDialog';
import BatchMovementForm from '../components/BatchMovementForm';

const MovementsPage = () => {
  const {
    accounts,
    pockets,
    subPockets,
    movements,
    movementTemplates,
    orphanedCount: storeOrphanedCount,
    loadAccounts,
    loadMovements,
    loadMovementTemplates,
    createAccount,
    createPocket,
    createMovement,
    updateMovement,
    deleteMovement,
    applyPendingMovement,
    markAsPending,
    createMovementTemplate,
    getPocketsByAccount,
    getSubPocketsByPocket,
    getOrphanedMovements,
    restoreOrphanedMovements,
  } = useFinanceStore();

  const toast = useToast();
  const { confirm, confirmState, handleClose, handleConfirm } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedPocketId, setSelectedPocketId] = useState<string>('');
  const [isFixedExpense, setIsFixedExpense] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Button-level loading
  const [deletingId, setDeletingId] = useState<string | null>(null); // Track which item is being deleted
  const [applyingId, setApplyingId] = useState<string | null>(null); // Track which item is being applied
  const [showPending, setShowPending] = useState<'all' | 'applied' | 'pending'>('all');
  
  // Template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  
  // Advanced filters
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterPocket, setFilterPocket] = useState<string>('all');
  
  // Orphaned movements
  const [showOrphaned, setShowOrphaned] = useState(false);
  const [orphanedMovements, setOrphanedMovements] = useState<Movement[]>([]);
  // Use cached count from store instead of local state
  const orphanedCount = storeOrphanedCount;
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'investment'>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | '7days' | '30days' | '3months' | '6months' | 'year' | 'custom'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterMinAmount, setFilterMinAmount] = useState<string>('');
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting state with localStorage persistence
  type SortField = 'createdAt' | 'displayedDate' | 'amount' | 'type';
  type SortOrder = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>(() => {
    const saved = localStorage.getItem('movementSortField');
    return (saved as SortField) || 'createdAt';
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const saved = localStorage.getItem('movementSortOrder');
    return (saved as SortOrder) || 'asc';
  });
  
  // Bulk selection state
  const [selectedMovementIds, setSelectedMovementIds] = useState<Set<string>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<'account' | 'pocket' | 'date'>('account');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  
  // Collapsible months state - simple UI toggle
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
    // Start with current month expanded
    const currentMonth = format(new Date(), 'yyyy-MM');
    return new Set([currentMonth]);
  });
  
  // Persist sort preferences
  useEffect(() => {
    localStorage.setItem('movementSortField', sortField);
    localStorage.setItem('movementSortOrder', sortOrder);
  }, [sortField, sortOrder]);

  useEffect(() => {
    const loadData = async () => {
      const startTime = performance.now();
      
      setIsLoading(true);
      try {
        // OPTIMIZATION: Skip investment prices since we don't display account balances here
        await Promise.all([loadAccounts(true), loadMovements(), loadMovementTemplates()]);
        
        const totalTime = performance.now() - startTime;
        console.log(`⏱️ [MovementsPage] Total load: ${totalTime.toFixed(0)}ms`);
      } catch (err) {
        console.error('Failed to load data:', err);
        toast.error('Failed to load movements data');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [loadAccounts, loadMovements, loadMovementTemplates]);
  
  // OPTIMIZATION: Orphaned count now loaded in store with movements (no extra query needed)
  
  // Load orphaned movements when showing orphaned section
  useEffect(() => {
    const loadOrphaned = async () => {
      if (showOrphaned) {
        const orphaned = await getOrphanedMovements();
        setOrphanedMovements(orphaned);
      }
    };
    loadOrphaned();
  }, [showOrphaned, getOrphanedMovements]);

  // Calculate date range based on filter
  const getDateRange = () => {
    const now = new Date();
    const ranges: Record<string, { from: Date; to: Date }> = {
      '7days': { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now },
      '30days': { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now },
      '3months': { from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), to: now },
      '6months': { from: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000), to: now },
      'year': { from: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), to: now },
    };
    
    if (filterDateRange === 'custom' && filterDateFrom && filterDateTo) {
      return { from: new Date(filterDateFrom), to: new Date(filterDateTo) };
    }
    
    return filterDateRange !== 'all' ? ranges[filterDateRange] : null;
  };

  // OPTIMIZATION: Memoize filtered movements to avoid recalculating on every render
  const filteredMovements = useMemo(() => {
    return movements.filter(movement => {
      // Pending status filter
      if (showPending === 'pending' && !movement.isPending) return false;
      if (showPending === 'applied' && movement.isPending) return false;
      
      // Account filter
      if (filterAccount !== 'all' && movement.accountId !== filterAccount) return false;
      
      // Pocket filter
      if (filterPocket !== 'all' && movement.pocketId !== filterPocket) return false;
      
      // Type filter (income/expense/investment)
      if (filterType !== 'all') {
        const isIncome = movement.type === 'IngresoNormal' || movement.type === 'IngresoFijo';
        const isExpense = movement.type === 'EgresoNormal' || movement.type === 'EgresoFijo';
        
        if (filterType === 'income' && !isIncome) return false;
        if (filterType === 'expense' && !isExpense) return false;
      }
      
      // Date range filter
      const dateRange = getDateRange();
      if (dateRange) {
        const movementDate = new Date(movement.displayedDate);
        if (movementDate < dateRange.from || movementDate > dateRange.to) return false;
      }
      
      // Search filter (notes)
      if (filterSearch && movement.notes) {
        if (!movement.notes.toLowerCase().includes(filterSearch.toLowerCase())) return false;
      } else if (filterSearch && !movement.notes) {
        return false;
      }
      
      // Amount range filter
      if (filterMinAmount && movement.amount < parseFloat(filterMinAmount)) return false;
      if (filterMaxAmount && movement.amount > parseFloat(filterMaxAmount)) return false;
      
      return true;
    });
  }, [movements, showPending, filterAccount, filterPocket, filterType, filterDateRange, filterDateFrom, filterDateTo, filterSearch, filterMinAmount, filterMaxAmount]);

  // OPTIMIZATION: Memoize grouped movements to avoid recalculating on every render
  // OPTIMIZATION: Memoize grouped movements to avoid recalculating on every render
  const movementsByMonth = useMemo(() => {
    const grouped = Array.from(
      filteredMovements.reduce((acc, movement) => {
        const date = parseISO(movement.displayedDate);
        const monthKey = format(date, 'yyyy-MM');
        if (!acc.has(monthKey)) {
          acc.set(monthKey, []);
        }
        acc.get(monthKey)!.push(movement);
        return acc;
      }, new Map<string, Movement[]>())
    ).sort((a, b) => b[0].localeCompare(a[0])); // Sort months descending

    // Sort movements within each month based on selected sort field and order
    grouped.forEach(([, monthMovements]) => {
      monthMovements.sort((a, b) => {
        let comparison = 0;
        
        switch (sortField) {
          case 'createdAt':
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case 'displayedDate':
            comparison = new Date(a.displayedDate).getTime() - new Date(b.displayedDate).getTime();
            break;
          case 'amount':
            comparison = a.amount - b.amount;
            break;
          case 'type':
            // Sort by type: Income types first, then expense types
            const typeOrder = { IngresoNormal: 0, IngresoFijo: 1, EgresoNormal: 2, EgresoFijo: 3 };
            comparison = typeOrder[a.type] - typeOrder[b.type];
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    });
    
    return grouped;
  }, [filteredMovements, sortField, sortOrder]);

  const getMovementTypeColor = (type: MovementType): string => {
    switch (type) {
      case 'IngresoNormal':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'EgresoNormal':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
      case 'IngresoFijo':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'EgresoFijo':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700';
    }
  };

  const getMovementTypeLabel = (type: MovementType): string => {
    switch (type) {
      case 'IngresoNormal':
        return 'Income';
      case 'EgresoNormal':
        return 'Expense';
      case 'IngresoFijo':
        return 'Fixed Income';
      case 'EgresoFijo':
        return 'Fixed Expense';
      default:
        return type;
    }
  };

  const getAccount = (id: string): Account | undefined => {
    return accounts.find((acc) => acc.id === id);
  };

  const getPocket = (id: string): Pocket | undefined => {
    return pockets.find((p) => p.id === id);
  };

  const getSubPocket = (id: string): SubPocket | undefined => {
    return subPockets.find((sp) => sp.id === id);
  };

  const handleBatchSave = async (rows: Array<{
    id: string;
    type: MovementType;
    accountId: string;
    pocketId: string;
    subPocketId?: string;
    amount: string;
    notes: string;
    displayedDate: string;
    isPending?: boolean;
  }>) => {
    try {
      // Create all movements
      for (const row of rows) {
        await createMovement(
          row.type,
          row.accountId,
          row.pocketId,
          parseFloat(row.amount),
          row.notes || undefined,
          row.displayedDate,
          row.subPocketId,
          row.isPending || false
        );
      }
      
      setShowBatchForm(false);
      const pendingText = rows[0]?.isPending ? ' as pending' : '';
      toast.success(`Successfully created ${rows.length} movement${rows.length > 1 ? 's' : ''}${pendingText}!`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save movements';
      toast.error(errorMessage);
      throw err; // Re-throw so form can handle it
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (!templateId) {
      // Clear form when "Start from scratch" is selected
      setSelectedAccountId('');
      setSelectedPocketId('');
      setIsFixedExpense(false);
      return;
    }
    
    const template = movementTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    // Pre-fill form with template data
    setSelectedAccountId(template.accountId);
    setSelectedPocketId(template.pocketId);
    setIsFixedExpense(template.type === 'IngresoFijo' || template.type === 'EgresoFijo');
    
    // Use setTimeout to ensure form elements are rendered
    setTimeout(() => {
      const form = document.querySelector('form') as HTMLFormElement;
      if (!form) return;
      
      const typeEl = form.elements.namedItem('type') as HTMLSelectElement | null;
      const accountEl = form.elements.namedItem('accountId') as HTMLSelectElement | null;
      const pocketEl = form.elements.namedItem('pocketId') as HTMLSelectElement | null;
      const subPocketEl = form.elements.namedItem('subPocketId') as HTMLSelectElement | null;
      const amountEl = form.elements.namedItem('amount') as HTMLInputElement | null;
      const notesEl = form.elements.namedItem('notes') as HTMLInputElement | null;
      
      if (typeEl) typeEl.value = template.type;
      if (accountEl) accountEl.value = template.accountId;
      if (pocketEl) pocketEl.value = template.pocketId;
      if (subPocketEl && template.subPocketId) subPocketEl.value = template.subPocketId;
      if (amountEl && template.defaultAmount) amountEl.value = template.defaultAmount.toString();
      if (notesEl && template.notes) notesEl.value = template.notes;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true); // Button-level loading only
    const form = e.currentTarget;
    const formData = new FormData(form);

    const type = formData.get('type') as MovementType;
    const accountId = formData.get('accountId') as string;
    const pocketId = formData.get('pocketId') as string;
    const subPocketId = formData.get('subPocketId') as string || undefined;
    const amount = parseFloat(formData.get('amount') as string);
    const notes = formData.get('notes') as string || undefined;
    // Convert date string to ISO format with local timezone to avoid date shifting
    const dateStr = formData.get('displayedDate') as string;
    const displayedDate = new Date(dateStr + 'T00:00:00').toISOString();
    const isPending = formData.get('isPending') === 'on';

    try {
      if (editingMovement) {
        // Optimistic: close form immediately, store handles optimistic update
        setEditingMovement(null);
        setShowForm(false);
        setSelectedAccountId('');
        setSelectedPocketId('');
        setIsFixedExpense(false);
        
        await updateMovement(editingMovement.id, {
          type,
          accountId,
          pocketId,
          subPocketId,
          amount,
          notes,
          displayedDate,
        });
        toast.success('Movement updated successfully!');
      } else {
        // Optimistic: close form immediately, store handles optimistic update
        form.reset();
        setShowForm(false);
        setSelectedAccountId('');
        setSelectedPocketId('');
        setIsFixedExpense(false);
        
        await createMovement(type, accountId, pocketId, amount, notes, displayedDate, subPocketId, isPending);
        
        // Save as template if checkbox is checked
        if (saveAsTemplate && templateName.trim()) {
          try {
            await createMovementTemplate(
              templateName.trim(),
              type,
              accountId,
              pocketId,
              amount,
              notes,
              subPocketId
            );
            toast.success(`Movement created and saved as template "${templateName}"!`);
            setSaveAsTemplate(false);
            setTemplateName('');
          } catch (templateErr) {
            // Movement was created successfully, just template save failed
            toast.warning(`Movement created but template save failed: ${templateErr instanceof Error ? templateErr.message : 'Unknown error'}`);
          }
        } else {
          toast.success(isPending ? 'Pending movement created successfully!' : 'Movement created successfully!');
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save movement';
      setError(errorMessage);
      toast.error(errorMessage);
      // Reopen form on error so user can retry
      setShowForm(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const movement = movements.find(m => m.id === id);
    
    const confirmed = await confirm({
      title: 'Delete Movement',
      message: `Are you sure you want to delete this movement${movement?.notes ? ` "${movement.notes}"` : ''}? This action cannot be undone.`,
      confirmText: 'Delete Movement',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    setError(null);
    setDeletingId(id); // Track which item is being deleted
    try {
      // Optimistic: UI updates immediately via store
      await deleteMovement(id);
      toast.success('Movement deleted successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete movement';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (movement: Movement) => {
    setEditingMovement(movement);
    setSelectedAccountId(movement.accountId);
    const pocket = getPocket(movement.pocketId);
    if (pocket) {
      setSelectedPocketId(movement.pocketId);
      setIsFixedExpense(pocket.type === 'fixed');
    }
    setShowForm(true);
  };

  const handleApplyPending = async (id: string) => {
    const movement = movements.find(m => m.id === id);
    
    const confirmed = await confirm({
      title: 'Apply Pending Movement',
      message: `Apply this pending movement${movement?.notes ? ` "${movement.notes}"` : ''}? This will update account balances.`,
      confirmText: 'Apply Movement',
      cancelText: 'Cancel',
      variant: 'info',
    });

    if (!confirmed) return;

    setError(null);
    setApplyingId(id); // Track which item is being applied
    try {
      // Optimistic: UI updates immediately via store
      await applyPendingMovement(id);
      toast.success('Movement applied successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to apply movement';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setApplyingId(null);
    }
  };

  // Bulk action handlers - optimized to batch operations
  const handleBulkApplyPending = async () => {
    const pendingMovements = Array.from(selectedMovementIds)
      .map(id => movements.find(m => m.id === id))
      .filter(m => m && m.isPending);

    if (pendingMovements.length === 0) {
      toast.warning('No pending movements selected');
      return;
    }

    try {
      // Process all movements in parallel
      await Promise.all(
        pendingMovements.map(movement => 
          movement ? applyPendingMovement(movement.id) : Promise.resolve()
        )
      );
      toast.success(`Applied ${pendingMovements.length} pending movement${pendingMovements.length > 1 ? 's' : ''}!`);
      setSelectedMovementIds(new Set());
    } catch (err) {
      toast.error(`Failed to apply movements: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleBulkMarkPending = async () => {
    const appliedMovements = Array.from(selectedMovementIds)
      .map(id => movements.find(m => m.id === id))
      .filter(m => m && !m.isPending);

    if (appliedMovements.length === 0) {
      toast.warning('No applied movements selected');
      return;
    }

    try {
      // Process all movements in parallel
      await Promise.all(
        appliedMovements.map(movement => 
          movement ? markAsPending(movement.id) : Promise.resolve()
        )
      );
      toast.success(`Marked ${appliedMovements.length} movement${appliedMovements.length > 1 ? 's' : ''} as pending!`);
      setSelectedMovementIds(new Set());
    } catch (err) {
      toast.error(`Failed to mark movements as pending: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMovementIds.size === 0) {
      toast.warning('No movements selected');
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Selected Movements',
      message: `Are you sure you want to delete ${selectedMovementIds.size} movement${selectedMovementIds.size > 1 ? 's' : ''}? This action cannot be undone.`,
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      // Process all deletions in parallel
      await Promise.all(
        Array.from(selectedMovementIds).map(id => deleteMovement(id))
      );
      toast.success(`Deleted ${selectedMovementIds.size} movement${selectedMovementIds.size > 1 ? 's' : ''}!`);
      setSelectedMovementIds(new Set());
    } catch (err) {
      toast.error(`Failed to delete movements: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleBulkEdit = async (field: 'account' | 'pocket' | 'date', value: string) => {
    if (selectedMovementIds.size === 0) {
      toast.warning('No movements selected');
      return;
    }

    try {
      // Process all updates in parallel
      await Promise.all(
        Array.from(selectedMovementIds).map(id => {
          const updates: Partial<Pick<Movement, 'accountId' | 'pocketId' | 'displayedDate'>> = {};
          
          if (field === 'account') {
            updates.accountId = value;
            // When changing account, also need to update pocket to one from the new account
            const newAccountPockets = getPocketsByAccount(value);
            if (newAccountPockets.length > 0) {
              updates.pocketId = newAccountPockets[0].id;
            }
          } else if (field === 'pocket') {
            updates.pocketId = value;
          } else if (field === 'date') {
            updates.displayedDate = value;
          }
          
          return updateMovement(id, updates);
        })
      );
      toast.success(`Updated ${selectedMovementIds.size} movement${selectedMovementIds.size > 1 ? 's' : ''}!`);
      setSelectedMovementIds(new Set());
    } catch (err) {
      toast.error(`Failed to update movements: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const availablePockets = selectedAccountId
    ? getPocketsByAccount(selectedAccountId)
    : [];
  const fixedPocket = availablePockets.find((p) => p.type === 'fixed');
  const availableSubPockets = fixedPocket && isFixedExpense
    ? getSubPocketsByPocket(fixedPocket.id)
    : [];

  // Movement types - same for all accounts (investment accounts use pockets to differentiate)
  const movementTypes: { value: MovementType; label: string }[] = [
    { value: 'IngresoNormal', label: 'Normal Income' },
    { value: 'EgresoNormal', label: 'Normal Expense' },
    { value: 'IngresoFijo', label: 'Fixed Income' },
    { value: 'EgresoFijo', label: 'Fixed Expense' },
  ];

  // Loading state
  if (isLoading) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Movements</h1>
        <div className="flex gap-2">
          {orphanedCount > 0 && (
            <Button
              variant="secondary"
              onClick={() => setShowOrphaned(!showOrphaned)}
            >
              <Trash2 className="w-5 h-5" />
              Orphaned ({orphanedCount})
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => setShowBatchForm(true)}
          >
            <Plus className="w-5 h-5" />
            Batch Add
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowForm(true);
              setEditingMovement(null);
              setSelectedAccountId('');
              setSelectedPocketId('');
              setIsFixedExpense(false);
            }}
          >
            <Plus className="w-5 h-5" />
            New Movement
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Orphaned Movements Section */}
      {showOrphaned && (
        <Card padding="md">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Orphaned Movements
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Movements from deleted accounts/pockets. Click "Restore All" to automatically recreate the account, pockets, and restore all movements.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowOrphaned(false)}
              >
                <X className="w-4 h-4" />
                Close
              </Button>
            </div>

            {orphanedMovements.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No orphaned movements found
              </div>
            ) : (
              <div className="space-y-4">
                {/* Group orphaned movements by account */}
                {Object.entries(
                  orphanedMovements.reduce((groups, movement) => {
                    const key = `${movement.orphanedAccountName}|${movement.orphanedAccountCurrency}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(movement);
                    return groups;
                  }, {} as Record<string, typeof orphanedMovements>)
                ).map(([key, movements]) => {
                  const [accountName, currency] = key.split('|');
                  const totalAmount = movements.reduce((sum, m) => {
                    const isIncome = m.type.includes('Ingreso');
                    return sum + (isIncome ? m.amount : -m.amount);
                  }, 0);
                  
                  // Check if matching account exists
                  const matchingAccount = accounts.find(
                    a => a.name === accountName && a.currency === currency
                  );
                  
                  return (
                    <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {accountName} ({currency})
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {movements.length} movement(s) • Total: ${totalAmount.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={async () => {
                              // Group by pocket to see what we need to create
                              const pocketGroups = movements.reduce((groups, m) => {
                                if (!groups[m.orphanedPocketName || '']) groups[m.orphanedPocketName || ''] = [];
                                groups[m.orphanedPocketName || ''].push(m);
                                return groups;
                              }, {} as Record<string, typeof movements>);
                              
                              const pocketNames = Object.keys(pocketGroups);
                              
                              // Show confirmation with what will be created
                              const willCreateAccount = !matchingAccount;
                              const willCreatePockets = pocketNames.filter(name => 
                                !pockets.find(p => p.accountId === matchingAccount?.id && p.name === name)
                              );
                              
                              const confirmMessage = `This will:\n${
                                willCreateAccount ? `• Create account "${accountName}" (${currency})\n` : ''
                              }${
                                willCreatePockets.length > 0 
                                  ? `• Create ${willCreatePockets.length} pocket(s): ${willCreatePockets.join(', ')}\n` 
                                  : ''
                              }• Restore ${movements.length} movement(s)\n\nContinue?`;
                              
                              if (!await confirm({
                                title: 'Restore Orphaned Movements',
                                message: confirmMessage,
                                variant: 'info'
                              })) {
                                return;
                              }
                              
                              try {
                                // Create account if needed
                                let accountId = matchingAccount?.id;
                                if (!accountId) {
                                  console.log(`🏗️ Creating account "${accountName}" (${currency})`);
                                  await createAccount(accountName, '#3B82F6', currency as any);
                                  // Wait for store to update
                                  await new Promise(resolve => setTimeout(resolve, 100));
                                  // Get fresh account from store
                                  const freshAccounts = useFinanceStore.getState().accounts;
                                  const newAccount = freshAccounts.find(a => a.name === accountName && a.currency === currency);
                                  if (!newAccount) {
                                    console.error('❌ Failed to find newly created account');
                                    toast.error('Failed to create account');
                                    return;
                                  }
                                  accountId = newAccount.id;
                                  console.log(`✅ Created account with ID: ${accountId}`);
                                }
                                
                                // Create pockets and restore movements
                                let restored = 0;
                                for (const [pocketName, pocketMovements] of Object.entries(pocketGroups)) {
                                  // Get fresh pockets from store
                                  const freshPockets = useFinanceStore.getState().pockets;
                                  let pocketId = freshPockets.find(p => p.accountId === accountId && p.name === pocketName)?.id;
                                  
                                  if (!pocketId) {
                                    console.log(`🏗️ Creating pocket "${pocketName}"`);
                                    await createPocket(accountId, pocketName, 'normal');
                                    // Wait for store to update
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    // Get fresh pocket from store
                                    const freshPockets2 = useFinanceStore.getState().pockets;
                                    const newPocket = freshPockets2.find(p => p.accountId === accountId && p.name === pocketName);
                                    if (!newPocket) {
                                      console.error(`❌ Failed to find newly created pocket "${pocketName}"`);
                                      toast.error(`Failed to create pocket "${pocketName}"`);
                                      continue;
                                    }
                                    pocketId = newPocket.id;
                                    console.log(`✅ Created pocket with ID: ${pocketId}`);
                                  }
                                  
                                  console.log(`🔄 Restoring ${pocketMovements.length} movements to pocket ${pocketId}`);
                                  await restoreOrphanedMovements(
                                    pocketMovements.map(m => m.id),
                                    accountId,
                                    pocketId
                                  );
                                  console.log(`✅ Successfully restored ${pocketMovements.length} movements`);
                                  restored += pocketMovements.length;
                                }
                                
                                if (restored > 0) {
                                  const updated = await getOrphanedMovements();
                                  setOrphanedMovements(updated);
                                  // Count is now in store, will update automatically
                                  toast.success(`✨ Restored ${restored} movement(s)!`);
                                }
                              } catch (err) {
                                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                                toast.error(`Failed to restore movements: ${errorMessage}`);
                                console.error('❌ Restoration error:', err);
                              }
                            }}
                          >
                            Restore All
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={async () => {
                              if (await confirm({
                                title: 'Delete All Orphaned Movements',
                                message: `Delete all ${movements.length} movement(s) for "${accountName}"? This cannot be undone.`,
                                variant: 'danger'
                              })) {
                                for (const movement of movements) {
                                  await deleteMovement(movement.id);
                                }
                                const updated = await getOrphanedMovements();
                                setOrphanedMovements(updated);
                                // Count is now in store, will update automatically
                                toast.success(`Deleted ${movements.length} movement(s)`);
                              }
                            }}
                          >
                            Delete All
                          </Button>
                        </div>
                      </div>
                      
                      {/* List movements */}
                      <div className="space-y-2">
                        {movements.map((movement) => (
                          <div
                            key={movement.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded"
                          >
                            <div className="flex items-center gap-3">
                              {movement.type.includes('Ingreso') ? (
                                <ArrowUpCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <ArrowDownCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {movement.orphanedPocketName} • ${movement.amount.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {format(parseISO(movement.displayedDate), 'MMM dd, yyyy')}
                                  {movement.notes && ` • ${movement.notes}`}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Filter Section */}
      <Card padding="md">
        <div className="space-y-4">
          {/* Quick Filters Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={showPending === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowPending('all')}
              >
                All ({movements.length})
              </Button>
              <Button
                variant={showPending === 'applied' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowPending('applied')}
              >
                Applied ({movements.filter(m => !m.isPending).length})
              </Button>
              <Button
                variant={showPending === 'pending' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowPending('pending')}
              >
                Pending ({movements.filter(m => m.isPending).length})
              </Button>
            </div>
            
            {/* Sort and Filter Controls */}
            <div className="flex gap-2 items-center">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="createdAt">Sort: Created Date</option>
                <option value="displayedDate">Sort: Display Date</option>
                <option value="amount">Sort: Amount</option>
                <option value="type">Sort: Type</option>
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
              
              {/* Separator */}
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
                {showFilters ? 'Hide Filters' : 'More Filters'}
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Type Filter */}
                <Select
                  label="Type"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'income', label: 'Income Only' },
                    { value: 'expense', label: 'Expense Only' },
                    { value: 'investment', label: 'Investment Only' },
                  ]}
                />

                {/* Account Filter */}
                <Select
                  label="Account"
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Accounts' },
                    ...accounts.map((acc) => ({
                      value: acc.id,
                      label: acc.name,
                    })),
                  ]}
                />

                {/* Pocket Filter */}
                <Select
                  label="Pocket"
                  value={filterPocket}
                  onChange={(e) => setFilterPocket(e.target.value)}
                  disabled={filterAccount === 'all'}
                  options={[
                    { value: 'all', label: 'All Pockets' },
                    ...(filterAccount !== 'all'
                      ? getPocketsByAccount(filterAccount).map((pocket) => ({
                          value: pocket.id,
                          label: pocket.name,
                        }))
                      : []),
                  ]}
                />

                {/* Date Range Filter */}
                <Select
                  label="Date Range"
                  value={filterDateRange}
                  onChange={(e) => setFilterDateRange(e.target.value as any)}
                  options={[
                    { value: 'all', label: 'All Time' },
                    { value: '7days', label: 'Last 7 Days' },
                    { value: '30days', label: 'Last 30 Days' },
                    { value: '3months', label: 'Last 3 Months' },
                    { value: '6months', label: 'Last 6 Months' },
                    { value: 'year', label: 'Last Year' },
                    { value: 'custom', label: 'Custom Range' },
                  ]}
                />

                {/* Custom Date From */}
                {filterDateRange === 'custom' && (
                  <>
                    <Input
                      label="From Date"
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                    />
                    <Input
                      label="To Date"
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                    />
                  </>
                )}

                {/* Amount Range */}
                <Input
                  label="Min Amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={filterMinAmount}
                  onChange={(e) => setFilterMinAmount(e.target.value)}
                />
                <Input
                  label="Max Amount"
                  type="number"
                  step="0.01"
                  placeholder="No limit"
                  value={filterMaxAmount}
                  onChange={(e) => setFilterMaxAmount(e.target.value)}
                />

                {/* Search */}
                <Input
                  label="Search Notes"
                  type="text"
                  placeholder="Search in notes..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                />
              </div>

              {/* Clear Filters Button */}
              <div className="mt-4 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFilterAccount('all');
                    setFilterPocket('all');
                    setFilterType('all');
                    setFilterDateRange('all');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setFilterSearch('');
                    setFilterMinAmount('');
                    setFilterMaxAmount('');
                  }}
                >
                  <X className="w-4 h-4" />
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredMovements.length} of {movements.length} movements
          </div>
        </div>
      </Card>

      {/* Bulk Actions Toolbar */}
      {selectedMovementIds.size > 0 && (
        <Card padding="md" className="sticky top-4 z-10 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 dark:text-blue-100">
                {selectedMovementIds.size} selected
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={handleBulkDelete}
              >
                Delete
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkApplyPending}
              >
                Apply Pending
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkMarkPending}
              >
                Mark as Pending
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowBulkEditModal(true)}
              >
                Edit Attribute
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMovementIds(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        </Card>
      )}

      {/* Movements List */}
      {movementsByMonth.length === 0 ? (
        <Card padding="lg" className="text-center text-gray-500 dark:text-gray-400">
          No movements yet. Create your first movement!
        </Card>
      ) : (
        <div className="space-y-6">
          {movementsByMonth.map(([monthKey, monthMovements]) => {
            const date = parseISO(`${monthKey}-01`);
            const isExpanded = expandedMonths.has(monthKey);
            
            return (
              <Card key={monthKey} padding="md">
                {/* Month Header - Always Visible */}
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 -m-4 p-4 rounded-lg transition-colors"
                  onClick={() => {
                    const newExpanded = new Set(expandedMonths);
                    if (isExpanded) {
                      newExpanded.delete(monthKey);
                    } else {
                      newExpanded.add(monthKey);
                    }
                    setExpandedMonths(newExpanded);
                  }}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                      {format(date, 'MMMM yyyy')}
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({monthMovements.length} movement{monthMovements.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  {isExpanded && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent collapse
                        const monthIds = monthMovements.map(m => m.id);
                        const allSelected = monthIds.every(id => selectedMovementIds.has(id));
                        const newSelection = new Set(selectedMovementIds);
                        if (allSelected) {
                          monthIds.forEach(id => newSelection.delete(id));
                        } else {
                          monthIds.forEach(id => newSelection.add(id));
                        }
                        setSelectedMovementIds(newSelection);
                      }}
                    >
                      {monthMovements.every(m => selectedMovementIds.has(m.id)) ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>

                {/* Movements List - Only When Expanded */}
                {isExpanded && (
                  <div className="space-y-2 mt-4">
                    {monthMovements.map((movement) => {
                    const account = getAccount(movement.accountId);
                    const pocket = getPocket(movement.pocketId);
                    const subPocket = movement.subPocketId
                      ? getSubPocket(movement.subPocketId)
                      : null;
                    const isIncome =
                      movement.type === 'IngresoNormal' ||
                      movement.type === 'IngresoFijo';

                    return (
                      <div
                        key={movement.id}
                        className={`p-4 rounded-lg border-2 ${
                          selectedMovementIds.has(movement.id)
                            ? 'ring-2 ring-blue-500 ring-offset-2'
                            : ''
                        } ${
                          movement.isPending 
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600 opacity-75' 
                            : getMovementTypeColor(movement.type)
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedMovementIds.has(movement.id)}
                            onChange={(e) => {
                              const newSelection = new Set(selectedMovementIds);
                              if (e.target.checked) {
                                newSelection.add(movement.id);
                              } else {
                                newSelection.delete(movement.id);
                              }
                              setSelectedMovementIds(newSelection);
                            }}
                            className="w-5 h-5 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  {isIncome ? (
                                    <ArrowUpCircle className="w-5 h-5" />
                                  ) : (
                                <ArrowDownCircle className="w-5 h-5" />
                              )}
                              <span className="font-semibold">
                                {getMovementTypeLabel(movement.type)}
                              </span>
                              {movement.isPending && (
                                <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-full">
                                  PENDING
                                </span>
                              )}
                              <span className="text-sm opacity-75">
                                {format(parseISO(movement.displayedDate), 'MMM d, yyyy')}
                              </span>
                            </div>
                            <div className="text-sm space-y-1">
                              <p>
                                <span className="font-medium">Account:</span> {account?.name || 'Unknown'}
                              </p>
                              <p>
                                <span className="font-medium">Pocket:</span> {pocket?.name || 'Unknown'}
                                {subPocket && ` → ${subPocket.name}`}
                              </p>
                              {movement.notes && (
                                <p>
                                  <span className="font-medium">Notes:</span> {movement.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-2xl font-bold">
                              {isIncome ? '+' : '-'}
                              {movement.amount.toLocaleString(undefined, {
                                style: 'currency',
                                currency: account?.currency || 'USD',
                              })}
                            </span>
                                <div className="flex gap-2">
                                  {movement.isPending && (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => handleApplyPending(movement.id)}
                                      loading={applyingId === movement.id}
                                      disabled={applyingId !== null}
                                      className="px-3 py-1 text-sm"
                                    >
                                      Apply
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(movement)}
                                    disabled={deletingId !== null || applyingId !== null}
                                    className="p-2 text-gray-600 hover:text-blue-600 dark:hover:text-blue-400"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(movement.id)}
                                    loading={deletingId === movement.id}
                                    disabled={deletingId !== null || applyingId !== null}
                                    className="p-2 text-gray-600 hover:text-red-600 dark:hover:text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Movement Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingMovement(null);
          setSelectedAccountId('');
          setSelectedPocketId('');
          setIsFixedExpense(false);
        }}
        title={editingMovement ? 'Edit Movement' : 'New Movement'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Template Selector - Only show when creating new movement */}
          {!editingMovement && movementTemplates.length > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Select
                label="Use Template (optional)"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                options={[
                  { value: '', label: 'Start from scratch' },
                  ...movementTemplates.map(t => ({
                    value: t.id,
                    label: `${t.name} - ${t.defaultAmount ? `$${t.defaultAmount}` : 'No amount'}`,
                  })),
                ]}
              />
            </div>
          )}

          <Select
            label="Type"
            name="type"
            defaultValue={editingMovement?.type || 'IngresoNormal'}
            onChange={(e) => {
              const type = e.target.value as MovementType;
              if (type === 'IngresoFijo' || type === 'EgresoFijo') {
                const fixedPocket = pockets.find((p) => p.type === 'fixed');
                if (fixedPocket) {
                  setSelectedAccountId(fixedPocket.accountId);
                  setSelectedPocketId(fixedPocket.id);
                  setIsFixedExpense(true);
                }
              }
            }}
            options={movementTypes.map(mt => ({ value: mt.value, label: mt.label }))}
            required
          />

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Account</label>
            <select
              name="accountId"
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setSelectedPocketId('');
                setIsFixedExpense(false);
              }}
              required
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            >
              <option value="">Select an account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency}){account.type === 'investment' ? ' - Investment' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedAccountId && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Pocket</label>
              <select
                name="pocketId"
                value={selectedPocketId}
                onChange={(e) => {
                  const pocket = availablePockets.find((p) => p.id === e.target.value);
                  setSelectedPocketId(e.target.value);
                  setIsFixedExpense(pocket?.type === 'fixed' || false);
                }}
                required
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              >
                <option value="">Select a pocket</option>
                {availablePockets.map((pocket) => (
                  <option key={pocket.id} value={pocket.id}>
                    {pocket.name} ({pocket.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {isFixedExpense && fixedPocket && availableSubPockets.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Sub-Pocket (Fixed Expense)</label>
              <select
                name="subPocketId"
                defaultValue={editingMovement?.subPocketId || ''}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              >
                <option value="">None</option>
                {availableSubPockets.map((subPocket) => (
                  <option key={subPocket.id} value={subPocket.id}>
                    {subPocket.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={editingMovement?.amount?.toString() || ''}
            required
          />

          <Input
            label="Date"
            name="displayedDate"
            type="date"
            defaultValue={
              editingMovement
                ? format(parseISO(editingMovement.displayedDate), 'yyyy-MM-dd')
                : format(new Date(), 'yyyy-MM-dd')
            }
            required
          />

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Notes (optional)</label>
            <textarea
              name="notes"
              defaultValue={editingMovement?.notes || ''}
              rows={3}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isPending"
              id="isPending"
              defaultChecked={editingMovement?.isPending || false}
              className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <label htmlFor="isPending" className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Pending (don't apply to balance yet)
            </label>
          </div>

          {/* Save as Template - Only show when creating new movement and no template selected */}
          {!editingMovement && !selectedTemplateId && (
            <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saveAsTemplate"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="saveAsTemplate" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Save as template for future use
                </label>
              </div>
              {saveAsTemplate && (
                <Input
                  label="Template Name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Monthly Rent, Grocery Shopping"
                  required={saveAsTemplate}
                />
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              loading={isSaving}
              className="flex-1"
            >
              {editingMovement ? 'Save Changes' : 'Create Movement'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setEditingMovement(null);
                setSelectedAccountId('');
                setSelectedPocketId('');
                setIsFixedExpense(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Batch Movement Form Modal */}
      <Modal isOpen={showBatchForm} onClose={() => setShowBatchForm(false)}>
        <BatchMovementForm
          accounts={accounts}
          getPocketsByAccount={getPocketsByAccount}
          getSubPocketsByPocket={getSubPocketsByPocket}
          onSave={handleBatchSave}
          onCancel={() => setShowBatchForm(false)}
        />
      </Modal>

      {/* Bulk Edit Modal */}
      <Modal
        isOpen={showBulkEditModal}
        onClose={() => {
          setShowBulkEditModal(false);
          setBulkEditField('account');
          setBulkEditValue('');
        }}
        title="Edit Selected Movements"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Update a single attribute for {selectedMovementIds.size} selected movement{selectedMovementIds.size > 1 ? 's' : ''}
          </p>

          <Select
            label="Field to Edit"
            value={bulkEditField}
            onChange={(e) => {
              setBulkEditField(e.target.value as 'account' | 'pocket' | 'date');
              setBulkEditValue('');
            }}
            options={[
              { value: 'account', label: 'Account' },
              { value: 'pocket', label: 'Pocket' },
              { value: 'date', label: 'Date' },
            ]}
          />

          {bulkEditField === 'account' && (
            <Select
              label="New Account"
              value={bulkEditValue}
              onChange={(e) => setBulkEditValue(e.target.value)}
              options={[
                { value: '', label: 'Select account...' },
                ...accounts.map((account) => ({
                  value: account.id,
                  label: `${account.name} (${account.currency})`,
                })),
              ]}
            />
          )}

          {bulkEditField === 'pocket' && (
            <Select
              label="New Pocket"
              value={bulkEditValue}
              onChange={(e) => setBulkEditValue(e.target.value)}
              options={[
                { value: '', label: 'Select pocket...' },
                ...pockets.map((pocket) => ({
                  value: pocket.id,
                  label: `${pocket.name} (${accounts.find(a => a.id === pocket.accountId)?.name})`,
                })),
              ]}
            />
          )}

          {bulkEditField === 'date' && (
            <Input
              label="New Date"
              type="datetime-local"
              value={bulkEditValue}
              onChange={(e) => setBulkEditValue(e.target.value)}
              required
            />
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowBulkEditModal(false);
                setBulkEditField('account');
                setBulkEditValue('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (bulkEditValue) {
                  handleBulkEdit(bulkEditField, bulkEditValue);
                  setShowBulkEditModal(false);
                  setBulkEditField('account');
                  setBulkEditValue('');
                } else {
                  toast.warning('Please select a value');
                }
              }}
              disabled={!bulkEditValue}
            >
              Update {selectedMovementIds.size} Movement{selectedMovementIds.size > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
      />
    </div>
  );
};

export default MovementsPage;
