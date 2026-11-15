import React from 'react';
import { Link } from 'react-router-dom';
import { useSchoolAdminFinancialSummary } from '../hooks/useSchoolAdminFinancialSummary';
import { formatCurrencyETB } from '../utils/school-finance-formatters';

export const SchoolAdminDashboardFinancialCard: React.FC = () => {
    const {
        summary,
        isLoading,
        error,
        isBackendUnavailable,
        canReadReports,
        canAccessFinance,
        reload,
    } = useSchoolAdminFinancialSummary();

    return (
        <section
            aria-labelledby="dashboard-finance-overview-heading"
            className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
        >
            {/* Header */}
            <div className="flex flex-col gap-2 border-b border-gray-200 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                    <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"
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
                    <div>
                        <h2
                            id="dashboard-finance-overview-heading"
                            className="text-base font-semibold leading-6 text-gray-900"
                        >
                            Financial Overview
                        </h2>
                        <p className="text-xs text-gray-500">
                            At-a-glance tuition collections and outstanding fee obligations.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={reload}
                        disabled={isLoading}
                        className="inline-flex items-center rounded border border-gray-300 bg-white p-1.5 text-xs text-gray-600 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Refresh financial overview"
                        aria-label="Refresh financial overview"
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
                    </button>
                    {canAccessFinance && (
                        <Link
                            to="/admin/finance"
                            className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                            View Financial Details &rarr;
                        </Link>
                    )}
                </div>
            </div>

            {/* Content Body */}
            <div className="p-5 sm:p-6">
                {!canReadReports ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-center">
                        <p className="text-xs font-medium text-amber-800">
                            Financial reporting summary requires the{' '}
                            <code className="font-mono text-[11px] font-semibold">reports.read</code> permission.
                        </p>
                    </div>
                ) : isBackendUnavailable ? (
                    <div className="space-y-4">
                        <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
                            <span className="font-semibold">Backend Integration Pending:</span> Aggregate metrics from <code className="font-mono text-[11px]">GET /finance/reports/summary</code> are awaiting backend service activation.
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                                <p className="text-xs text-gray-500">Verified Collections</p>
                                <span className="mt-2 inline-flex rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                    Pending
                                </span>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                                <p className="text-xs text-gray-500">Outstanding Balances</p>
                                <span className="mt-2 inline-flex rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                    Pending
                                </span>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                                <p className="text-xs text-gray-500">Students With Dues</p>
                                <span className="mt-2 inline-flex rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                    Pending
                                </span>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                                <p className="text-xs text-gray-500">Pending Verification</p>
                                <span className="mt-2 inline-flex rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                    Pending
                                </span>
                            </div>
                        </div>
                    </div>
                ) : error ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-center">
                        <p className="text-xs font-medium text-red-800">{error}</p>
                        <button
                            type="button"
                            onClick={reload}
                            className="mt-2 text-xs font-medium text-red-700 underline hover:text-red-900"
                        >
                            Try again
                        </button>
                    </div>
                ) : isLoading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
                        <div className="h-20 animate-pulse rounded-lg bg-gray-100 p-4" />
                        <div className="h-20 animate-pulse rounded-lg bg-gray-100 p-4" />
                        <div className="h-20 animate-pulse rounded-lg bg-gray-100 p-4" />
                        <div className="h-20 animate-pulse rounded-lg bg-gray-100 p-4" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* 1. Total Verified Collections */}
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                                Verified Collections
                            </span>
                            <p className="mt-1.5 text-xl font-bold tracking-tight text-gray-900">
                                {formatCurrencyETB(summary?.totalCollectedVerified ?? 0)}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500">
                                Approved school revenue
                            </p>
                        </div>

                        {/* 2. Total Outstanding Balances */}
                        <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">
                                Outstanding Balances
                            </span>
                            <p className="mt-1.5 text-xl font-bold tracking-tight text-gray-900">
                                {formatCurrencyETB(summary?.totalOutstandingBalances ?? 0)}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500">
                                Uncollected tuition & fees
                            </p>
                        </div>

                        {/* 3. Students With Outstanding Balances */}
                        <div className="rounded-lg border border-gray-200 bg-gray-50/30 p-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                                Students With Dues
                            </span>
                            <p className="mt-1.5 text-xl font-bold tracking-tight text-gray-900">
                                {summary?.studentCountWithOutstandingBalance?.toLocaleString() ?? 0}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500">
                                Carrying outstanding balance
                            </p>
                        </div>

                        {/* 4. Pending Payment Verification Count */}
                        <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                                Pending Verification
                            </span>
                            <p className="mt-1.5 text-xl font-bold tracking-tight text-gray-900">
                                {summary?.pendingPaymentCount?.toLocaleString() ?? 0}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500">
                                Awaiting accountant review
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer with link if permitted */}
            {canAccessFinance && (
                <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 sm:px-6">
                    <Link
                        to="/admin/finance"
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                        View Financial Details &rarr;
                    </Link>
                </div>
            )}
        </section>
    );
};

