import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Wallet } from 'lucide-react';
import {
  useAccountsQuery,
  usePocketsQuery,
  useAccountMutations,
  usePocketMutations,
} from '../hooks/queries';
import { useToast } from '../hooks/useToast';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { useAccountActions } from '../hooks/useAccountActions';
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

  // Sort accounts for display — useMemo to skip the spread+sort when nothing
  // relevant changes (e.g. while typing in the form).
  const sortedAccounts = useMemo(
    () =>
      [...accounts].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
      ),
    [accounts]
  );

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
