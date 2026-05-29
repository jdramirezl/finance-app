/**
 * NetWorthRangeControls
 *
 * Compact pill-style range selector for the net-worth timeline. Replaces
 * the older `30d / 6m / 1y / All Time` buttons with four chips — `1Y`,
 * `2Y`, `All`, `Custom` — that drive the chart's `dataZoom` window
 * programmatically rather than filtering snapshots out of the dataset.
 * The chart always receives the full snapshot history; the chips control
 * which slice of that history is currently in view.
 *
 * `Custom` opens a small popover with two `<input type="month">` fields
 * (From / To) and an `Apply` button. The popover closes on apply or when
 * the user clicks outside it. The selected months are passed back to the
 * widget so it can resolve the `dataZoom` start/end percentages from the
 * actual data extent.
 *
 * Why month-precision instead of full date pickers: net-worth snapshots
 * are taken at most a few times per month, so picking days adds friction
 * without improving the resulting zoom range. Month-level precision also
 * keeps the popover minimal and dependency-free (no calendar widget).
 */

import { useEffect, useId, useRef, useState } from 'react';

export type NetWorthRange = '1m' | '3m' | '6m' | '1y' | '2y' | 'all' | 'custom';

export interface NetWorthRangeControlsProps {
    /** Currently selected range. Drives the active-chip styling. */
    activeRange: NetWorthRange;
    /**
     * Called when the user picks a new range. For `custom`, the
     * `customFrom` and `customTo` arguments hold the user's selected
     * months as `YYYY-MM` strings; they are omitted for the other
     * presets so consumers can rely on `range` alone.
     */
    onRangeChange: (
        range: NetWorthRange,
        customFrom?: string,
        customTo?: string,
    ) => void;
    /** Initial value for the From input when the popover opens. */
    initialCustomFrom?: string;
    /** Initial value for the To input when the popover opens. */
    initialCustomTo?: string;
}

interface ChipDef {
    value: NetWorthRange;
    label: string;
}

// Order is intentional: presets first, escape hatch last. Keeping it as a
// module-level constant avoids reallocating the array on every render.
const CHIPS: readonly ChipDef[] = [
    { value: '1m', label: '1M' },
    { value: '3m', label: '3M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: '2y', label: '2Y' },
    { value: 'all', label: 'All' },
    { value: 'custom', label: 'Custom' },
];

const CHIP_BASE =
    'rounded-full px-3 py-1 text-xs font-medium transition-colors';
const CHIP_ACTIVE = 'bg-blue-600 text-white';
const CHIP_INACTIVE = 'bg-gray-700 text-gray-300 hover:bg-gray-600';

const NetWorthRangeControls = ({
    activeRange,
    onRangeChange,
    initialCustomFrom = '',
    initialCustomTo = '',
}: NetWorthRangeControlsProps) => {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [customFrom, setCustomFrom] = useState(initialCustomFrom);
    const [customTo, setCustomTo] = useState(initialCustomTo);

    // The popover wraps both the Custom chip and the floating panel so
    // the click-outside handler can treat them as a single unit. Without
    // this, clicking the chip itself would register as "outside" relative
    // to the panel and immediately close the popover that just opened.
    const containerRef = useRef<HTMLDivElement>(null);

    // Stable ids let us wire the labels to inputs explicitly. `useId` is
    // SSR-safe and avoids collisions if more than one widget mounts on
    // the same page (e.g. a future side-by-side comparison view).
    const fromId = useId();
    const toId = useId();

    useEffect(() => {
        if (!popoverOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (containerRef.current?.contains(target)) return;
            setPopoverOpen(false);
        };

        // `mousedown` (rather than `click`) so the popover dismisses on
        // press-down, matching native `<select>` and dropdown behavior
        // and avoiding a frame where a second click would be needed.
        document.addEventListener('mousedown', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, [popoverOpen]);

    const handleChipClick = (range: NetWorthRange) => {
        if (range === 'custom') {
            setPopoverOpen((open) => !open);
            return;
        }
        // Switching to a non-custom preset always closes the popover so
        // the user isn't left with a stale floating panel obscuring the
        // chart.
        setPopoverOpen(false);
        onRangeChange(range);
    };

    const handleApply = () => {
        // Both fields are required to define a range. If either is
        // missing, leave the popover open so the user can finish their
        // selection rather than silently no-op'ing the apply.
        if (!customFrom || !customTo) return;
        onRangeChange('custom', customFrom, customTo);
        setPopoverOpen(false);
    };

    return (
        <div ref={containerRef} className="relative inline-flex items-center gap-1">
            {CHIPS.map((chip) => {
                const isActive = activeRange === chip.value;
                return (
                    <button
                        key={chip.value}
                        type="button"
                        onClick={() => handleChipClick(chip.value)}
                        aria-pressed={isActive}
                        aria-haspopup={chip.value === 'custom' ? 'dialog' : undefined}
                        aria-expanded={
                            chip.value === 'custom' ? popoverOpen : undefined
                        }
                        className={`${CHIP_BASE} ${
                            isActive ? CHIP_ACTIVE : CHIP_INACTIVE
                        }`}
                    >
                        {chip.label}
                    </button>
                );
            })}

            {popoverOpen && (
                <div
                    role="dialog"
                    aria-label="Custom date range"
                    // Position below the chip row. `top-full + mt-2`
                    // anchors the panel just under the chips and `right-0`
                    // keeps it from flowing past the right edge of the
                    // surrounding card on narrow widths.
                    className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-700 bg-gray-800 p-3 shadow-lg"
                >
                    <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                            <label
                                htmlFor={fromId}
                                className="text-xs font-medium text-gray-300"
                            >
                                From
                            </label>
                            <input
                                id={fromId}
                                type="month"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className="rounded-md border border-gray-600 bg-gray-900 px-2 py-1 text-xs text-gray-100 focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label
                                htmlFor={toId}
                                className="text-xs font-medium text-gray-300"
                            >
                                To
                            </label>
                            <input
                                id={toId}
                                type="month"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className="rounded-md border border-gray-600 bg-gray-900 px-2 py-1 text-xs text-gray-100 focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                onClick={handleApply}
                                disabled={!customFrom || !customTo}
                                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-400"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NetWorthRangeControls;
