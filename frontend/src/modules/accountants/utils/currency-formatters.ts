/**
 * Frontend currency and financial amount formatters.
 * Initial currency support defaults to ETB (Ethiopian Birr),
 * with extensible locale and currency support for future multi-currency configurations.
 */

export interface CurrencyFormatOptions {
    currency?: string;
    locale?: string;
    showCode?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    fallback?: string;
}

const DEFAULT_CURRENCY = 'ETB';
const DEFAULT_LOCALE = 'en-ET';

/**
 * Formats a numeric amount with a specified currency and locale using Intl.NumberFormat.
 * Handles null, undefined, NaN, and infinity safely without throwing runtime errors.
 */
export function formatCurrency(
    amount: number | string | null | undefined,
    options: CurrencyFormatOptions = {}
): string {
    const {
        currency = DEFAULT_CURRENCY,
        locale = DEFAULT_LOCALE,
        showCode = true,
        minimumFractionDigits = 2,
        maximumFractionDigits = 2,
        fallback = 'ETB 0.00',
    } = options;

    if (amount === null || amount === undefined || amount === '') {
        return fallback;
    }

    const numericAmount = typeof amount === 'number' ? amount : Number(amount);
    if (!Number.isFinite(numericAmount)) {
        return fallback;
    }

    try {
        const formatter = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            currencyDisplay: showCode ? 'code' : 'symbol',
            minimumFractionDigits,
            maximumFractionDigits,
        });

        return formatter.format(numericAmount);
    } catch {
        // Fallback formatting if environment lacks specified locale/currency support
        const sign = numericAmount < 0 ? '-' : '';
        const absVal = Math.abs(numericAmount).toLocaleString('en-US', {
            minimumFractionDigits,
            maximumFractionDigits,
        });
        return `${sign}${currency} ${absVal}`;
    }
}

/**
 * Standardized ETB (Ethiopian Birr) currency formatter.
 * Produces clean strings such as "ETB 1,500.00", "ETB 0.00", "-ETB 250.50".
 */
export function formatCurrencyETB(
    amount: number | string | null | undefined,
    options: Omit<CurrencyFormatOptions, 'currency'> = {}
): string {
    return formatCurrency(amount, {
        ...options,
        currency: 'ETB',
    });
}

/**
 * Formats a minor-unit integer (e.g. cents or santim) into an ETB formatted string.
 * Example: 150000 santim -> "ETB 1,500.00".
 */
export function formatMinorUnitsETB(
    cents: number | null | undefined,
    options: Omit<CurrencyFormatOptions, 'currency'> = {}
): string {
    if (cents === null || cents === undefined || !Number.isFinite(cents)) {
        return formatCurrencyETB(0, options);
    }
    return formatCurrencyETB(cents / 100, options);
}

/**
 * Parses a currency input string into a valid number or null.
 * Strips whitespace, thousands separators, and currency symbols.
 */
export function parseCurrencyInput(value: string | null | undefined): number | null {
    if (!value || typeof value !== 'string') return null;
    const clean = value.replace(/[^0-9.-]/g, '').trim();
    if (!clean || clean === '-' || clean === '.') return null;
    const num = Number(clean);
    return Number.isFinite(num) ? num : null;
}

