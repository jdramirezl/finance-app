import { useSelection } from '../../contexts/SelectionContext';
import { currencyService } from '../../services/currencyService';
import { X } from 'lucide-react';
import type { Currency } from '../../types';

interface FloatingStatsBarProps {
    primaryCurrency?: Currency;
}

const FloatingStatsBar = ({ primaryCurrency = 'USD' }: FloatingStatsBarProps) => {
    const { selectedItems, clearSelection } = useSelection();

    if (selectedItems.size === 0) return null;

    const values = Array.from(selectedItems.values());
    const count = values.length;
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    const avg = count > 0 ? sum / count : 0;

    return (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 transform -translate-x-1/2 bg-surface-container-high/90 text-on-surface backdrop-blur-md px-6 py-3 rounded-full z-50 flex items-center gap-6 animate-in slide-in-from-bottom-4 fade-in duration-200 border border-white/[0.08]">
            <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Selected</span>
                <span className="font-bold font-mono text-lg leading-none">{count}</span>
            </div>

            <div className="w-px h-8 bg-outline-variant"></div>

            <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Sum</span>
                <span className="font-bold font-mono text-lg leading-none">
                    {currencyService.formatCurrency(sum, primaryCurrency)}
                </span>
            </div>

            <div className="w-px h-8 bg-outline-variant"></div>

            <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Average</span>
                <span className="font-bold font-mono text-lg leading-none">
                    {currencyService.formatCurrency(avg, primaryCurrency)}
                </span>
            </div>

            <div className="w-px h-8 bg-outline-variant ml-2"></div>

            <button
                onClick={clearSelection}
                className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
                title="Clear selection"
                aria-label="Clear selection"
            >
                <X className="w-5 h-5" aria-hidden="true" />
            </button>
        </div>
    );
};

export default FloatingStatsBar;
