import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Wallet, Search } from 'lucide-react';
import {
  useAccountsWithArchived,
  usePocketsWithArchived,
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
import { AccountCard, AccountForm, ArchivedSection } from '../components/accounts';
import CDAccountCard from '../components/accounts/CDAccountCard';
import CDAccountForm, {
  type CDFormData,
} from '../components/accounts/CDAccountForm';
import AccountDetailPanel from '../components/accounts/AccountDetailPanel';
import CascadeDeleteDialog from '../components/accounts/CascadeDeleteDialog';

const isCDAccount = (account: Account): account is CDInvestmentAccount =>
  account.type === 'cd';

const AccountsPage = () => {
  // Pull both active and archived accounts from a single query so we can
  // render the active grid and the collapsed "Archived" section without
  // double-fetching. Active rows still drive every existing flow — selection,
  // editing, sorting, deep-linking — so the archived rows are split out
  // immediately below and never leak into those code paths.
  const { data: allAccounts = [], isLoading: accountsLoading } =
    useAccountsWithArchived();
  // Pull pockets via the include-archived variant so the same query feeds
  // both the active grid (filtered to non-archived) and the Archived
  // section's pocket rows. Splitting once below mirrors the accounts split
  // and keeps the rest of the page treating `pockets` as the canonical
  // "active pockets" list.
  const { data: allPockets = [], isLoading: pocketsLoading } =
    usePocketsWithArchived();
  const accountMutations = useAccountMutations();
  const pocketMutations = usePocketMutations();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const location = useLocation();

  // Split once at the top so the rest of the page treats `accounts` as the
  // canonical "active accounts" list — same shape the page used before the
  // archived section was added.
  const accounts = useMemo(
    () => allAccounts.filter((a) => !a.archivedAt),
    [allAccounts],
  );
  const archivedAccounts = useMemo(
    () => allAccounts.filter((a) => Boolean(a.archivedAt)),
    [allAccounts],
  );

  // Same split for pockets. The active list feeds every existing flow
  // (selection, fixed-expense detection, the detail panel). The archived
  // list is filtered to pockets whose parent account is still ACTIVE —
  // pockets owned by an archived account are already represented by the
  // archived account row above, so duplicating them here would be noise.
  const pockets = useMemo(
    () => allPockets.filter((p) => !p.archivedAt),
    [allPockets],
  );
  const archivedPockets = useMemo(() => {
    const activeAccountIds = new Set(accounts.map((a) => a.id));
    return allPockets.filter(
      (p) => Boolean(p.archivedAt) && activeAccountIds.has(p.accountId),
    );
  }, [allPockets, accounts]);

  // Page-level UI state — modal visibility, selected row, in-flight error.
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showCDForm, setShowCDForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingCD, setEditingCD] = useState<CDInvestmentAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'investment' | 'normal' | 'cd'>('all');

  // Per-row in-flight ids for archive and restore. Mutations expose a
  // single `isPending` shared across calls, which would mark every card
  // as busy when only one row is actually mid-flight — track the id we
  // started the call with instead and pass it down so each card knows
  // whether the loading state belongs to it.
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  // Same per-row pattern for archived pockets in the Archived section.
  // Tracked separately from the account ids so the two flows can be in
  // flight simultaneously without mis-attributing a spinner to the wrong
  // section.
  const [restoringPocketId, setRestoringPocketId] = useState<string | null>(null);
  const [deletingPocketId, setDeletingPocketId] = useState<string | null>(null);

  // Selection lives in state for rendering, but we also keep a mirror in
  // a ref so callbacks that only read it on success (e.g. archive's
  // post-success "did you just archive the row you were viewing?" check)
  // do not need `selectedAccountId` in their dep array. Without this,
  // every selection change would create a new `handleArchiveAccount`
  // identity and defeat the React.memo wrap on every AccountCard.
  const selectedAccountIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedAccountIdRef.current = selectedAccountId;
  }, [selectedAccountId]);

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
    mutations: accountMutations,
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
  // per-row check below stays O(1) instead of O(pockets) per row. Archived
  // pockets are excluded defensively — the backend already drops them from
  // the default listing, but a future query swap shouldn't be able to mark
  // an active account as "fixed expenses" because of an archived ghost.
  const fixedExpenseAccountIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of pockets) {
      if (p.type === 'fixed' && !p.archivedAt) set.add(p.accountId);
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

  // Archive is the new primary destructive action on each account card.
  // It's reversible (the row moves into the ArchivedSection below the grid),
  // so we deliberately invoke the mutation without a confirmation dialog
  // — the backend cascades the archive to the account's pockets.
  const handleArchiveAccount = useCallback(
    (id: string) => {
      setArchivingId(id);
      accountMutations.archiveAccount.mutate(id, {
        onSuccess: () => {
          // Read selection through the ref so this callback does not
          // depend on `selectedAccountId` and stays stable for memoized
          // cards (see the ref comment above).
          if (selectedAccountIdRef.current === id) {
            setSelectedAccountId(null);
          }
          toast.success('Account archived');
        },
        onSettled: () => {
          // Clear the per-row spinner whether the request succeeded or
          // failed; the mutation hook already shows an error toast.
          setArchivingId((current) => (current === id ? null : current));
        },
      });
    },
    [accountMutations.archiveAccount, toast]
  );

  // Restoring an archived account uses the same per-row id pattern so the
  // ArchivedSection can disable only the row currently being unarchived.
  const handleRestoreAccount = useCallback(
    (id: string) => {
      setRestoringId(id);
      accountMutations.unarchiveAccount.mutate(id, {
        onSuccess: () => {
          toast.success('Account restored');
        },
        onSettled: () => {
          setRestoringId((current) => (current === id ? null : current));
        },
      });
    },
    [accountMutations.unarchiveAccount, toast]
  );

  // Restoring an archived pocket mirrors the account flow — same per-row
  // id pattern so the section disables only the row currently being
  // unarchived. Restore is reversible and non-destructive, so no confirm
  // dialog is shown; the muted toast is enough feedback.
  const handleRestorePocket = useCallback(
    (id: string) => {
      setRestoringPocketId(id);
      pocketMutations.unarchivePocket.mutate(id, {
        onSuccess: () => {
          toast.success('Pocket restored');
        },
        onSettled: () => {
          setRestoringPocketId((current) => (current === id ? null : current));
        },
      });
    },
    [pocketMutations.unarchivePocket, toast]
  );

  // Permanent (hard) delete of an archived pocket. Pockets don't have a
  // cascade dialog like accounts because deleting a pocket only orphans
  // its movements (the parent account stays put), so a single confirm
  // prompt is enough to guard the action.
  const handleDeleteArchivedPocket = useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: 'Delete pocket permanently?',
        message:
          'This pocket will be removed for good. Its movements will become orphans (still counted in totals, no longer attributable to a pocket). This cannot be undone.',
        confirmText: 'Delete',
        variant: 'danger',
      });
      if (!ok) return;
      setDeletingPocketId(id);
      pocketMutations.deletePocket.mutate(id, {
        onSuccess: () => {
          toast.success('Pocket deleted');
        },
        onSettled: () => {
          setDeletingPocketId((current) => (current === id ? null : current));
        },
      });
    },
    [confirm, pocketMutations.deletePocket, toast]
  );

  // Permanent (cascade) delete is wired through the existing dialog. After
  // this UI cleanup the active account card no longer exposes a permanent
  // delete button — the action is reachable from the account detail panel
  // (subtle red text link) and from the Archived section's row controls.
  // Both flows route through `accountActions.cascadeDelete.open` directly,
  // so we no longer need a `handleDeletePermanent` wrapper here.

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
              renderItem={(account) => {
                // Only the row whose archive is actually in flight should
                // show a spinner. Permanent delete no longer renders on
                // the active card — it is reachable from the account
                // detail panel and the Archived section instead — so we
                // do not need a per-row "is this row being deleted?"
                // signal here anymore.
                const isThisArchiving = archivingId === account.id;
                return (
                  <SortableItem key={account.id} id={account.id}>
                    {isCDAccount(account) ? (
                      <CDAccountCard
                        account={account}
                        isSelected={selectedAccountId === account.id}
                        onSelect={handleSelectAccount}
                        onEdit={handleEditCD}
                        onArchive={handleArchiveAccount}
                        isArchiving={isThisArchiving}
                      />
                    ) : (
                      <AccountCard
                        account={account}
                        isSelected={selectedAccountId === account.id}
                        onSelect={handleSelectAccount}
                        onEdit={handleEditAccount}
                        onArchive={handleArchiveAccount}
                        isArchiving={isThisArchiving}
                        isFixedExpensesAccount={fixedExpenseAccountIds.has(account.id)}
                      />
                    )}
                  </SortableItem>
                );
              }}
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

      {/*
        Archived section sits below the active grid so it stays out of the
        way for normal browsing but is still discoverable. It only renders
        when there is at least one archived account, and is collapsed by
        default — see ArchivedSection for the rationale.
      */}
      <div className={selectedAccountId ? 'hidden md:block' : 'block'}>
        <ArchivedSection
          accounts={archivedAccounts}
          onRestore={handleRestoreAccount}
          onDeletePermanent={accountActions.cascadeDelete.open}
          restoringId={restoringId}
          deletingId={
            accountActions.cascadeDelete.isDeleting
              ? accountActions.cascadeDelete.accountId
              : null
          }
          archivedPockets={archivedPockets}
          accountsForPocketLookup={accounts}
          onRestorePocket={handleRestorePocket}
          onDeletePocket={handleDeleteArchivedPocket}
          restoringPocketId={restoringPocketId}
          deletingPocketId={deletingPocketId}
        />
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
