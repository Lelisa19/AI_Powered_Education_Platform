import type { PaginationMeta } from '../../../types/api.types';

/**
 * Supported payment methods for school fee collection.
 * Includes local Ethiopian digital payment methods alongside standard channels.
 */
export type PaymentMethod =
    | 'TELEBIRR'
    | 'CBE_BIRR'
    | 'PAGUME'
    | 'CASH'
    | 'BANK_TRANSFER';

/**
 * Strict payment lifecycle status.
 * Deliberately separated from student account status and academic enrollment status.
 */
export type PaymentStatus =
    | 'PENDING_VERIFICATION'
    | 'VERIFIED'
    | 'REJECTED';

/**
 * Verification decision actions for an Accountant reviewing submitted payments.
 */
export type PaymentVerificationDecision = 'APPROVE' | 'REJECT';

/**
 * Standard audit summary for administrative records.
 */
export interface PaymentAuditSummary {
    id: string;
    name?: string | null;
    email?: string | null;
}

/**
 * Lightweight student identity reference attached to financial records.
 * Excludes sensitive personal details.
 */
export interface PaymentStudentSummary {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    studentCode?: string | null;
}

/**
 * Metadata representing uploaded payment receipt evidence.
 * Does not expose internal file storage paths or permanent public access tokens.
 */
export interface PaymentReceipt {
    id: string;
    paymentId: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    evidenceReference: string; // Tenant-scoped evidence identifier or temporary signed URL
    uploadedAt: string;
}

/**
 * Audit information captured when an Accountant verifies or rejects a payment.
 */
export interface PaymentVerificationMetadata {
    reviewedBy: PaymentAuditSummary;
    reviewedAt: string;
    decisionNote?: string | null;
    rejectionReason?: string | null;
}

/**
 * Canonical payment record representing a student's recorded or submitted payment.
 */
export interface PaymentRecord {
    id: string;
    tenantId: string;
    studentId: string;
    student?: PaymentStudentSummary | null;

    // Academic / Fee obligation linkage (optional for standalone or general payments)
    enrollmentId?: string | null;
    feeAssignmentId?: string | null;
    programId?: string | null;
    programName?: string | null;
    courseId?: string | null;
    courseTitle?: string | null;
    academicYearId?: string | null;
    academicYearName?: string | null;

    // Financial transaction fields
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    status: PaymentStatus;
    paymentDate: string; // YYYY-MM-DD
    submittedAt: string; // ISO 8601
    transactionReference?: string | null;

    // Associated evidence and audit metadata
    receipt?: PaymentReceipt | null;
    verification?: PaymentVerificationMetadata | null;
    notes?: string | null;

    createdAt?: string | null;
    updatedAt?: string | null;
}

/**
 * Category of assigned fee.
 */
export type FeeCategory =
    | 'PROGRAM_TUITION'
    | 'COURSE_FEE'
    | 'REGISTRATION_FEE'
    | 'EXAM_FEE'
    | 'OTHER';

/**
 * Status of a specific fee obligation.
 */
export type FeeAssignmentStatus =
    | 'UNPAID'
    | 'PARTIALLY_PAID'
    | 'PAID'
    | 'OVERDUE'
    | 'WAIVED';

/**
 * School fee obligation assigned to a student or enrollment.
 */
export interface FeeAssignment {
    id: string;
    tenantId: string;
    studentId: string;
    student?: PaymentStudentSummary | null;

    enrollmentId?: string | null;
    programId?: string | null;
    programName?: string | null;
    courseId?: string | null;
    courseTitle?: string | null;
    academicYearId?: string | null;
    academicYearName?: string | null;

    category: FeeCategory;
    title: string;
    description?: string | null;

    totalAmount: number;
    currency: string;
    dueDate?: string | null; // YYYY-MM-DD
    allowPartialPayments: boolean;

    status: FeeAssignmentStatus;
    createdAt?: string | null;
    updatedAt?: string | null;
}

/**
 * Comprehensive student financial balance summary.
 * Strict business rule:
 * Outstanding Balance = Total Assigned Fees - Total Verified Payments.
 * Pending verification payments must never reduce the outstanding balance.
 */
export interface StudentBalanceSummary {
    studentId: string;
    student?: PaymentStudentSummary | null;
    currency: string;

    totalAssignedFees: number;
    totalVerifiedPayments: number;
    totalPendingPayments: number;
    totalRejectedPayments: number;
    outstandingBalance: number;

    nextDueDate?: string | null;
    isOverdue: boolean;

    feeItemCount: number;
    verifiedPaymentCount: number;
    pendingPaymentCount: number;
}

/**
 * Accountant decision payload to approve or reject a pending payment.
 */
export interface PaymentVerificationRequest {
    paymentId: string;
    decision: PaymentVerificationDecision;
    note?: string | null; // Optional for APPROVE, required for REJECT
}

/**
 * Server response after verifying a payment.
 */
export interface PaymentVerificationResponse {
    payment: PaymentRecord;
    balanceSummary?: StudentBalanceSummary | null;
    message?: string;
}

/**
 * Query filters for the payment queue and payment history views.
 */
export interface ListPaymentsQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: PaymentStatus | 'ALL';
    paymentMethod?: PaymentMethod | 'ALL';
    studentId?: string;
    academicYearId?: string;
    programId?: string;
    startDate?: string;
    endDate?: string;
}

export interface PaymentListResponse {
    items: PaymentRecord[];
    pagination?: PaginationMeta;
}

export interface StudentPaymentHistoryResponse {
    studentId: string;
    student?: PaymentStudentSummary | null;
    balanceSummary: StudentBalanceSummary;
    payments: PaymentRecord[];
    feeAssignments: FeeAssignment[];
}

export interface ListFeeAssignmentsQuery {
    page?: number;
    limit?: number;
    search?: string;
    studentId?: string;
    status?: FeeAssignmentStatus | 'ALL';
    category?: FeeCategory | 'ALL';
    academicYearId?: string;
}

export interface FeeAssignmentListResponse {
    items: FeeAssignment[];
    pagination?: PaginationMeta;
}

/**
 * High-level school financial aggregation metrics for Accountant overview.
 */
export interface FinancialReportSummary {
    currency: string;
    totalCollectedVerified: number;
    totalPendingVerification: number;
    totalOutstandingBalances: number;
    pendingPaymentCount: number;
    verifiedPaymentCount: number;
    rejectedPaymentCount: number;
    studentCountWithOutstandingBalance: number;
    collectionsByMethod: Record<PaymentMethod, number>;
}

