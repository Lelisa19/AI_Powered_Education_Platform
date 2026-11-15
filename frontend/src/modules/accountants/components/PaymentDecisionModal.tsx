import React, { useEffect, useRef, useState } from 'react';
import type { PaymentRecord } from '../types/accountant.types';
import { PaymentMethodBadge } from './PaymentStatusBadge';
import { formatCurrencyETB, formatPaymentDate, formatStudentDisplayName } from '../utils/currency-formatters';
import { FINANCE_LIMITS } from '../schemas/accountant-schema';

interface PaymentDecisionModalProps {
    payment: PaymentRecord | null;
    decision: 'APPROVE' | 'REJECT' | null;
    isOpen: boolean;
    isSubmitting: boolean;
    error: string | null;
    onConfirm: (note: string | null) => Promise<void>;
    onClose: () => void;
}

interface PaymentDecisionDialogProps {
    payment: PaymentRecord;
    decision: 'APPROVE' | 'REJECT';
    isSubmitting: boolean;
    error: string | null;
    onConfirm: (note: string | null) => Promise<void>;
    onClose: () => void;
}

const PaymentDecisionDialog: React.FC<PaymentDecisionDialogProps> = ({
    payment,
    decision,
    isSubmitting,
    error,
    onConfirm,
    onClose,
}) => {
    const [note, setNote] = useState('');
    const [clientValidationError, setClientValidationError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isSubmitting) {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isSubmitting, onClose]);

    const isApprove = decision === 'APPROVE';
    const isReject = decision === 'REJECT';
    const isFinalized = payment.status !== 'PENDING_VERIFICATION';

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setClientValidationError(null);

        const cleanNote = note.trim();

        if (isReject && !cleanNote) {
            setClientValidationError('A rejection reason is required when rejecting a payment.');
            return;
        }

        if (cleanNote.length > FINANCE_LIMITS.DECISION_NOTE_MAX) {
            setClientValidationError(
                `Note must be ${FINANCE_LIMITS.DECISION_NOTE_MAX} characters or fewer.`
            );
            return;
        }

        try {
            await onConfirm(cleanNote ? cleanNote : null);
        } catch {
            // Handled via error prop
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 p-4 sm:p-6 md:p-12"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-decision-modal-title"
        >
            <div
                className="fixed inset-0"
                aria-hidden="true"
                onClick={isSubmitting ? undefined : onClose}
            />

            <div className="relative mx-auto max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl">
                <form onSubmit={handleFormSubmit}>
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <span
                                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                                    isApprove
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                }`}
                                aria-hidden="true"
                            >
                                {isApprove ? (
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </span>
                            <div>
                                <h2 id="payment-decision-modal-title" className="text-base font-bold text-gray-900">
                                    {isApprove ? 'Verify & Approve Payment' : 'Reject Payment Submission'}
                                </h2>
                                <p className="text-xs text-gray-500">
                                    Ref: {payment.transactionReference || payment.id}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                            aria-label="Close decision modal"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="space-y-4 p-6 text-xs">
                        {/* Finalized warning */}
                        {isFinalized && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                                <p className="font-semibold">Payment Already Finalized</p>
                                <p className="mt-0.5 text-[11px]">
                                    This payment is already marked as {payment.status} and cannot be decided again.
                                </p>
                            </div>
                        )}

                        {/* Payment Overview Card */}
                        <div className="rounded-lg border border-gray-200 bg-gray-50/75 p-3.5 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Student:</span>
                                <span className="font-semibold text-gray-900">
                                    {formatStudentDisplayName(payment.student, payment.studentId)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Amount:</span>
                                <span className="font-bold text-gray-900 text-sm">
                                    {formatCurrencyETB(payment.amount)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Payment Method:</span>
                                <PaymentMethodBadge method={payment.paymentMethod} />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Payment Date:</span>
                                <span className="font-medium text-gray-700">
                                    {formatPaymentDate(payment.paymentDate)}
                                </span>
                            </div>
                        </div>

                        {/* Rule Explanatory Callout */}
                        {isApprove ? (
                            <div className="rounded-lg border border-green-200 bg-green-50/70 p-3 text-green-900">
                                <p className="font-semibold">Financial Impact Notice:</p>
                                <p className="mt-0.5 text-[11px] text-green-800">
                                    Marking this payment as <span className="font-bold">VERIFIED</span> will officially credit the funds to the student&apos;s account and reduce their outstanding fee balance.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-red-200 bg-red-50/70 p-3 text-red-900">
                                <p className="font-semibold">Financial Impact Notice:</p>
                                <p className="mt-0.5 text-[11px] text-red-800">
                                    Marking this payment as <span className="font-bold">REJECTED</span> indicates the payment could not be validated. The student&apos;s balance will <span className="font-bold">NOT</span> be reduced.
                                </p>
                            </div>
                        )}

                        {/* Form Note / Reason */}
                        {!isFinalized && (
                            <div>
                                <label
                                    htmlFor="decision-note-input"
                                    className="block font-semibold text-gray-700"
                                >
                                    {isReject ? (
                                        <>
                                            Rejection Reason <span className="text-red-600">*</span>
                                        </>
                                    ) : (
                                        'Decision Note (Optional)'
                                    )}
                                </label>
                                <p className="mt-0.5 text-[11px] text-gray-500">
                                    {isReject
                                        ? 'Provide a clear explanation for the student regarding why the receipt or transaction was rejected.'
                                        : 'Optional memo, bank reference confirmation, or verification notes.'}
                                </p>
                                <textarea
                                    ref={textareaRef}
                                    id="decision-note-input"
                                    rows={3}
                                    disabled={isSubmitting}
                                    value={note}
                                    maxLength={FINANCE_LIMITS.DECISION_NOTE_MAX}
                                    onChange={(e) => {
                                        setNote(e.target.value);
                                        if (clientValidationError) setClientValidationError(null);
                                    }}
                                    placeholder={
                                        isReject
                                            ? 'e.g. Deposit slip reference does not match bank statement record; transaction amount mismatch.'
                                            : 'e.g. Confirmed on CBE internet banking portal statement.'
                                    }
                                    className="mt-2 block w-full rounded-md border border-gray-300 p-2.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                                <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                                    <span>
                                        {clientValidationError && (
                                            <span className="font-medium text-red-600">
                                                {clientValidationError}
                                            </span>
                                        )}
                                    </span>
                                    <span>
                                        {note.length}/{FINANCE_LIMITS.DECISION_NOTE_MAX}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Submission Error Banner */}
                        {error && (
                            <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-red-700">
                                <p className="font-medium">{error}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2.5 border-t border-gray-200 bg-gray-50 px-6 py-3.5">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onClose}
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        {!isFinalized && (
                            <button
                                type="submit"
                                disabled={isSubmitting || (isReject && !note.trim())}
                                className={`inline-flex items-center rounded-md px-4 py-1.5 text-xs font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                                    isApprove
                                        ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                                        : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                }`}
                            >
                                {isSubmitting && (
                                    <svg
                                        className="mr-1.5 h-3.5 w-3.5 animate-spin text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v8H4z"
                                        />
                                    </svg>
                                )}
                                {isApprove ? 'Confirm & Approve' : 'Confirm & Reject'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export const PaymentDecisionModal: React.FC<PaymentDecisionModalProps> = ({
    payment,
    decision,
    isOpen,
    isSubmitting,
    error,
    onConfirm,
    onClose,
}) => {
    if (!isOpen || !payment || !decision) return null;

    return (
        <PaymentDecisionDialog
            key={`${payment.id}-${decision}`}
            payment={payment}
            decision={decision}
            isSubmitting={isSubmitting}
            error={error}
            onConfirm={onConfirm}
            onClose={onClose}
        />
    );
};
