import type { AxiosProgressEvent } from 'axios';
import { PERMISSIONS } from '../../../constants/permissions';
import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import { uploadFile } from '../../../services/api/upload-client';
import type { PaginationMeta } from '../../../types/api.types';
import type { AuthenticatedUser } from '../../../types/auth';
import { hasAnyPermission } from '../../../utils/authorization';
import {
    isPaymentMethod,
    isPaymentStatus,
    validatePaymentVerificationDecision,
    validateReceiptFile,
} from '../schemas/accountant-schema';
import type {
    FeeAssignment,
    FeeAssignmentListResponse,
    FeeCategory,
    FinancialReportSummary,
    ListFeeAssignmentsQuery,
    ListPaymentsQuery,
    ListStudentBalancesQuery,
    PaymentAuditSummary,
    PaymentListResponse,
    PaymentMethod,
    PaymentReceipt,
    PaymentRecord,
    PaymentStatus,
    PaymentStudentSummary,
    PaymentVerificationMetadata,
    PaymentVerificationRequest,
    PaymentVerificationResponse,
    StudentBalanceListResponse,
    StudentBalanceSummary,
    StudentPaymentHistoryResponse,
} from '../types/accountant.types';

/**
 * Secret or credential keys that must never appear in any School Finance API response.
 * Prevents accidental leakage of payment gateway secrets, tokens, or credentials.
 */
const FORBIDDEN_FINANCE_SECRET_KEYS = [
    'token',
    'secret',
    'apiKey',
    'apiSecret',
    'privateKey',
    'rawToken',
    'password',
    'passwordHash',
    'webhookSecret',
    'clientSecret',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoExposedSensitiveFields(obj: Record<string, unknown>, context: string): void {
    for (const key of FORBIDDEN_FINANCE_SECRET_KEYS) {
        if (key in obj && obj[key] !== undefined && obj[key] !== null) {
            throw new ApiError(
                `Security violation: ${context} response exposed sensitive credential or secret metadata.`,
                502
            );
        }
    }
}

/**
 * Validates that the active session matches the expected school tenant and has at least
 * one of the required functional permissions.
 * Note: Frontend checks provide UI routing/guarding only; authoritative RBAC is enforced
 * by the backend.
 */
function assertFinanceActorAuthorizedAny(
    actor: AuthenticatedUser | null,
    expectedTenantId: string | null | undefined,
    requiredPermissions: readonly string[]
): string {
    if (typeof expectedTenantId !== 'string' || expectedTenantId.trim() === '') {
        throw new ApiError('Verified school tenant context is required.', 400);
    }
    const cleanTenantId = expectedTenantId.trim();

    if (!actor || actor.accountType !== 'SCHOOL' || actor.tenantId !== cleanTenantId) {
        throw new ApiError(
            'Forbidden: Verified school session matching the active tenant is required.',
            403
        );
    }

    if (!hasAnyPermission(actor, [...requiredPermissions])) {
        throw new ApiError(
            `Forbidden: Requires one of [${requiredPermissions.join(', ')}].`,
            403
        );
    }

    return cleanTenantId;
}

function assertMatchingTenantId(
    actualTenantId: string,
    expectedTenantId: string,
    contextLabel: string
): void {
    if (actualTenantId !== expectedTenantId) {
        throw new ApiError(
            `Security violation: ${contextLabel} belongs to a different school tenant.`,
            502
        );
    }
}

function parseRequiredString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new ApiError(`Invalid backend finance payload: missing '${fieldName}'.`, 502);
    }
    return value.trim();
}

function parseOptionalNullableString(
    value: unknown,
    fieldName: string
): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(
            `Invalid backend finance payload: '${fieldName}' must be string or null.`,
            502
        );
    }
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function parseNonNegativeNumber(value: unknown, fieldName: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new ApiError(
            `Invalid backend finance payload: '${fieldName}' must be a non-negative number.`,
            502
        );
    }
    return value;
}

function parseAuditSummary(raw: unknown): PaymentAuditSummary | null | undefined {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    if (!isPlainObject(raw) || typeof raw.id !== 'string' || raw.id.trim() === '') {
        return undefined;
    }
    assertNoExposedSensitiveFields(raw, 'Finance audit summary');
    return {
        id: raw.id.trim(),
        name: parseOptionalNullableString(raw.name, 'audit.name'),
        email: parseOptionalNullableString(raw.email, 'audit.email'),
    };
}

function parseStudentSummary(raw: unknown): PaymentStudentSummary | null | undefined {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    if (!isPlainObject(raw)) return undefined;
    assertNoExposedSensitiveFields(raw, 'Student summary');
    return {
        id: parseRequiredString(raw.id, 'student.id'),
        firstName: parseRequiredString(raw.firstName, 'student.firstName'),
        lastName: parseRequiredString(raw.lastName, 'student.lastName'),
        email: parseRequiredString(raw.email, 'student.email'),
        studentCode: parseOptionalNullableString(raw.studentCode, 'student.studentCode'),
    };
}

function parsePaymentReceipt(raw: unknown): PaymentReceipt | null | undefined {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    if (!isPlainObject(raw)) return undefined;
    assertNoExposedSensitiveFields(raw, 'Payment receipt');
    return {
        id: parseRequiredString(raw.id, 'receipt.id'),
        paymentId: parseRequiredString(raw.paymentId, 'receipt.paymentId'),
        fileName: parseRequiredString(raw.fileName, 'receipt.fileName'),
        mimeType: parseRequiredString(raw.mimeType, 'receipt.mimeType'),
        fileSizeBytes: parseNonNegativeNumber(raw.fileSizeBytes, 'receipt.fileSizeBytes'),
        evidenceReference: parseRequiredString(
            raw.evidenceReference ?? raw.fileUrl ?? raw.evidenceKey,
            'receipt.evidenceReference'
        ),
        uploadedAt: parseRequiredString(raw.uploadedAt, 'receipt.uploadedAt'),
    };
}

function parseVerificationMetadata(raw: unknown): PaymentVerificationMetadata | null | undefined {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    if (!isPlainObject(raw)) return undefined;
    assertNoExposedSensitiveFields(raw, 'Payment verification');

    const reviewedBy = parseAuditSummary(raw.reviewedBy);
    if (!reviewedBy) {
        throw new ApiError('Invalid backend payment verification: missing reviewedBy.', 502);
    }

    return {
        reviewedBy,
        reviewedAt: parseRequiredString(raw.reviewedAt, 'verification.reviewedAt'),
        decisionNote: parseOptionalNullableString(
            raw.decisionNote ?? raw.note,
            'verification.decisionNote'
        ),
        rejectionReason: parseOptionalNullableString(
            raw.rejectionReason,
            'verification.rejectionReason'
        ),
    };
}

function parsePaymentRecord(raw: unknown, expectedTenantId: string): PaymentRecord {
    if (!isPlainObject(raw)) {
        throw new ApiError('Invalid backend payment record payload.', 502);
    }
    assertNoExposedSensitiveFields(raw, 'Payment record');

    const id = parseRequiredString(raw.id, 'payment.id');
    const tenantId = parseRequiredString(raw.tenantId, 'payment.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'payment record');

    const studentId = parseRequiredString(raw.studentId, 'payment.studentId');
    const amount = parseNonNegativeNumber(raw.amount, 'payment.amount');
    const currency = parseRequiredString(raw.currency ?? 'ETB', 'payment.currency');

    if (!isPaymentMethod(raw.paymentMethod)) {
        throw new ApiError(
            `Invalid backend payment payload: unrecognized payment method '${String(
                raw.paymentMethod
            )}'.`,
            502
        );
    }

    if (!isPaymentStatus(raw.status)) {
        throw new ApiError(
            `Invalid backend payment payload: unrecognized payment status '${String(raw.status)}'.`,
            502
        );
    }

    return {
        id,
        tenantId,
        studentId,
        student: parseStudentSummary(raw.student),
        enrollmentId: parseOptionalNullableString(raw.enrollmentId, 'payment.enrollmentId'),
        feeAssignmentId: parseOptionalNullableString(
            raw.feeAssignmentId,
            'payment.feeAssignmentId'
        ),
        programId: parseOptionalNullableString(raw.programId, 'payment.programId'),
        programName: parseOptionalNullableString(raw.programName, 'payment.programName'),
        courseId: parseOptionalNullableString(raw.courseId, 'payment.courseId'),
        courseTitle: parseOptionalNullableString(raw.courseTitle, 'payment.courseTitle'),
        academicYearId: parseOptionalNullableString(
            raw.academicYearId,
            'payment.academicYearId'
        ),
        academicYearName: parseOptionalNullableString(
            raw.academicYearName,
            'payment.academicYearName'
        ),
        amount,
        currency,
        paymentMethod: raw.paymentMethod,
        status: raw.status,
        paymentDate: parseRequiredString(raw.paymentDate, 'payment.paymentDate'),
        submittedAt: parseRequiredString(raw.submittedAt, 'payment.submittedAt'),
        transactionReference: parseOptionalNullableString(
            raw.transactionReference ?? raw.referenceNumber,
            'payment.transactionReference'
        ),
        receipt: parsePaymentReceipt(raw.receipt),
        verification: parseVerificationMetadata(raw.verification),
        notes: parseOptionalNullableString(raw.notes, 'payment.notes'),
        createdAt: parseOptionalNullableString(raw.createdAt, 'payment.createdAt'),
        updatedAt: parseOptionalNullableString(raw.updatedAt, 'payment.updatedAt'),
    };
}

function parseFeeAssignment(raw: unknown, expectedTenantId: string): FeeAssignment {
    if (!isPlainObject(raw)) {
        throw new ApiError('Invalid backend fee assignment payload.', 502);
    }
    assertNoExposedSensitiveFields(raw, 'Fee assignment');

    const id = parseRequiredString(raw.id, 'fee.id');
    const tenantId = parseRequiredString(raw.tenantId, 'fee.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'fee assignment');

    const studentId = parseRequiredString(raw.studentId, 'fee.studentId');
    const totalAmount = parseNonNegativeNumber(raw.totalAmount ?? raw.amount, 'fee.totalAmount');
    const currency = parseRequiredString(raw.currency ?? 'ETB', 'fee.currency');

    const rawStatus = raw.status;
    const validStatuses = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WAIVED'];
    if (typeof rawStatus !== 'string' || !validStatuses.includes(rawStatus)) {
        throw new ApiError(
            `Invalid backend fee assignment payload: unrecognized status '${String(rawStatus)}'.`,
            502
        );
    }

    const rawCategory = raw.category;
    const validCategories: FeeCategory[] = [
        'PROGRAM_TUITION',
        'COURSE_FEE',
        'REGISTRATION_FEE',
        'EXAM_FEE',
        'OTHER',
    ];
    const category: FeeCategory =
        typeof rawCategory === 'string' &&
        validCategories.includes(rawCategory as FeeCategory)
            ? (rawCategory as FeeCategory)
            : 'PROGRAM_TUITION';

    return {
        id,
        tenantId,
        studentId,
        student: parseStudentSummary(raw.student),
        enrollmentId: parseOptionalNullableString(raw.enrollmentId, 'fee.enrollmentId'),
        programId: parseOptionalNullableString(raw.programId, 'fee.programId'),
        programName: parseOptionalNullableString(raw.programName, 'fee.programName'),
        courseId: parseOptionalNullableString(raw.courseId, 'fee.courseId'),
        courseTitle: parseOptionalNullableString(raw.courseTitle, 'fee.courseTitle'),
        academicYearId: parseOptionalNullableString(
            raw.academicYearId,
            'fee.academicYearId'
        ),
        academicYearName: parseOptionalNullableString(
            raw.academicYearName,
            'fee.academicYearName'
        ),
        category,
        title: parseRequiredString(raw.title, 'fee.title'),
        description: parseOptionalNullableString(raw.description, 'fee.description'),
        totalAmount,
        currency,
        dueDate: parseOptionalNullableString(raw.dueDate, 'fee.dueDate'),
        allowPartialPayments: Boolean(raw.allowPartialPayments),
        status: rawStatus as FeeAssignment['status'],
        createdAt: parseOptionalNullableString(raw.createdAt, 'fee.createdAt'),
        updatedAt: parseOptionalNullableString(raw.updatedAt, 'fee.updatedAt'),
    };
}

function parseStudentBalanceSummary(
    raw: unknown,
    expectedStudentId?: string
): StudentBalanceSummary {
    if (!isPlainObject(raw)) {
        throw new ApiError('Invalid backend student balance payload.', 502);
    }
    assertNoExposedSensitiveFields(raw, 'Student balance');

    const studentId = parseRequiredString(raw.studentId, 'balance.studentId');
    if (expectedStudentId && studentId !== expectedStudentId) {
        throw new ApiError('Security violation: Returned balance student ID mismatch.', 502);
    }

    const totalAssignedFees = parseNonNegativeNumber(
        raw.totalAssignedFees,
        'balance.totalAssignedFees'
    );
    const totalVerifiedPayments = parseNonNegativeNumber(
        raw.totalVerifiedPayments,
        'balance.totalVerifiedPayments'
    );
    const totalPendingPayments = parseNonNegativeNumber(
        raw.totalPendingPayments ?? 0,
        'balance.totalPendingPayments'
    );
    const totalRejectedPayments = parseNonNegativeNumber(
        raw.totalRejectedPayments ?? 0,
        'balance.totalRejectedPayments'
    );
    const outstandingBalance = parseNonNegativeNumber(
        raw.outstandingBalance,
        'balance.outstandingBalance'
    );
    const currency = parseRequiredString(raw.currency ?? 'ETB', 'balance.currency');

    return {
        studentId,
        student: parseStudentSummary(raw.student),
        currency,
        totalAssignedFees,
        totalVerifiedPayments,
        totalPendingPayments,
        totalRejectedPayments,
        outstandingBalance,
        nextDueDate: parseOptionalNullableString(raw.nextDueDate, 'balance.nextDueDate'),
        isOverdue: Boolean(raw.isOverdue),
        feeItemCount: parseNonNegativeNumber(raw.feeItemCount ?? 0, 'balance.feeItemCount'),
        verifiedPaymentCount: parseNonNegativeNumber(
            raw.verifiedPaymentCount ?? 0,
            'balance.verifiedPaymentCount'
        ),
        pendingPaymentCount: parseNonNegativeNumber(
            raw.pendingPaymentCount ?? 0,
            'balance.pendingPaymentCount'
        ),
    };
}

function parsePaginationMeta(
    raw: unknown,
    fallbackTotal: number,
    fallbackPage = 1,
    fallbackLimit = 20
): PaginationMeta {
    if (!isPlainObject(raw)) {
        return {
            page: fallbackPage,
            limit: fallbackLimit,
            total: fallbackTotal,
            totalPages: Math.max(1, Math.ceil(fallbackTotal / Math.max(1, fallbackLimit))),
        };
    }

    const page =
        typeof raw.page === 'number' && Number.isInteger(raw.page) && raw.page >= 1
            ? raw.page
            : fallbackPage;
    const limit =
        typeof raw.limit === 'number' && Number.isInteger(raw.limit) && raw.limit >= 1
            ? raw.limit
            : fallbackLimit;
    const total =
        typeof raw.total === 'number' && Number.isInteger(raw.total) && raw.total >= 0
            ? raw.total
            : fallbackTotal;
    const totalPages =
        typeof raw.totalPages === 'number' &&
        Number.isInteger(raw.totalPages) &&
        raw.totalPages >= 1
            ? raw.totalPages
            : Math.max(1, Math.ceil(total / limit));

    return { page, limit, total, totalPages };
}

function extractMessage(payload: unknown): string | undefined {
    if (
        isPlainObject(payload) &&
        typeof payload.message === 'string' &&
        payload.message.trim() !== ''
    ) {
        return payload.message.trim();
    }
    return undefined;
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isFinanceBackendUnavailableError(error: unknown): boolean {
    if (error instanceof ApiError) {
        if (
            error.statusCode === 404 ||
            error.statusCode === 501 ||
            error.statusCode === 502 ||
            error.statusCode === 503
        ) {
            return true;
        }
        if (
            typeof error.message === 'string' &&
            /backend|not implemented|unavailable|network error|cannot connect|endpoint/i.test(
                error.message
            )
        ) {
            return true;
        }
    }
    return false;
}

export function formatFinanceOperationError(
    error: unknown,
    fallbackMessage: string
): string {
    if (error instanceof ApiError) {
        if (error.statusCode === 409) {
            return error.message && error.message.trim() !== ''
                ? `Conflict: ${error.message}`
                : 'Conflict (HTTP 409): This payment record has already been decided or updated by another user.';
        }
        if (error.statusCode === 404) {
            return error.message && error.message.trim() !== ''
                ? error.message
                : 'The requested financial record was not found.';
        }
        if (error.statusCode === 403) {
            return error.message && error.message.trim() !== ''
                ? error.message
                : 'Access Denied: You do not have permission to perform this financial operation.';
        }
        if (error.message && error.message.trim() !== '') {
            return error.message;
        }
    }
    if (error instanceof Error && error.message.trim() !== '') {
        return error.message;
    }
    return fallbackMessage;
}

// ==================== Public Service Functions ====================

/**
 * Lists payment records matching search, status, and filter parameters.
 * Requires `payments.read`.
 */
export async function listPayments(
    query: ListPaymentsQuery,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<PaymentListResponse> {
    const cleanTenantId = assertFinanceActorAuthorizedAny(actor, expectedTenantId, [
        PERMISSIONS.PAYMENTS.READ,
    ]);

    const params: Record<string, string | number> = {};
    if (query.page !== undefined) params.page = query.page;
    if (query.limit !== undefined) params.limit = query.limit;
    if (query.search && query.search.trim() !== '') params.search = query.search.trim();
    if (query.status && query.status !== 'ALL') params.status = query.status;
    if (query.paymentMethod && query.paymentMethod !== 'ALL') {
        params.paymentMethod = query.paymentMethod;
    }
    if (query.studentId) params.studentId = query.studentId;
    if (query.academicYearId) params.academicYearId = query.academicYearId;
    if (query.programId) params.programId = query.programId;
    if (query.startDate) params.startDate = query.startDate;
    if (query.endDate) params.endDate = query.endDate;

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.FINANCE.PAYMENTS, {
            params,
            signal,
        });
        const payload = response.data;

        if (Array.isArray(payload)) {
            const items = payload.map((item) => parsePaymentRecord(item, cleanTenantId));
            return {
                items,
                pagination: parsePaginationMeta(
                    undefined,
                    items.length,
                    query.page,
                    query.limit
                ),
            };
        }

        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend payment list response.', 502);
        }
        assertNoExposedSensitiveFields(payload, 'Payment list');

        const rawItems = Array.isArray(payload.payments)
            ? payload.payments
            : Array.isArray(payload.items)
              ? payload.items
              : null;

        if (!rawItems) {
            throw new ApiError('Backend payment list response did not contain items array.', 502);
        }

        const items = rawItems.map((item) => parsePaymentRecord(item, cleanTenantId));
        return {
            items,
            pagination: parsePaginationMeta(
                payload.pagination,
                items.length,
                query.page,
                query.limit
            ),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Retrieves a single payment record by ID with receipt and verification metadata.
 * Requires `payments.read`.
 */
export async function getPaymentById(
    paymentId: string,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<PaymentRecord> {
    const cleanTenantId = assertFinanceActorAuthorizedAny(actor, expectedTenantId, [
        PERMISSIONS.PAYMENTS.READ,
    ]);

    const cleanPaymentId = paymentId.trim();
    if (!cleanPaymentId) {
        throw new ApiError('Payment identifier is required.', 400);
    }

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.FINANCE.PAYMENT_BY_ID(cleanPaymentId),
            { signal }
        );
        const candidate =
            isPlainObject(response.data) && isPlainObject(response.data.payment)
                ? response.data.payment
                : response.data;

        const record = parsePaymentRecord(candidate, cleanTenantId);
        if (record.id !== cleanPaymentId) {
            throw new ApiError('Security violation: Returned payment ID mismatch.', 502);
        }
        return record;
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Retrieves a student's complete financial history including payments and balance.
 * Requires `payments.read`.
 */
export async function getStudentPaymentHistory(
    studentId: string,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<StudentPaymentHistoryResponse> {
    const cleanTenantId = assertFinanceActorAuthorizedAny(actor, expectedTenantId, [
        PERMISSIONS.PAYMENTS.READ,
    ]);

    const cleanStudentId = studentId.trim();
    if (!cleanStudentId) {
        throw new ApiError('Student identifier is required.', 400);
    }

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.FINANCE.STUDENT_PAYMENTS(cleanStudentId),
            { signal }
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend student payment history response.', 502);
        }
        assertNoExposedSensitiveFields(payload, 'Student payment history');

        const rawPayments = Array.isArray(payload.payments) ? payload.payments : [];
        const payments = rawPayments.map((p) => parsePaymentRecord(p, cleanTenantId));

        const rawFees = Array.isArray(payload.feeAssignments)
            ? payload.feeAssignments
            : [];
        const feeAssignments = rawFees.map((f) => parseFeeAssignment(f, cleanTenantId));

        const balanceSummary = parseStudentBalanceSummary(
            payload.balanceSummary ?? payload.balance ?? {},
            cleanStudentId
        );

        return {
            studentId: cleanStudentId,
            student: parseStudentSummary(payload.student),
            balanceSummary,
            payments,
            feeAssignments,
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Retrieves a student's balance summary directly.
 * Requires `payments.read`.
 */
export async function getStudentBalanceSummary(
    studentId: string,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<StudentBalanceSummary> {
    assertFinanceActorAuthorizedAny(actor, expectedTenantId, [PERMISSIONS.PAYMENTS.READ]);

    const cleanStudentId = studentId.trim();
    if (!cleanStudentId) {
        throw new ApiError('Student identifier is required.', 400);
    }

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.FINANCE.STUDENT_BALANCE(cleanStudentId),
            { signal }
        );
        const payload = response.data;
        return parseStudentBalanceSummary(payload, cleanStudentId);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Lists student balance summaries across the school.
 * Uses API_ENDPOINTS.FINANCE.BALANCES ('/finance/balances').
 * Requires `payments.read` and `students.read`.
 */
export async function listStudentBalances(
    query: ListStudentBalancesQuery,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<StudentBalanceListResponse> {
    assertFinanceActorAuthorizedAny(actor, expectedTenantId, [
        PERMISSIONS.PAYMENTS.READ,
        PERMISSIONS.STUDENTS.READ,
    ]);

    const params: Record<string, string | number | boolean> = {};
    if (query.page !== undefined) params.page = query.page;
    if (query.limit !== undefined) params.limit = query.limit;
    if (query.search && query.search.trim() !== '') params.search = query.search.trim();
    if (query.isOverdue !== undefined) params.isOverdue = query.isOverdue;

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.FINANCE.BALANCES, {
            params,
            signal,
        });
        const payload = response.data;

        if (Array.isArray(payload)) {
            const items = payload.map((item) => parseStudentBalanceSummary(item));
            return {
                items,
                pagination: parsePaginationMeta(
                    undefined,
                    items.length,
                    query.page,
                    query.limit
                ),
            };
        }

        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend student balance list response.', 502);
        }
        assertNoExposedSensitiveFields(payload, 'Student balance list');

        const rawItems = Array.isArray(payload.balances)
            ? payload.balances
            : Array.isArray(payload.items)
              ? payload.items
              : null;

        if (!rawItems) {
            throw new ApiError(
                'Backend student balance list response did not contain items array.',
                502
            );
        }

        const items = rawItems.map((item) => parseStudentBalanceSummary(item));
        return {
            items,
            pagination: parsePaginationMeta(
                payload.pagination,
                items.length,
                query.page,
                query.limit
            ),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Lists fee assignments across students.
 * Requires `payments.read`.
 */
export async function listFeeAssignments(
    query: ListFeeAssignmentsQuery,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<FeeAssignmentListResponse> {
    const cleanTenantId = assertFinanceActorAuthorizedAny(actor, expectedTenantId, [
        PERMISSIONS.PAYMENTS.READ,
    ]);

    const params: Record<string, string | number> = {};
    if (query.page !== undefined) params.page = query.page;
    if (query.limit !== undefined) params.limit = query.limit;
    if (query.search && query.search.trim() !== '') params.search = query.search.trim();
    if (query.studentId) params.studentId = query.studentId;
    if (query.status && query.status !== 'ALL') params.status = query.status;
    if (query.category && query.category !== 'ALL') params.category = query.category;
    if (query.academicYearId) params.academicYearId = query.academicYearId;

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.FINANCE.FEE_ASSIGNMENTS, {
            params,
            signal,
        });
        const payload = response.data;

        if (Array.isArray(payload)) {
            const items = payload.map((item) => parseFeeAssignment(item, cleanTenantId));
            return {
                items,
                pagination: parsePaginationMeta(
                    undefined,
                    items.length,
                    query.page,
                    query.limit
                ),
            };
        }

        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend fee assignments response.', 502);
        }
        assertNoExposedSensitiveFields(payload, 'Fee assignment list');

        const rawItems = Array.isArray(payload.feeAssignments)
            ? payload.feeAssignments
            : Array.isArray(payload.items)
              ? payload.items
              : null;

        if (!rawItems) {
            throw new ApiError('Backend response did not contain items array.', 502);
        }

        const items = rawItems.map((item) => parseFeeAssignment(item, cleanTenantId));
        return {
            items,
            pagination: parsePaginationMeta(
                payload.pagination,
                items.length,
                query.page,
                query.limit
            ),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Submits an Accountant's verification decision (`APPROVE` or `REJECT`) for a pending payment.
 * Requires `payments.verify` for APPROVE or `payments.reject` for REJECT.
 * Prevents re-deciding finalized payments at the service boundary.
 */
export async function submitPaymentVerification(
    paymentRecord: PaymentRecord,
    decisionPayload: PaymentVerificationRequest,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<PaymentVerificationResponse> {
    const requiredPermission =
        decisionPayload.decision === 'APPROVE'
            ? PERMISSIONS.PAYMENTS.VERIFY
            : PERMISSIONS.PAYMENTS.REJECT;

    const cleanTenantId = assertFinanceActorAuthorizedAny(actor, expectedTenantId, [
        requiredPermission,
    ]);

    assertMatchingTenantId(paymentRecord.tenantId, cleanTenantId, 'payment record');

    const validation = validatePaymentVerificationDecision({
        payment: paymentRecord,
        decision: decisionPayload.decision,
        note: decisionPayload.note,
    });

    if (!validation.valid || !validation.payload) {
        throw new ApiError(
            validation.generalError ?? 'Invalid payment verification decision.',
            400,
            validation.fieldErrors.note
                ? { note: [validation.fieldErrors.note] }
                : undefined
        );
    }

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.FINANCE.PAYMENT_VERIFICATION(paymentRecord.id),
            {
                decision: validation.payload.decision,
                note: validation.payload.note,
            }
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend payment verification response.', 502);
        }
        assertNoExposedSensitiveFields(payload, 'Payment verification');

        const rawPayment = isPlainObject(payload.payment)
            ? payload.payment
            : isPlainObject(payload.data)
              ? payload.data
              : payload;

        const updatedPayment = parsePaymentRecord(rawPayment, cleanTenantId);
        const expectedStatus: PaymentStatus =
            decisionPayload.decision === 'APPROVE' ? 'VERIFIED' : 'REJECTED';

        if (updatedPayment.status !== expectedStatus) {
            throw new ApiError(
                `Contract violation: Expected ${expectedStatus} payment status after verification decision.`,
                502
            );
        }

        let balanceSummary: StudentBalanceSummary | null = null;
        if (isPlainObject(payload.balanceSummary)) {
            balanceSummary = parseStudentBalanceSummary(
                payload.balanceSummary,
                paymentRecord.studentId
            );
        }

        return {
            payment: updatedPayment,
            balanceSummary,
            message:
                extractMessage(payload) ??
                `Payment ${
                    decisionPayload.decision === 'APPROVE' ? 'verified' : 'rejected'
                } successfully.`,
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Uploads receipt evidence for a payment record.
 * Validates file safety, extension, and size limits before sending.
 * Requires `payments.create`.
 */
export async function uploadPaymentReceipt(
    paymentId: string,
    file: File,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    onProgress?: (progressEvent: AxiosProgressEvent) => void
): Promise<PaymentReceipt> {
    assertFinanceActorAuthorizedAny(actor, expectedTenantId, [
        PERMISSIONS.PAYMENTS.CREATE,
    ]);

    const cleanPaymentId = paymentId.trim();
    if (!cleanPaymentId) {
        throw new ApiError('Payment identifier is required.', 400);
    }

    const fileCheck = validateReceiptFile(file);
    if (!fileCheck.valid) {
        throw new ApiError(fileCheck.error, 400);
    }

    try {
        const response = await uploadFile<unknown>({
            endpoint: API_ENDPOINTS.FINANCE.PAYMENT_RECEIPT(cleanPaymentId),
            file,
            fieldName: 'receipt',
            onProgress,
        });

        if (!isPlainObject(response)) {
            throw new ApiError('Invalid backend receipt upload response.', 502);
        }
        assertNoExposedSensitiveFields(response, 'Receipt upload');

        const parsed = parsePaymentReceipt(
            isPlainObject(response.receipt) ? response.receipt : response
        );
        if (!parsed) {
            throw new ApiError('Failed to parse uploaded receipt metadata.', 502);
        }
        return parsed;
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export interface FinancialReportQueryParams {
    startDate?: string;
    endDate?: string;
}

/**
 * Retrieves aggregate financial summary metrics for the school.
 * Requires `reports.read`.
 */
export async function getFinancialReportSummary(
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal,
    queryParams?: FinancialReportQueryParams
): Promise<FinancialReportSummary> {
    assertFinanceActorAuthorizedAny(actor, expectedTenantId, [PERMISSIONS.REPORTS.READ]);

    const params: Record<string, string> = {};
    if (queryParams?.startDate && queryParams.startDate.trim() !== '') {
        params.startDate = queryParams.startDate.trim();
    }
    if (queryParams?.endDate && queryParams.endDate.trim() !== '') {
        params.endDate = queryParams.endDate.trim();
    }

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.FINANCE.REPORTS_SUMMARY, {
            params: Object.keys(params).length > 0 ? params : undefined,
            signal,
        });
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend financial report response.', 502);
        }
        assertNoExposedSensitiveFields(payload, 'Financial report');

        const collectionsByMethod: Record<PaymentMethod, number> = {
            TELEBIRR: 0,
            CBE_BIRR: 0,
            PAGUME: 0,
            CASH: 0,
            BANK_TRANSFER: 0,
        };

        if (isPlainObject(payload.collectionsByMethod)) {
            for (const key of Object.keys(collectionsByMethod) as PaymentMethod[]) {
                if (typeof payload.collectionsByMethod[key] === 'number') {
                    collectionsByMethod[key] = parseNonNegativeNumber(
                        payload.collectionsByMethod[key],
                        `collectionsByMethod.${key}`
                    );
                }
            }
        }

        return {
            currency: parseRequiredString(payload.currency ?? 'ETB', 'report.currency'),
            totalCollectedVerified: parseNonNegativeNumber(
                payload.totalCollectedVerified ?? 0,
                'report.totalCollectedVerified'
            ),
            totalPendingVerification: parseNonNegativeNumber(
                payload.totalPendingVerification ?? 0,
                'report.totalPendingVerification'
            ),
            totalOutstandingBalances: parseNonNegativeNumber(
                payload.totalOutstandingBalances ?? 0,
                'report.totalOutstandingBalances'
            ),
            pendingPaymentCount: parseNonNegativeNumber(
                payload.pendingPaymentCount ?? 0,
                'report.pendingPaymentCount'
            ),
            verifiedPaymentCount: parseNonNegativeNumber(
                payload.verifiedPaymentCount ?? 0,
                'report.verifiedPaymentCount'
            ),
            rejectedPaymentCount: parseNonNegativeNumber(
                payload.rejectedPaymentCount ?? 0,
                'report.rejectedPaymentCount'
            ),
            studentCountWithOutstandingBalance: parseNonNegativeNumber(
                payload.studentCountWithOutstandingBalance ?? 0,
                'report.studentCountWithOutstandingBalance'
            ),
            collectionsByMethod,
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

