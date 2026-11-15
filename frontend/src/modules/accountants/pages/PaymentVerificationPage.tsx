import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardEmptyState } from '../../../components/Dashboards/DashboardEmptyState';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PaymentDecisionModal } from '../components/PaymentDecisionModal';
import { PaymentReceiptViewerModal } from '../components/PaymentReceiptViewerModal';
import { PaymentMethodBadge, PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { usePaymentVerificationQueue } from '../hooks/usePaymentVerificationQueue';
import type {
    PaymentMethod,
    PaymentRecord,
    PaymentStatus,
} from '../types/accountant.types';
import {
    formatCurrencyETB,
    formatPaymentDate,
    formatPaymentDateTime,
    formatReviewerDisplayName,
    formatStudentDisplayName,
} from '../utils/currency-formatters';

const STATUS_TABS: { id: PaymentStatus | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'All Payments' },
    { id: 'PENDING_VERIFICATION', label: 'Pending Review' },
    { id: 'VERIFIED', label: 'Verified' },
    { id: 'REJECTED', label: 'Rejected' },
];

const PAYMENT_METHODS: { value: PaymentMethod | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All Payment Methods' },
    { value: 'TELEBIRR', label: 'Telebirr' },
    { value: 'CBE_BIRR', label: 'CBE Birr' },
    { value: 'PAGUME', label: 'Pagumē' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer / Deposit' },
    { value: 'CASH', label: 'Cash (In-Person)' },
];

export const PaymentVerificationPage: React.FC = () => {
    const {
        payments,
        pagination,
        isLoading,
        error,
        isBackendUnavailable,
        filters,
        setPage,
        setSearch,
        setStatusFilter,
        setPaymentMethodFilter,
        setDateRange,
        resetFilters,
        reload,
        isSubmittingDecision,
        decisionError,
        submitDecision,
        canReadPayments,
        canVerifyPayments,
        canRejectPayments,
    } = usePaymentVerificationQueue('ALL');

    // Modals state
    const [viewerPayment, setViewerPayment] = useState<PaymentRecord | null>(null);
    const [decisionTarget, setDecisionTarget] = useState<{
        payment: PaymentRecord;
        decision: 'APPROVE' | 'REJECT';
    } | null>(null);

    // Decision feedback notice
    const [feedbackNotice, setFeedbackNotice] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    const hasActiveFilters =
        filters.search.trim() !== '' ||
        filters.status !== 'ALL' ||
        filters.paymentMethod !== 'ALL' ||
        Boolean(filters.startDate) ||
        Boolean(filters.endDate);

    const handleOpenApproveModal = (payment: PaymentRecord) => {
        setFeedbackNotice(null);
        setDecisionTarget({ payment, decision: 'APPROVE' });
    };

    const handleOpenRejectModal = (payment: PaymentRecord) => {
        setFeedbackNotice(null);
        setDecisionTarget({ payment, decision: 'REJECT' });
    };

    const handleConfirmDecision = async (note: string | null) => {
        if (!decisionTarget) return;

        try {
            const result = await submitDecision(
                decisionTarget.payment,
                decisionTarget.decision,
                note
            );

            const isApprove = decisionTarget.decision === 'APPROVE';
            setFeedbackNotice({
                type: 'success',
                message:
                    result.message ??
                    `Payment ${
                        isApprove ? 'verified and balance credited' : 'rejected'
                    } successfully.`,
            });
            setDecisionTarget(null);
        } catch {
            // Handled via decisionError inside the decision modal
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <DashboardPageHeader
                    title="Payment Verification"
                    subtitle="Review student bank deposits, mobile banking receipts, match references, and confirm or reject payments."
                />
                <button
                    type="button"
                    onClick={reload}
                    disabled={isLoading}
                    className="inline-flex items-center self-start rounded-md border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
                    aria-label="Refresh payment verification queue"
                >
                    <svg
                        className={`mr-2 h-4 w-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                    Refresh Queue
                </button>
            </div>

            {/* Decision Success/Feedback Alert */}
            {feedbackNotice && (
                <div
                    className={`flex items-center justify-between rounded-md p-4 text-xs font-medium ${
                        feedbackNotice.type === 'success'
                            ? 'border border-green-200 bg-green-50 text-green-800'
                            : 'border border-red-200 bg-red-50 text-red-800'
                    }`}
                    role="alert"
                >
                    <div className="flex items-center gap-2">
                        {feedbackNotice.type === 'success' ? (
                            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        <span>{feedbackNotice.message}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFeedbackNotice(null)}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Dismiss notification"
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* Permission Denied Guard */}
            {!canReadPayments ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
                    <p className="text-sm font-semibold text-amber-800">Permission Required</p>
                    <p className="mt-1 text-xs text-amber-700">
                        Viewing payment verification records requires the{' '}
                        <code className="font-mono text-xs font-bold">payments.read</code> permission.
                    </p>
                    <div className="mt-4">
                        <Link
                            to="/accountant"
                            className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                            &larr; Return to Financial Dashboard
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    {/* Status Tabs Navigation */}
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-6" aria-label="Payment Status Tabs">
                            {STATUS_TABS.map((tab) => {
                                const isActive = filters.status === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setStatusFilter(tab.id)}
                                        className={`whitespace-nowrap border-b-2 py-3 text-xs font-medium transition-colors ${
                                            isActive
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Search Input */}
                            <div>
                                <label htmlFor="queue-search" className="block text-[11px] font-semibold text-gray-700">
                                    Search Queue
                                </label>
                                <input
                                    id="queue-search"
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Student name, code, or ref..."
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Payment Method Selector */}
                            <div>
                                <label htmlFor="queue-method" className="block text-[11px] font-semibold text-gray-700">
                                    Payment Method
                                </label>
                                <select
                                    id="queue-method"
                                    value={filters.paymentMethod}
                                    onChange={(e) => setPaymentMethodFilter(e.target.value as PaymentMethod | 'ALL')}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {PAYMENT_METHODS.map((method) => (
                                        <option key={method.value} value={method.value}>
                                            {method.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Range Start */}
                            <div>
                                <label htmlFor="queue-start-date" className="block text-[11px] font-semibold text-gray-700">
                                    From Date
                                </label>
                                <input
                                    id="queue-start-date"
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setDateRange(e.target.value, filters.endDate)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Date Range End */}
                            <div>
                                <label htmlFor="queue-end-date" className="block text-[11px] font-semibold text-gray-700">
                                    To Date
                                </label>
                                <div className="mt-1 flex items-center gap-2">
                                    <input
                                        id="queue-end-date"
                                        type="date"
                                        value={filters.endDate}
                                        onChange={(e) => setDateRange(filters.startDate, e.target.value)}
                                        className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    {hasActiveFilters && (
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="whitespace-nowrap rounded border border-gray-300 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                                            title="Reset all filters"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Backend Unavailable Notice */}
                    {isBackendUnavailable && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4">
                            <div className="flex items-start gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </span>
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                                        Payment Verification Backend Integration Pending
                                    </h3>
                                    <p className="mt-1 text-xs text-amber-700">
                                        The payment listing and verification endpoints (<code className="font-mono text-[11px]">GET /finance/payments</code> and <code className="font-mono text-[11px]">POST /finance/payments/:id/verification</code>) are awaiting backend service deployment.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Banner */}
                    {error && !isBackendUnavailable && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                            <p className="text-sm text-red-700">{error}</p>
                            <button
                                type="button"
                                onClick={reload}
                                className="mt-2 text-xs font-medium text-red-800 underline hover:text-red-900"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* Main Content Area */}
                    {isLoading ? (
                        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
                            <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                            <p className="text-xs text-gray-500">Loading payment records...</p>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
                            <DashboardEmptyState
                                title={
                                    hasActiveFilters
                                        ? 'No Payments Match Your Filter Criteria'
                                        : 'No Payments in Verification Queue'
                                }
                                description={
                                    hasActiveFilters
                                        ? 'Try clearing or broadening your search, payment method, or date range filters.'
                                        : 'There are currently no submitted payment records awaiting accountant review.'
                                }
                            />
                            {hasActiveFilters && (
                                <div className="mt-4 text-center">
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="text-xs font-semibold text-blue-600 hover:underline"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                                        <tr>
                                            <th scope="col" className="px-4 py-3">Student</th>
                                            <th scope="col" className="px-4 py-3">Reference</th>
                                            <th scope="col" className="px-4 py-3">Method</th>
                                            <th scope="col" className="px-4 py-3">Amount</th>
                                            <th scope="col" className="px-4 py-3">Payment Date</th>
                                            <th scope="col" className="px-4 py-3">Status</th>
                                            <th scope="col" className="px-4 py-3">Evidence</th>
                                            <th scope="col" className="px-4 py-3">Reviewer</th>
                                            <th scope="col" className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {payments.map((payment) => {
                                            const isPending = payment.status === 'PENDING_VERIFICATION';
                                            const hasReceipt = Boolean(payment.receipt);

                                            return (
                                                <tr key={payment.id} className="hover:bg-gray-50/80">
                                                    {/* Student */}
                                                    <td className="px-4 py-3 font-medium text-gray-900">
                                                        <div>
                                                            <p>{formatStudentDisplayName(payment.student, payment.studentId)}</p>
                                                            {payment.student?.email && (
                                                                <p className="text-[11px] text-gray-500 font-normal">
                                                                    {payment.student.email}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Reference */}
                                                    <td className="px-4 py-3 font-mono text-gray-600">
                                                        {payment.transactionReference || payment.id.slice(0, 8)}
                                                    </td>

                                                    {/* Method */}
                                                    <td className="px-4 py-3">
                                                        <PaymentMethodBadge method={payment.paymentMethod} />
                                                    </td>

                                                    {/* Amount */}
                                                    <td className="px-4 py-3 font-semibold text-gray-900">
                                                        {formatCurrencyETB(payment.amount)}
                                                    </td>

                                                    {/* Date */}
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {formatPaymentDate(payment.paymentDate)}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-4 py-3">
                                                        <PaymentStatusBadge status={payment.status} />
                                                    </td>

                                                    {/* Receipt Evidence */}
                                                    <td className="px-4 py-3">
                                                        {hasReceipt ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setViewerPayment(payment)}
                                                                className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                                                                title={`View ${payment.receipt?.fileName}`}
                                                            >
                                                                <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                </svg>
                                                                Slip On File
                                                            </button>
                                                        ) : (
                                                            <span className="text-[11px] text-gray-400">
                                                                None
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Reviewer */}
                                                    <td className="px-4 py-3 text-[11px] text-gray-500">
                                                        {payment.verification ? (
                                                            <div>
                                                                <p className="font-medium text-gray-700">
                                                                    {formatReviewerDisplayName(payment.verification.reviewedBy)}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400">
                                                                    {formatPaymentDateTime(payment.verification.reviewedAt)}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {/* Inspect Details Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setViewerPayment(payment)}
                                                                className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                                                                title="View transaction and receipt details"
                                                            >
                                                                Details
                                                            </button>

                                                            {/* Operational Decision Actions */}
                                                            {isPending ? (
                                                                <>
                                                                    {canVerifyPayments && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenApproveModal(payment)}
                                                                            className="rounded bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                                                                            title="Approve and credit payment"
                                                                        >
                                                                            Approve
                                                                        </button>
                                                                    )}
                                                                    {canRejectPayments && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenRejectModal(payment)}
                                                                            className="rounded bg-red-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                                                                            title="Reject payment submission"
                                                                        >
                                                                            Reject
                                                                        </button>
                                                                    )}
                                                                    {!canVerifyPayments && !canRejectPayments && (
                                                                        <span className="text-[11px] text-gray-400 italic">
                                                                            Read Only
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="text-[11px] font-medium text-gray-400">
                                                                    Finalized
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {pagination && pagination.totalPages > 1 && (
                                <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row">
                                    <p className="text-xs text-gray-600">
                                        Page <span className="font-semibold">{pagination.page}</span> of{' '}
                                        <span className="font-semibold">{pagination.totalPages}</span> ({pagination.total}{' '}
                                        total records)
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={pagination.page <= 1 || isLoading}
                                            onClick={() => setPage(pagination.page - 1)}
                                            className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            type="button"
                                            disabled={pagination.page >= pagination.totalPages || isLoading}
                                            onClick={() => setPage(pagination.page + 1)}
                                            className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Receipt / Details Inspection Modal */}
            {viewerPayment && (
                <PaymentReceiptViewerModal
                    payment={viewerPayment}
                    isOpen={Boolean(viewerPayment)}
                    onClose={() => setViewerPayment(null)}
                />
            )}

            {/* Decision Confirmation Modal (Approve / Reject) */}
            {decisionTarget && (
                <PaymentDecisionModal
                    payment={decisionTarget.payment}
                    decision={decisionTarget.decision}
                    isOpen={Boolean(decisionTarget)}
                    isSubmitting={isSubmittingDecision}
                    error={decisionError}
                    onConfirm={handleConfirmDecision}
                    onClose={() => setDecisionTarget(null)}
                />
            )}
        </div>
    );
};
