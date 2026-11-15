import { PERMISSIONS } from '../../../constants/permissions';
import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import type { PaginationMeta } from '../../../types/api.types';
import type { AuthenticatedUser, SchoolRole } from '../../../types/auth';
import { hasAnyPermission, hasPermission } from '../../../utils/authorization';
import { isAcademicBackendUnavailableError } from '../../academic/services/academic-structure-service';
import { isStudentAccountStatus } from '../schemas/student-management-schema';
import type {
    CreateStudentRequest,
    CreateStudentResponse,
    ListStudentsQuery,
    StudentAuditSummary,
    StudentDetailRecord,
    StudentDirectoryItem,
    StudentListResponse,
    StudentMutationResponse,
    StudentProfileDetails,
    StudentRegistrationDecisionRequest,
    StudentRegistrationSource,
    UpdateStudentProfileRequest,
    UpdateStudentStatusRequest,
} from '../types/student-management.types';

export const isStudentBackendUnavailableError = isAcademicBackendUnavailableError;

const VALID_SCHOOL_ROLES: ReadonlySet<SchoolRole> = new Set([
    'SCHOOL_ADMIN',
    'TEACHER',
    'STUDENT',
    'SCHOOL_ACCOUNTANT',
]);

/**
 * Secret or credential keys that must never appear in any School Admin Student API response.
 * Prevents accidental leakage of activation/invitation tokens, passwords, or hashes.
 */
const FORBIDDEN_STUDENT_SECRET_KEYS = [
    'token',
    'invitationToken',
    'activationToken',
    'rawToken',
    'tokenHash',
    'refreshToken',
    'password',
    'passwordHash',
    'tempPassword',
    'temporaryPassword',
    'secret',
    'accessKey',
    'privateKey',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoExposedSensitiveFields(obj: Record<string, unknown>, context: string): void {
    for (const key of FORBIDDEN_STUDENT_SECRET_KEYS) {
        if (key in obj && obj[key] !== undefined && obj[key] !== null) {
            throw new ApiError(
                `Security violation: ${context} response exposed sensitive credential or token metadata.`,
                502
            );
        }
    }
}

function assertStudentActorAuthorizedAny(
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

function assertStudentActorAuthorized(
    actor: AuthenticatedUser | null,
    expectedTenantId: string | null | undefined,
    requiredPermission: string
): string {
    return assertStudentActorAuthorizedAny(actor, expectedTenantId, [requiredPermission]);
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
        throw new ApiError(`Invalid backend student payload: missing '${fieldName}'.`, 502);
    }
    return value.trim();
}

function parseOptionalNullableString(value: unknown, fieldName: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(`Invalid backend student payload: '${fieldName}' must be string or null.`, 502);
    }
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function parseStudentRoles(rawRoles: unknown): SchoolRole[] {
    if (!Array.isArray(rawRoles) || rawRoles.length === 0) {
        throw new ApiError('Invalid backend student payload: roles array is required.', 502);
    }

    const deduped: SchoolRole[] = [];
    const seen = new Set<string>();

    for (const entry of rawRoles) {
        if (typeof entry !== 'string' || !VALID_SCHOOL_ROLES.has(entry as SchoolRole)) {
            throw new ApiError(
                'Security violation: Student payload contains unrecognized role value.',
                502
            );
        }
        if (!seen.has(entry)) {
            seen.add(entry);
            deduped.push(entry as SchoolRole);
        }
    }

    if (!deduped.includes('STUDENT')) {
        throw new ApiError(
            'Security violation: Target record in Student Management must carry the STUDENT role.',
            502
        );
    }

    return deduped;
}

function parseRegistrationSource(raw: unknown): StudentRegistrationSource | undefined {
    if (raw === undefined || raw === null) return undefined;
    if (raw === 'SELF_REGISTRATION' || raw === 'ADMIN_ACTIVATION') {
        return raw;
    }
    return undefined;
}

function parseAuditSummary(raw: unknown): StudentAuditSummary | null | undefined {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    if (!isPlainObject(raw) || typeof raw.id !== 'string' || raw.id.trim() === '') {
        return undefined;
    }
    assertNoExposedSensitiveFields(raw, 'Student audit summary');
    return {
        id: raw.id.trim(),
        name: parseOptionalNullableString(raw.name, 'audit.name'),
        email: parseOptionalNullableString(raw.email, 'audit.email'),
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

function parseStudentDirectoryItem(
    raw: unknown,
    expectedTenantId: string
): StudentDirectoryItem {
    if (!isPlainObject(raw)) {
        throw new ApiError('Invalid backend student directory record.', 502);
    }
    assertNoExposedSensitiveFields(raw, 'Student');

    const id = parseRequiredString(raw.id, 'student.id');
    const tenantId = parseRequiredString(raw.tenantId, 'student.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'student');

    const email = parseRequiredString(raw.email, 'student.email');
    const firstName = parseRequiredString(raw.firstName, 'student.firstName');
    const lastName = parseRequiredString(raw.lastName, 'student.lastName');
    const roles = parseStudentRoles(raw.roles);

    if (!isStudentAccountStatus(raw.status)) {
        throw new ApiError(
            'Invalid backend student payload: unrecognized account status.',
            502
        );
    }

    const profileSource = isPlainObject(raw.profile) ? raw.profile : null;
    if (profileSource) {
        assertNoExposedSensitiveFields(profileSource, 'Student profile summary');
    }

    const registrationSource = parseRegistrationSource(raw.registrationSource);
    const activatedAt = parseOptionalNullableString(raw.activatedAt, 'student.activatedAt');

    if (raw.status === 'PENDING_ACTIVATION') {
        if (activatedAt) {
            throw new ApiError(
                'Contract violation: PENDING_ACTIVATION student cannot report an activatedAt timestamp.',
                502
            );
        }
        if (registrationSource === 'SELF_REGISTRATION') {
            throw new ApiError(
                'Contract violation: Self-registered student cannot use PENDING_ACTIVATION onboarding state.',
                502
            );
        }
    }

    if (raw.status === 'PENDING_APPROVAL' && registrationSource === 'ADMIN_ACTIVATION') {
        throw new ApiError(
            'Contract violation: Admin activation-link student cannot enter self-registration PENDING_APPROVAL state.',
            502
        );
    }

    return {
        id,
        tenantId,
        email,
        firstName,
        lastName,
        roles,
        status: raw.status,
        registrationSource,
        studentCode: parseOptionalNullableString(
            raw.studentCode ?? profileSource?.studentCode,
            'student.studentCode'
        ),
        phone: parseOptionalNullableString(raw.phone ?? profileSource?.phone, 'student.phone'),
        createdAt: parseRequiredString(raw.createdAt, 'student.createdAt'),
        activatedAt,
        lastLoginAt: parseOptionalNullableString(raw.lastLoginAt, 'student.lastLoginAt'),
    };
}

function parseStudentProfileDetails(
    source: Record<string, unknown>,
    baseItem: StudentDirectoryItem
): StudentProfileDetails {
    assertNoExposedSensitiveFields(source, 'Student profile');

    return {
        studentCode:
            parseOptionalNullableString(source.studentCode, 'profile.studentCode') ??
            baseItem.studentCode ??
            null,
        phone:
            parseOptionalNullableString(source.phone, 'profile.phone') ??
            baseItem.phone ??
            null,
        dateOfBirth: parseOptionalNullableString(source.dateOfBirth, 'profile.dateOfBirth') ?? null,
        gender: parseOptionalNullableString(source.gender, 'profile.gender') ?? null,
        address: parseOptionalNullableString(source.address, 'profile.address') ?? null,
        emergencyContactName:
            parseOptionalNullableString(
                source.emergencyContactName,
                'profile.emergencyContactName'
            ) ?? null,
        emergencyContactPhone:
            parseOptionalNullableString(
                source.emergencyContactPhone,
                'profile.emergencyContactPhone'
            ) ?? null,
        emergencyContactRelation:
            parseOptionalNullableString(
                source.emergencyContactRelation,
                'profile.emergencyContactRelation'
            ) ?? null,
        notes: parseOptionalNullableString(source.notes, 'profile.notes') ?? null,
        updatedAt: parseOptionalNullableString(source.updatedAt, 'profile.updatedAt') ?? null,
    };
}

function parseStudentDetailRecord(
    payload: unknown,
    expectedTenantId: string
): StudentDetailRecord {
    if (!isPlainObject(payload)) {
        throw new ApiError('Invalid backend student detail payload.', 502);
    }
    assertNoExposedSensitiveFields(payload, 'Student detail');

    const candidate = isPlainObject(payload.student)
        ? payload.student
        : isPlainObject(payload.data)
          ? payload.data
          : payload;

    assertNoExposedSensitiveFields(candidate, 'Student detail');
    const base = parseStudentDirectoryItem(candidate, expectedTenantId);

    const profileSource = isPlainObject(candidate.profile)
        ? (candidate.profile as Record<string, unknown>)
        : candidate;

    return {
        ...base,
        profile: parseStudentProfileDetails(profileSource, base),
        approvedBy: parseAuditSummary(candidate.approvedBy),
        approvedAt: parseOptionalNullableString(candidate.approvedAt, 'student.approvedAt'),
        rejectedAt: parseOptionalNullableString(candidate.rejectedAt, 'student.rejectedAt'),
        rejectionReason: parseOptionalNullableString(
            candidate.rejectionReason,
            'student.rejectionReason'
        ),
        suspendedReason: parseOptionalNullableString(
            candidate.suspendedReason,
            'student.suspendedReason'
        ),
    };
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

export function formatStudentOperationError(error: unknown, fallbackMessage: string): string {
    if (error instanceof ApiError) {
        if (error.statusCode === 409) {
            return error.message && error.message.trim() !== ''
                ? `Conflict: ${error.message}`
                : 'Conflict (HTTP 409): A student account with this email or code already exists, or the target status transition is no longer valid.';
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

/**
 * Lists School-scoped student accounts.
 * - Full directory / arbitrary status filters strictly require `students.read`.
 * - Approval-only actors (`students.approve` without `students.read`) are strictly scoped
 *   to `status: 'PENDING_APPROVAL'` queries.
 */
export async function listStudents(
    query: ListStudentsQuery,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<StudentListResponse> {
    const allowedPermissions =
        query.status === 'PENDING_APPROVAL'
            ? [PERMISSIONS.STUDENTS.READ, PERMISSIONS.STUDENTS.APPROVE]
            : [PERMISSIONS.STUDENTS.READ];

    const cleanTenantId = assertStudentActorAuthorizedAny(
        actor,
        expectedTenantId,
        allowedPermissions
    );

    const params: Record<string, string | number> = {};
    if (query.page !== undefined) params.page = query.page;
    if (query.limit !== undefined) params.limit = query.limit;
    if (query.search && query.search.trim() !== '') {
        params.search = query.search.trim();
    }
    if (query.status) {
        params.status = query.status;
    }

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.SCHOOL_STUDENTS.BASE, {
            params,
            signal,
        });
        const data = response.data;

        if (Array.isArray(data)) {
            const items = data.map((item) => parseStudentDirectoryItem(item, cleanTenantId));
            return {
                items,
                pagination: parsePaginationMeta(undefined, items.length, query.page, query.limit),
            };
        }

        if (!isPlainObject(data)) {
            throw new ApiError('Invalid backend student list response.', 502);
        }
        assertNoExposedSensitiveFields(data, 'Student list');

        const rawItems = Array.isArray(data.students)
            ? data.students
            : Array.isArray(data.items)
              ? data.items
              : null;

        if (!rawItems) {
            throw new ApiError('Backend student list response did not contain items array.', 502);
        }

        const items = rawItems.map((item) => parseStudentDirectoryItem(item, cleanTenantId));
        return {
            items,
            pagination: parsePaginationMeta(data.pagination, items.length, query.page, query.limit),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function getStudentById(
    studentId: string,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<StudentDetailRecord> {
    const cleanTenantId = assertStudentActorAuthorizedAny(actor, expectedTenantId, [
        PERMISSIONS.STUDENTS.READ,
        PERMISSIONS.STUDENTS.APPROVE,
    ]);

    const cleanId = studentId.trim();
    if (!cleanId) {
        throw new ApiError('Student identifier is required.', 400);
    }

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.SCHOOL_STUDENTS.BY_ID(cleanId),
            { signal }
        );
        const detail = parseStudentDetailRecord(response.data, cleanTenantId);
        if (detail.id !== cleanId) {
            throw new ApiError('Security violation: Returned student ID mismatch.', 502);
        }

        // Approvers without `students.read` may only inspect pending self-registered accounts awaiting decision.
        if (
            !hasPermission(actor, PERMISSIONS.STUDENTS.READ) &&
            (detail.status !== 'PENDING_APPROVAL' ||
                detail.registrationSource === 'ADMIN_ACTIVATION')
        ) {
            throw new ApiError(
                'Forbidden: Viewing this student record requires students.read.',
                403
            );
        }

        return detail;
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function createStudent(
    request: CreateStudentRequest,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<CreateStudentResponse> {
    const cleanTenantId = assertStudentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.STUDENTS.CREATE
    );

    if (request.onboardingMode !== 'ACTIVATION_LINK') {
        throw new ApiError('Student creation must use activation-link onboarding.', 400);
    }

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.SCHOOL_STUDENTS.BASE,
            request
        );
        const detail = parseStudentDetailRecord(response.data, cleanTenantId);
        if (detail.status !== 'PENDING_ACTIVATION') {
            throw new ApiError(
                'Contract violation: Admin-created activation-link students must remain PENDING_ACTIVATION until completed by the student.',
                502
            );
        }
        if (detail.registrationSource === 'SELF_REGISTRATION') {
            throw new ApiError(
                'Contract violation: Admin-created student returned SELF_REGISTRATION source.',
                502
            );
        }

        const deliveryChannel =
            isPlainObject(response.data) && typeof response.data.deliveryChannel === 'string'
                ? response.data.deliveryChannel
                : undefined;

        return {
            student: detail,
            ...(deliveryChannel ? { deliveryChannel } : {}),
            ...(extractMessage(response.data) ? { message: extractMessage(response.data) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateStudentProfile(
    studentId: string,
    request: UpdateStudentProfileRequest,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<StudentMutationResponse> {
    const cleanTenantId = assertStudentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.STUDENTS.UPDATE
    );

    const cleanId = studentId.trim();
    if (!cleanId) {
        throw new ApiError('Student identifier is required.', 400);
    }

    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.SCHOOL_STUDENTS.PROFILE(cleanId),
            request
        );
        const detail = parseStudentDetailRecord(response.data, cleanTenantId);
        if (detail.id !== cleanId) {
            throw new ApiError('Security violation: Returned student ID mismatch.', 502);
        }

        return {
            student: detail,
            ...(extractMessage(response.data) ? { message: extractMessage(response.data) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function submitStudentRegistrationDecision(
    studentId: string,
    request: StudentRegistrationDecisionRequest,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<StudentMutationResponse> {
    const cleanTenantId = assertStudentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.STUDENTS.APPROVE
    );

    const cleanId = studentId.trim();
    if (!cleanId) {
        throw new ApiError('Student identifier is required.', 400);
    }

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.SCHOOL_STUDENTS.REGISTRATION_DECISION(cleanId),
            request
        );
        const detail = parseStudentDetailRecord(response.data, cleanTenantId);
        if (detail.id !== cleanId) {
            throw new ApiError('Security violation: Returned student ID mismatch.', 502);
        }
        const expectedDecisionStatus = request.decision === 'APPROVE' ? 'ACTIVE' : 'REJECTED';
        if (detail.status !== expectedDecisionStatus) {
            throw new ApiError(
                `Contract violation: Expected ${expectedDecisionStatus} status after registration decision.`,
                502
            );
        }

        return {
            student: detail,
            ...(extractMessage(response.data) ? { message: extractMessage(response.data) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateStudentAccountStatus(
    studentId: string,
    request: UpdateStudentStatusRequest,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<StudentMutationResponse> {
    const cleanTenantId = assertStudentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.STUDENTS.DISABLE
    );

    const cleanId = studentId.trim();
    if (!cleanId) {
        throw new ApiError('Student identifier is required.', 400);
    }

    if (actor?.id === cleanId && request.status === 'SUSPENDED') {
        throw new ApiError('You cannot suspend your own currently signed-in account.', 400);
    }

    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.SCHOOL_STUDENTS.STATUS(cleanId),
            request
        );
        const detail = parseStudentDetailRecord(response.data, cleanTenantId);
        if (detail.id !== cleanId) {
            throw new ApiError('Security violation: Returned student ID mismatch.', 502);
        }
        if (detail.status !== request.status) {
            throw new ApiError(
                `Contract violation: Expected ${request.status} status after status update.`,
                502
            );
        }

        return {
            student: detail,
            ...(extractMessage(response.data) ? { message: extractMessage(response.data) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

