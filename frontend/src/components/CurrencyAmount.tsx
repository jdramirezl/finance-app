/**
 * Standardized currency display.
 *
 * Renders an `amount` formatted with `Intl.NumberFormat` for the given
 * `currency`. By default the fraction digits follow the currency's own
 * convention (matching `Number.prototype.toLocaleString(undefined,
 * { style: 'currency', currency })`); override with the `minimumFractionDigits`
 * / `maximumFractionDigits` props when a different precision is needed
 * (e.g. integer amounts on a chart axis).
 *
 * For non-React call sites that need a string (e.g. Recharts
 * `tickFormatter`/`tooltipFormatter`), use the named `formatCurrencyAmount`
 * helper exported from this module.
 */

import { memo } from 'react';

export interface CurrencyAmountProps {
  /** Numeric amount to display. */
  amount: number;
  /** ISO 4217 currency code (e.g. `'USD'`, `'MXN'`). */
  currency: string;
  /**
   * BCP 47 locale tag passed to `Intl.NumberFormat`. Defaults to `undefined`,
   * which uses the runtime's default locale.
   */
  locale?: string;
  /** Forwarded to `Intl.NumberFormat`. */
  minimumFractionDigits?: number;
  /** Forwarded to `Intl.NumberFormat`. */
  maximumFractionDigits?: number;
  /** Optional className applied to the wrapping `<span>`. */
  className?: string;
}

export interface FormatCurrencyAmountOptions {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format an `amount` as a currency string via `Intl.NumberFormat`.
 *
 * Use this when you need a string outside of JSX — Recharts formatters,
 * tooltip text builders, etc. Inside JSX prefer the `<CurrencyAmount>`
 * component for consistency.
 */
export function formatCurrencyAmount(
  amount: number,
  currency: string,
  options: FormatCurrencyAmountOptions = {},
): string {
  const formatterOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
  };

  // Only forward fraction-digit overrides when explicitly provided so the
  // currency's default precision is preserved when callers don't care.
  if (options.minimumFractionDigits !== undefined) {
    formatterOptions.minimumFractionDigits = options.minimumFractionDigits;
  }
  if (options.maximumFractionDigits !== undefined) {
    formatterOptions.maximumFractionDigits = options.maximumFractionDigits;
  }

  return new Intl.NumberFormat(options.locale, formatterOptions).format(amount);
}

const CurrencyAmount = ({
  amount,
  currency,
  locale,
  minimumFractionDigits,
  maximumFractionDigits,
  className,
}: CurrencyAmountProps) => {
  const formatted = formatCurrencyAmount(amount, currency, {
    locale,
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return <span className={className}>{formatted}</span>;
};

export default memo(CurrencyAmount);
