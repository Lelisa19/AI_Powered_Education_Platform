import React, { useState } from 'react';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import type { PaymentRecord } from '../../accountants/types/accountant.types';
import { FinancialOversightMetricCards } from '../components/FinancialOversightMetricCards';
import { PaymentAuditDetailModal } from '../components/PaymentAuditDetailModal';
import { PaymentAuditHistoryTable } from '../components/PaymentAuditHistoryTable';
import { useSchoolAdminFinancialOversight } from '../hooks/useSchoolAdminFinancialOversight';

export const SchoolAdminFinancePage: React.FC = () => {
    const {
        summary,
        isSummaryLoading,
        summaryError,
        isSummaryBackendUnavailable,
        payments,
        pagination,
        isPaymentsLoading,
        paymentsError,
        isPaymentsBackendUnavailable,
        query,
        setPage,
        setSearch,
        setStatusFilter,
        setPaymentMethodFilter,
        resetFilters,
        canReadReports,
        canReadPayments,
        reload,
    } = useSchoolAdminFinancialOversight();

    const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

    const isAnyLoading = isSummaryLoading || isPaymentsLoading;

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            {/* Page Header with Refresh Action */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <DashboardPageHeader
                    title="Financial Oversight"
                    subtitle="Executive school revenue monitoring, tuition collection totals, and accountant payment verification audit history."
                />
                <button
                    type="button"
                    onClick={reload}
                    disabled={isAnyLoading}
                    className="inline-flex items-center self-start rounded-md border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
                    aria-label="Refresh financial oversight data"
                >
                    <svg
                        className={`mr-2 h-3.5 w-3.5 text-gray-500 ${isAnyLoading ? 'animate-spin' : ''}`}
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

            {/* School Admin Oversight Scope Callout */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                        </svg>
                    </span>
                    <div className="text-xs text-blue-900">
                        <p className="font-semibold">School Admin Financial Oversight Scope</p>
                        <p className="mt-0.5 text-blue-700">
                            This workspace provides executive visibility into aggregate verified tuition collections, outstanding fee balances, and payment verification audit records. Payment verification and slip approvals are managed operationally by School Accountants.
                        </p>
                    </div>
                </div>
            </div>

            {/* Section 1: Financial Overview Metric Cards */}
            <FinancialOversightMetricCards
                summary={summary}
                isLoading={isSummaryLoading}
                error={summaryError}
                isBackendUnavailable={isSummaryBackendUnavailable}
                canReadReports={canReadReports}
                onRetry={reload}
            />

            {/* Section 2: Payment History and Verification Audit Table */}
            <PaymentAuditHistoryTable
                payments={payments}
                pagination={pagination}
                isLoading={isPaymentsLoading}
                error={paymentsError}
                isBackendUnavailable={isPaymentsBackendUnavailable}
                canReadPayments={canReadPayments}
                query={query}
                onPageChange={setPage}
                onSearchChange={setSearch}
                onStatusChange={setStatusFilter}
                onPaymentMethodChange={setPaymentMethodFilter}
                onResetFilters={resetFilters}
                onSelectPayment={setSelectedPayment}
                onRetry={reload}
            />

            {/* Section 3: Read-Only Audit Detail Modal */}
            {selectedPayment && (
                <PaymentAuditDetailModal
                    payment={selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                />
            )}
        </div>
    );
};
