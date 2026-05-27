/**
 * OverlayToggleChips
 *
 * Pill/chip row for toggling chart overlays (currency exchange rates and
 * stock prices) on the net-worth timeline. Inactive chips render with a
 * muted gray background; active chips fill with the overlay's own color
 * so the chip swatch matches the dashed line that appears on the chart.
 *
 * The component is presentational — overlay availability and the active
 * set are owned by the parent widget (`NetWorthTimelineWidget`). The
 * widget derives `available` from the user's accounts (one entry per
 * non-primary currency and per investment stock symbol) and persists
 * `active` as a `Set<string>` of overlay ids.
 *
 * Returns `null` when there are no available overlays — the only
 * scenario where this happens is a single-currency / no-stock user, in
 * which case rendering an empty row would just add visual noise.
 */

import type { FC } from 'react';

export interface OverlayToggleChipItem {
    /** Stable overlay identifier — currency pair like `USD→COP` or stock symbol like `VOO`. */
    id: string;
    /** Display label shown inside the chip. */
    label: string;
    /** Hex color used for the active background and the swatch dot. */
    color: string;
}

export interface OverlayToggleChipsProps {
    available: OverlayToggleChipItem[];
    active: Set<string>;
    onToggle: (id: string) => void;
}

const OverlayToggleChips: FC<OverlayToggleChipsProps> = ({
    available,
    active,
    onToggle,
}) => {
    if (available.length === 0) return null;

    return (
        <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Chart overlays"
        >
            {available.map((item) => {
                const isActive = active.has(item.id);
                return (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onToggle(item.id)}
                        aria-pressed={isActive}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            isActive
                                ? 'border-transparent text-white'
                                : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                        }`}
                        // Inline color overrides apply only to active chips so
                        // the active state can match the overlay's own line
                        // color exactly. Inactive chips stay on the
                        // light/dark Tailwind palette declared above.
                        style={
                            isActive
                                ? {
                                      backgroundColor: item.color,
                                      borderColor: item.color,
                                  }
                                : undefined
                        }
                    >
                        <span
                            aria-hidden="true"
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{
                                backgroundColor: isActive ? '#ffffff' : item.color,
                            }}
                        />
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
};

export default OverlayToggleChips;
