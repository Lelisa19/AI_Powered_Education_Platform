import type {
    PaymentAuditSummary,
    PaymentStudentSummary,
} from '../types/accountant.types';

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

/**
 * Formats a date string (YYYY-MM-DD or ISO 8601) into a human-readable localized date.
 */
export function formatPaymentDate(value?: string | null): string {
    if (!value || value.trim() === '') return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Formats an ISO 8601 timestamp into a localized date and time string.
 */
export function formatPaymentDateTime(value?: string | null): string {
    if (!value || value.trim() === '') return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Formats a student's full name and student code if available.
 */
export function formatStudentDisplayName(
    student?: PaymentStudentSummary | null,
    fallbackId?: string
): string {
    if (!student) {
        return fallbackId ? `Student #${fallbackId}` : 'Unknown Student';
    }
    const name = `${student.firstName} ${student.lastName}`.trim();
    if (student.studentCode) {
        return `${name} (${student.studentCode})`;
    }
    return name || student.email || fallbackId || 'Student';
}

/**
 * Formats an auditor/reviewer's name or email.
 */
export function formatReviewerDisplayName(reviewedBy?: PaymentAuditSummary | null): string {
    if (!reviewedBy) return '—';
    if (reviewedBy.name && reviewedBy.name.trim() !== '') {
        return reviewedBy.name.trim();
    }
    if (reviewedBy.email && reviewedBy.email.trim() !== '') {
        return reviewedBy.email.trim();
    }
    return reviewedBy.id ? `Accountant #${reviewedBy.id}` : 'Accountant';
}

/**
 * Formats file size in bytes to a human-readable string (KB, MB).
 */
export function formatFileSize(bytes?: number): string {
    if (bytes === undefined || bytes === null || !Number.isFinite(bytes) || bytes < 0) {
        return '—';
    }
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

