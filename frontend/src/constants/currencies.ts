/**
 * Currency constants — single source of truth for the set of supported
 * currencies, their display names, and dropdown option shapes.
 *
 * Add a currency by:
 *   1. Adding the code to {@link SUPPORTED_CURRENCIES}.
 *   2. Adding the display name to {@link CURRENCY_NAMES}.
 *
 * The {@link Currency} type is derived from {@link SUPPORTED_CURRENCIES}, so a
 * matching entry in {@link CURRENCY_NAMES} is enforced at compile time.
 */

/**
 * All currency codes supported by the application. Order is reflected in the
 * derived dropdown options.
 */
export const SUPPORTED_CURRENCIES = ['USD', 'MXN', 'COP', 'EUR', 'GBP'] as const;

/**
 * Union of supported currency codes derived from {@link SUPPORTED_CURRENCIES}.
 */
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Default currency used when none is specified (new accounts, primary currency
 * fallback, etc.).
 */
export const DEFAULT_CURRENCY: Currency = 'USD';

/**
 * Human-readable name for each currency code.
 */
export const CURRENCY_NAMES: Record<Currency, string> = {
    USD: 'US Dollar',
    MXN: 'Mexican Peso',
    COP: 'Colombian Peso',
    EUR: 'Euro',
    GBP: 'British Pound',
};

/**
 * Shape of an option entry in {@link CURRENCY_OPTIONS} and
 * {@link CURRENCY_OPTIONS_WITH_NAMES}. Compatible with the `Select` component's
 * `options` prop.
 */
export interface CurrencyOption {
    value: Currency;
    label: string;
}

/**
 * Dropdown options where the label is the bare currency code (e.g. `"USD"`).
 * Use this when the surrounding UI already gives enough context.
 */
export const CURRENCY_OPTIONS: CurrencyOption[] = SUPPORTED_CURRENCIES.map(
    (code) => ({ value: code, label: code })
);

/**
 * Dropdown options where the label includes the full currency name
 * (e.g. `"USD - US Dollar"`). Use this when the user benefits from the
 * disambiguating name.
 */
export const CURRENCY_OPTIONS_WITH_NAMES: CurrencyOption[] = SUPPORTED_CURRENCIES.map(
    (code) => ({ value: code, label: `${code} - ${CURRENCY_NAMES[code]}` })
);

/**
 * Type guard that checks whether an arbitrary string is a supported currency.
 * Useful for validating untrusted input (e.g. settings updates from the API)
 * before treating it as a {@link Currency}.
 */
export const isSupportedCurrency = (value: string): value is Currency =>
    (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
