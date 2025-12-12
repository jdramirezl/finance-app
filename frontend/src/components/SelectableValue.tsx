import React from 'react';
import { useSelection } from '../context/SelectionContext';
import { currencyService } from '../services/currencyService';

interface SelectableValueProps {
    id: string; // Unique ID for this value
    value: number; // The numeric value
    currency?: string; // Optional: for default formatting
    children?: React.ReactNode; // Optional: Custom render content
    className?: string;
}

const SelectableValue = ({
    id,
    value,
    currency,
    children,
    className = ''
}: SelectableValueProps) => {
    const { toggleSelection, isSelected } = useSelection();
    const selected = isSelected(id);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent bubbling if nested
        toggleSelection(id, value);
    };

    return (
        <div
            onClick={handleClick}
            role="button"
            tabIndex={0}
            className={`
        inline-block rounded px-1 -mx-1 transition-colors cursor-pointer select-none
        ${selected
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-100 ring-2 ring-blue-500/20'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }
        ${className}
      `}
        >
            {children ? children : (
                <span>
                    {currency ? currencyService.formatCurrency(value, currency as any) : value.toLocaleString()}
                </span>
            )}
        </div>
    );
};

export default SelectableValue;
