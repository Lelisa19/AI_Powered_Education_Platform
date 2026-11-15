import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PaymentMethodBadge } from '../components/PaymentStatusBadge';
import { useFinancialReports } from '../hooks/useFinancialReports';
import type { PaymentMethod } from '../types/accountant.types';
import { formatCurrencyETB } from '../utils/currency-formatters';
import {
    downloadCsvFile,
    generateFinancialReportCsv,
} from '../utils/financial-csv-export';

const ALL_PAYMENT_METHODS: readonly PaymentMethod[] = [
    'TELEBIRR',
    'CBE_BIRR',
    'PAGUME',
    'CASH',
    'BANK_TRANSFER',
];

export const FinancialReportsPage: React.FC = () => {
    const { tenantId } = useTenantContext();
    const {
        summary,
        isLoading,
        error,
        isBackendUnavailable,
        dateRange,
        validationError,
        setDateRange,
        resetDateRange,
        hasActiveDateFilter,
        periodLabel,
        reload,
        canReadReports,
        canExportReports,
    } = useFinancialReports();

    // Local form state for date filter inputs before applying
    const [startInput, setStartInput] = useState<string>(dateRange.startDate);
    const [endInput, setEndInput] = useState<string>(dateRange.endDate);

    // Export user feedback banner
    const [exportMessage, setExportMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    const handleApplyDateFilter = (e: React.FormEvent) => {
        e.preventDefault();
        setDateRange(startInput, endInput);
    };

    const handleClearDateFilter = () => {
        setStartInput('');
        setEndInput('');
        resetDateRange();
    };

    const handleExportCsv = () => {
        setExportMessage(null);

        if (!canExportReports) {
            setExportMessage({
                type: 'error',
                text: 'Permission Denied: You do not have reports.export permission to export financial CSV files.',
            });
            return;
        }

        if (!summary) {
            setExportMessage({
                type: 'error',
                text: 'Cannot export report: Authoritative financial summary data is not currently available.',
            });
            return;
        }

        try {
            const csvContent = generateFinancialReportCsv({
                summary,
                tenantId,
                periodLabel,
                startDate: dateRange.startDate || undefined,
                endDate: dateRange.endDate || undefined,
            });

            const dateStamp = new Date().toISOString().split('T')[0];
            const cleanTenantSlug = tenantId ? tenantId.replace(/[^a-zA-Z0-9_-]/g, '') : 'school';
            const fileName = `financial-report-${cleanTenantSlug}-${dateStamp}.csv`;

            downloadCsvFile(csvContent, fileName);

            setExportMessage({
                type: 'success',
                text: `Successfully exported financial report (${fileName}).`,
            });
        } catch (err: unknown) {
            setExportMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'Failed to generate financial CSV export.',
            });
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            {/* Header & Main Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <DashboardPageHeader
                    title="Financial Reports & Insights"
                    subtitle="School revenue summaries, payment collection methods, and outstanding fee aging."
                />
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                    <button
                        type="button"
                        onClick={reload}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                        aria-label="Refresh financial reports"
                    >
                        <svg
                            className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        Refresh
                    </button>

                    {/* CSV Export Button */}
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={isLoading || !summary || !canExportReports}
                        title={
                            !canExportReports
                                ? 'Requires reports.export permission'
                                : !summary
                                  ? 'Report data is unavailable'
                                  : 'Export current report to RFC 4180 CSV'
                        }
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <svg className="h-3.5 w-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV
                    </button>

                    <Link
                        to="/accountant/payments"
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Verification Queue
                    </Link>
                </div>
            </div>

            {/* Export Feedback Toast */}
            {exportMessage && (
                <div
                    className={`rounded-lg border p-3 text-xs flex items-center justify-between ${
                        exportMessage.type === 'success'
                            ? 'border-green-200 bg-green-50 text-green-800'
                            : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {exportMessage.type === 'success' ? (
                            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        <span>{exportMessage.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setExportMessage(null)}
                        className="text-gray-400 hover:text-gray-600 font-bold ml-3"
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* Backend Unavailable Notice Banner */}
            {isBackendUnavailable && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
                    <div className="flex items-center gap-2 font-semibold text-amber-800">
                        <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Backend Notice: Financial Report Summary Endpoint Pending</span>
                    </div>
                    <p className="mt-1 text-amber-800">
                        The aggregate financial reporting endpoint (<code>GET /finance/reports/summary</code>) is awaiting backend implementation. The reporting workspace, date filtering controls, method breakdown cards, and CSV export logic are fully operational and waiting for backend integration.
                    </p>
                </div>
            )}

            {/* Permission Denied Fallback */}
            {!canReadReports && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                    <p className="font-semibold">Access Restricted</p>
                    <p className="mt-0.5">
                        You do not possess the required <code>reports.read</code> permission to view school financial reporting summaries.
                    </p>
                </div>
            )}

            {/* Date Range Filtering Toolbar */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                <form onSubmit={handleApplyDateFilter} className="flex flex-wrap items-end gap-3 text-xs">
                    <div>
                        <label htmlFor="report-start-date" className="block font-medium text-gray-700 mb-1">
                            Start Date
                        </label>
                        <input
                            id="report-start-date"
                            type="date"
                            value={startInput}
                            onChange={(e) => setStartInput(e.target.value)}
                            className="rounded-md border border-gray-300 py-1.5 px-2.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="report-end-date" className="block font-medium text-gray-700 mb-1">
                            End Date
                        </label>
                        <input
                            id="report-end-date"
                            type="date"
                            value={endInput}
                            onChange={(e) => setEndInput(e.target.value)}
                            className="rounded-md border border-gray-300 py-1.5 px-2.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center rounded-md bg-indigo-600 px-3.5 py-1.5 font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            Apply Range
                        </button>

                        {(hasActiveDateFilter || startInput || endInput) && (
                            <button
                                type="button"
                                onClick={handleClearDateFilter}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
                            >
                                Reset Range
                            </button>
                        )}
                    </div>

                    {/* Active Reporting Period Indicator */}
                    <div className="ml-auto self-center text-xs">
                        <span className="text-gray-500">Active Period: </span>
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 font-semibold text-indigo-700 border border-indigo-200">
                            {periodLabel}
                        </span>
                    </div>
                </form>

                {validationError && (
                    <p className="text-xs font-medium text-red-600">
                        {validationError}
                    </p>
                )}

                <p className="text-[11px] text-gray-400 border-t border-gray-100 pt-2">
                    Date-range parameters are passed to <code>GET /finance/reports/summary?startDate=...&endDate=...</code> for authoritative backend aggregation. Reports never fabricate estimates from paginated partial lists.
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                    <p className="font-semibold">Unable to load report</p>
                    <p className="mt-0.5">{error}</p>
                    <button
                        type="button"
                        onClick={reload}
                        className="mt-2 text-xs font-medium text-red-800 underline hover:no-underline"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Section 3: Financial Summary Cards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Total Verified Collections */}
                <div className="rounded-xl border border-green-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-500">Total Verified Collections</p>
                        <span className="rounded-full bg-green-50 p-1.5 text-green-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-green-700">
                        {isLoading ? '...' : formatCurrencyETB(summary?.totalCollectedVerified ?? 0)}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">
                        {summary ? `${summary.verifiedPaymentCount} verified transaction(s)` : 'Awaiting data'}
                    </p>
                </div>

                {/* 2. Pending Verification Amount */}
                <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-500">Pending Verification</p>
                        <span className="rounded-full bg-amber-50 p-1.5 text-amber-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-amber-700">
                        {isLoading ? '...' : formatCurrencyETB(summary?.totalPendingVerification ?? 0)}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">
                        {summary ? `${summary.pendingPaymentCount} unverified submission(s)` : 'Awaiting data'}
                    </p>
                </div>

                {/* 3. Total Outstanding Balances */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-500">Total Outstanding Balances</p>
                        <span className="rounded-full bg-gray-100 p-1.5 text-gray-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                        {isLoading ? '...' : formatCurrencyETB(summary?.totalOutstandingBalances ?? 0)}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">
                        {summary ? `${summary.studentCountWithOutstandingBalance} student(s) with balance` : 'Awaiting data'}
                    </p>
                </div>

                {/* 4. Total Rejected Transactions */}
                <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-500">Rejected Submissions</p>
                        <span className="rounded-full bg-red-50 p-1.5 text-red-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-red-700">
                        {isLoading ? '...' : `${summary?.rejectedPaymentCount ?? 0}`}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">
                        Total rejected payment submissions
                    </p>
                </div>
            </div>

            {/* Section 4: Payment Method Breakdown Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">
                            Collections by Payment Method
                        </h2>
                        <p className="text-xs text-gray-500">
                            Verified fee collections distributed across supported Ethiopian digital and physical channels.
                        </p>
                    </div>
                    <span className="text-xs font-semibold text-gray-700">
                        Verified Total: {isLoading ? '...' : formatCurrencyETB(summary?.totalCollectedVerified ?? 0)}
                    </span>
                </div>

                {/* Methods Table & Progress Display */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                        <thead className="bg-gray-50 font-semibold text-gray-600">
                            <tr>
                                <th className="px-4 py-3">Channel / Method</th>
                                <th className="px-4 py-3">Verified Amount (ETB)</th>
                                <th className="px-4 py-3">Revenue Share</th>
                                <th className="px-4 py-3">Visual Distribution</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {ALL_PAYMENT_METHODS.map((method) => {
                                const amount = summary?.collectionsByMethod?.[method] ?? 0;
                                const totalVerified = summary?.totalCollectedVerified ?? 0;
                                const sharePct = totalVerified > 0 ? (amount / totalVerified) * 100 : 0;

                                return (
                                    <tr key={method} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="px-4 py-3.5">
                                            <PaymentMethodBadge method={method} />
                                        </td>
                                        <td className="px-4 py-3.5 font-semibold text-gray-900">
                                            {formatCurrencyETB(amount)}
                                        </td>
                                        <td className="px-4 py-3.5 font-medium text-gray-700">
                                            {sharePct.toFixed(1)}%
                                        </td>
                                        <td className="px-4 py-3.5 w-1/3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                                                        style={{ width: `${Math.min(100, Math.max(0, sharePct))}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Section 8: Financial Integrity & Policy Box */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 text-xs text-indigo-900 shadow-sm space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Institutional Accounting Rules & Reporting Integrity
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 pt-1 text-[11px] text-indigo-800">
                    <div className="rounded bg-white/70 p-2.5 border border-indigo-100">
                        <p className="font-semibold text-indigo-950">1. Verified Revenue Only</p>
                        <p className="mt-0.5">
                            Only transactions marked as <strong>VERIFIED</strong> are recognized as institutional revenue. Pending submissions are awaiting slip validation.
                        </p>
                    </div>
                    <div className="rounded bg-white/70 p-2.5 border border-indigo-100">
                        <p className="font-semibold text-indigo-950">2. Receivable Formula</p>
                        <p className="mt-0.5">
                            Total Outstanding Balances equal Total Assigned Tuition minus Total Verified Payments. Pending and rejected submissions do not reduce student obligations.
                        </p>
                    </div>
                    <div className="rounded bg-white/70 p-2.5 border border-indigo-100">
                        <p className="font-semibold text-indigo-950">3. Non-Invasive Scope</p>
                        <p className="mt-0.5">
                            Financial reporting and CSV export operations are strictly read-only and exert no side-effects on student enrollments or academic standing.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
