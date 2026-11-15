import type { FinancialReportSummary, PaymentMethod } from '../types/accountant.types';
import { formatPaymentMethodLabel } from '../schemas/accountant-schema';

export interface ExportFinancialReportOptions {
    summary: FinancialReportSummary;
    tenantId?: string | null;
    schoolName?: string | null;
    periodLabel?: string;
    startDate?: string;
    endDate?: string;
}

/**
 * Escapes a cell value for standard CSV format (RFC 4180).
 * Handles quotes, commas, newlines, null, and undefined.
 */
export function escapeCsvField(value: unknown): string {
    if (value === null || value === undefined) {
        return '""';
    }
    const stringValue = String(value);
    // Double any existing double-quotes
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
}

/**
 * Generates RFC 4180 compliant CSV string from authoritative FinancialReportSummary data.
 */
export function generateFinancialReportCsv(options: ExportFinancialReportOptions): string {
    const { summary, schoolName, periodLabel, startDate, endDate } = options;
    const lines: string[] = [];

    // 1. Report Metadata Section
    lines.push([escapeCsvField('SCHOOL FINANCIAL REPORT SUMMARY')].join(','));
    lines.push([escapeCsvField('Institution'), escapeCsvField(schoolName || 'School Tenant')].join(','));
    lines.push([
        escapeCsvField('Reporting Period'),
        escapeCsvField(
            periodLabel ||
                (startDate && endDate
                    ? `${startDate} to ${endDate}`
                    : startDate
                      ? `From ${startDate}`
                      : endDate
                        ? `Up to ${endDate}`
                        : 'All-Time Cumulative')
        ),
    ].join(','));
    lines.push([escapeCsvField('Currency'), escapeCsvField(summary.currency || 'ETB')].join(','));
    lines.push([escapeCsvField('Generated At (UTC)'), escapeCsvField(new Date().toISOString())].join(','));
    lines.push(''); // Blank row separator

    // 2. Executive Summary Metrics Table
    lines.push([escapeCsvField('EXECUTIVE REVENUE & BALANCE METRICS')].join(','));
    lines.push([
        escapeCsvField('Metric Category'),
        escapeCsvField('Metric Name'),
        escapeCsvField('Value'),
        escapeCsvField('Unit / Type'),
    ].join(','));

    lines.push([
        escapeCsvField('Revenue'),
        escapeCsvField('Total Verified Collections'),
        escapeCsvField(summary.totalCollectedVerified.toFixed(2)),
        escapeCsvField(summary.currency),
    ].join(','));

    lines.push([
        escapeCsvField('Workflow'),
        escapeCsvField('Pending Verification Amount'),
        escapeCsvField(summary.totalPendingVerification.toFixed(2)),
        escapeCsvField(summary.currency),
    ].join(','));

    lines.push([
        escapeCsvField('Receivables'),
        escapeCsvField('Total Outstanding Balances'),
        escapeCsvField(summary.totalOutstandingBalances.toFixed(2)),
        escapeCsvField(summary.currency),
    ].join(','));

    lines.push([
        escapeCsvField('Volume'),
        escapeCsvField('Verified Payment Transactions'),
        escapeCsvField(summary.verifiedPaymentCount),
        escapeCsvField('Transactions'),
    ].join(','));

    lines.push([
        escapeCsvField('Volume'),
        escapeCsvField('Pending Verification Submissions'),
        escapeCsvField(summary.pendingPaymentCount),
        escapeCsvField('Transactions'),
    ].join(','));

    lines.push([
        escapeCsvField('Volume'),
        escapeCsvField('Rejected Payment Submissions'),
        escapeCsvField(summary.rejectedPaymentCount),
        escapeCsvField('Transactions'),
    ].join(','));

    lines.push([
        escapeCsvField('Receivables'),
        escapeCsvField('Students With Outstanding Balances'),
        escapeCsvField(summary.studentCountWithOutstandingBalance),
        escapeCsvField('Students'),
    ].join(','));

    lines.push(''); // Blank row separator

    // 3. Payment Collections by Method Table
    lines.push([escapeCsvField('VERIFIED COLLECTIONS BY PAYMENT METHOD')].join(','));
    lines.push([
        escapeCsvField('Payment Channel'),
        escapeCsvField('Method Code'),
        escapeCsvField('Verified Collected Amount'),
        escapeCsvField('Currency'),
        escapeCsvField('Share of Verified Revenue (%)'),
    ].join(','));

    const methods: PaymentMethod[] = [
        'TELEBIRR',
        'CBE_BIRR',
        'PAGUME',
        'CASH',
        'BANK_TRANSFER',
    ];

    for (const method of methods) {
        const amount = summary.collectionsByMethod[method] ?? 0;
        const sharePercentage =
            summary.totalCollectedVerified > 0
                ? ((amount / summary.totalCollectedVerified) * 100).toFixed(2)
                : '0.00';

        lines.push([
            escapeCsvField(formatPaymentMethodLabel(method)),
            escapeCsvField(method),
            escapeCsvField(amount.toFixed(2)),
            escapeCsvField(summary.currency),
            escapeCsvField(`${sharePercentage}%`),
        ].join(','));
    }

    lines.push(''); // Blank row separator

    // 4. Financial Audit & Scope Statement
    lines.push([escapeCsvField('AUDIT & INTEGRITY NOTICE')].join(','));
    lines.push([
        escapeCsvField('Notice'),
        escapeCsvField(
            'In accordance with school accounting policies, only VERIFIED payments are recognized as collected revenue. Pending submissions do NOT reduce fee obligations until approved. Outstanding balance represents total fee obligations minus verified collections.'
        ),
    ].join(','));

    return lines.join('\r\n');
}

/**
 * Initiates browser file download of the generated CSV content using UTF-8 BOM.
 */
export function downloadCsvFile(csvContent: string, fileName: string): void {
    // \uFEFF is UTF-8 Byte Order Mark (BOM) to ensure Microsoft Excel and spreadsheet tools parse UTF-8 accurately
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke object URL after delay to release memory
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 200);
}

