import type {
    PaymentAuditSummary,
    PaymentStudentSummary,
} from '../../accountants/types/accountant.types';
import { formatCurrencyETB } from '../../accountants/utils/currency-formatters';

export { formatCurrencyETB };

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

