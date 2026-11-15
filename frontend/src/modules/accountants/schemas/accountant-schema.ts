import type { ValidationErrors } from '../../../services/api/api-error';
import type {
    FeeAssignment,
    PaymentMethod,
    PaymentRecord,
    PaymentStatus,
    PaymentVerificationDecision,
    PaymentVerificationRequest,
    StudentBalanceSummary,
} from '../types/accountant.types';

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
    'TELEBIRR',
    'CBE_BIRR',
    'PAGUME',
    'CASH',
    'BANK_TRANSFER',
];

export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
    'PENDING_VERIFICATION',
    'VERIFIED',
    'REJECTED',
];

export const PAYMENT_DECISIONS: readonly PaymentVerificationDecision[] = [
    'APPROVE',
    'REJECT',
];

export const FINANCE_LIMITS = {
    AMOUNT_MIN: 0.01,
    AMOUNT_MAX: 10_000_000,
    REFERENCE_MAX: 100,
    DECISION_NOTE_MAX: 500,
    RECEIPT_MAX_BYTES: 10 * 1024 * 1024, // 10 MB
} as const;

export const SUPPORTED_RECEIPT_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
] as const;

export const SUPPORTED_RECEIPT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'] as const;

const PAYMENT_METHOD_LABELS: Readonly<Record<PaymentMethod, string>> = {
    TELEBIRR: 'Telebirr',
    CBE_BIRR: 'CBE Birr',
    PAGUME: 'Pagumē',
    CASH: 'Cash (In-Person)',
    BANK_TRANSFER: 'Bank Transfer / Deposit',
};

const PAYMENT_STATUS_LABELS: Readonly<Record<PaymentStatus, string>> = {
    PENDING_VERIFICATION: 'Pending Verification',
    VERIFIED: 'Verified',
    REJECTED: 'Rejected',
};

export function isPaymentMethod(value: unknown): value is PaymentMethod {
    return typeof value === 'string' && PAYMENT_METHODS.includes(value as PaymentMethod);
}

export function isPaymentStatus(value: unknown): value is PaymentStatus {
    return typeof value === 'string' && PAYMENT_STATUSES.includes(value as PaymentStatus);
}

export function isPaymentDecision(value: unknown): value is PaymentVerificationDecision {
    return value === 'APPROVE' || value === 'REJECT';
}

export function formatPaymentMethodLabel(method: PaymentMethod): string {
    return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function formatPaymentStatusLabel(status: PaymentStatus): string {
    return PAYMENT_STATUS_LABELS[status] ?? status;
}

// ==================== Decimal / Minor Units Precision ====================

/**
 * Converts a floating-point currency amount to integer minor units (santim/cents)
 * to avoid IEEE 754 precision issues during arithmetic.
 */
export function toMinorUnits(amount: number): number {
    if (!Number.isFinite(amount)) return 0;
    return Math.round((amount + Number.EPSILON) * 100);
}

/**
 * Converts integer minor units back to a standard decimal currency value.
 */
export function fromMinorUnits(minorUnits: number): number {
    if (!Number.isFinite(minorUnits)) return 0;
    return minorUnits / 100;
}

/**
 * Normalizes and rounds a currency value to 2 decimal places.
 */
export function roundCurrency(amount: number): number {
    return fromMinorUnits(toMinorUnits(amount));
}

// ==================== Balance & Partial Payment Calculations ====================

/**
 * Calculates a student's financial balance according to the strict business rule:
 * Outstanding Balance = Total Assigned Fees - Total Verified Payments.
 *
 * Requirements:
 * 1. Only VERIFIED payments reduce the outstanding balance.
 * 2. PENDING_VERIFICATION and REJECTED payments do NOT reduce the balance.
 * 3. Outstanding balance never drops below zero.
 * 4. Precision uses integer minor units to eliminate floating-point drift.
 */
export function calculateStudentBalance(
    feeAssignments: readonly FeeAssignment[],
    payments: readonly PaymentRecord[],
    currency = 'ETB'
): StudentBalanceSummary {
    let assignedMinor = 0;
    let verifiedMinor = 0;
    let pendingMinor = 0;
    let rejectedMinor = 0;

    let verifiedCount = 0;
    let pendingCount = 0;

    // 1. Sum assigned fee obligations (excluding waived fees)
    for (const fee of feeAssignments) {
        if (fee.status !== 'WAIVED' && Number.isFinite(fee.totalAmount) && fee.totalAmount > 0) {
            assignedMinor += toMinorUnits(fee.totalAmount);
        }
    }

    // 2. Sum payments strictly according to verification status
    for (const p of payments) {
        if (!Number.isFinite(p.amount) || p.amount <= 0) continue;

        const pMinor = toMinorUnits(p.amount);
        if (p.status === 'VERIFIED') {
            verifiedMinor += pMinor;
            verifiedCount += 1;
        } else if (p.status === 'PENDING_VERIFICATION') {
            pendingMinor += pMinor;
            pendingCount += 1;
        } else if (p.status === 'REJECTED') {
            rejectedMinor += pMinor;
        }
    }

    const outstandingMinor = Math.max(0, assignedMinor - verifiedMinor);

    // 3. Resolve nearest upcoming or past due date from unpaid/partially paid fee assignments
    const activeDueDates = feeAssignments
        .filter((fee) => fee.status !== 'PAID' && fee.status !== 'WAIVED' && Boolean(fee.dueDate))
        .map((fee) => fee.dueDate as string)
        .sort();

    const nextDueDate = activeDueDates[0] ?? null;
    const todayIso = new Date().toISOString().split('T')[0];
    const isOverdue = Boolean(nextDueDate && nextDueDate < todayIso && outstandingMinor > 0);

    const studentSummary =
        payments[0]?.student ?? feeAssignments[0]?.student ?? null;

    return {
        studentId: payments[0]?.studentId ?? feeAssignments[0]?.studentId ?? '',
        student: studentSummary,
        currency,
        totalAssignedFees: fromMinorUnits(assignedMinor),
        totalVerifiedPayments: fromMinorUnits(verifiedMinor),
        totalPendingPayments: fromMinorUnits(pendingMinor),
        totalRejectedPayments: fromMinorUnits(rejectedMinor),
        outstandingBalance: fromMinorUnits(outstandingMinor),
        nextDueDate,
        isOverdue,
        feeItemCount: feeAssignments.length,
        verifiedPaymentCount: verifiedCount,
        pendingPaymentCount: pendingCount,
    };
}

/**
 * Validates whether a partial payment is allowed on the specified payment date.
 * Strict business rule:
 * Partial payments are allowed only on or before the applicable due date (`paymentDate <= dueDate`).
 * If the payment date is after the due date, partial payments are blocked.
 */
export function isPartialPaymentAllowedOnDate(
    paymentDate: string,
    dueDate: string | null | undefined
): boolean {
    if (!dueDate || dueDate.trim() === '') {
        // If no due date is configured, partial payment is allowed
        return true;
    }
    const cleanPaymentDate = paymentDate.trim().split('T')[0];
    const cleanDueDate = dueDate.trim().split('T')[0];

    // Allowed on or before due date (lexicographical YYYY-MM-DD comparison is safe and exact)
    return cleanPaymentDate <= cleanDueDate;
}

// ==================== Form Validation & Decision Logic ====================

export interface PaymentDecisionFieldErrors {
    note?: string;
}

export interface PaymentDecisionValidationResult {
    valid: boolean;
    payload?: PaymentVerificationRequest;
    fieldErrors: PaymentDecisionFieldErrors;
    generalError?: string;
}

/**
 * Validates an Accountant's verification decision (APPROVE or REJECT).
 * Enforces:
 * - Decision must be APPROVE or REJECT.
 * - Payment must be currently PENDING_VERIFICATION (finalized payments cannot be decided again).
 * - REJECT requires a non-empty rejection reason.
 * - APPROVE allows an optional decision note.
 * - Maximum character length on notes.
 */
export function validatePaymentVerificationDecision(options: {
    payment: Pick<PaymentRecord, 'id' | 'status'>;
    decision: PaymentVerificationDecision;
    note?: string | null;
}): PaymentDecisionValidationResult {
    const { payment, decision, note } = options;
    const fieldErrors: PaymentDecisionFieldErrors = {};

    if (!payment || !payment.id) {
        return {
            valid: false,
            fieldErrors,
            generalError: 'Payment record reference is required.',
        };
    }

    if (payment.status !== 'PENDING_VERIFICATION') {
        return {
            valid: false,
            fieldErrors,
            generalError: `This payment has already been finalized as ${formatPaymentStatusLabel(
                payment.status
            )} and cannot be decided again.`,
        };
    }

    if (!isPaymentDecision(decision)) {
        return {
            valid: false,
            fieldErrors,
            generalError: 'Invalid decision: must be APPROVE or REJECT.',
        };
    }

    const cleanNote = note?.trim() ?? '';

    if (decision === 'REJECT') {
        if (!cleanNote) {
            fieldErrors.note = 'A rejection reason is required when rejecting a payment.';
        }
    }

    if (cleanNote.length > FINANCE_LIMITS.DECISION_NOTE_MAX) {
        fieldErrors.note = `Note must be ${FINANCE_LIMITS.DECISION_NOTE_MAX} characters or fewer.`;
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        payload: {
            paymentId: payment.id,
            decision,
            note: cleanNote === '' ? null : cleanNote,
        },
        fieldErrors: {},
    };
}

/**
 * Validates receipt evidence files for uploads.
 * Enforces size limits and MIME/extension restrictions without trusting raw filenames blindly.
 */
export function validateReceiptFile(file: File): { valid: true } | { valid: false; error: string } {
    if (!file) {
        return { valid: false, error: 'A receipt file is required.' };
    }

    if (file.size <= 0) {
        return { valid: false, error: 'The uploaded file is empty.' };
    }

    if (file.size > FINANCE_LIMITS.RECEIPT_MAX_BYTES) {
        const maxMb = Math.round(FINANCE_LIMITS.RECEIPT_MAX_BYTES / (1024 * 1024));
        return {
            valid: false,
            error: `Receipt file exceeds the maximum allowed size of ${maxMb}MB.`,
        };
    }

    const normalizedMime = file.type.toLowerCase().trim();
    const hasValidMime = (SUPPORTED_RECEIPT_MIME_TYPES as readonly string[]).includes(
        normalizedMime
    );

    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = SUPPORTED_RECEIPT_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));

    if (!hasValidMime && !hasValidExt) {
        return {
            valid: false,
            error: 'Unsupported file type. Receipts must be JPEG, PNG, WebP, or PDF documents.',
        };
    }

    return { valid: true };
}

/**
 * Helper to map backend validation error records to form fields.
 */
export function mapBackendFieldValidationErrors<T extends string>(
    validationErrors: ValidationErrors | undefined,
    allowedFields: readonly T[]
): Partial<Record<T, string>> {
    const result: Partial<Record<T, string>> = {};
    if (!validationErrors) return result;

    for (const field of allowedFields) {
        const errors = validationErrors[field];
        if (Array.isArray(errors) && errors.length > 0 && typeof errors[0] === 'string') {
            result[field] = errors[0];
        }
    }

    return result;
}

