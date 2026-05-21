import { useMemo } from 'react';
import type { SubPocket, FixedExpenseGroup } from '../../types';

interface FixedObligationsWidgetProps {
  subPockets: SubPocket[];
  groups: FixedExpenseGroup[];
}

interface GroupSummary {
  name: string;
  current: number;
  target: number;
}

const FixedObligationsWidget = ({ subPockets, groups }: FixedObligationsWidgetProps) => {
  const { groupSummaries, overallPct } = useMemo(() => {
    const groupMap = new Map<string | undefined, SubPocket[]>();
    for (const sp of subPockets) {
      if (!sp.enabled) continue;
      const key = sp.groupId || '__default';
      const list = groupMap.get(key) || [];
      list.push(sp);
      groupMap.set(key, list);
    }

    const summaries: GroupSummary[] = [];
    let totalCurrent = 0;
    let totalTarget = 0;

    for (const [key, sps] of groupMap) {
      const group = groups.find((g) => g.id === key);
      const name = group?.name || 'General';
      const current = sps.reduce((sum, sp) => sum + sp.balance, 0);
      const target = sps.reduce((sum, sp) => sum + (sp.valueTotal / sp.periodicityMonths), 0);
      totalCurrent += current;
      totalTarget += target;
      summaries.push({ name, current, target });
    }

    const pct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
    return { groupSummaries: summaries.slice(0, 4), overallPct: pct };
  }, [subPockets, groups]);

  if (subPockets.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          Fixed Obligations
        </h4>
        <span className="font-mono text-sm text-on-surface">
          {overallPct}% <span className="text-[10px] text-on-surface-variant">REACHED</span>
        </span>
      </div>

      <div className="space-y-4">
        {groupSummaries.map((g) => {
          const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
          return (
            <div key={g.name} className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold">
                <span>{g.name}</span>
                <span>${Math.round(g.current).toLocaleString()} / ${Math.round(g.target).toLocaleString()}</span>
              </div>
              <div className="bg-surface-container-highest h-1 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FixedObligationsWidget;
