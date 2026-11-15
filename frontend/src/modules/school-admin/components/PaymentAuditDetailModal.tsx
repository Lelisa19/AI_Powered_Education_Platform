import React, { useEffect, useRef } from 'react';
import type { PaymentRecord } from '../../accountants/types/accountant.types';
import { PaymentMethodBadge, PaymentStatusBadge } from '../../accountants/components/PaymentStatusBadge';
import {
    formatCurrencyETB,
    formatFileSize,
    formatPaymentDate,
    formatPaymentDateTime,
    formatReviewerDisplayName,
    formatStudentDisplayName,
} from '../utils/school-finance-formatters';

interface PaymentAuditDetailModalProps {
    payment: PaymentRecord;
    onClose: () => void;
}

export const PaymentAuditDetailModal: React.FC<PaymentAuditDetailModalProps> = ({
    payment,
    onClose,
}) => {
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        closeButtonRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 p-4 sm:p-6 md:p-20"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-audit-modal-title"
        >
            <div
                className="fixed inset-0"
                aria-hidden="true"
                onClick={onClose}
            />

            <div className="relative mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white shadow-2xl">
                {/* Modal Header */}
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2
                                id="payment-audit-modal-title"
                                className="text-lg font-bold text-gray-900"
                            >
                                Payment Audit Record
                            </h2>
                            <PaymentStatusBadge status={payment.status} />
                        </div>
                        <p className="mt-1 font-mono text-xs text-gray-500">
                            Reference: {payment.transactionReference || payment.id}
                        </p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Close audit details"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="max-h-[75vh] space-y-6 overflow-y-auto px-6 py-5">
                    {/* Read-only Governance Notice */}
                    <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-xs text-blue-800">
                        <svg className="h-4 w-4 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                            <strong>School Admin Oversight:</strong> This record is strictly read-only. Payment verification and decision actions are restricted to School Accountants.
                        </span>
                    </div>

                    {/* Section 1: Financial & Transaction Information */}
                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Financial Transaction Details
                        </h3>
                        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4 sm:grid-cols-2">
                            <div>
                                <dt className="text-xs text-gray-500">Amount</dt>
                                <dd className="mt-0.5 text-base font-bold text-gray-900">
                                    {formatCurrencyETB(payment.amount)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-gray-500">Payment Method</dt>
                                <dd className="mt-1">
                                    <PaymentMethodBadge method={payment.paymentMethod} />
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-gray-500">Payment Date</dt>
                                <dd className="mt-0.5 text-xs font-medium text-gray-900">
                                    {formatPaymentDate(payment.paymentDate)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-gray-500">Submitted Timestamp</dt>
                                <dd className="mt-0.5 text-xs text-gray-700">
                                    {formatPaymentDateTime(payment.submittedAt)}
                                </dd>
                            </div>
                            {payment.notes && (
                                <div className="sm:col-span-2">
                                    <dt className="text-xs text-gray-500">Transaction Notes</dt>
                                    <dd className="mt-0.5 text-xs text-gray-700">
                                        {payment.notes}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    {/* Section 2: Student Information */}
                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Student Information
                        </h3>
                        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4 sm:grid-cols-2">
                            <div>
                                <dt className="text-xs text-gray-500">Student Name</dt>
                                <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                    {formatStudentDisplayName(payment.student, payment.studentId)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-gray-500">Student Code</dt>
                                <dd className="mt-0.5 font-mono text-xs text-gray-700">
                                    {payment.student?.studentCode || '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-gray-500">Student Email</dt>
                                <dd className="mt-0.5 text-xs text-gray-700">
                                    {payment.student?.email || '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-gray-500">System Student ID</dt>
                                <dd className="mt-0.5 font-mono text-xs text-gray-500">
                                    {payment.studentId}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Section 3: Academic / Fee Linkage (if available) */}
                    {(payment.programName || payment.courseTitle || payment.academicYearName) && (
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Academic Allocation
                            </h3>
                            <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4 sm:grid-cols-2">
                                {payment.programName && (
                                    <div>
                                        <dt className="text-xs text-gray-500">Program</dt>
                                        <dd className="mt-0.5 text-xs font-medium text-gray-900">
                                            {payment.programName}
                                        </dd>
                                    </div>
                                )}
                                {payment.courseTitle && (
                                    <div>
                                        <dt className="text-xs text-gray-500">Course</dt>
                                        <dd className="mt-0.5 text-xs font-medium text-gray-900">
                                            {payment.courseTitle}
                                        </dd>
                                    </div>
                                )}
                                {payment.academicYearName && (
                                    <div>
                                        <dt className="text-xs text-gray-500">Academic Year</dt>
                                        <dd className="mt-0.5 text-xs font-medium text-gray-900">
                                            {payment.academicYearName}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    )}

                    {/* Section 4: Verification & Accountant Audit Trail */}
                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Accountant Verification Audit Trail
                        </h3>
                        {payment.verification ? (
                            <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4 sm:grid-cols-2">
                                <div>
                                    <dt className="text-xs text-gray-500">Reviewing Accountant</dt>
                                    <dd className="mt-0.5 text-xs font-semibold text-gray-900">
                                        {formatReviewerDisplayName(payment.verification.reviewedBy)}
                                    </dd>
                                    {payment.verification.reviewedBy.email && (
                                        <p className="text-xs text-gray-500">
                                            {payment.verification.reviewedBy.email}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <dt className="text-xs text-gray-500">Verification Timestamp</dt>
                                    <dd className="mt-0.5 text-xs text-gray-700">
                                        {formatPaymentDateTime(payment.verification.reviewedAt)}
                                    </dd>
                                </div>
                                {payment.verification.decisionNote && (
                                    <div className="sm:col-span-2">
                                        <dt className="text-xs text-gray-500">Decision Note</dt>
                                        <dd className="mt-0.5 rounded border border-gray-200 bg-white p-2.5 text-xs text-gray-800">
                                            {payment.verification.decisionNote}
                                        </dd>
                                    </div>
                                )}
                                {payment.verification.rejectionReason && (
                                    <div className="sm:col-span-2">
                                        <dt className="text-xs font-semibold text-red-700">Rejection Reason</dt>
                                        <dd className="mt-0.5 rounded border border-red-200 bg-red-50/70 p-2.5 text-xs text-red-800">
                                            {payment.verification.rejectionReason}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        ) : (
                            <div className="mt-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center">
                                <p className="text-xs text-gray-500">
                                    {payment.status === 'PENDING_VERIFICATION'
                                        ? 'This payment has not yet been reviewed. It is currently in the Accountant verification queue.'
                                        : 'No audit verification metadata recorded for this payment.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Section 5: Receipt Evidence Metadata */}
                    {payment.receipt && (
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Uploaded Receipt Evidence
                            </h3>
                            <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4 sm:grid-cols-2">
                                <div>
                                    <dt className="text-xs text-gray-500">File Name</dt>
                                    <dd className="mt-0.5 text-xs font-medium text-gray-900">
                                        {payment.receipt.fileName}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-gray-500">File Size</dt>
                                    <dd className="mt-0.5 text-xs text-gray-700">
                                        {formatFileSize(payment.receipt.fileSizeBytes)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-gray-500">MIME Type</dt>
                                    <dd className="mt-0.5 text-xs text-gray-700">
                                        {payment.receipt.mimeType}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-gray-500">Upload Date</dt>
                                    <dd className="mt-0.5 text-xs text-gray-700">
                                        {formatPaymentDateTime(payment.receipt.uploadedAt)}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end border-t border-gray-200 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

