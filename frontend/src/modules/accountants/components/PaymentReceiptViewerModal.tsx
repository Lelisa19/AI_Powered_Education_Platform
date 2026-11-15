import React, { useEffect, useRef } from 'react';
import type { PaymentRecord } from '../types/accountant.types';
import { PaymentMethodBadge, PaymentStatusBadge } from './PaymentStatusBadge';
import {
    formatCurrencyETB,
    formatFileSize,
    formatPaymentDate,
    formatPaymentDateTime,
    formatReviewerDisplayName,
    formatStudentDisplayName,
} from '../utils/currency-formatters';

interface PaymentReceiptViewerModalProps {
    payment: PaymentRecord;
    isOpen: boolean;
    onClose: () => void;
}

function isSafeBrowserUrl(url?: string | null): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim().toLowerCase();
    return (
        trimmed.startsWith('https://') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('blob:') ||
        trimmed.startsWith('data:image/')
    );
}

export const PaymentReceiptViewerModal: React.FC<PaymentReceiptViewerModalProps> = ({
    payment,
    isOpen,
    onClose,
}) => {
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;

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
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const receipt = payment.receipt;
    const mimeTypeLower = (receipt?.mimeType || '').toLowerCase().trim();
    const isImage = mimeTypeLower.startsWith('image/');
    const isPdf = mimeTypeLower === 'application/pdf';
    const hasSafePreviewUrl = receipt?.evidenceReference
        ? isSafeBrowserUrl(receipt.evidenceReference)
        : false;

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 p-4 sm:p-6 md:p-12"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-viewer-modal-title"
        >
            <div className="fixed inset-0" aria-hidden="true" onClick={onClose} />

            <div className="relative mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 id="receipt-viewer-modal-title" className="text-lg font-bold text-gray-900">
                                Payment Details & Evidence
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
                        aria-label="Close receipt details modal"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body Content */}
                <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
                    {/* Financial Transaction Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-xs sm:grid-cols-4">
                        <div>
                            <span className="text-gray-500">Student</span>
                            <p className="mt-1 font-medium text-gray-900">
                                {formatStudentDisplayName(payment.student, payment.studentId)}
                            </p>
                        </div>
                        <div>
                            <span className="text-gray-500">Amount</span>
                            <p className="mt-1 font-semibold text-gray-900">
                                {formatCurrencyETB(payment.amount)}
                            </p>
                        </div>
                        <div>
                            <span className="text-gray-500">Method</span>
                            <div className="mt-1">
                                <PaymentMethodBadge method={payment.paymentMethod} />
                            </div>
                        </div>
                        <div>
                            <span className="text-gray-500">Payment Date</span>
                            <p className="mt-1 font-medium text-gray-900">
                                {formatPaymentDate(payment.paymentDate)}
                            </p>
                        </div>
                    </div>

                    {/* Receipt Evidence Attachment Section */}
                    <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Receipt Evidence
                        </h3>

                        {!receipt ? (
                            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                                <p className="text-sm font-medium text-gray-600">No Receipt Attachment Available</p>
                                <p className="mt-1 text-xs text-gray-500">
                                    This payment was entered without an uploaded deposit slip or receipt evidence file.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Attachment Metadata Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3.5 text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                            {isPdf ? (
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            ) : (
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </span>
                                        <div>
                                            <p className="font-semibold text-gray-900">{receipt.fileName}</p>
                                            <p className="text-[11px] text-gray-500">
                                                {formatFileSize(receipt.fileSizeBytes)} &bull; {receipt.mimeType}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-gray-500">
                                        Uploaded {formatPaymentDateTime(receipt.uploadedAt)}
                                    </span>
                                </div>

                                {/* Preview Area */}
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                    {isImage && hasSafePreviewUrl ? (
                                        <div className="flex justify-center overflow-hidden rounded bg-white p-2">
                                            <img
                                                src={receipt.evidenceReference}
                                                alt={receipt.fileName}
                                                className="max-h-96 w-auto object-contain"
                                            />
                                        </div>
                                    ) : isPdf && hasSafePreviewUrl ? (
                                        <div className="h-80 w-full overflow-hidden rounded border bg-white">
                                            <iframe
                                                src={receipt.evidenceReference}
                                                title={receipt.fileName}
                                                className="h-full w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-6 text-center">
                                            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-xs font-semibold text-blue-900">
                                                Evidence File On Record
                                            </p>
                                            <p className="mt-1 font-mono text-[11px] text-blue-800">
                                                Identifier: {receipt.evidenceReference}
                                            </p>
                                            <p className="mx-auto mt-2 max-w-sm text-[11px] text-gray-500">
                                                In-browser document rendering requires the backend signed receipt delivery endpoint (GET /finance/payments/:id/receipt).
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Verification Audit Trail (If Reviewed) */}
                    {payment.verification && (
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Review Audit Record
                            </h3>
                            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                                <div>
                                    <span className="text-gray-500">Reviewed By</span>
                                    <p className="mt-0.5 font-medium text-gray-900">
                                        {formatReviewerDisplayName(payment.verification.reviewedBy)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Reviewed At</span>
                                    <p className="mt-0.5 font-medium text-gray-900">
                                        {formatPaymentDateTime(payment.verification.reviewedAt)}
                                    </p>
                                </div>
                                {payment.verification.decisionNote && (
                                    <div className="sm:col-span-2">
                                        <span className="text-gray-500">Decision Note</span>
                                        <p className="mt-0.5 text-gray-800">
                                            {payment.verification.decisionNote}
                                        </p>
                                    </div>
                                )}
                                {payment.verification.rejectionReason && (
                                    <div className="sm:col-span-2 rounded bg-red-50 p-2.5">
                                        <span className="font-semibold text-red-800">Rejection Reason</span>
                                        <p className="mt-0.5 text-red-700">
                                            {payment.verification.rejectionReason}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-6 py-3.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

