import { useEffect, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import type { Movement, MovementType, Account, Pocket, SubPocket } from '../types';
import { Plus, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, Filter, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Input from '../components/Input';
import { Skeleton, SkeletonTable } from '../components/Skeleton';
import Select from '../components/Select';
import Card from '../components/Card';
import ConfirmDialog from '../components/ConfirmDialog';

const MovementsPage = () => {
  const {
    accounts,
    pockets,
    subPockets,
    movements,
    loadAccounts,
    loadMovements,
    createMovement,
    updateMovement,
    deleteMovement,
    applyPendingMovement,
    getPocketsByAccount,
    getSubPocketsByPocket,
  } = useFinanceStore();

  const toast = useToast();
  const { confirm, confirmState, handleClose, handleConfirm } = useConfirm();
  const [showForm, setShowForm] = useState(false);
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
  
  // Advanced filters
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterPocket, setFilterPocket] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'investment'>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | '7days' | '30days' | '3months' | '6months' | 'year' | 'custom'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterMinAmount, setFilterMinAmount] = useState<string>('');
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // loadAccounts now loads accounts, pockets, and subPockets in one call
        await Promise.all([
          loadAccounts(),
          loadMovements(),
        ]);
      } catch (err) {
        console.error('Failed to load data:', err);
        toast.error('Failed to load movements data');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [loadAccounts, loadMovements]); // Removed toast from dependencies - it shouldn't trigger reloads

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

  // Filter movements based on all criteria
  const filteredMovements = movements.filter(movement => {
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
      const isInvestment = movement.type === 'InvestmentIngreso' || movement.type === 'InvestmentShares';
      
      if (filterType === 'income' && !isIncome) return false;
      if (filterType === 'expense' && !isExpense) return false;
      if (filterType === 'investment' && !isInvestment) return false;
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

  // Get movements grouped by month
  const movementsByMonth = Array.from(
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

  // Sort movements within each month by createdAt
  movementsByMonth.forEach(([, monthMovements]) => {
    monthMovements.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  });

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
      case 'InvestmentIngreso':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700';
      case 'InvestmentShares':
        return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700';
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
      case 'InvestmentIngreso':
        return 'Investment Deposit';
      case 'InvestmentShares':
        return 'Investment Shares';
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
    const displayedDate = formData.get('displayedDate') as string;
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
        toast.success(isPending ? 'Pending movement created successfully!' : 'Movement created successfully!');
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

  const selectedAccount = selectedAccountId
    ? accounts.find((acc) => acc.id === selectedAccountId)
    : null;
  const isInvestmentAccount = selectedAccount?.type === 'investment';

  const availablePockets = selectedAccountId
    ? getPocketsByAccount(selectedAccountId)
    : [];
  const fixedPocket = availablePockets.find((p) => p.type === 'fixed');
  const availableSubPockets = fixedPocket && isFixedExpense
    ? getSubPocketsByPocket(fixedPocket.id)
    : [];

  // Movement types depend on account type
  const movementTypes: { value: MovementType; label: string }[] = isInvestmentAccount
    ? [
        { value: 'InvestmentIngreso', label: 'Invest Money' },
        { value: 'InvestmentShares', label: 'Add Shares' },
      ]
    : [
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

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
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
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'More Filters'}
            </Button>
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

      {/* Movements List */}
      {movementsByMonth.length === 0 ? (
        <Card padding="lg" className="text-center text-gray-500 dark:text-gray-400">
          No movements yet. Create your first movement!
        </Card>
      ) : (
        <div className="space-y-6">
          {movementsByMonth.map(([monthKey, monthMovements]) => {
            const date = parseISO(`${monthKey}-01`);
            return (
              <Card key={monthKey} padding="md">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                  {format(date, 'MMMM yyyy')}
                </h2>
                <div className="space-y-2">
                  {monthMovements.map((movement) => {
                    const account = getAccount(movement.accountId);
                    const pocket = getPocket(movement.pocketId);
                    const subPocket = movement.subPocketId
                      ? getSubPocket(movement.subPocketId)
                      : null;
                    const isIncome =
                      movement.type === 'IngresoNormal' ||
                      movement.type === 'IngresoFijo' ||
                      movement.type === 'InvestmentIngreso';

                    return (
                      <div
                        key={movement.id}
                        className={`p-4 rounded-lg border-2 ${
                          movement.isPending 
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600 opacity-75' 
                            : getMovementTypeColor(movement.type)
                        }`}
                      >
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
                    );
                  })}
                </div>
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
