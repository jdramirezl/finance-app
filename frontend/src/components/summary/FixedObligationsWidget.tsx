import { useMemo } from 'react';
import { Home, Zap, Wifi, Car, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { currencyService } from '../../services/currencyService';
import type { SubPocket, FixedExpenseGroup, Currency } from '../../types';

interface FixedObligationsWidgetProps {
  subPockets: SubPocket[];
  groups: FixedExpenseGroup[];
  primaryCurrency?: Currency;
}

// Map common group names to icons
const GROUP_ICONS: Record<string, typeof Home> = {
  housing: Home,
  utilities: Zap,
  internet: Wifi,
  transport: Car,
  default: CreditCard,
};

function getGroupIcon(name: string) {
  const lower = name.toLowerCase();
  for (const [key, Icon] of Object.entries(GROUP_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return GROUP_ICONS.default;
}

const FixedObligationsWidget = ({ subPockets, groups, primaryCurrency = 'USD' }: FixedObligationsWidgetProps) => {
  const navigate = useNavigate();

  const { totalCurrent, totalTarget, pct, topGroups } = useMemo(() => {
    const enabledSps = subPockets.filter((sp) => sp.enabled);
    const current = enabledSps.reduce((sum, sp) => sum + sp.balance, 0);
    const target = enabledSps.reduce((sum, sp) => sum + (sp.valueTotal / sp.periodicityMonths), 0);
    const p = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

    // Get unique group names for icons (max 4)
    const groupNames = new Set<string>();
    for (const sp of enabledSps) {
      const group = groups.find((g) => g.id === sp.groupId);
      groupNames.add(group?.name || 'General');
      if (groupNames.size >= 4) break;
    }

    return { totalCurrent: current, totalTarget: target, pct: p, topGroups: Array.from(groupNames) };
  }, [subPockets, groups]);

  if (subPockets.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          Fixed Commitments
        </p>
        <p className="font-mono text-xs text-on-surface">
          {currencyService.formatCurrency(totalCurrent, primaryCurrency)} / {currencyService.formatCurrency(totalTarget, primaryCurrency)}
        </p>
      </div>

      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-primary to-cyan-400 h-full rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex justify-between items-center">
        <div className="flex -space-x-2">
          {topGroups.map((name) => {
            const Icon = getGroupIcon(name);
            return (
              <div
                key={name}
                className="w-6 h-6 rounded-full bg-surface-bright flex items-center justify-center border border-background"
                title={name}
              >
                <Icon className="w-3 h-3" />
              </div>
            );
          })}
        </div>
        <button
          onClick={() => navigate('/fixed-expenses')}
          className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
        >
          VIEW SCHEDULE
        </button>
      </div>
    </div>
  );
};

export default FixedObligationsWidget;
