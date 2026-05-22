import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';

interface InlineEditableAmountProps {
    amount: number;
    isIncome: boolean;
    onSave: (newAmount: number) => Promise<void>;
    triggerMode?: 'click' | 'icon';
}

/**
 * Displays a movement amount as clickable text. On click, transforms into
 * an inline number input for quick editing without opening the full modal.
 */
const InlineEditableAmount = memo(({ amount, isIncome, onSave, triggerMode = 'click' }: InlineEditableAmountProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) inputRef.current?.select();
    }, [isEditing]);

    const colorClass = isIncome
        ? 'text-green-400'
        : 'text-red-400';

    const startEditing = useCallback(() => {
        setInputValue(String(amount));
        setIsEditing(true);
    }, [amount]);

    const cancel = useCallback(() => {
        setIsEditing(false);
    }, []);

    const save = useCallback(async () => {
        const parsed = parseFloat(inputValue);
        if (!inputValue || isNaN(parsed) || parsed <= 0) {
            cancel();
            return;
        }
        if (parsed === amount) {
            cancel();
            return;
        }
        setIsSaving(true);
        try {
            await onSave(parsed);
            setIsEditing(false);
        } catch {
            // Keep editing on error so user can retry
            inputRef.current?.focus();
        } finally {
            setIsSaving(false);
        }
    }, [inputValue, amount, onSave, cancel]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            save();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
        }
    }, [save, cancel]);

    if (isEditing) {
        return (
            <span className={`inline-flex items-center gap-1 text-lg font-bold ${colorClass}`}>
                {isIncome ? '+' : '-'}$
                <input
                    ref={inputRef}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={save}
                    disabled={isSaving}
                    className={`w-24 bg-transparent border-b border-current outline-none text-lg font-bold ${colorClass} ${isSaving ? 'opacity-50' : ''}`}
                    aria-label="Edit amount"
                />
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            </span>
        );
    }

    if (triggerMode === 'icon') {
        return (
            <span className="group/edit inline-flex items-center gap-1">
                <span className={`text-lg font-bold ${colorClass}`}>
                    {isIncome ? '+' : '-'}${amount.toLocaleString()}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); startEditing(); }}
                    className="opacity-40 sm:opacity-0 sm:group-hover/edit:opacity-60 hover:!opacity-100 transition-opacity p-0.5"
                    aria-label="Edit amount"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
            </span>
        );
    }

    return (
        <span
            className={`text-lg font-bold ${colorClass} cursor-pointer hover:underline`}
            onClick={startEditing}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') startEditing(); }}
            aria-label={`Edit amount: ${isIncome ? '+' : '-'}$${amount.toLocaleString()}`}
        >
            {isIncome ? '+' : '-'}${amount.toLocaleString()}
        </span>
    );
});

InlineEditableAmount.displayName = 'InlineEditableAmount';

export default InlineEditableAmount;
