import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardEmptyState } from '../../../components/Dashboards/DashboardEmptyState';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { useAuth } from '../../../hooks/useAuth';
import { PaymentMethodBadge, PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { useAccountantDashboard } from '../hooks/useAccountantDashboard';
import { formatCurrencyETB } from '../utils/currency-formatters';

export const AccountantDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const {
        summary,
        isSummaryLoading,
        summaryError,
        isSummaryBackendUnavailable,
        recentPayments,
        isPaymentsLoading,
        paymentsError,
        isPaymentsBackendUnavailable,
        canReadPayments,
        canVerifyPayments,
        canReadReports,
        reload,
    } = useAccountantDashboard();

    const isAnyLoading = isSummaryLoading || isPaymentsLoading;

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <DashboardPageHeader
                    title="Financial Dashboard"
                    subtitle={`Welcome, ${user?.firstName || 'Accountant'}. Monitor school finances, verify payments, and track student fee balances.`}
                />
                <button
                    type="button"
                    onClick={reload}
                    disabled={isAnyLoading}
                    className="inline-flex items-center self-start rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
                    aria-label="Refresh financial dashboard"
                >
                    <svg
                        className={`mr-2 h-4 w-4 text-gray-500 ${isAnyLoading ? 'animate-spin' : ''}`}
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
                    Refresh
                </button>
            </div>

            {/* Overview Metrics Cards */}
            <section aria-labelledby="financial-metrics-heading">
                <h2 id="financial-metrics-heading" className="sr-only">
                    Financial Overview Metrics
                </h2>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Card 1: Pending Verification */}
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">
                                Pending Verification
                            </span>
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600"
                                aria-hidden="true"
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-3">
                            {isSummaryLoading ? (
                                <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
                            ) : !canReadReports ? (
                                <p className="text-xs text-gray-500">Requires reports.read</p>
                            ) : isSummaryBackendUnavailable ? (
                                <span className="inline-flex rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                                    Backend pending
                                </span>
                            ) : summaryError ? (
                                <span className="text-xs text-red-600">Unavailable</span>
                            ) : (
                                <p className="text-2xl font-bold text-gray-900">
                                    {summary?.pendingPaymentCount ?? 0}
                                </p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                                Payments awaiting review
                            </p>
                        </div>
                        {canVerifyPayments && (
                            <div className="mt-4 border-t border-gray-100 pt-3">
                                <Link
                                    to="/accountant/payments"
                                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                >
                                    Review queue &rarr;
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Card 2: Verified Payments */}
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">
                                Verified Payments
                            </span>
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600"
                                aria-hidden="true"
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-3">
                            {isSummaryLoading ? (
                                <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
                            ) : !canReadReports ? (
                                <p className="text-xs text-gray-500">Requires reports.read</p>
                            ) : isSummaryBackendUnavailable ? (
                                <span className="inline-flex rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                                    Backend pending
                                </span>
                            ) : summaryError ? (
                                <span className="text-xs text-red-600">Unavailable</span>
                            ) : (
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {summary?.verifiedPaymentCount ?? 0}
                                    </p>
                                    <p className="mt-0.5 text-xs font-medium text-green-700">
                                        {formatCurrencyETB(summary?.totalCollectedVerified ?? 0)} collected
                                    </p>
                                </div>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                                Approved & credited payments
                            </p>
                        </div>
                    </div>

                    {/* Card 3: Rejected Payments */}
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">
                                Rejected Payments
                            </span>
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600"
                                aria-hidden="true"
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-3">
                            {isSummaryLoading ? (
                                <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
                            ) : !canReadReports ? (
                                <p className="text-xs text-gray-500">Requires reports.read</p>
                            ) : isSummaryBackendUnavailable ? (
                                <span className="inline-flex rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                                    Backend pending
                                </span>
                            ) : summaryError ? (
                                <span className="text-xs text-red-600">Unavailable</span>
                            ) : (
                                <p className="text-2xl font-bold text-gray-900">
                                    {summary?.rejectedPaymentCount ?? 0}
                                </p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                                Declined / invalid receipts
                            </p>
                        </div>
                    </div>

                    {/* Card 4: Outstanding Balances */}
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">
                                Outstanding Balances
                            </span>
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600"
                                aria-hidden="true"
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-3">
                            {isSummaryLoading ? (
                                <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
                            ) : !canReadReports ? (
                                <p className="text-xs text-gray-500">Requires reports.read</p>
                            ) : isSummaryBackendUnavailable ? (
                                <span className="inline-flex rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                                    Backend pending
                                </span>
                            ) : summaryError ? (
                                <span className="text-xs text-red-600">Unavailable</span>
                            ) : (
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {formatCurrencyETB(summary?.totalOutstandingBalances ?? 0)}
                                    </p>
                                    {summary?.studentCountWithOutstandingBalance !== undefined && (
                                        <p className="mt-0.5 text-xs text-gray-500">
                                            {summary.studentCountWithOutstandingBalance} student(s) with dues
                                        </p>
                                    )}
                                </div>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                                Uncollected tuition & fees
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Operations Shortcuts */}
            <section aria-labelledby="quick-operations-heading">
                <h2 id="quick-operations-heading" className="mb-4 text-base font-semibold text-gray-900">
                    Financial Workspaces
                </h2>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <Link
                        to="/accountant/payments"
                        className="group flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-400 hover:shadow-md"
                    >
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                    <svg
                                        className="h-5 w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </span>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                                        Payment Verification
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Offline slips & mobile payments
                                    </p>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-gray-600">
                                Inspect uploaded deposit slips, match bank references, and approve student payments.
                            </p>
                        </div>
                        <span className="mt-4 inline-flex items-center text-xs font-medium text-blue-600 group-hover:underline">
                            Open Queue &rarr;
                        </span>
                    </Link>

                    <Link
                        to="/accountant/students"
                        className="group flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-400 hover:shadow-md"
                    >
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                                    <svg
                                        className="h-5 w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                        />
                                    </svg>
                                </span>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                                        Student Financial Records
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Fee assignments & ledgers
                                    </p>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-gray-600">
                                View student balance summaries, assigned fee obligations, and individual payment history.
                            </p>
                        </div>
                        <span className="mt-4 inline-flex items-center text-xs font-medium text-blue-600 group-hover:underline">
                            View Records &rarr;
                        </span>
                    </Link>

                    <Link
                        to="/accountant/reports"
                        className="group flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-400 hover:shadow-md"
                    >
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                                    <svg
                                        className="h-5 w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                </span>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                                        Financial Reports
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Collection & audit summaries
                                    </p>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-gray-600">
                                Analyze revenue streams, payment method breakdowns, and generate financial statements.
                            </p>
                        </div>
                        <span className="mt-4 inline-flex items-center text-xs font-medium text-blue-600 group-hover:underline">
                            View Reports &rarr;
                        </span>
                    </Link>
                </div>
            </section>

            {/* Recent Payment Activity Section */}
            <section aria-labelledby="recent-payments-heading">
                <DashboardOverviewCard title="Recent Payment Activity">
                    {!canReadPayments ? (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-center">
                            <p className="text-sm text-amber-800">
                                You do not have permission (<code className="font-mono text-xs">payments.read</code>) to view school payment records.
                            </p>
                        </div>
                    ) : isPaymentsLoading ? (
                        <div className="space-y-3 py-4" aria-busy="true">
                            <div className="h-6 w-full animate-pulse rounded bg-gray-100" />
                            <div className="h-6 w-full animate-pulse rounded bg-gray-100" />
                            <div className="h-6 w-full animate-pulse rounded bg-gray-100" />
                        </div>
                    ) : isPaymentsBackendUnavailable ? (
                        <DashboardEmptyState
                            title="Payment Activity Pending Backend Integration"
                            description="Recent payment records will appear here once the payment service (GET /finance/payments) is implemented on the backend."
                        />
                    ) : paymentsError ? (
                        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-center">
                            <p className="text-sm text-red-700">{paymentsError}</p>
                            <button
                                type="button"
                                onClick={reload}
                                className="mt-2 text-xs font-medium text-red-800 underline hover:text-red-900"
                            >
                                Try again
                            </button>
                        </div>
                    ) : recentPayments.length === 0 ? (
                        <DashboardEmptyState
                            title="No Recent Payment Transactions"
                            description="No payment records found. Submitted offline bank deposits and mobile payments will appear here for verification."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                                        <th scope="col" className="py-3 pr-4">Student</th>
                                        <th scope="col" className="px-4 py-3">Reference</th>
                                        <th scope="col" className="px-4 py-3">Method</th>
                                        <th scope="col" className="px-4 py-3">Amount</th>
                                        <th scope="col" className="px-4 py-3">Date</th>
                                        <th scope="col" className="px-4 py-3">Status</th>
                                        {canVerifyPayments && (
                                            <th scope="col" className="py-3 pl-4 text-right">Action</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {recentPayments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50/75">
                                            <td className="py-3.5 pr-4 font-medium text-gray-900">
                                                {payment.student
                                                    ? `${payment.student.firstName} ${payment.student.lastName}`.trim()
                                                    : payment.studentId}
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-gray-500">
                                                {payment.transactionReference || '—'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <PaymentMethodBadge method={payment.paymentMethod} />
                                            </td>
                                            <td className="px-4 py-3.5 font-semibold text-gray-900">
                                                {formatCurrencyETB(payment.amount)}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-gray-500">
                                                {payment.paymentDate}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <PaymentStatusBadge status={payment.status} />
                                            </td>
                                            {canVerifyPayments && (
                                                <td className="py-3.5 pl-4 text-right">
                                                    {payment.status === 'PENDING_VERIFICATION' ? (
                                                        <Link
                                                            to="/accountant/payments"
                                                            className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                                                        >
                                                            Verify
                                                        </Link>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">Complete</span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DashboardOverviewCard>
            </section>
        </div>
    );
};
