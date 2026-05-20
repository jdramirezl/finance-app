import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Wallet } from 'lucide-react';
import {
  useAccountsQuery,
  usePocketsQuery,
  useAccountMutations,
  usePocketMutations,
} from '../hooks/queries';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { useAccountActions } from '../hooks/useAccountActions';
import type { Account, CDInvestmentAccount } from '../types';
import Modal from '../components/Modal';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import SortableList from '../components/SortableList';
import SortableItem from '../components/SortableItem';
import { Skeleton, SkeletonList } from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
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
  const { confirm, confirmState, handleClose, handleConfirm } = useConfirm();
  const location = useLocation();

  // Page-level UI state — modal visibility, selected row, in-flight error.
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showCDForm, setShowCDForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingCD, setEditingCD] = useState<CDInvestmentAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  const closeAccountForm = () => {
    setShowAccountForm(false);
    setEditingAccount(null);
  };
  const closeCDForm = () => {
    setShowCDForm(false);
    setEditingCD(null);
  };
  const switchToCDForm = () => {
    setShowAccountForm(false);
    setShowCDForm(true);
  };

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
  const sortedAccounts = [...accounts].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  );

  // Mobile shows either the list OR the detail panel based on selection;
  // desktop always shows both side-by-side.
  const listClasses = `space-y-4 ${selectedAccountId ? 'hidden md:block' : 'block'}`;
  const detailsClasses = `space-y-4 ${selectedAccountId ? 'block' : 'hidden md:block'}`;

  const handleAccountFormSubmit = editingAccount
    ? (e: React.FormEvent<HTMLFormElement>) =>
        accountActions.handleUpdateAccount(editingAccount, e)
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
            >
              <Plus className="w-5 h-5" />
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
                      onSelect={() => setSelectedAccountId(account.id)}
                      onEdit={() => {
                        setEditingCD(account);
                        setShowCDForm(true);
                      }}
                      onDelete={() => accountActions.handleDeleteAccount(account.id)}
                    />
                  ) : (
                    <AccountCard
                      account={account}
                      isSelected={selectedAccountId === account.id}
                      onSelect={() => setSelectedAccountId(account.id)}
                      onEdit={() => {
                        setEditingAccount(account);
                        setShowAccountForm(true);
                      }}
                      onDelete={() => accountActions.handleDeleteAccount(account.id)}
                      isFixedExpensesAccount={pockets.some(
                        (p) => p.accountId === account.id && p.type === 'fixed'
                      )}
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

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    </div>
  );
};

export default AccountsPage;
