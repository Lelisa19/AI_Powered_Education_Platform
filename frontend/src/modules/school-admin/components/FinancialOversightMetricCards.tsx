import React from 'react';
import type { FinancialReportSummary, PaymentMethod } from '../../accountants/types/accountant.types';
import { formatCurrencyETB } from '../utils/school-finance-formatters';

interface FinancialOversightMetricCardsProps {
    summary: FinancialReportSummary | null;
    isLoading: boolean;
    error: string | null;
    isBackendUnavailable: boolean;
    canReadReports: boolean;
    onRetry?: () => void;
}

const PAYMENT_METHOD_NAMES: Record<PaymentMethod, string> = {
    TELEBIRR: 'Telebirr',
    CBE_BIRR: 'CBE Birr',
    BANK_TRANSFER: 'Bank Transfer',
    CASH: 'Cash',
    PAGUME: 'Pagume',
};

export const FinancialOversightMetricCards: React.FC<FinancialOversightMetricCardsProps> = ({
    summary,
    isLoading,
    error,
    isBackendUnavailable,
    canReadReports,
    onRetry,
}) => {
    if (!canReadReports) {
        return (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                <p className="text-sm font-medium text-amber-800">
                    Financial overview metrics require the{' '}
                    <code className="font-mono text-xs font-semibold">reports.read</code> permission.
                </p>
            </div>
        );
    }

    if (error && !isBackendUnavailable) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-center">
                <p className="text-sm font-medium text-red-800">{error}</p>
                {onRetry && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="mt-3 inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        Retry Loading Metrics
                    </button>
                )}
            </div>
        );
    }

    return (
        <section aria-labelledby="financial-oversight-overview-heading" className="space-y-6">
            <h2 id="financial-oversight-overview-heading" className="sr-only">
                Financial Overview Metrics
            </h2>

            {/* Backend Pending Notice */}
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
                                Financial Report Backend Integration Pending
                            </h3>
                            <p className="mt-1 text-xs text-amber-700">
                                Aggregate metrics from <code className="font-mono">GET /finance/reports/summary</code> are awaiting backend service activation. Values below will update automatically when the endpoint is active.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Primary 6 Metric Cards Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {/* 1. Total Verified Collections */}
                <div className="flex flex-col justify-between overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                                Verified Collections
                            </span>
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                                aria-hidden="true"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-3">
                            {isLoading ? (
                                <div className="h-7 w-24 animate-pulse rounded bg-gray-200" />
                            ) : isBackendUnavailable ? (
                                <span className="inline-flex rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                    Pending
                                </span>
                            ) : (
                                <p className="text-xl font-bold tracking-tight text-gray-900">
                                    {formatCurrencyETB(summary?.totalCollectedVerified ?? 0)}
                                </p>
                            )}
                        </div>
                    </div>
                    <p className="mt-3 border-t border-emerald-100/80 pt-2 text-xs text-gray-500">
                        Only verified payments count as revenue
                    </p>
                </div>

                {/* 2. Total Outstanding Balances */}
                <div className="flex flex-col justify-between overflow-hidden rounded-lg border border-blue-200 bg-blue-50/30 p-5 shadow-sm">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">
                                Outstanding Balances
                            </span>
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700"
                                aria-hidden="true"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
                                    />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-3">
                            {isLoading ? (
                                <div className="h-7 w-24 animate-pulse rounded bg-gray-200" />
                            ) : isBackendUnavailable ? (
                                <span className="inline-flex rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                    Pending
                                </span>
                            ) : (
                                <p className="text-xl font-bold tracking-tight text-gray-900">
                                    {formatCurrencyETB(summary?.totalOutstandingBalances ?? 0)}
                                </p>
                            )}
                        </div>
                    </div>
                    <p className="mt-3 border-t border-blue-100/80 pt-2 text-xs text-gray-500">
                        Uncollected fees across students
                    </p>
                </div>

                {/* 3. Students With Outstanding Balances */}
                <div className="flex flex-col justify-between overflow-hidden rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                                Students With Dues
                            </span>
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700"
                                aria-hidden="true"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-3">
                            {isLoading ? (
                                <div className="h-7 w-16 animate-pulse rounded bg-gray-200" />
                            ) : isBackendUnavailable ? (
                                <span className="inline-flex rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                    Pending
                                </span>
                            ) : (
                                <p className="text-xl font-bold tracking-tight text-gray-900">
                                    {summary?.studentCountWithOutstandingBalance?.toLocaleString() ?? 0}
                                </p>
                            )}
                        </div>
                    </div>
                    <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
                        Students carrying balance
                    </p>
                </div>

                {/* 4. Pending Verification Count */}
                <div className="flex flex-col justify-between overflow-hidden rounded-lg border border-amber-200 bg-amber-50/30 p-5 shadow-sm">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                                Pending Review
                            </span>
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700"
                                aria-hidden="true"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                            {isLoading ? (
                                <div className="h-7 w-16 animate-pulse rounded bg-gray-200" />
                            ) : isBackendUnavailable ? (
                                <span className="inline-flex rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                    Pending
                                </span>
                            ) : (
                                <div>
                                    <p className="text-xl font-bold tracking-tight text-gray-900">
                                        {summary?.pendingPaymentCount?.toLocaleString() ?? 0}
                                    </p>
                                    {summary?.totalPendingVerification !== undefined && summary.totalPendingVerification > 0 && (
                                        <p className="mt-0.5 text-xs font-medium text-amber-700">
                                            {formatCurrencyETB(summary.totalPendingVerification)}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="mt-3 border-t border-amber-100/80 pt-2 text-xs text-gray-500">
                        Awaiting accountant review
                    </p>
                </div>

                {/* 5. Verified Payment Count */}
                <div className="flex flex-col justify-between overflow-hidden rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                                Verified Count
                            </span>
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700"
                                aria-hidden="true"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                            {isLoading ? (
                                <div className="h-7 w-16 animate-pulse rounded bg-gray-200" />
                            ) : isBackendUnavailable ? (
                                <span className="inline-flex rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                    Pending
                                </span>
                            ) : (
                                <p className="text-xl font-bold tracking-tight text-gray-900">
                                    {summary?.verifiedPaymentCount?.toLocaleString() ?? 0}
                                </p>
                            )}
                        </div>
                    </div>
                    <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
                        Approved transactions
                    </p>
                </div>

                {/* 6. Rejected Payment Count */}
                <div className="flex flex-col justify-between overflow-hidden rounded-lg border border-rose-200 bg-rose-50/30 p-5 shadow-sm">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">
                                Rejected Count
                            </span>
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-700"
                                aria-hidden="true"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                            {isLoading ? (
                                <div className="h-7 w-16 animate-pulse rounded bg-gray-200" />
                            ) : isBackendUnavailable ? (
                                <span className="inline-flex rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                    Pending
                                </span>
                            ) : (
                                <p className="text-xl font-bold tracking-tight text-gray-900">
                                    {summary?.rejectedPaymentCount?.toLocaleString() ?? 0}
                                </p>
                            )}
                        </div>
                    </div>
                    <p className="mt-3 border-t border-rose-100/80 pt-2 text-xs text-gray-500">
                        Declined deposit slips
                    </p>
                </div>
            </div>

            {/* Collections by Payment Method Breakdown (supported by FinancialReportSummary) */}
            {summary?.collectionsByMethod && (
                <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                        Verified Collections by Payment Method
                    </h3>
                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                        {(Object.keys(summary.collectionsByMethod) as PaymentMethod[]).map((method) => {
                            const amount = summary.collectionsByMethod[method] ?? 0;
                            return (
                                <div key={method} className="rounded-md border border-gray-100 bg-gray-50/60 p-3">
                                    <p className="text-xs text-gray-500">{PAYMENT_METHOD_NAMES[method] ?? method}</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-900">
                                        {formatCurrencyETB(amount)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
};

