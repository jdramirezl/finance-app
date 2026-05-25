import { memo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Account } from '../../types';
import Button from '../ui/Button';

interface ArchivedSectionProps {
    /**
     * Archived accounts to render. The caller is responsible for filtering
     * the full account list — passing only rows with `archivedAt` set keeps
     * this component free of cross-cutting query knowledge.
     */
    accounts: Account[];
    /**
     * Restore handler. Wired to `useUnarchiveAccount` in the parent. Restore
     * is reversible (the row simply re-enters the active grid), so the
     * action is invoked without a confirmation prompt.
     */
    onRestore: (id: string) => void;
    /**
     * Permanent delete handler. Wired to the existing cascade-delete dialog
     * in `AccountsPage`, which prompts for confirmation and offers to keep
     * or drop the account's movement history.
     */
    onDeletePermanent: (id: string) => void;
    /**
     * ID of the row currently being restored, if any. Used to flip only
     * that row's button into a loading state — passing a global boolean
     * here would lie about which row is actually busy when the user is
     * able to queue actions across multiple rows.
     */
    restoringId?: string | null;
    /**
     * ID of the row whose permanent-delete cascade is currently in flight.
     * Same per-row rationale as `restoringId`.
     */
    deletingId?: string | null;
}

/**
 * Renders the collapsed "Archived" section beneath the active accounts
 * grid on the Accounts page. Hidden when there are no archived accounts
 * so the section never adds visual noise to a clean page.
 *
 * Default state is collapsed — archived accounts are kept around for
 * recovery, not for everyday browsing — and the header doubles as the
 * disclosure control. Each row is intentionally minimal (color dot,
 * name, currency badge, restore + delete) and styled with muted greys
 * so it visually de-emphasises against the active list above.
 */
const ArchivedSection = ({
    accounts,
    onRestore,
    onDeletePermanent,
    restoringId = null,
    deletingId = null,
}: ArchivedSectionProps) => {
    const [expanded, setExpanded] = useState(false);

    // Empty state is silent — the section only earns its border + header
    // when the user actually has something archived to act on.
    if (accounts.length === 0) return null;

    const ChevronIcon = expanded ? ChevronDown : ChevronRight;

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 mt-6 pt-4">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls="archived-accounts-list"
                className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
                <ChevronIcon className="w-4 h-4" aria-hidden="true" />
                <span>Archived ({accounts.length})</span>
            </button>

            {expanded && (
                <ul
                    id="archived-accounts-list"
                    className="mt-3 space-y-2"
                    aria-label="Archived accounts"
                >
                    {accounts.map((account) => {
                        // Per-row in-flight checks: only the row whose action is
                        // actually mid-flight shows a spinner / disables. We
                        // intentionally disable both buttons on the busy row so
                        // the user can't queue a restore while a delete is
                        // already in flight (or vice versa) on the same id.
                        const isThisRestoring = restoringId === account.id;
                        const isThisDeleting = deletingId === account.id;
                        const isBusy = isThisRestoring || isThisDeleting;
                        return (
                            <li
                                key={account.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg text-gray-500 dark:text-gray-500 bg-gray-100/70 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className="w-2 h-2 rounded-full flex-shrink-0 opacity-60"
                                        style={{ backgroundColor: account.color }}
                                        aria-hidden="true"
                                    />
                                    <span className="font-medium truncate">{account.name}</span>
                                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium border border-gray-300 dark:border-gray-600 whitespace-nowrap">
                                        {account.currency}
                                    </span>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => onRestore(account.id)}
                                        loading={isThisRestoring}
                                        disabled={isBusy}
                                        aria-label={`Restore ${account.name}`}
                                    >
                                        Restore
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => onDeletePermanent(account.id)}
                                        loading={isThisDeleting}
                                        disabled={isBusy}
                                        aria-label={`Permanently delete ${account.name}`}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default memo(ArchivedSection);
