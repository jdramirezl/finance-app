import { useSelection } from '../../context/SelectionContext';
import { currencyService } from '../../services/currencyService';
import { X } from 'lucide-react';

interface FloatingStatsBarProps {
    primaryCurrency?: string;
}

const FloatingStatsBar = ({ primaryCurrency = 'USD' }: FloatingStatsBarProps) => {
    const { selectedItems, clearSelection } = useSelection();

    if (selectedItems.size === 0) return null;

    const values = Array.from(selectedItems.values());
    const count = values.length;
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    const avg = count > 0 ? sum / count : 0;

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900/90 dark:bg-gray-800/90 text-white backdrop-blur-md px-6 py-3 rounded-full shadow-xl z-50 flex items-center gap-6 animate-in slide-in-from-bottom-4 fade-in duration-200 border border-gray-700/50">
            <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Selected</span>
                <span className="font-bold text-lg leading-none">{count}</span>
            </div>

            <div className="w-px h-8 bg-gray-700"></div>

            <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Sum</span>
                <span className="font-bold text-lg leading-none">
                    {currencyService.formatCurrency(sum, primaryCurrency as any)}
                </span>
            </div>

            <div className="w-px h-8 bg-gray-700"></div>

            <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Average</span>
                <span className="font-bold text-lg leading-none">
                    {currencyService.formatCurrency(avg, primaryCurrency as any)}
                </span>
            </div>

            <div className="w-px h-8 bg-gray-700 ml-2"></div>

            <button
                onClick={clearSelection}
                className="text-gray-400 hover:text-white transition-colors p-1"
                title="Clear selection"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
};

export default FloatingStatsBar;
