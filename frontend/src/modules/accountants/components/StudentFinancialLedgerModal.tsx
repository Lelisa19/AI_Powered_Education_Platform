import React, { useEffect, useState } from 'react';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { useAuth } from '../../../hooks/useAuth';
import { ApiError } from '../../../services/api/api-error';
import {
    formatFinanceOperationError,
    getStudentPaymentHistory,
    isFinanceBackendUnavailableError,
} from '../services/accountant-service';
import type {
    FeeAssignment,
    PaymentRecord,
    StudentBalanceSummary,
    StudentPaymentHistoryResponse,
} from '../types/accountant.types';
import {
    formatCurrencyETB,
    formatPaymentDate,
    formatPaymentDateTime,
    formatReviewerDisplayName,
    formatStudentDisplayName,
} from '../utils/currency-formatters';
import {
    BalanceStatusBadge,
    FeeAssignmentStatusBadge,
    PaymentMethodBadge,
    PaymentStatusBadge,
} from './PaymentStatusBadge';
import { PaymentReceiptViewerModal } from './PaymentReceiptViewerModal';

interface StudentFinancialLedgerModalProps {
    studentId: string | null;
    isOpen: boolean;
    onClose: () => void;
    initialSummary?: StudentBalanceSummary | null;
}

interface StudentFinancialLedgerDialogProps {
    studentId: string;
    isOpen: boolean;
    onClose: () => void;
    initialSummary?: StudentBalanceSummary | null;
}

const StudentFinancialLedgerDialog: React.FC<StudentFinancialLedgerDialogProps> = ({
    studentId,
    isOpen,
    onClose,
    initialSummary,
}) => {
    const { user } = useAuth();
    const { tenantId } = useTenantContext();

    const [history, setHistory] = useState<StudentPaymentHistoryResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isBackendUnavailable, setIsBackendUnavailable] = useState(false);

    // Active receipt preview modal state
    const [previewPayment, setPreviewPayment] = useState<PaymentRecord | null>(null);

    // Active ledger tab: 'OVERVIEW' | 'FEES' | 'PAYMENTS'
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FEES' | 'PAYMENTS'>('OVERVIEW');

    useEffect(() => {
        const abortController = new AbortController();

        getStudentPaymentHistory(studentId, tenantId, user, abortController.signal)
            .then((data) => {
                setHistory(data);
                setIsLoading(false);
            })
            .catch((err: unknown) => {
                if (err instanceof ApiError && err.isCancellation) return;

                setIsLoading(false);
                if (isFinanceBackendUnavailableError(err)) {
                    setIsBackendUnavailable(true);
                } else {
                    setError(
                        formatFinanceOperationError(
                            err,
                            'Failed to load student financial ledger.'
                        )
                    );
                }
            });

        return () => {
            abortController.abort();
        };
    }, [studentId, tenantId, user]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !previewPayment) {
                e.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, previewPayment]);

    if (!isOpen || !studentId) return null;

    const summary = history?.balanceSummary ?? initialSummary;
    const student = history?.student ?? initialSummary?.student;
    const studentName = formatStudentDisplayName(student, studentId);
    const feeAssignments: FeeAssignment[] = history?.feeAssignments ?? [];
    const payments: PaymentRecord[] = history?.payments ?? [];

    return (
        <>
            <div
                className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 p-3 sm:p-6 md:p-10"
                role="dialog"
                aria-modal="true"
                aria-labelledby="student-ledger-modal-title"
            >
                <div className="fixed inset-0" aria-hidden="true" onClick={onClose} />

                <div className="relative mx-auto flex max-w-4xl flex-col rounded-xl border border-gray-200 bg-white shadow-2xl">
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <span
                                className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"
                                aria-hidden="true"
                            >
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
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                            </span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2
                                        id="student-ledger-modal-title"
                                        className="text-base font-bold text-gray-900"
                                    >
                                        Student Financial Ledger
                                    </h2>
                                    {summary && (
                                        <BalanceStatusBadge
                                            outstandingBalance={summary.outstandingBalance}
                                            isOverdue={summary.isOverdue}
                                        />
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">
                                    {studentName} {student?.studentCode && `• ID: ${student.studentCode}`}{' '}
                                    {student?.email && `• ${student.email}`}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
                            aria-label="Close ledger modal"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex border-b border-gray-200 bg-gray-50/70 px-6 text-xs font-medium">
                        <button
                            type="button"
                            onClick={() => setActiveTab('OVERVIEW')}
                            className={`border-b-2 py-3 px-4 font-semibold transition-colors ${
                                activeTab === 'OVERVIEW'
                                    ? 'border-indigo-600 text-indigo-700 bg-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Financial Overview & Breakdown
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('FEES')}
                            className={`flex items-center gap-1.5 border-b-2 py-3 px-4 font-semibold transition-colors ${
                                activeTab === 'FEES'
                                    ? 'border-indigo-600 text-indigo-700 bg-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <span>Assigned Fees</span>
                            {feeAssignments.length > 0 && (
                                <span className="rounded-full bg-gray-200 px-1.5 py-0.2 text-[10px] text-gray-700">
                                    {feeAssignments.length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('PAYMENTS')}
                            className={`flex items-center gap-1.5 border-b-2 py-3 px-4 font-semibold transition-colors ${
                                activeTab === 'PAYMENTS'
                                    ? 'border-indigo-600 text-indigo-700 bg-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <span>Payment History</span>
                            {payments.length > 0 && (
                                <span className="rounded-full bg-gray-200 px-1.5 py-0.2 text-[10px] text-gray-700">
                                    {payments.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Body Content */}
                    <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
                        {/* Loading Spinner */}
                        {isLoading && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                                <p className="mt-3 text-xs font-medium text-gray-600">
                                    Loading student financial ledger...
                                </p>
                            </div>
                        )}

                        {/* Backend Unavailable Banner */}
                        {isBackendUnavailable && !isLoading && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                                <div className="flex items-center gap-2 font-semibold">
                                    <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span>Backend Integration Notice: Ledger Endpoint Pending</span>
                                </div>
                                <p className="mt-1 text-amber-800">
                                    The individual student ledger endpoint (<code>GET /finance/students/:id/payments</code>) is not yet active on the backend service. Summary metadata is displayed from directory records.
                                </p>
                            </div>
                        )}

                        {/* Error Banner */}
                        {error && !isLoading && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                                <p className="font-semibold">Unable to load ledger</p>
                                <p className="mt-0.5">{error}</p>
                            </div>
                        )}

                        {!isLoading && summary && (
                            <>
                                {/* Section A: Financial Summary Cards */}
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <div className="rounded-lg border border-gray-200 bg-white p-3.5 shadow-sm">
                                        <p className="text-[11px] font-medium text-gray-500">Total Assigned Fees</p>
                                        <p className="mt-1 text-base font-bold text-gray-900">
                                            {formatCurrencyETB(summary.totalAssignedFees)}
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-gray-400">
                                            {summary.feeItemCount} assigned fee items
                                        </p>
                                    </div>

                                    <div className="rounded-lg border border-green-200 bg-green-50/40 p-3.5 shadow-sm">
                                        <p className="text-[11px] font-medium text-green-700">Verified Payments</p>
                                        <p className="mt-1 text-base font-bold text-green-700">
                                            {formatCurrencyETB(summary.totalVerifiedPayments)}
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-green-600">
                                            {summary.verifiedPaymentCount} verified payments
                                        </p>
                                    </div>

                                    <div className={`rounded-lg border p-3.5 shadow-sm ${
                                        summary.outstandingBalance > 0
                                            ? summary.isOverdue
                                                ? 'border-red-200 bg-red-50/50'
                                                : 'border-amber-200 bg-amber-50/50'
                                            : 'border-gray-200 bg-gray-50'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <p className={`text-[11px] font-medium ${
                                                summary.outstandingBalance > 0
                                                    ? summary.isOverdue
                                                        ? 'text-red-700'
                                                        : 'text-amber-800'
                                                    : 'text-gray-500'
                                            }`}>
                                                Outstanding Balance
                                            </p>
                                            {summary.isOverdue && (
                                                <span className="rounded bg-red-100 px-1 py-0.2 text-[9px] font-bold text-red-700">
                                                    OVERDUE
                                                </span>
                                            )}
                                        </div>
                                        <p className={`mt-1 text-base font-bold ${
                                            summary.outstandingBalance > 0
                                                ? summary.isOverdue
                                                    ? 'text-red-700'
                                                    : 'text-amber-900'
                                                : 'text-gray-900'
                                        }`}>
                                            {formatCurrencyETB(summary.outstandingBalance)}
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-gray-500">
                                            {summary.nextDueDate
                                                ? `Due: ${formatPaymentDate(summary.nextDueDate)}`
                                                : summary.outstandingBalance === 0
                                                  ? 'All fees settled'
                                                  : 'No due date specified'}
                                        </p>
                                    </div>

                                    <div className="rounded-lg border border-gray-200 bg-white p-3.5 shadow-sm">
                                        <p className="text-[11px] font-medium text-gray-500">Pending Review</p>
                                        <p className="mt-1 text-base font-bold text-amber-700">
                                            {formatCurrencyETB(summary.totalPendingPayments)}
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-gray-400">
                                            {summary.pendingPaymentCount} unverified submissions
                                        </p>
                                    </div>
                                </div>

                                {/* TAB 1: OVERVIEW & PARTIAL PAYMENT BREAKDOWN */}
                                {activeTab === 'OVERVIEW' && (
                                    <div className="space-y-4">
                                        {/* Partial Payment Calculation Breakdown Card */}
                                        <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs shadow-sm">
                                            <h3 className="font-bold text-gray-900">
                                                Financial Balance Reconciliation
                                            </h3>
                                            <p className="mt-0.5 text-[11px] text-gray-500">
                                                Strict ledger reconciliation based on verified transaction records.
                                            </p>

                                            <div className="mt-3 space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3.5">
                                                <div className="flex justify-between items-center text-gray-700">
                                                    <span>Original Assigned Obligations</span>
                                                    <span className="font-semibold text-gray-900">
                                                        {formatCurrencyETB(summary.totalAssignedFees)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-green-700">
                                                    <span className="flex items-center gap-1.5">
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                        </svg>
                                                        Total Verified Payments (Credited)
                                                    </span>
                                                    <span className="font-semibold">
                                                        - {formatCurrencyETB(summary.totalVerifiedPayments)}
                                                    </span>
                                                </div>
                                                <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-sm font-bold text-gray-900">
                                                    <span>Remaining Outstanding Balance</span>
                                                    <span className={summary.outstandingBalance > 0 ? 'text-amber-800' : 'text-green-700'}>
                                                        {formatCurrencyETB(summary.outstandingBalance)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Pending payments notice */}
                                            {summary.totalPendingPayments > 0 && (
                                                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800 flex items-start gap-2">
                                                    <svg className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <div>
                                                        <span className="font-semibold">Unverified Submissions Notice:</span>{' '}
                                                        Student has submitted {formatCurrencyETB(summary.totalPendingPayments)} across{' '}
                                                        {summary.pendingPaymentCount} pending transaction(s). In accordance with Ethiopian financial accounting policies, pending payments do NOT reduce the outstanding balance until approved by an Accountant.
                                                    </div>
                                                </div>
                                            )}

                                            {summary.totalRejectedPayments > 0 && (
                                                <div className="mt-2 text-[11px] text-gray-500">
                                                    Total rejected submissions: {formatCurrencyETB(summary.totalRejectedPayments)} (Not credited).
                                                </div>
                                            )}
                                        </div>

                                        {/* Accounting Rules Callout */}
                                        <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4 text-xs text-indigo-900">
                                            <p className="font-bold">Accounting Rule Notice</p>
                                            <p className="mt-1 text-[11px] text-indigo-800">
                                                This student ledger is strictly read-only. Payment verification or rejection actions must be conducted through the Accountant Payment Verification queue. Only verified receipts apply toward fee obligations.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 2: FEE ASSIGNMENTS TABLE */}
                                {activeTab === 'FEES' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-bold text-gray-900">
                                                Assigned Fee Obligations
                                            </h3>
                                            <span className="text-[11px] text-gray-500">
                                                {feeAssignments.length} obligation(s) recorded
                                            </span>
                                        </div>

                                        {feeAssignments.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-xs text-gray-500">
                                                No fee assignments recorded for this student.
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                                                    <thead className="bg-gray-50 font-semibold text-gray-600">
                                                        <tr>
                                                            <th className="px-4 py-3">Fee Title & Obligation</th>
                                                            <th className="px-4 py-3">Program / Course</th>
                                                            <th className="px-4 py-3">Assigned Amount</th>
                                                            <th className="px-4 py-3">Due Date</th>
                                                            <th className="px-4 py-3">Status</th>
                                                            <th className="px-4 py-3">Partial Payments</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 bg-white">
                                                        {feeAssignments.map((fee) => (
                                                            <tr key={fee.id} className="hover:bg-gray-50/70">
                                                                <td className="px-4 py-3">
                                                                    <div className="font-medium text-gray-900">{fee.title}</div>
                                                                    <div className="text-[11px] text-gray-500">
                                                                        {fee.category.replace('_', ' ')}
                                                                        {fee.description && ` • ${fee.description}`}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-700">
                                                                    {fee.programName || fee.courseTitle || '—'}
                                                                </td>
                                                                <td className="px-4 py-3 font-semibold text-gray-900">
                                                                    {formatCurrencyETB(fee.totalAmount)}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {fee.dueDate ? (
                                                                        <span className={
                                                                            fee.status === 'OVERDUE'
                                                                                ? 'font-medium text-red-600'
                                                                                : 'text-gray-700'
                                                                        }>
                                                                            {formatPaymentDate(fee.dueDate)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-gray-400">No due date</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <FeeAssignmentStatusBadge status={fee.status} />
                                                                </td>
                                                                <td className="px-4 py-3 text-[11px] text-gray-600">
                                                                    {fee.allowPartialPayments ? (
                                                                        <span className="inline-flex items-center text-blue-700">
                                                                            Allowed (on/before due date)
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-gray-500">
                                                                            Full payment required
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 3: PAYMENT HISTORY TABLE */}
                                {activeTab === 'PAYMENTS' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-bold text-gray-900">
                                                Transaction Payment History
                                            </h3>
                                            <span className="text-[11px] text-gray-500">
                                                {payments.length} transaction(s) recorded
                                            </span>
                                        </div>

                                        {payments.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-xs text-gray-500">
                                                No payment transactions recorded for this student.
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                                                    <thead className="bg-gray-50 font-semibold text-gray-600">
                                                        <tr>
                                                            <th className="px-4 py-3">Ref & Date</th>
                                                            <th className="px-4 py-3">Method</th>
                                                            <th className="px-4 py-3">Amount</th>
                                                            <th className="px-4 py-3">Verification Status</th>
                                                            <th className="px-4 py-3">Review & Decision Audit</th>
                                                            <th className="px-4 py-3 text-right">Receipt Evidence</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 bg-white">
                                                        {payments.map((p) => (
                                                            <tr key={p.id} className="hover:bg-gray-50/70">
                                                                <td className="px-4 py-3">
                                                                    <div className="font-medium text-gray-900">
                                                                        {p.transactionReference || p.id}
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-500">
                                                                        {formatPaymentDate(p.paymentDate)}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <PaymentMethodBadge method={p.paymentMethod} />
                                                                </td>
                                                                <td className="px-4 py-3 font-semibold text-gray-900">
                                                                    {formatCurrencyETB(p.amount)}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <PaymentStatusBadge status={p.status} />
                                                                </td>
                                                                <td className="px-4 py-3 text-[11px]">
                                                                    {p.verification ? (
                                                                        <div>
                                                                            <span className="font-medium text-gray-700">
                                                                                {formatReviewerDisplayName(p.verification.reviewedBy)}
                                                                            </span>
                                                                            <span className="text-gray-400">
                                                                                {' '}• {formatPaymentDateTime(p.verification.reviewedAt)}
                                                                            </span>
                                                                            {p.verification.decisionNote && (
                                                                                <p className="mt-0.5 text-gray-600 italic">
                                                                                    &ldquo;{p.verification.decisionNote}&rdquo;
                                                                                </p>
                                                                            )}
                                                                            {p.verification.rejectionReason && (
                                                                                <p className="mt-0.5 font-medium text-red-600">
                                                                                    Reason: {p.verification.rejectionReason}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-gray-400">Awaiting Accountant Review</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    {p.receipt ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPreviewPayment(p)}
                                                                            className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
                                                                        >
                                                                            <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                            </svg>
                                                                            View Slip
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-gray-400 text-[11px]">No Slip Attached</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3.5 text-xs">
                        <span className="text-gray-500">
                            School Accountant Financial Workspace • Read-Only Ledger Detail
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
                        >
                            Close Ledger
                        </button>
                    </div>
                </div>
            </div>

            {/* Receipt Preview Sub-Modal */}
            {previewPayment && (
                <PaymentReceiptViewerModal
                    payment={previewPayment}
                    isOpen={Boolean(previewPayment)}
                    onClose={() => setPreviewPayment(null)}
                />
            )}
        </>
    );
};

export const StudentFinancialLedgerModal: React.FC<StudentFinancialLedgerModalProps> = ({
    studentId,
    isOpen,
    onClose,
    initialSummary,
}) => {
    if (!isOpen || !studentId) return null;

    return (
        <StudentFinancialLedgerDialog
            key={studentId}
            studentId={studentId}
            isOpen={isOpen}
            onClose={onClose}
            initialSummary={initialSummary}
        />
    );
};


