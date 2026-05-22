import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, ToggleLeft, ToggleRight, ArrowRightLeft } from 'lucide-react';
import type { FixedExpenseGroup, SubPocket } from '../../types';
import CurrencyAmount from '../ui/CurrencyAmount';
import {
  calculateAporteMensual,
  calculateSimpleMonthlyContribution,
  calculateProgress,
} from '../../utils/fixedExpenseUtils';

interface FixedExpenseGroupCardProps {
  group: FixedExpenseGroup;
  subPockets: SubPocket[];
  allGroups: FixedExpenseGroup[];
  currency: string;
  isDefaultGroup: boolean;
  onEditGroup: (group: FixedExpenseGroup) => void;
  onDeleteGroup: (group: FixedExpenseGroup) => void;
  onEditExpense: (subPocket: SubPocket) => void;
  onDeleteExpense: (id: string) => void;
  onToggleExpense: (id: string) => void;
  onMoveToGroup: (subPocketId: string, groupId: string) => void;
  deletingId: string | null;
  togglingId: string | null;
}

type ExpenseStatus = 'SETTLED' | 'RECURRING' | 'IN PROGRESS' | 'DUE SOON' | 'OFF';

function getExpenseStatus(sp: SubPocket): ExpenseStatus {
  if (!sp.enabled) return 'OFF';
  const progress = calculateProgress(sp.balance, sp.valueTotal);
  if (progress >= 100) return 'SETTLED';
  // Recurring: periodicity is 1 month (monthly bill that resets)
  if (sp.periodicityMonths === 1) return 'RECURRING';
  // DUE SOON: less than 10% funded
  if (progress < 10) return 'DUE SOON';
  return 'IN PROGRESS';
}

function getStatusColor(status: ExpenseStatus): string {
  switch (status) {
    case 'SETTLED': return 'text-blue-400';
    case 'RECURRING': return 'text-blue-400';
    case 'IN PROGRESS': return 'text-gray-400';
    case 'DUE SOON': return 'text-red-400';
    case 'OFF': return 'text-gray-400';
  }
}

const MoveDropdown = ({ groups, onMove }: { groups: FixedExpenseGroup[]; onMove: (groupId: string) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1 text-gray-400 hover:text-blue-400 transition-colors rounded"
        title="Move to group"
      >
        <ArrowRightLeft className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-30 bg-gray-700 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[120px]">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => { onMove(g.id); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-100 hover:bg-gray-700/50"
            >
              {g.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FixedExpenseGroupCard = ({
  group,
  subPockets,
  allGroups,
  currency,
  isDefaultGroup,
  onEditGroup,
  onDeleteGroup,
  onEditExpense,
  onDeleteExpense,
  onToggleExpense,
  onMoveToGroup,
  deletingId,
  togglingId,
}: FixedExpenseGroupCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const groupTotal = useMemo(
    () => subPockets.filter((sp) => sp.enabled).reduce((sum, sp) => sum + calculateSimpleMonthlyContribution(sp.valueTotal, sp.periodicityMonths), 0),
    [subPockets]
  );

  return (
    <section className="bg-gray-800 border border-gray-700 rounded-xl flex flex-col">
      {/* Header: icon + name + kebab */}
      <div className="p-5 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: `${group.color}15`, color: group.color }}
          >
            {group.name.charAt(0).toUpperCase()}
          </div>
          <h3 className="text-xl font-semibold text-gray-100">{group.name}</h3>
        </div>

        {/* Kebab menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 text-gray-400 hover:text-gray-100 transition-colors rounded"
            aria-label={`Actions for ${group.name}`}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 bg-gray-700 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[140px]">
              {!isDefaultGroup && (
                <>
                  <button
                    onClick={() => { onEditGroup(group); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-100 hover:bg-gray-700/50"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => { onDeleteGroup(group); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700/50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expense rows */}
      <div className="flex-1 p-5 space-y-6">
        {subPockets.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">
            No expenses in this group
          </p>
        ) : (
          subPockets.map((sp) => {
            const progress = calculateProgress(sp.balance, sp.valueTotal);
            const monthlyContrib = calculateAporteMensual(sp.valueTotal, sp.periodicityMonths, sp.balance);
            const status = getExpenseStatus(sp);
            const statusColor = getStatusColor(status);
            const otherGroups = allGroups.filter((g) => g.id !== group.id);

            return (
              <div
                key={sp.id}
                className={`group/row relative space-y-2 ${!sp.enabled ? 'opacity-50' : ''}`}
              >
                {/* Name + amounts + hover actions */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleExpense(sp.id)}
                      disabled={togglingId === sp.id}
                      className="text-gray-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                      title={sp.enabled ? 'Disable expense' : 'Enable expense'}
                    >
                      {sp.enabled
                        ? <ToggleRight className="w-5 h-5 text-blue-400" />
                        : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <span className="text-sm text-gray-100 text-left">
                      {sp.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Hover-reveal action buttons */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditExpense(sp)}
                        className="p-1 text-gray-400 hover:text-blue-400 transition-colors rounded"
                        title="Edit expense"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteExpense(sp.id)}
                        disabled={deletingId === sp.id}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors rounded disabled:opacity-50"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {otherGroups.length > 0 && (
                        <MoveDropdown
                          groups={otherGroups}
                          onMove={(groupId) => onMoveToGroup(sp.id, groupId)}
                        />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-100 ml-2">
                      <CurrencyAmount amount={sp.balance} currency={currency} className="text-gray-100" />
                      {' '}
                      <span className="text-gray-400">
                        / <CurrencyAmount amount={sp.valueTotal} currency={currency} />
                      </span>
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 w-full bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-[#4cd7f6] rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>

                {/* Monthly contrib + status badge */}
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.06em] text-gray-400">
                  <span>
                    MONTHLY CONTRIB: <CurrencyAmount amount={monthlyContrib} currency={currency} />
                  </span>
                  <span className={statusColor}>{status}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: group total */}
      <div className="px-5 py-4 bg-gray-700/50 mt-auto rounded-b-xl border-t border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-400">
            GROUP TOTAL
          </span>
          <CurrencyAmount
            amount={groupTotal}
            currency={currency}
            className="text-sm font-medium text-blue-400"
          />
        </div>
      </div>
    </section>
  );
};

export default memo(FixedExpenseGroupCard);
