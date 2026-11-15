import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { StudentFinancialLedgerModal } from '../components/StudentFinancialLedgerModal';
import { BalanceStatusBadge } from '../components/PaymentStatusBadge';
import { useStudentFinancialRecords } from '../hooks/useStudentFinancialRecords';
import type { StudentBalanceSummary } from '../types/accountant.types';
import {
    formatCurrencyETB,
    formatPaymentDate,
    formatStudentDisplayName,
} from '../utils/currency-formatters';

export const StudentFinancialRecordsPage: React.FC = () => {
    const {
        records,
        pagination,
        isLoading,
        error,
        isBackendUnavailable,
        filters,
        setPage,
        setSearch,
        setOverdueOnly,
        resetFilters,
        reload,
        hasRequiredPermissions,
    } = useStudentFinancialRecords();

    // Selected student for Ledger modal
    const [selectedStudent, setSelectedStudent] = useState<StudentBalanceSummary | null>(null);
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);

    const handleOpenLedger = (student: StudentBalanceSummary) => {
        setSelectedStudent(student);
        setIsLedgerOpen(true);
    };

    const handleCloseLedger = () => {
        setSelectedStudent(null);
        setIsLedgerOpen(false);
    };

    // Calculate aggregate metrics from currently listed items
    const totalAssignedSum = records.reduce((acc, r) => acc + r.totalAssignedFees, 0);
    const totalVerifiedSum = records.reduce((acc, r) => acc + r.totalVerifiedPayments, 0);
    const totalOutstandingSum = records.reduce((acc, r) => acc + r.outstandingBalance, 0);
    const overdueCount = records.filter((r) => r.isOverdue).length;

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <DashboardPageHeader
                    title="Student Financial Records"
                    subtitle="Inspect individual student fee obligations, verified payment histories, and outstanding fee ledgers."
                />
                <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                        type="button"
                        onClick={reload}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                        aria-label="Refresh financial records"
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

            {/* Backend Unavailable Notice Banner */}
            {isBackendUnavailable && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
                    <div className="flex items-center gap-2 font-semibold text-amber-800">
                        <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Backend Notice: Student Financial Balances Endpoint Pending</span>
                    </div>
                    <p className="mt-1 text-amber-800">
                        The School Accountant student financial balances endpoint (<code>GET /finance/balances</code>) is awaiting backend service deployment. Once active, student fee balances, verified payment sums, and overdue status will populate automatically.
                    </p>
                </div>
            )}

            {/* Permission Denial Fallback */}
            {!hasRequiredPermissions && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                    <p className="font-semibold">Access Restricted</p>
                    <p className="mt-0.5">
                        Viewing student financial records requires both <code>payments.read</code> and <code>students.read</code> permissions. Please contact your School Administrator if you believe this is in error.
                    </p>
                </div>
            )}

            {/* Filter and Search Bar */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by student name, code, or email..."
                            className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-xs shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* Quick Filters & Reset */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Overdue Only Filter */}
                        <div className="inline-flex rounded-md shadow-sm">
                            <button
                                type="button"
                                onClick={() => setOverdueOnly(false)}
                                className={`rounded-l-md border px-3 py-1.5 text-xs font-medium ${
                                    !filters.overdueOnly
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                All Students
                            </button>
                            <button
                                type="button"
                                onClick={() => setOverdueOnly(true)}
                                className={`rounded-r-md border border-l-0 px-3 py-1.5 text-xs font-medium ${
                                    filters.overdueOnly
                                        ? 'border-red-600 bg-red-50 text-red-700'
                                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Overdue Only
                            </button>
                        </div>

                        {/* Reset Filters */}
                        {(filters.search || filters.overdueOnly) && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Directory Aggregation Ribbon (visible when records loaded) */}
                {records.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-xs sm:grid-cols-4">
                        <div className="rounded bg-gray-50 p-2">
                            <span className="text-gray-500">Students Listed:</span>{' '}
                            <span className="font-semibold text-gray-900">{records.length}</span>
                        </div>
                        <div className="rounded bg-gray-50 p-2">
                            <span className="text-gray-500">Total Assigned:</span>{' '}
                            <span className="font-semibold text-gray-900">{formatCurrencyETB(totalAssignedSum)}</span>
                        </div>
                        <div className="rounded bg-gray-50 p-2">
                            <span className="text-gray-500">Total Verified:</span>{' '}
                            <span className="font-semibold text-green-700">{formatCurrencyETB(totalVerifiedSum)}</span>
                        </div>
                        <div className="rounded bg-gray-50 p-2">
                            <span className="text-gray-500">Total Outstanding:</span>{' '}
                            <span className="font-semibold text-amber-800">{formatCurrencyETB(totalOutstandingSum)}</span>
                            {overdueCount > 0 && (
                                <span className="ml-1 text-[10px] text-red-600">({overdueCount} overdue)</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                    <p className="font-semibold">Unable to load records</p>
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

            {/* Student Financial Directory Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                        <thead className="bg-gray-50 font-semibold text-gray-600">
                            <tr>
                                <th className="px-5 py-3">Student & Code</th>
                                <th className="px-4 py-3">Total Assigned</th>
                                <th className="px-4 py-3">Verified Payments</th>
                                <th className="px-4 py-3">Outstanding Balance</th>
                                <th className="px-4 py-3">Pending Submissions</th>
                                <th className="px-4 py-3">Due / Status</th>
                                <th className="px-4 py-3 text-right">Ledger Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {/* Loading State Skeleton */}
                            {isLoading && (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={`skeleton-${i}`} className="animate-pulse">
                                        <td className="px-5 py-4">
                                            <div className="h-3 w-36 rounded bg-gray-200" />
                                            <div className="mt-1.5 h-2.5 w-24 rounded bg-gray-100" />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="h-3 w-20 rounded bg-gray-200" />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="h-3 w-20 rounded bg-gray-200" />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="h-3 w-24 rounded bg-gray-200" />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="h-3 w-16 rounded bg-gray-200" />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="h-3 w-16 rounded bg-gray-200" />
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="ml-auto h-6 w-20 rounded bg-gray-200" />
                                        </td>
                                    </tr>
                                ))
                            )}

                            {/* Empty Directory State */}
                            {!isLoading && records.length === 0 && !error && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                        </div>
                                        <p className="mt-3 text-sm font-semibold text-gray-900">
                                            {filters.search || filters.overdueOnly
                                                ? 'No matching student financial records found'
                                                : 'No student financial records available'}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {filters.search || filters.overdueOnly
                                                ? 'Try clearing your search query or removing the overdue filter.'
                                                : isBackendUnavailable
                                                  ? 'Records will appear here once the backend student balance service is connected.'
                                                  : 'Student accounts enrolled with assigned fees will be listed here.'}
                                        </p>
                                        {(filters.search || filters.overdueOnly) && (
                                            <button
                                                type="button"
                                                onClick={resetFilters}
                                                className="mt-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                                            >
                                                Clear Filters
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )}

                            {/* Records Rows */}
                            {!isLoading && records.map((record) => (
                                <tr key={record.studentId} className="hover:bg-gray-50/80 transition-colors">
                                    {/* Student Name & Code */}
                                    <td className="px-5 py-3.5">
                                        <div className="font-semibold text-gray-900">
                                            {formatStudentDisplayName(record.student, record.studentId)}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                            {record.student?.studentCode && (
                                                <span className="font-mono text-gray-600">
                                                    {record.student.studentCode}
                                                </span>
                                            )}
                                            {record.student?.email && (
                                                <>
                                                    <span>•</span>
                                                    <span>{record.student.email}</span>
                                                </>
                                            )}
                                        </div>
                                    </td>

                                    {/* Assigned Fees */}
                                    <td className="px-4 py-3.5">
                                        <div className="font-semibold text-gray-900">
                                            {formatCurrencyETB(record.totalAssignedFees)}
                                        </div>
                                        <div className="text-[11px] text-gray-500">
                                            {record.feeItemCount} item{record.feeItemCount === 1 ? '' : 's'}
                                        </div>
                                    </td>

                                    {/* Verified Payments */}
                                    <td className="px-4 py-3.5">
                                        <div className="font-semibold text-green-700">
                                            {formatCurrencyETB(record.totalVerifiedPayments)}
                                        </div>
                                        <div className="text-[11px] text-green-600">
                                            {record.verifiedPaymentCount} verified
                                        </div>
                                    </td>

                                    {/* Outstanding Balance */}
                                    <td className="px-4 py-3.5">
                                        <div className="font-bold text-gray-900">
                                            {formatCurrencyETB(record.outstandingBalance)}
                                        </div>
                                        <div className="mt-0.5">
                                            <BalanceStatusBadge
                                                outstandingBalance={record.outstandingBalance}
                                                isOverdue={record.isOverdue}
                                            />
                                        </div>
                                    </td>

                                    {/* Pending Payments */}
                                    <td className="px-4 py-3.5 text-gray-700">
                                        {record.totalPendingPayments > 0 ? (
                                            <div>
                                                <span className="font-semibold text-amber-700">
                                                    {formatCurrencyETB(record.totalPendingPayments)}
                                                </span>
                                                <div className="text-[11px] text-amber-600">
                                                    {record.pendingPaymentCount} pending
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>

                                    {/* Due / Status */}
                                    <td className="px-4 py-3.5">
                                        {record.isOverdue ? (
                                            <div>
                                                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                                    OVERDUE
                                                </span>
                                                {record.nextDueDate && (
                                                    <p className="mt-0.5 text-[11px] text-red-600">
                                                        {formatPaymentDate(record.nextDueDate)}
                                                    </p>
                                                )}
                                            </div>
                                        ) : record.nextDueDate ? (
                                            <div>
                                                <span className="text-[11px] text-gray-600">
                                                    Due: {formatPaymentDate(record.nextDueDate)}
                                                </span>
                                            </div>
                                        ) : record.outstandingBalance === 0 ? (
                                            <span className="text-[11px] text-green-600 font-medium">Cleared</span>
                                        ) : (
                                            <span className="text-gray-400 text-[11px]">No due date</span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3.5 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenLedger(record)}
                                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                        >
                                            <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            View Ledger
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-3 text-xs text-gray-700">
                        <div>
                            Showing{' '}
                            <span className="font-semibold">
                                {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}
                            </span>{' '}
                            to{' '}
                            <span className="font-semibold">
                                {Math.min(pagination.page * pagination.limit, pagination.total)}
                            </span>{' '}
                            of <span className="font-semibold">{pagination.total}</span> students
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage(pagination.page - 1)}
                                disabled={pagination.page <= 1 || isLoading}
                                className="rounded border border-gray-300 bg-white px-2.5 py-1 font-medium hover:bg-gray-100 disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <span className="text-gray-500">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages || isLoading}
                                className="rounded border border-gray-300 bg-white px-2.5 py-1 font-medium hover:bg-gray-100 disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Individual Student Financial Ledger Modal */}
            {isLedgerOpen && selectedStudent && (
                <StudentFinancialLedgerModal
                    studentId={selectedStudent.studentId}
                    isOpen={isLedgerOpen}
                    initialSummary={selectedStudent}
                    onClose={handleCloseLedger}
                />
            )}
        </div>
    );
};
