import React, { useState } from 'react';
import type { PaginationMeta } from '../../../types/api.types';
import type {
    PaymentMethod,
    PaymentRecord,
    PaymentStatus,
} from '../../accountants/types/accountant.types';
import {
    PaymentMethodBadge,
    PaymentStatusBadge,
} from '../../accountants/components/PaymentStatusBadge';
import type { FinancialOversightQuery } from '../hooks/useSchoolAdminFinancialOversight';
import {
    formatCurrencyETB,
    formatPaymentDate,
    formatReviewerDisplayName,
    formatStudentDisplayName,
} from '../utils/school-finance-formatters';

interface PaymentAuditHistoryTableProps {
    payments: PaymentRecord[];
    pagination: PaginationMeta | null;
    isLoading: boolean;
    error: string | null;
    isBackendUnavailable: boolean;
    canReadPayments: boolean;
    query: FinancialOversightQuery;
    onPageChange: (page: number) => void;
    onSearchChange: (search: string) => void;
    onStatusChange: (status: PaymentStatus | 'ALL') => void;
    onPaymentMethodChange: (method: PaymentMethod | 'ALL') => void;
    onResetFilters: () => void;
    onSelectPayment: (payment: PaymentRecord) => void;
    onRetry?: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All Payment Methods' },
    { value: 'TELEBIRR', label: 'Telebirr' },
    { value: 'CBE_BIRR', label: 'CBE Birr' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CASH', label: 'Cash' },
    { value: 'PAGUME', label: 'Pagume' },
];

const PAYMENT_STATUSES: { value: PaymentStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'PENDING_VERIFICATION', label: 'Pending Review' },
    { value: 'VERIFIED', label: 'Verified' },
    { value: 'REJECTED', label: 'Rejected' },
];

export const PaymentAuditHistoryTable: React.FC<PaymentAuditHistoryTableProps> = ({
    payments,
    pagination,
    isLoading,
    error,
    isBackendUnavailable,
    canReadPayments,
    query,
    onPageChange,
    onSearchChange,
    onStatusChange,
    onPaymentMethodChange,
    onResetFilters,
    onSelectPayment,
    onRetry,
}) => {
    const [localSearch, setLocalSearch] = useState(query.search);

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSearchChange(localSearch);
    };

    const handleSearchClear = () => {
        setLocalSearch('');
        onSearchChange('');
    };

    const hasActiveFilters =
        query.search.trim() !== '' || query.status !== 'ALL' || query.paymentMethod !== 'ALL';

    if (!canReadPayments) {
        return (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-11a4 4 0 00-8 0v4h8V6z"
                        />
                    </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Permission Required</h3>
                <p className="mt-1 text-xs text-gray-500">
                    Viewing payment transaction history requires the{' '}
                    <code className="font-mono text-xs font-semibold">payments.read</code> permission.
                </p>
            </div>
        );
    }

    return (
        <section aria-labelledby="payment-history-audit-heading" className="space-y-4">
            {/* Header & Section Title */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2
                        id="payment-history-audit-heading"
                        className="text-base font-semibold text-gray-900"
                    >
                        Payment History & Verification Audit
                    </h2>
                    <p className="text-xs text-gray-500">
                        Read-only log of submitted student payments, reviewing accountants, and verification audit decisions.
                    </p>
                </div>
                {pagination && pagination.total > 0 && (
                    <span className="text-xs font-medium text-gray-500">
                        {pagination.total.toLocaleString()} total record{pagination.total === 1 ? '' : 's'}
                    </span>
                )}
            </div>

            {/* Filter & Search Bar */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <form
                    onSubmit={handleSearchSubmit}
                    className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                placeholder="Search by student name, code, or reference..."
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-3 pr-8 text-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                aria-label="Search payment records"
                            />
                            {localSearch && (
                                <button
                                    type="button"
                                    onClick={handleSearchClear}
                                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-gray-600"
                                    aria-label="Clear search"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Status Filter */}
                        <select
                            value={query.status}
                            onChange={(e) => onStatusChange(e.target.value as PaymentStatus | 'ALL')}
                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            aria-label="Filter by payment status"
                        >
                            {PAYMENT_STATUSES.map((status) => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>

                        {/* Payment Method Filter */}
                        <select
                            value={query.paymentMethod}
                            onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod | 'ALL')}
                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            aria-label="Filter by payment method"
                        >
                            {PAYMENT_METHODS.map((method) => (
                                <option key={method.value} value={method.value}>
                                    {method.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Search
                        </button>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={() => {
                                    setLocalSearch('');
                                    onResetFilters();
                                }}
                                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Content Table / States */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                {isBackendUnavailable ? (
                    <div className="p-8 text-center sm:p-12">
                        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">
                            Payment Service Backend Integration Pending
                        </h3>
                        <p className="mx-auto mt-1 max-w-md text-xs text-gray-500">
                            The payments list endpoint (<code className="font-mono">GET /finance/payments</code>) is pending backend service activation. Submitted student payments will appear here once the service is live.
                        </p>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center sm:p-10">
                        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-red-900">Failed to Load Payments</h3>
                        <p className="mt-1 text-xs text-red-700">{error}</p>
                        {onRetry && (
                            <button
                                type="button"
                                onClick={onRetry}
                                className="mt-4 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                ) : isLoading ? (
                    <div className="space-y-4 p-6" aria-busy="true">
                        <div className="h-8 w-full animate-pulse rounded bg-gray-100" />
                        <div className="h-8 w-full animate-pulse rounded bg-gray-100" />
                        <div className="h-8 w-full animate-pulse rounded bg-gray-100" />
                        <div className="h-8 w-full animate-pulse rounded bg-gray-100" />
                    </div>
                ) : payments.length === 0 ? (
                    <div className="p-8 text-center sm:p-12">
                        <svg
                            className="mx-auto mb-3 h-10 w-10 text-gray-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <h3 className="text-sm font-semibold text-gray-900">No Payment Records Found</h3>
                        <p className="mt-1 text-xs text-gray-500">
                            {hasActiveFilters
                                ? 'No payments matched the specified search or filter criteria.'
                                : 'No student payments have been submitted yet.'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={() => {
                                    setLocalSearch('');
                                    onResetFilters();
                                }}
                                className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 font-medium uppercase tracking-wider text-gray-500">
                                    <th scope="col" className="px-4 py-3">Student</th>
                                    <th scope="col" className="px-4 py-3">Reference</th>
                                    <th scope="col" className="px-4 py-3">Method</th>
                                    <th scope="col" className="px-4 py-3">Amount</th>
                                    <th scope="col" className="px-4 py-3">Date</th>
                                    <th scope="col" className="px-4 py-3">Status</th>
                                    <th scope="col" className="px-4 py-3">Reviewing Accountant</th>
                                    <th scope="col" className="px-4 py-3">Review Date</th>
                                    <th scope="col" className="px-4 py-3">Decision Note / Reason</th>
                                    <th scope="col" className="px-4 py-3 text-right">Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {payments.map((payment) => (
                                    <tr key={payment.id} className="transition-colors hover:bg-gray-50/75">
                                        {/* Student */}
                                        <td className="px-4 py-3.5 font-medium text-gray-900">
                                            <div>
                                                <span>{formatStudentDisplayName(payment.student, payment.studentId)}</span>
                                                {payment.student?.email && (
                                                    <span className="block text-[11px] text-gray-500">
                                                        {payment.student.email}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Reference */}
                                        <td className="px-4 py-3.5 font-mono text-gray-600">
                                            {payment.transactionReference || '—'}
                                        </td>

                                        {/* Method */}
                                        <td className="px-4 py-3.5">
                                            <PaymentMethodBadge method={payment.paymentMethod} />
                                        </td>

                                        {/* Amount */}
                                        <td className="px-4 py-3.5 font-semibold text-gray-900">
                                            {formatCurrencyETB(payment.amount)}
                                        </td>

                                        {/* Date */}
                                        <td className="px-4 py-3.5 text-gray-500">
                                            {formatPaymentDate(payment.paymentDate)}
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3.5">
                                            <PaymentStatusBadge status={payment.status} />
                                        </td>

                                        {/* Reviewing Accountant */}
                                        <td className="px-4 py-3.5 text-gray-700">
                                            {formatReviewerDisplayName(payment.verification?.reviewedBy)}
                                        </td>

                                        {/* Review Date */}
                                        <td className="px-4 py-3.5 text-gray-500">
                                            {payment.verification?.reviewedAt
                                                ? formatPaymentDate(payment.verification.reviewedAt)
                                                : '—'}
                                        </td>

                                        {/* Decision Note or Rejection Reason */}
                                        <td className="max-w-xs truncate px-4 py-3.5 text-gray-600">
                                            {payment.verification?.rejectionReason ? (
                                                <span className="text-red-700" title={payment.verification.rejectionReason}>
                                                    {payment.verification.rejectionReason}
                                                </span>
                                            ) : payment.verification?.decisionNote ? (
                                                <span title={payment.verification.decisionNote}>
                                                    {payment.verification.decisionNote}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>

                                        {/* Strictly Read-Only Row Action */}
                                        <td className="px-4 py-3.5 text-right">
                                            <button
                                                type="button"
                                                onClick={() => onSelectPayment(payment)}
                                                className="inline-flex items-center rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {pagination && pagination.totalPages > 1 && !isBackendUnavailable && !error && (
                    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row">
                        <p className="text-xs text-gray-600">
                            Showing page <span className="font-semibold">{pagination.page}</span> of{' '}
                            <span className="font-semibold">{pagination.totalPages}</span> ({pagination.total.toLocaleString()} total transactions)
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={pagination.page <= 1 || isLoading}
                                onClick={() => onPageChange(pagination.page - 1)}
                                className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                disabled={pagination.page >= pagination.totalPages || isLoading}
                                onClick={() => onPageChange(pagination.page + 1)}
                                className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

