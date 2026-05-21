import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Wallet, Search, TrendingUp, Lock, Edit2, Trash2 } from 'lucide-react';
import {
  useAccountsQuery,
  usePocketsQuery,
  useAccountMutations,
  usePocketMutations,
} from '../hooks/queries';
import { useToast } from '../hooks/useToast';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { useAccountActions } from '../hooks/actions/useAccountActions';
import { currencyService } from '../services/currencyService';
import type { Account, CDInvestmentAccount } from '../types';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import CDAccountForm, {
  type CDFormData,
} from '../components/accounts/CDAccountForm';
import AccountForm from '../components/accounts/AccountForm';
import CascadeDeleteDialog from '../components/accounts/CascadeDeleteDialog';
import PocketManagementSection from '../components/accounts/PocketManagementSection';

const isCDAccount = (account: Account): account is CDInvestmentAccount =>
  account.type === 'cd';

function getAccountSubtitle(account: Account, pocketCount: number) {
  if (account.type === 'investment' && account.stockSymbol) {
    const shares = account.shares ?? 0;
    // Gains % would need investment data; show shares for now
    return `${account.stockSymbol} • ${shares} shares`;
  }
  if (isCDAccount(account)) {
    const rate = account.interestRate ?? 0;
    const maturity = account.maturityDate
      ? new Date(account.maturityDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : '—';
    const days = account.maturityDate
      ? Math.max(0, Math.ceil((new Date(account.maturityDate).getTime() - Date.now()) / 86400000))
      : 0;
    return `${rate}% APY • Due ${maturity} • ${days}d`;
  }
  if (pocketCount > 0) return `${pocketCount} pocket${pocketCount !== 1 ? 's' : ''} • ${account.currency}`;
  return account.currency;
}

function getAccountIcon(type: string | undefined) {
  if (type === 'investment') return TrendingUp;
  if (type === 'cd') return Lock;
  return Wallet;
}

type AccountFilter = 'all' | 'investment' | 'normal' | 'cd';

const FILTER_CHIPS: { label: string; value: AccountFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Investment', value: 'investment' },
  { label: 'Normal', value: 'normal' },
  { label: 'CD', value: 'cd' },
];

const AccountsPage = () => {
  const { data: accounts = [], isLoading: accountsLoading } = useAccountsQuery();
  const { data: pockets = [], isLoading: pocketsLoading } = usePocketsQuery();
  const accountMutations = useAccountMutations();
  const pocketMutations = usePocketMutations();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const location = useLocation();

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showCDForm, setShowCDForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingCD, setEditingCD] = useState<CDInvestmentAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<AccountFilter>('all');

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

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

  // Deep linking
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id && accounts.length > 0 && accounts.some((a) => a.id === id)) {
      setSelectedAccountId(id);
    }
  }, [location.search, accounts]);

  // Handlers
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
    (id: string) => { void accountActions.handleDeleteAccount(id); },
    [accountActions]
  );

  // Filter and search accounts
  const filteredAccounts = useMemo(() => {
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

  // Group pockets by account for O(1) lookup
  const pocketsByAccount = useMemo(() => {
    const map = new Map<string, typeof pockets>();
    for (const p of pockets) {
      const arr = map.get(p.accountId) || [];
      arr.push(p);
      map.set(p.accountId, arr);
    }
    return map;
  }, [pockets]);

  if (accountsLoading || pocketsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const handleAccountFormSubmit = editingAccount
    ? (data: Parameters<typeof accountActions.handleUpdateAccount>[1]) =>
        accountActions.handleUpdateAccount(editingAccount, data)
    : accountActions.handleCreateAccount;

  const handleCDFormSubmit = editingCD
    ? (data: CDFormData) => accountActions.handleUpdateCD(editingCD, data)
    : accountActions.handleCreateCD;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Accounts</h2>
          <p className="text-on-surface-variant text-sm">Manage your global liquidity and asset distribution.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => { setShowAccountForm(true); setEditingAccount(null); }}
          className="border-2 border-primary-container text-primary font-bold rounded-lg px-6 py-2.5 hover:bg-primary/5"
          aria-label="Create new account"
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
          <span>Add Account</span>
        </Button>
      </section>

      {error && (
        <div className="p-4 bg-error/10 border border-error/20 text-error rounded-xl">
          {error}
        </div>
      )}

      {/* Search + Filter chips */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => setActiveFilter(chip.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === chip.value
                  ? 'bg-primary/10 text-primary border border-primary/20 font-bold'
                  : 'bg-white/5 text-on-surface-variant border border-white/5 hover:bg-white/10'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Split Layout: Account List (left) + Pocket Panel (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Account List */}
        <div className="lg:col-span-2">
          {filteredAccounts.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={accounts.length === 0 ? 'No accounts yet' : 'No matching accounts'}
              description={
                accounts.length === 0
                  ? 'Create your first account to start tracking your finances.'
                  : 'Try adjusting your search or filter.'
              }
              action={accounts.length === 0 ? {
                label: 'Create Account',
                onClick: () => setShowAccountForm(true),
                icon: Plus,
              } : undefined}
            />
          ) : (
            <div className="space-y-1">
              {filteredAccounts.map((account) => {
                const Icon = getAccountIcon(account.type);
                const pocketCount = (pocketsByAccount.get(account.id) || []).length;
                const subtitle = getAccountSubtitle(account, pocketCount);
                const isSelected = selectedAccountId === account.id;

                return (
                  <div
                    key={account.id}
                    onClick={() => handleSelectAccount(account)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-colors border ${
                      isSelected
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{account.name}</p>
                      <p className="text-xs text-on-surface-variant font-mono truncate">{subtitle}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/5 text-on-surface-variant shrink-0">
                      {account.currency}
                    </span>
                    <span className="font-mono text-sm font-bold text-on-surface whitespace-nowrap">
                      {currencyService.formatCurrency(account.balance, account.currency)}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); isCDAccount(account) ? handleEditCD(account) : handleEditAccount(account); }}
                        className="p-1.5 rounded-md hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-colors"
                        aria-label={`Edit ${account.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account.id); }}
                        className="p-1.5 rounded-md hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors"
                        aria-label={`Delete ${account.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Pocket Management Panel */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-xl p-5 sticky top-6">
            {selectedAccountId ? (
              <PocketManagementSection
                accountId={selectedAccountId}
                accounts={accounts}
                pockets={pocketsByAccount.get(selectedAccountId) || []}
                pocketMutations={pocketMutations}
                toast={toast}
                confirm={confirm}
                setError={setError}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wallet className="w-10 h-10 text-on-surface-variant/40 mb-3" aria-hidden="true" />
                <p className="text-on-surface-variant text-sm">Select an account to manage pockets</p>
              </div>
            )}
          </div>
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
