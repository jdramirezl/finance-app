import type { FixedExpenseGroup, SubPocket } from '../types';
import { ChevronDown, ChevronRight, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import Button from './Button';
import AnimatedProgressBar from './AnimatedProgressBar';
import { calculateAporteMensual, calculateSimpleMonthlyContribution, calculateProgress } from '../utils/fixedExpenseUtils';

interface FixedExpenseGroupCardProps {
  group: FixedExpenseGroup;
  subPockets: SubPocket[];
  allGroups: FixedExpenseGroup[];
  currency: string;
  isDefaultGroup: boolean;
  isCollapsed: boolean;
  isToggling: boolean;
  onToggleCollapse: () => void;
  onToggleGroup: (enabled: boolean) => void;
  onEditGroup: () => void;
  onDeleteGroup: () => void;
  onEditExpense: (subPocket: SubPocket) => void;
  onDeleteExpense: (id: string) => void;
  onToggleExpense: (id: string) => void;
  onMoveToGroup: (subPocketId: string, groupId: string) => void;
  deletingId: string | null;
  togglingId: string | null;
}

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
}: FixedExpenseGroupCardProps) => {

  const enabledCount = subPockets.filter(sp => sp.enabled).length;
  const totalMonthlyExpected = subPockets
    .filter(sp => sp.enabled)
    .reduce((sum, sp) => sum + calculateSimpleMonthlyContribution(sp.valueTotal, sp.periodicityMonths), 0);
  const totalMonthlyActual = subPockets
    .filter(sp => sp.enabled)
    .reduce((sum, sp) => sum + calculateAporteMensual(sp.valueTotal, sp.periodicityMonths, sp.balance), 0);
  const allEnabled = subPockets.length > 0 && enabledCount === subPockets.length;
  const someEnabled = enabledCount > 0 && enabledCount < subPockets.length;

  return (
    <div
      className="border dark:border-gray-700 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{ borderLeftWidth: '4px', borderLeftColor: group.color }}
    >
      {/* Group Header */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 sticky top-0 z-10 border-b dark:border-gray-700 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {group.name}
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({enabledCount}/{subPockets.length} enabled)
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Expected:</span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                    {totalMonthlyExpected.toLocaleString(undefined, { style: 'currency', currency })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Actual:</span>
                  <span className="ml-1 font-medium text-blue-600 dark:text-blue-400">
                    {totalMonthlyActual.toLocaleString(undefined, { style: 'currency', currency })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Group Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleGroup(!allEnabled)}
              loading={isToggling}
              disabled={isToggling || subPockets.length === 0}
              className={`p-2 ${allEnabled
                ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                : someEnabled
                  ? 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              title={allEnabled ? 'Disable all in group' : 'Enable all in group'}
            >
              {allEnabled ? (
                <ToggleRight className="w-5 h-5" />
              ) : (
                <ToggleLeft className="w-5 h-5" />
              )}
            </Button>

            {/* Edit Group */}
            {!isDefaultGroup && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEditGroup}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  title="Edit group"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>

                {/* Delete Group */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDeleteGroup}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                  title="Delete group"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expenses List */}
      {!isCollapsed && (
        <div className="divide-y dark:divide-gray-700">
          {subPockets.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No expenses in this group
            </div>
          ) : (
            subPockets.map((subPocket) => {
              const aporteMensualExpected = calculateSimpleMonthlyContribution(subPocket.valueTotal, subPocket.periodicityMonths);
              const aporteMensualActual = calculateAporteMensual(subPocket.valueTotal, subPocket.periodicityMonths, subPocket.balance);
              const progress = calculateProgress(subPocket.balance, subPocket.valueTotal);
              const isDeleting = deletingId === subPocket.id;
              const isTogglingExpense = togglingId === subPocket.id;

              return (
                <div
                  key={subPocket.id}
                  className={`p-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent dark:hover:from-gray-800/50 dark:hover:to-transparent transition-all duration-200 ${!subPocket.enabled ? 'opacity-50' : ''
                    } last:rounded-b-xl`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium text-gray-900 dark:text-gray-100 ${!subPocket.enabled ? 'line-through' : ''}`}>
                            {subPocket.name}
                          </h4>
                          {!subPocket.enabled && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                              Disabled
                            </span>
                          )}
                        </div>

                        {/* Group Selector */}
                        <select
                          value={subPocket.groupId || ''}
                          onChange={(e) => onMoveToGroup(subPocket.id, e.target.value)}
                          className="text-xs px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          title="Move to group"
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
                          <span className="text-gray-500 dark:text-gray-400">Total:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                            {subPocket.valueTotal.toLocaleString(undefined, { style: 'currency', currency })}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Expected:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                            {aporteMensualExpected.toLocaleString(undefined, { style: 'currency', currency })}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Actual:</span>
                          <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">
                            {aporteMensualActual.toLocaleString(undefined, { style: 'currency', currency })}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Balance:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                            {subPocket.balance.toLocaleString(undefined, { style: 'currency', currency })}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Periodicity:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
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
                          ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        title={subPocket.enabled ? 'Disable' : 'Enable'}
                      >
                        {subPocket.enabled ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditExpense(subPocket)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteExpense(subPocket.id)}
                        loading={isDeleting}
                        disabled={isDeleting}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
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

export default FixedExpenseGroupCard;
