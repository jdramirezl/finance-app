/**
 * Single source of truth for movement type metadata.
 *
 * Movement types follow Spanish naming for historical reasons:
 *   - IngresoNormal  → ad-hoc income
 *   - EgresoNormal   → ad-hoc expense
 *   - IngresoFijo    → recurring income tied to a fixed pocket
 *   - EgresoFijo     → recurring expense tied to a fixed pocket
 *
 * Two label styles are exposed because the UI uses them in different
 * contexts:
 *   - MOVEMENT_TYPES uses descriptive labels for form Select dropdowns
 *     where there is enough room ("Normal Income", "Fixed Expense", …).
 *   - getMovementTypeLabel returns the shorter labels used by compact
 *     UI elements such as badge chips on template cards.
 *
 * Keep this file UI-agnostic — it should only depend on the shared
 * `MovementType` definition and return primitives or class strings.
 */

import type { MovementType } from '../types';

export type { MovementType };

export interface MovementTypeOption {
  value: MovementType;
  label: string;
}

/**
 * Form-friendly options for a movement Select dropdown.
 * Order is meaningful — it mirrors how the options should be displayed.
 */
export const MOVEMENT_TYPES: MovementTypeOption[] = [
  { value: 'IngresoNormal', label: 'Normal Income' },
  { value: 'EgresoNormal', label: 'Normal Expense' },
  { value: 'IngresoFijo', label: 'Fixed Income' },
  { value: 'EgresoFijo', label: 'Fixed Expense' },
];

/** Returns true when the movement is tied to a fixed pocket. */
export const isFixedMovement = (type: MovementType): boolean =>
  type === 'IngresoFijo' || type === 'EgresoFijo';

/** Returns true when the movement adds to (rather than subtracts from) a balance. */
export const isIncomeMovement = (type: MovementType): boolean =>
  type === 'IngresoNormal' || type === 'IngresoFijo';

/**
 * Compact label for badge-style UI (e.g. template cards).
 * For the descriptive form-dropdown label, look up `MOVEMENT_TYPES` instead.
 */
export const getMovementTypeLabel = (type: MovementType): string => {
  switch (type) {
    case 'IngresoNormal':
      return 'Income';
    case 'EgresoNormal':
      return 'Expense';
    case 'IngresoFijo':
      return 'Fixed Income';
    case 'EgresoFijo':
      return 'Fixed Expense';
    default: {
      // Exhaustiveness guard — if MovementType gains a new variant
      // TypeScript will fail to narrow `_exhaustive` to `never` and
      // surface a compile error here.
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
};

/**
 * Tailwind classes for type-coded badges.
 * Income variants are green, expense variants are red.
 */
export const getMovementTypeColor = (type: MovementType): string =>
  isIncomeMovement(type)
    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
