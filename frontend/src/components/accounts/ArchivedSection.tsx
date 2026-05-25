import { memo, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Account, Pocket } from '../../types';
import Button from '../ui/Button';

interface ArchivedSectionProps {
    /**
     * Archived accounts to render. The caller is responsible for filtering
     * the full account list — passing only rows with `archivedAt` set keeps
     * this component free of cross-cutting query knowledge.
     */
    accounts: Account[];
    /**
     * Restore handler for archived accounts. Wired to `useUnarchiveAccount`
     * in the parent. Restore is reversible (the row simply re-enters the
     * active grid), so the action is invoked without a confirmation prompt.
     */
    onRestore: (id: string) => void;
    /**
     * Permanent delete handler for archived accounts. Wired to the existing
     * cascade-delete dialog in `AccountsPage`, which prompts for confirmation
     * and offers to keep or drop the account's movement history.
     */
    onDeletePermanent: (id: string) => void;
    /**
     * ID of the account row currently being restored, if any. Used to flip
     * only that row's button into a loading state — passing a global boolean
     * here would lie about which row is actually busy when the user is able
     * to queue actions across multiple rows.
     */
    restoringId?: string | null;
    /**
     * ID of the account row whose permanent-delete cascade is currently in
     * flight. Same per-row rationale as `restoringId`.
     */
    deletingId?: string | null;
    /**
     * Archived pockets that still belong to ACTIVE accounts. Pockets owned
     * by an archived account are intentionally hidden here — the archived
     * account row already represents them. Caller is responsible for that
     * filtering so the section stays free of cross-cutting query knowledge.
     */
    archivedPockets?: Pocket[];
    /**
     * Active accounts list used to resolve a pocket's parent name for the
     * `AccountName › PocketName` label. Only `id` and `name` are read so
     * the prop is typed narrowly — callers can pass slimmer shapes (e.g.
     * Storybook fixtures) without constructing full Account objects.
     */
    accountsForPocketLookup?: Pick<Account, 'id' | 'name'>[];
    /**
     * Restore handler for archived pockets. Wired to `useUnarchivePocket`
     * in the parent. Restore moves the pocket back into the active list on
     * its parent account.
     */
    onRestorePocket?: (id: string) => void;
    /**
     * Permanent delete handler for archived pockets. The parent confirms
     * before invoking — this component just forwards the id.
     */
    onDeletePocket?: (id: string) => void;
    /** ID of the pocket row currently being restored, if any. */
    restoringPocketId?: string | null;
    /** ID of the pocket row currently being permanently deleted, if any. */
    deletingPocketId?: string | null;
}

/**
 * Renders the collapsed "Archived" section beneath the active accounts
 * grid on the Accounts page. Surfaces both archived accounts AND archived
 * pockets (whose parent account is still active) so the user has a single
 * recovery surface — accounts are listed first, pockets after, both inside
 * the same disclosure.
 *
 * Hidden when there is nothing archived so the section never adds visual
 * noise to a clean page. Default state is collapsed — archived items are
 * kept around for recovery, not for everyday browsing — and the header
 * doubles as the disclosure control.
 */
const ArchivedSection = ({
    accounts,
    onRestore,
    onDeletePermanent,
    restoringId = null,
    deletingId = null,
    archivedPockets = [],
    accountsForPocketLookup = [],
    onRestorePocket,
    onDeletePocket,
    restoringPocketId = null,
    deletingPocketId = null,
}: ArchivedSectionProps) => {
    const [expanded, setExpanded] = useState(false);

    // Resolve parent account name for each archived pocket. The lookup is
    // a Map so renderItem stays O(1) per row regardless of how many active
    // accounts the user has.
    const accountNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const a of accountsForPocketLookup) {
            map.set(a.id, a.name);
        }
        return map;
    }, [accountsForPocketLookup]);

    const totalCount = accounts.length + archivedPockets.length;

    // Empty state is silent — the section only earns its border + header
    // when the user actually has something archived to act on.
    if (totalCount === 0) return null;

    const ChevronIcon = expanded ? ChevronDown : ChevronRight;

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 mt-6 pt-4">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls="archived-items-list"
                className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
                <ChevronIcon className="w-4 h-4" aria-hidden="true" />
                <span>Archived ({totalCount})</span>
            </button>

            {expanded && (
                <div id="archived-items-list" className="mt-3 space-y-2">
                    {accounts.length > 0 && (
                        <ul className="space-y-2" aria-label="Archived accounts">
                            {accounts.map((account) => {
                                // Per-row in-flight checks: only the row whose action
                                // is actually mid-flight shows a spinner / disables.
                                // We intentionally disable both buttons on the busy
                                // row so the user can't queue a restore while a
                                // delete is already in flight (or vice versa) on
                                // the same id.
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

                    {archivedPockets.length > 0 && (
                        <ul className="space-y-2" aria-label="Archived pockets">
                            {archivedPockets.map((pocket) => {
                                // Same per-row in-flight pattern as accounts above —
                                // only the row whose pocket id is mid-flight shows
                                // the spinner and disables both buttons.
                                const isThisRestoring = restoringPocketId === pocket.id;
                                const isThisDeleting = deletingPocketId === pocket.id;
                                const isBusy = isThisRestoring || isThisDeleting;
                                const parentName = accountNameById.get(pocket.accountId);
                                // Render `Account › Pocket` when the parent
                                // account is known. The "›" lives in its own
                                // muted span so screen readers can pause
                                // naturally and the visual weight stays on
                                // the names themselves. Aria-labels use
                                // natural-language phrasing ("Restore X (in
                                // Y)") so assistive tech readers hear the
                                // relationship between pocket and parent
                                // account, not a flat concatenation.
                                const restoreLabel = parentName
                                    ? `Restore ${pocket.name} (in ${parentName})`
                                    : `Restore ${pocket.name}`;
                                const deleteLabel = parentName
                                    ? `Permanently delete ${pocket.name} (in ${parentName})`
                                    : `Permanently delete ${pocket.name}`;
                                return (
                                    <li
                                        key={pocket.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg text-gray-500 dark:text-gray-500 bg-gray-100/70 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="font-medium truncate">
                                                {parentName && (
                                                    <>
                                                        <span className="text-gray-400 dark:text-gray-500">{parentName}</span>
                                                        <span className="mx-1.5 text-gray-400 dark:text-gray-500" aria-hidden="true">›</span>
                                                    </>
                                                )}
                                                <span>{pocket.name}</span>
                                            </span>
                                            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium border border-gray-300 dark:border-gray-600 whitespace-nowrap">
                                                {pocket.currency}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => onRestorePocket?.(pocket.id)}
                                                loading={isThisRestoring}
                                                disabled={isBusy || !onRestorePocket}
                                                aria-label={restoreLabel}
                                            >
                                                Restore
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => onDeletePocket?.(pocket.id)}
                                                loading={isThisDeleting}
                                                disabled={isBusy || !onDeletePocket}
                                                aria-label={deleteLabel}
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
            )}
        </div>
    );
};

export default memo(ArchivedSection);
