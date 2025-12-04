import { useState } from 'react';
import { useAccountsQuery, usePocketsQuery, useAccountMutations, usePocketMutations } from '../hooks/queries';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import type { Account, Pocket } from '../types';
import { Plus, Wallet } from 'lucide-react';
import Modal from '../components/Modal';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import SortableList from '../components/SortableList';
import SortableItem from '../components/SortableItem';
import { Skeleton, SkeletonList } from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { AccountCard, PocketCard, AccountForm, PocketForm } from '../components/accounts';
import Card from '../components/Card';

const AccountsPage = () => {
  // Queries
  const { data: accounts = [], isLoading: accountsLoading } = useAccountsQuery();
  const { data: pockets = [], isLoading: pocketsLoading } = usePocketsQuery();

  // Mutations
  const {
    createAccount,
    updateAccount,
    deleteAccount,
    deleteAccountCascade,
    reorderAccounts
  } = useAccountMutations();

  const {
    createPocket,
    updatePocket,
    deletePocket,
    reorderPockets,
    migrateFixedPocketToAccount
  } = usePocketMutations();

  // Local State
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const toast = useToast();
  const { confirm, confirmState, handleClose, handleConfirm } = useConfirm();

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showPocketForm, setShowPocketForm] = useState(false);
  const [showCascadeDialog, setShowCascadeDialog] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationPocketId, setMigrationPocketId] = useState<string | null>(null);
  const [migrationTargetAccountId, setMigrationTargetAccountId] = useState<string>('');
  const [cascadeAccountId, setCascadeAccountId] = useState<string | null>(null);
  const [cascadeDeleteMovements, setCascadeDeleteMovements] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingPocket, setEditingPocket] = useState<Pocket | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [isCascadeDeleting, setIsCascadeDeleting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Combined loading state
  const isLoading = accountsLoading || pocketsLoading;

  const selectedAccount = selectedAccountId
    ? accounts.find((acc) => acc.id === selectedAccountId) || null
    : null;
  const selectedAccountPockets = selectedAccountId
    ? pockets.filter(p => p.accountId === selectedAccountId)
    : [];

  // --- Account Handlers ---

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await createAccount.mutateAsync({
        name: formData.get('name') as string,
        color: formData.get('color') as string,
        currency: formData.get('currency') as any,
        type: (formData.get('type') as any) || 'normal',
        stockSymbol: (formData.get('stockSymbol') as string) || undefined,
      });
      toast.success('Account created successfully!');
      setShowAccountForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
      toast.error(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!editingAccount) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);

    try {
      await updateAccount.mutateAsync({
        id: editingAccount.id,
        updates: {
          name: formData.get('name') as string,
          color: formData.get('color') as string,
          currency: formData.get('currency') as any,
        }
      });
      toast.success('Account updated successfully!');
      setEditingAccount(null);
      setShowAccountForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
      toast.error(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    const account = accounts.find(a => a.id === id);
    const confirmed = await confirm({
      title: 'Delete Account',
      message: `Are you sure you want to delete "${account?.name}"? This will also delete all its pockets and cannot be undone.`,
      confirmText: 'Delete Account',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    setError(null);
    try {
      if (selectedAccountId === id) {
        setSelectedAccountId(null);
      }
      await deleteAccount.mutateAsync(id);
      toast.success('Account deleted successfully!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleCascadeDelete = (id: string) => {
    setCascadeAccountId(id);
    setCascadeDeleteMovements(false);
    setShowCascadeDialog(true);
  };

  const handleConfirmCascadeDelete = async () => {
    if (!cascadeAccountId) return;

    setIsCascadeDeleting(true);
    setError(null);
    try {
      const result = await deleteAccountCascade.mutateAsync({ id: cascadeAccountId, deleteMovements: cascadeDeleteMovements });

      if (selectedAccountId === cascadeAccountId) {
        setSelectedAccountId(null);
      }

      setShowCascadeDialog(false);
      setCascadeAccountId(null);

      toast.success(
        `Deleted account "${result.account}" with ${result.pockets} pocket(s), ${result.subPockets} sub-pocket(s)` +
        (result.movements > 0 ? `, and ${result.movements} movement(s)` : '')
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCascadeDeleting(false);
    }
  };

  // --- Pocket Handlers ---

  const handleCreatePocket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!selectedAccountId) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);

    try {
      let name = formData.get('name') as string;
      let type = (formData.get('type') as any) || 'normal';

      await createPocket.mutateAsync({ accountId: selectedAccountId, name, type });
      toast.success('Pocket created successfully!');
      setShowPocketForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create pocket');
      toast.error(err instanceof Error ? err.message : 'Failed to create pocket');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePocket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!editingPocket) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);

    try {
      await updatePocket.mutateAsync({
        id: editingPocket.id,
        updates: { name: formData.get('name') as string }
      });
      toast.success('Pocket updated successfully!');
      setEditingPocket(null);
      setShowPocketForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update pocket');
      toast.error(err instanceof Error ? err.message : 'Failed to update pocket');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePocket = async (id: string) => {
    const pocket = selectedAccountPockets.find(p => p.id === id);
    const confirmed = await confirm({
      title: 'Delete Pocket',
      message: `Are you sure you want to delete "${pocket?.name}"? This action cannot be undone.`,
      confirmText: 'Delete Pocket',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    setError(null);
    try {
      await deletePocket.mutateAsync(id);
      toast.success('Pocket deleted successfully!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete pocket';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleMigratePocket = (pocketId: string) => {
    setMigrationPocketId(pocketId);
    setMigrationTargetAccountId('');
    setShowMigrationDialog(true);
  };

  const handleConfirmMigration = async () => {
    if (!migrationPocketId || !migrationTargetAccountId) return;

    setIsMigrating(true);
    setError(null);
    try {
      const pocket = selectedAccountPockets.find(p => p.id === migrationPocketId);
      const targetAccount = accounts.find(a => a.id === migrationTargetAccountId);

      await migrateFixedPocketToAccount.mutateAsync({ pocketId: migrationPocketId, targetAccountId: migrationTargetAccountId });

      setShowMigrationDialog(false);
      setMigrationPocketId(null);
      setMigrationTargetAccountId('');

      toast.success(
        `Successfully migrated "${pocket?.name}" to "${targetAccount?.name}". All movements have been transferred.`
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to migrate pocket';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsMigrating(false);
    }
  };

  if (isLoading) {
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

  return (
    <div className="space-y-6">
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
            New Account
          </Button>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Account List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">All Accounts</h2>
          {accounts.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No accounts yet"
              description="Create your first account to start tracking your finances."
              action={{
                label: "Create Account",
                onClick: () => setShowAccountForm(true),
                icon: Plus
              }}
            />
          ) : (
            <SortableList
              items={[...accounts].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))}
              onReorder={(items) => reorderAccounts.mutate(items)}
              getId={(account) => account.id}
              renderItem={(account) => (
                <SortableItem key={account.id} id={account.id}>
                  <AccountCard
                    account={account}
                    isSelected={selectedAccountId === account.id}
                    onSelect={() => setSelectedAccountId(account.id)}
                    onEdit={() => {
                      setEditingAccount(account);
                      setShowAccountForm(true);
                    }}
                    onDelete={() => handleDeleteAccount(account.id)}
                  />
                </SortableItem>
              )}
            />
          )}
        </div>

        {/* Right: Account Details & Pockets */}
        <div className="space-y-4">
          {selectedAccount ? (
            <>
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Account Details</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedAccountId(null)}>Close</Button>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: selectedAccount.color }}
                  >
                    {selectedAccount.currency}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedAccount.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Balance: <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                        ${selectedAccount.balance.toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setEditingAccount(selectedAccount);
                      setShowAccountForm(true);
                    }}
                  >
                    Edit Account
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => handleCascadeDelete(selectedAccount.id)}
                  >
                    Delete All Data
                  </Button>
                </div>
              </Card>

              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Pockets</h2>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setShowPocketForm(true);
                      setEditingPocket(null);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    New Pocket
                  </Button>
                </div>

                {showPocketForm && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <PocketForm
                      initialData={editingPocket}
                      onSubmit={editingPocket ? handleUpdatePocket : handleCreatePocket}
                      onCancel={() => {
                        setShowPocketForm(false);
                        setEditingPocket(null);
                      }}
                      isSaving={isSaving}
                    />
                  </div>
                )}

                {selectedAccountPockets.length === 0 && !showPocketForm ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No pockets yet. Create one to organize your money.
                  </div>
                ) : (
                  <SortableList
                    items={[...selectedAccountPockets].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))}
                    onReorder={(items) => reorderPockets.mutate(items)}
                    getId={(pocket) => pocket.id}
                    renderItem={(pocket) => (
                      <SortableItem key={pocket.id} id={pocket.id}>
                        <PocketCard
                          pocket={pocket}
                          onEdit={() => {
                            setEditingPocket(pocket);
                            setShowPocketForm(true);
                          }}
                          onDelete={() => handleDeletePocket(pocket.id)}
                          onMigrate={pocket.type === 'fixed' ? () => handleMigratePocket(pocket.id) : undefined}
                        />
                      </SortableItem>
                    )}
                  />
                )}
              </Card>
            </>
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

      {/* Account Form Modal */}
      <Modal
        isOpen={showAccountForm}
        onClose={() => setShowAccountForm(false)}
        title={editingAccount ? "Edit Account" : "Create New Account"}
      >
        <AccountForm
          initialData={editingAccount}
          onSubmit={editingAccount ? handleUpdateAccount : handleCreateAccount}
          onCancel={() => setShowAccountForm(false)}
          isSaving={isSaving}
        />
      </Modal>

      {/* Cascade Delete Dialog */}
      <Modal isOpen={showCascadeDialog} onClose={() => !isCascadeDeleting && setShowCascadeDialog(false)}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Delete Account & All Data
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            This is a destructive action. You can choose to delete everything or keep the transaction history.
          </p>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={cascadeDeleteMovements}
                onChange={(e) => setCascadeDeleteMovements(e.target.checked)}
                className="mt-1 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
              />
              <div>
                <span className="font-medium text-red-900 dark:text-red-100">Delete all movements history</span>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  If checked, all movements associated with this account will be permanently deleted.
                  If unchecked, movements will be preserved but marked as orphaned.
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowCascadeDialog(false)}
              disabled={isCascadeDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCascadeDelete}
              loading={isCascadeDeleting}
            >
              Delete Everything
            </Button>
          </div>
        </div>
      </Modal>

      {/* Migration Dialog */}
      <Modal isOpen={showMigrationDialog} onClose={() => !isMigrating && setShowMigrationDialog(false)}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Migrate Pocket
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Select an account to migrate this pocket and all its movements to.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Target Account</label>
            <select
              value={migrationTargetAccountId}
              onChange={(e) => setMigrationTargetAccountId(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select an account</option>
              {accounts
                .filter(a => a.id !== selectedAccountId)
                .map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))
              }
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowMigrationDialog(false)}
              disabled={isMigrating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmMigration}
              loading={isMigrating}
              disabled={!migrationTargetAccountId}
            >
              Migrate Pocket
            </Button>
          </div>
        </div>
      </Modal>

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
