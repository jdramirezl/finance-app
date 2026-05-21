import { memo, useMemo } from 'react';
import type { FixedExpenseGroup, SubPocket, Account } from '../../types';
import { ChevronDown, ChevronRight, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import Button from '../ui/Button';
import AnimatedProgressBar from '../ui/AnimatedProgressBar';
import CurrencyAmount from '../ui/CurrencyAmount';
import { calculateAporteMensual, calculateSimpleMonthlyContribution, calculateProgress } from '../../utils/fixedExpenseUtils';

interface FixedExpenseGroupCardProps {
  group: FixedExpenseGroup;
  subPockets: SubPocket[];
  allGroups: FixedExpenseGroup[];
  currency: string;
  isDefaultGroup: boolean;
  isCollapsed: boolean;
  isToggling: boolean;
  /**
   * All callbacks take the relevant id/group/subPocket so the parent can
   * hold a single stable callback (via useCallback) per action and the card
   * binds it to its own group/expense at the call site. This keeps
   * React.memo effective when one card re-renders.
   */
  onToggleCollapse: (groupId: string) => void;
  onToggleGroup: (groupId: string, enabled: boolean) => void;
  onEditGroup: (group: FixedExpenseGroup) => void;
  onDeleteGroup: (group: FixedExpenseGroup) => void;
  onEditExpense: (subPocket: SubPocket) => void;
  onDeleteExpense: (id: string) => void;
  onToggleExpense: (id: string) => void;
  onMoveToGroup: (subPocketId: string, groupId: string) => void;
  deletingId: string | null;
  togglingId: string | null;
  pocketAccountMap?: Map<string, Account>;
}

/**
 * Renders a single fixed-expense group with its sub-pocket rows.
 * Memoized so changes to one group (collapse, toggle, edit) don't cause
 * every other group's totals/progress bars to re-compute.
 */
const FixedExpenseGroupCard = ({
  group,
  subPockets,
  allGroups,
  currency,
  isDefaultGroup,
  isCollapsed,
  isToggling,
  onToggleCollapse,
  onToggleGroup,
  onEditGroup,
  onDeleteGroup,
  onEditExpense,
  onDeleteExpense,
  onToggleExpense,
  onMoveToGroup,
  deletingId,
  togglingId,
  pocketAccountMap,
}: FixedExpenseGroupCardProps) => {
  // Group-level aggregates: filter+reduce twice over the same list. Memoized
  // so we don't redo the math on every parent re-render.
  const { enabledCount, totalMonthlyExpected, totalMonthlyActual } = useMemo(() => {
    let enabled = 0;
    let expected = 0;
    let actual = 0;
    for (const sp of subPockets) {
      if (!sp.enabled) continue;
      enabled += 1;
      expected += calculateSimpleMonthlyContribution(sp.valueTotal, sp.periodicityMonths);
      actual += calculateAporteMensual(sp.valueTotal, sp.periodicityMonths, sp.balance);
    }
    return {
      enabledCount: enabled,
      totalMonthlyExpected: expected,
      totalMonthlyActual: actual,
    };
  }, [subPockets]);

  const allEnabled = subPockets.length > 0 && enabledCount === subPockets.length;
  const someEnabled = enabledCount > 0 && enabledCount < subPockets.length;

  const groupToggleLabel = allEnabled
    ? `Disable all expenses in ${group.name}`
    : `Enable all expenses in ${group.name}`;

  return (
    <div
      className="border border-outline-variant rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{ borderLeftWidth: '4px', borderLeftColor: group.color }}
    >
      {/* Group Header */}
      <div className="bg-surface-container-high p-4 sticky top-0 z-10 border-b border-white/[0.06] rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => onToggleCollapse(group.id)}
              className="p-1 hover:bg-surface-container-highest rounded transition-colors"
              aria-label={isCollapsed ? `Expand ${group.name}` : `Collapse ${group.name}`}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5 text-on-surface-variant" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-5 h-5 text-on-surface-variant" aria-hidden="true" />
              )}
            </button>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-on-surface">
                  {group.name}
                </h3>
                <span className="text-sm text-on-surface-variant">
                  ({enabledCount}/{subPockets.length} enabled)
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-on-surface-variant">Expected:</span>
                  <CurrencyAmount
                    amount={totalMonthlyExpected}
                    currency={currency}
                    className="ml-1 font-medium text-on-surface"
                  />
                </div>
                <div>
                  <span className="text-on-surface-variant">Actual:</span>
                  <CurrencyAmount
                    amount={totalMonthlyActual}
                    currency={currency}
                    className="ml-1 font-medium text-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Group Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleGroup(group.id, !allEnabled)}
              loading={isToggling}
              disabled={isToggling || subPockets.length === 0}
              className={`p-2 ${allEnabled
                ? 'text-[#34d399] hover:bg-[#34d399]/10'
                : someEnabled
                  ? 'text-[#ffb873] hover:bg-[#ffb873]/10'
                  : 'text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              title={groupToggleLabel}
              aria-label={groupToggleLabel}
            >
              {allEnabled ? (
                <ToggleRight className="w-5 h-5" aria-hidden="true" />
              ) : (
                <ToggleLeft className="w-5 h-5" aria-hidden="true" />
              )}
            </Button>

            {/* Edit Group */}
            {!isDefaultGroup && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditGroup(group)}
                  className="p-2 text-primary hover:bg-primary/10"
                  title="Edit group"
                  aria-label={`Edit group ${group.name}`}
                >
                  <Edit2 className="w-4 h-4" aria-hidden="true" />
                </Button>

                {/* Delete Group */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteGroup(group)}
                  className="p-2 text-[#ffb4ab] hover:bg-[#ffb4ab]/10"
                  title="Delete group"
                  aria-label={`Delete group ${group.name}`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expenses List */}
      {!isCollapsed && (
        <div className="divide-y divide-white/[0.06]">
          {subPockets.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant">
              No expenses in this group
            </div>
          ) : (
            subPockets.map((subPocket) => {
              const aporteMensualExpected = calculateSimpleMonthlyContribution(subPocket.valueTotal, subPocket.periodicityMonths);
              const aporteMensualActual = calculateAporteMensual(subPocket.valueTotal, subPocket.periodicityMonths, subPocket.balance);
              const progress = calculateProgress(subPocket.balance, subPocket.valueTotal);
              const isDeleting = deletingId === subPocket.id;
              const isTogglingExpense = togglingId === subPocket.id;
              const account = pocketAccountMap?.get(subPocket.pocketId);
              const expenseToggleLabel = subPocket.enabled
                ? `Disable ${subPocket.name}`
                : `Enable ${subPocket.name}`;

              return (
                <div
                  key={subPocket.id}
                  className={`p-4 hover:bg-surface-container-high/50 transition-all duration-200 ${!subPocket.enabled ? 'opacity-50' : ''
                    } last:rounded-b-xl`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium text-on-surface ${!subPocket.enabled ? 'line-through' : ''}`}>
                            {subPocket.name}
                          </h4>
                          {account && (
                            <span
                              className="px-1.5 py-0.5 text-[11px] uppercase font-bold rounded border opacity-70"
                              style={{
                                color: account.color,
                                borderColor: account.color,
                                backgroundColor: `${account.color}10`
                              }}
                            >
                              {account.name}
                            </span>
                          )}
                          {!subPocket.enabled && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-surface-container-highest text-on-surface-variant rounded">
                              Disabled
                            </span>
                          )}
                        </div>

                        {/* Group Selector */}
                        <select
                          value={subPocket.groupId || ''}
                          onChange={(e) => onMoveToGroup(subPocket.id, e.target.value)}
                          className="text-xs px-2 py-1 border border-outline-variant rounded bg-surface-container-highest text-on-surface"
                          title="Move to group"
                          aria-label={`Move ${subPocket.name} to a different group`}
                        >
                          {allGroups.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-on-surface-variant">Total:</span>
                          <CurrencyAmount
                            amount={subPocket.valueTotal}
                            currency={currency}
                            className="ml-2 font-medium text-on-surface"
                          />
                        </div>
                        <div>
                          <span className="text-on-surface-variant">Expected:</span>
                          <CurrencyAmount
                            amount={aporteMensualExpected}
                            currency={currency}
                            className="ml-2 font-medium text-on-surface"
                          />
                        </div>
                        <div>
                          <span className="text-on-surface-variant">Actual:</span>
                          <CurrencyAmount
                            amount={aporteMensualActual}
                            currency={currency}
                            className="ml-2 font-medium text-primary"
                          />
                        </div>
                        <div>
                          <span className="text-on-surface-variant">Balance:</span>
                          <CurrencyAmount
                            amount={subPocket.balance}
                            currency={currency}
                            className="ml-2 font-medium text-on-surface"
                          />
                        </div>
                        <div>
                          <span className="text-on-surface-variant">Periodicity:</span>
                          <span className="ml-2 font-medium text-on-surface font-mono">
                            {subPocket.periodicityMonths} months
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <AnimatedProgressBar
                          value={subPocket.balance}
                          max={subPocket.valueTotal}
                          color={progress >= 100 ? 'green' : progress >= 75 ? 'blue' : progress >= 50 ? 'orange' : 'red'}
                          showPercentage={true}
                          height="md"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleExpense(subPocket.id)}
                        loading={isTogglingExpense}
                        disabled={isTogglingExpense}
                        className={`p-2 ${subPocket.enabled
                          ? 'text-[#34d399] hover:bg-[#34d399]/10'
                          : 'text-on-surface-variant hover:bg-surface-container-highest'
                          }`}
                        title={expenseToggleLabel}
                        aria-label={expenseToggleLabel}
                      >
                        {subPocket.enabled ? (
                          <ToggleRight className="w-5 h-5" aria-hidden="true" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" aria-hidden="true" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditExpense(subPocket)}
                        className="p-2 text-primary hover:bg-primary/10"
                        title="Edit"
                        aria-label={`Edit fixed expense ${subPocket.name}`}
                      >
                        <Edit2 className="w-4 h-4" aria-hidden="true" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteExpense(subPocket.id)}
                        loading={isDeleting}
                        disabled={isDeleting}
                        className="p-2 text-[#ffb4ab] hover:bg-[#ffb4ab]/10"
                        title="Delete"
                        aria-label={`Delete fixed expense ${subPocket.name}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </div>
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

export default memo(FixedExpenseGroupCard);
