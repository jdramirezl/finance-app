import { useMemo, Fragment } from 'react';
import { Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { currencyService } from '../../services/currencyService';
import ProgressBar from '../ui/ProgressBar';
import Card from '../ui/Card';
import type { SubPocket, FixedExpenseGroup, Currency } from '../../types';

interface FixedObligationsWidgetProps {
  subPockets: SubPocket[];
  groups: FixedExpenseGroup[];
  primaryCurrency?: Currency;
}

const FixedObligationsWidget = ({ subPockets, groups, primaryCurrency = 'USD' }: FixedObligationsWidgetProps) => {
  const navigate = useNavigate();

  const { totalCurrent, totalTarget, groupedData } = useMemo(() => {
    const current = subPockets.reduce((sum, sp) => sum + sp.balance, 0);
    const target = subPockets.reduce((sum, sp) => sum + (sp.valueTotal / sp.periodicityMonths), 0);

    // Group expenses by groupId
    const groupsMap = new Map<string, SubPocket[]>();
    const ungrouped: SubPocket[] = [];

    subPockets.forEach(sp => {
      if (sp.groupId) {
        const arr = groupsMap.get(sp.groupId) || [];
        arr.push(sp);
        groupsMap.set(sp.groupId, arr);
      } else {
        ungrouped.push(sp);
      }
    });

    const sortedGroups = [...groups].sort((a, b) => a.displayOrder - b.displayOrder);

    return { totalCurrent: current, totalTarget: target, groupedData: { sortedGroups, groupsMap, ungrouped } };
  }, [subPockets, groups]);

  if (subPockets.length === 0) return null;

  const renderRow = (sp: SubPocket) => {
    const monthlyTarget = sp.valueTotal / sp.periodicityMonths;
    const progress = monthlyTarget > 0 ? Math.min((sp.balance / monthlyTarget) * 100, 100) : 0;

    return (
      <tr key={sp.id} className="hover:bg-surface-container-high/30">
        <td className="px-3 py-1.5 text-sm text-on-surface">
          <div className="flex items-center gap-1.5">
            <span className={!sp.enabled ? 'line-through text-on-surface-variant' : ''}>
              {sp.name}
            </span>
            {!sp.enabled && (
              <span className="text-[10px] bg-surface-container-highest text-on-surface-variant px-1 rounded">OFF</span>
            )}
          </div>
        </td>
        <td className="px-3 py-1.5 text-xs font-mono text-on-surface-variant">
          {currencyService.formatCurrency(sp.balance, primaryCurrency)}
        </td>
        <td className="px-3 py-1.5 text-xs font-mono text-on-surface-variant">
          {currencyService.formatCurrency(monthlyTarget, primaryCurrency)}
        </td>
        <td className="px-3 py-1.5 min-w-[80px]">
          <ProgressBar value={progress} showLabel size="sm" />
        </td>
      </tr>
    );
  };

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-lg font-semibold text-on-surface flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Fixed Expenses
        </h3>
        <button
          onClick={() => navigate('/fixed-expenses')}
          className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
        >
          VIEW ALL
        </button>
      </div>

      {/* Total */}
      <div className="px-4 py-2 bg-surface-container-high/30 border-b border-white/[0.06] flex justify-between items-center">
        <span className="text-xs text-on-surface-variant uppercase tracking-wider">Monthly Total</span>
        <span className="text-sm font-bold font-mono text-on-surface">
          {currencyService.formatCurrency(totalCurrent, primaryCurrency)} / {currencyService.formatCurrency(totalTarget, primaryCurrency)}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-surface-container-high/50 sticky top-0">
            <tr>
              <th className="px-3 py-1.5 text-left text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">Name</th>
              <th className="px-3 py-1.5 text-left text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">Contributed</th>
              <th className="px-3 py-1.5 text-left text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">Target</th>
              <th className="px-3 py-1.5 text-left text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {groupedData.sortedGroups.map(group => {
              const expenses = groupedData.groupsMap.get(group.id);
              if (!expenses?.length) return null;

              const groupTotal = expenses.reduce((sum, sp) => sum + sp.balance, 0);

              return (
                <Fragment key={group.id}>
                  {/* Group Header */}
                  <tr className="bg-surface-container/30">
                    <td colSpan={4} className="px-3 py-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                            {group.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-on-surface-variant">
                          {currencyService.formatCurrency(groupTotal, primaryCurrency)}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {expenses.map(renderRow)}
                </Fragment>
              );
            })}

            {/* Ungrouped */}
            {groupedData.ungrouped.length > 0 && (
              <>
                <tr className="bg-surface-container/30">
                  <td colSpan={4} className="px-3 py-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Other
                    </span>
                  </td>
                </tr>
                {groupedData.ungrouped.map(renderRow)}
              </>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default FixedObligationsWidget;
