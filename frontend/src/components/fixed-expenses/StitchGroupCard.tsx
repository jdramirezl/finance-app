import { memo, useMemo, useState } from 'react';
import {
  ChevronDown,
  Edit2,
  FileText,
  Folder,
  FolderInput,
  Loader2,
  Trash2,
} from 'lucide-react';
import type { FixedExpenseGroup, SubPocket } from '../../types';
import CurrencyAmount from '../ui/CurrencyAmount';
import { calculateSimpleMonthlyContribution } from '../../utils/fixedExpenseUtils';

export interface StitchGroupCardProps {
  group: FixedExpenseGroup;
  expenses: SubPocket[];
  currency: string;
  /**
   * Whether this card is the synthetic "Default" bucket. When `true` the
   * edit/delete group buttons are hidden — Default is not editable.
   */
  isDefaultGroup?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onEditGroup: () => void;
  onDeleteGroup: () => void;
  onEditExpense: (expense: SubPocket) => void;
  onDeleteExpense: (expense: SubPocket) => void;
  /**
   * Move an expense to a different group. `targetGroupId` is the destination
   * group id, or `null` to ungroup (clear the expense's groupId).
   */
  onMoveToGroup: (expense: SubPocket, targetGroupId: string | null) => void;
  /**
   * Groups this card's expenses can be moved to. Should already exclude the
   * card's own group. The "Ungrouped" option (`null`) is appended by the
   * card itself — do not include it here.
   */
  availableGroups: { id: string; name: string }[];
  deletingExpenseId?: string | null;
}

/**
 * Stitch-style fixed-expense group card.
 *
 * Replaces the legacy `FixedExpenseGroupCard` drag-and-drop layout with a
 * minimal collapsible card that exposes group + per-row hover actions.
 * The rest of the CRUD behaviour is preserved — only the visual layout
 * changes.
 *
 * Per-action callbacks are pre-bound to this group/expense by the parent
 * list, which keeps this component a pure presentational unit.
 */
const StitchGroupCard = ({
  group,
  expenses,
  currency,
  isDefaultGroup = false,
  isCollapsed,
  onToggleCollapse,
  onEditGroup,
  onDeleteGroup,
  onEditExpense,
  onDeleteExpense,
  onMoveToGroup,
  availableGroups,
  deletingExpenseId = null,
}: StitchGroupCardProps) => {
  // Tracks which expense's move-to-group dropdown is currently open. Only
  // one can be open at a time; clicking the trigger toggles it, picking an
  // option closes it, and clicking the backdrop closes it.
  const [movingExpenseId, setMovingExpenseId] = useState<string | null>(null);

  // Group total = sum of monthly contributions for all expenses.
  const { groupTotal } = useMemo(() => {
    let total = 0;
    for (const sp of expenses) {
      total += calculateSimpleMonthlyContribution(sp.valueTotal, sp.periodicityMonths);
    }
    return { groupTotal: total };
  }, [expenses]);

  return (
    <div className="group bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* ---- Group Header ---- */}
      <div className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? `Expand ${group.name}` : `Collapse ${group.name}`}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <span className="text-blue-400 flex-shrink-0">
            <Folder className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="font-medium text-gray-100 truncate">{group.name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {expenses.length} items
          </span>
        </button>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Hover-revealed group actions: edit, delete */}
          <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex gap-1">
            {!isDefaultGroup && (
              <>
                <button
                  type="button"
                  onClick={onEditGroup}
                  aria-label={`Edit group ${group.name}`}
                  title="Edit group"
                  className="p-1.5 rounded-md text-gray-300 hover:bg-gray-700 hover:text-blue-400 transition-colors"
                >
                  <Edit2 className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onDeleteGroup}
                  aria-label={`Delete group ${group.name}`}
                  title="Delete group"
                  className="p-1.5 rounded-md text-gray-300 hover:bg-gray-700 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          <CurrencyAmount
            amount={groupTotal}
            currency={currency}
            className="text-gray-200 font-mono text-sm tabular-nums"
          />

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? `Expand ${group.name}` : `Collapse ${group.name}`}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ChevronDown
              className={`w-5 h-5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* ---- Expense Rows ---- */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-1">
          {expenses.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">
              No expenses in this group
            </div>
          ) : (
            expenses.map((expense) => {
              const monthlyAmount = calculateSimpleMonthlyContribution(
                expense.valueTotal,
                expense.periodicityMonths,
              );
              const isDeleting = deletingExpenseId === expense.id;

              return (
                <div
                  key={expense.id}
                  className="group/row flex items-center justify-between p-2 rounded-lg hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText
                      className="w-4 h-4 text-gray-500 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-gray-200 truncate">
                      {expense.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Hover-revealed row actions: move, edit, delete. The
                        action group is forced visible while a move dropdown
                        is open so the menu's anchor button doesn't disappear
                        when the user moves the cursor onto the dropdown. */}
                    <div
                      className={`opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity flex gap-1${
                        movingExpenseId === expense.id ? ' !opacity-100' : ''
                      }`}
                    >
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setMovingExpenseId((current) =>
                              current === expense.id ? null : expense.id,
                            )
                          }
                          aria-label={`Move fixed expense ${expense.name} to another group`}
                          aria-haspopup="menu"
                          aria-expanded={movingExpenseId === expense.id}
                          title="Move to group"
                          className="p-1 rounded-md text-gray-300 hover:bg-gray-700 hover:text-blue-400 transition-colors"
                        >
                          <FolderInput
                            className="w-3.5 h-3.5"
                            aria-hidden="true"
                          />
                        </button>
                        {movingExpenseId === expense.id && (
                          <>
                            {/* Backdrop closes the menu on any outside click. */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setMovingExpenseId(null)}
                              aria-hidden="true"
                            />
                            <div
                              role="menu"
                              aria-label={`Move ${expense.name} to`}
                              className="absolute right-0 bottom-full mb-1 z-20 min-w-[160px] bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1"
                            >
                              {availableGroups.length === 0 && (
                                <div className="px-3 py-1.5 text-xs text-gray-500">
                                  No other groups
                                </div>
                              )}
                              {availableGroups.map((g) => (
                                <button
                                  key={g.id}
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    onMoveToGroup(expense, g.id);
                                    setMovingExpenseId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
                                >
                                  {g.name}
                                </button>
                              ))}
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  onMoveToGroup(expense, null);
                                  setMovingExpenseId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 border-t border-gray-700"
                              >
                                Ungrouped
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onEditExpense(expense)}
                        aria-label={`Edit fixed expense ${expense.name}`}
                        title="Edit expense"
                        className="p-1 rounded-md text-gray-300 hover:bg-gray-700 hover:text-blue-400 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(expense)}
                        disabled={isDeleting}
                        aria-label={`Delete fixed expense ${expense.name}`}
                        title="Delete expense"
                        className="p-1 rounded-md text-gray-300 hover:bg-gray-700 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isDeleting ? (
                          <Loader2
                            className="w-3.5 h-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>

                    <CurrencyAmount
                      amount={monthlyAmount}
                      currency={currency}
                      className="font-mono text-sm text-gray-100 tabular-nums"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default memo(StitchGroupCard);
