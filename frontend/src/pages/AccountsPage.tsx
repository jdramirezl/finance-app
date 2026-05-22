import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Wallet, Search } from 'lucide-react';
import {
  useAccountsQuery,
  usePocketsQuery,
  useAccountMutations,
  usePocketMutations,
} from '../hooks/queries';
import { useToast } from '../hooks/useToast';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { useAccountActions } from '../hooks/actions/useAccountActions';
import type { Account, CDInvestmentAccount } from '../types';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import SortableList from '../components/ui/SortableList';
import SortableItem from '../components/ui/SortableItem';
import { Skeleton, SkeletonList } from '../components/ui/Skeleton';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { AccountCard, AccountForm } from '../components/accounts';
import CDAccountCard from '../components/accounts/CDAccountCard';
import CDAccountForm, {
  type CDFormData,
} from '../components/accounts/CDAccountForm';
import AccountDetailPanel from '../components/accounts/AccountDetailPanel';
import CascadeDeleteDialog from '../components/accounts/CascadeDeleteDialog';

const isCDAccount = (account: Account): account is CDInvestmentAccount =>
  account.type === 'cd';

const AccountsPage = () => {
  const { data: accounts = [], isLoading: accountsLoading } = useAccountsQuery();
  const { data: pockets = [], isLoading: pocketsLoading } = usePocketsQuery();
  const accountMutations = useAccountMutations();
  const pocketMutations = usePocketMutations();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const location = useLocation();

  // Page-level UI state — modal visibility, selected row, in-flight error.
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showCDForm, setShowCDForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingCD, setEditingCD] = useState<CDInvestmentAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'investment' | 'normal' | 'cd'>('all');

  const closeAccountForm = useCallback(() => {
    setShowAccountForm(false);
    setEditingAccount(null);
  }, []);
  const closeCDForm = useCallback(() => {
    setShowCDForm(false);
    setEditingCD(null);
  }, []);
  const switchToCDForm = useCallback(() => {
    setShowAccountForm(false);
    setShowCDForm(true);
  }, []);

  const accountActions = useAccountActions({
    accounts,
    mutations: accountMutations,
    confirm,
    toast,
    setError,
    selectedAccountId,
    setSelectedAccountId,
    closeAccountForm,
    closeCDForm,
    switchToCDForm,
  });

  // Deep linking: select account from `?id=...` URL parameter.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id && accounts.length > 0 && accounts.some((a) => a.id === id)) {
      setSelectedAccountId(id);
    }
  }, [location.search, accounts]);

  // Build a single set of which accounts are "fixed-expense" accounts so the
  // per-row check below stays O(1) instead of O(pockets) per row.
  const fixedExpenseAccountIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of pockets) {
      if (p.type === 'fixed') set.add(p.accountId);
    }
    return set;
  }, [pockets]);

  // Stable, id-based handlers passed to memoized AccountCard/CDAccountCard so
  // they can skip re-renders when other accounts change.
  const handleSelectAccount = useCallback((account: Account) => {
    setSelectedAccountId(account.id);
  }, []);
  const handleEditAccount = useCallback((account: Account) => {
    setEditingAccount(account);
    setShowAccountForm(true);
  }, []);
  const handleEditCD = useCallback((account: CDInvestmentAccount) => {
    setEditingCD(account);
    setShowCDForm(true);
  }, []);
  const handleDeleteAccount = useCallback(
    (id: string) => {
      void accountActions.handleDeleteAccount(id);
    },
    [accountActions]
  );

  // Sort and filter accounts for display.
  const sortedAccounts = useMemo(() => {
    let result = [...accounts].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
    );
    if (activeFilter !== 'all') {
      result = result.filter((a) => (a.type || 'normal') === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(q));
    }
    return result;
  }, [accounts, activeFilter, searchQuery]);

  if (accountsLoading || pocketsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <SkeletonList items={3} />
      </div>
    );
  }

  const selectedAccount = selectedAccountId
    ? accounts.find((acc) => acc.id === selectedAccountId) ?? null
    : null;
  const selectedAccountPockets = selectedAccountId
    ? pockets.filter((p) => p.accountId === selectedAccountId)
    : [];

  // Mobile shows either the list OR the detail panel based on selection;
  // desktop always shows both side-by-side.
  const listClasses = `space-y-4 ${selectedAccountId ? 'hidden md:block' : 'block'}`;
  const detailsClasses = `space-y-4 ${selectedAccountId ? 'block' : 'hidden md:block'}`;

  const handleAccountFormSubmit = editingAccount
    ? (data: Parameters<typeof accountActions.handleUpdateAccount>[1]) =>
        accountActions.handleUpdateAccount(editingAccount, data)
    : accountActions.handleCreateAccount;

  const handleCDFormSubmit = editingCD
    ? (data: CDFormData) => accountActions.handleUpdateCD(editingCD, data)
    : accountActions.handleCreateCD;

  return (
    <div className="space-y-6">
      <div className={selectedAccountId ? 'hidden md:block' : 'block'}>
        <PageHeader
          title="Accounts"
          actions={
            <Button
              variant="primary"
              onClick={() => {
                setShowAccountForm(true);
                setEditingAccount(null);
              }}
              aria-label="Create new account"
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
              <span className="hidden sm:inline">New Account</span>
            </Button>
          }
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'investment', 'normal', 'cd'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setActiveFilter(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === value
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {value === 'all' ? 'All' : value === 'cd' ? 'CD' : value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={listClasses}>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 md:mb-0">
            All Accounts
          </h2>
          {accounts.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No accounts yet"
              description="Create your first account to start tracking your finances."
              action={{
                label: 'Create Account',
                onClick: () => setShowAccountForm(true),
                icon: Plus,
              }}
            />
          ) : (
            <SortableList
              items={sortedAccounts}
              onReorder={(items) => accountMutations.reorderAccounts.mutate(items)}
              getId={(account) => account.id}
              renderItem={(account) => (
                <SortableItem key={account.id} id={account.id}>
                  {isCDAccount(account) ? (
                    <CDAccountCard
                      account={account}
                      isSelected={selectedAccountId === account.id}
                      onSelect={handleSelectAccount}
                      onEdit={handleEditCD}
                      onDelete={handleDeleteAccount}
                    />
                  ) : (
                    <AccountCard
                      account={account}
                      isSelected={selectedAccountId === account.id}
                      onSelect={handleSelectAccount}
                      onEdit={handleEditAccount}
                      onDelete={handleDeleteAccount}
                      isFixedExpensesAccount={fixedExpenseAccountIds.has(account.id)}
                    />
                  )}
                </SortableItem>
              )}
            />
          )}
        </div>

        <div className={detailsClasses}>
          {selectedAccount ? (
            <AccountDetailPanel
              account={selectedAccount}
              pockets={selectedAccountPockets}
              accounts={accounts}
              pocketMutations={pocketMutations}
              toast={toast}
              confirm={confirm}
              setError={setError}
              onEditAccount={(acc) => {
                setEditingAccount(acc);
                setShowAccountForm(true);
              }}
              onEditCD={(acc) => {
                setEditingCD(acc);
                setShowCDForm(true);
              }}
              onCascadeDelete={accountActions.cascadeDelete.open}
              onClose={() => setSelectedAccountId(null)}
              onMobileBack={() => setSelectedAccountId(null)}
            />
          ) : (
            <div className="hidden lg:block sticky top-6">
              <EmptyState
                icon={Wallet}
                title="Select an account"
                description="Select an account from the list to view its details and manage pockets."
              />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showAccountForm}
        onClose={closeAccountForm}
        title={editingAccount ? 'Edit Account' : 'Create New Account'}
        size="lg"
      >
        <AccountForm
          initialData={editingAccount}
          onSubmit={handleAccountFormSubmit}
          onCancel={closeAccountForm}
          isSaving={accountActions.isAccountFormSaving}
        />
      </Modal>

      <Modal
        isOpen={showCDForm}
        onClose={closeCDForm}
        title={editingCD ? 'Edit Certificate of Deposit' : 'Create Certificate of Deposit'}
        size="xl"
      >
        <CDAccountForm
          account={editingCD || undefined}
          onSubmit={handleCDFormSubmit}
          onCancel={closeCDForm}
          isLoading={accountActions.isCDFormSaving}
        />
      </Modal>

      <CascadeDeleteDialog
        isOpen={accountActions.cascadeDelete.isOpen}
        isDeleting={accountActions.cascadeDelete.isDeleting}
        deleteMovements={accountActions.cascadeDelete.deleteMovements}
        onDeleteMovementsChange={accountActions.cascadeDelete.setDeleteMovements}
        onConfirm={() => accountActions.cascadeDelete.confirm()}
        onClose={accountActions.cascadeDelete.close}
      />
    </div>
  );
};

export default AccountsPage;
