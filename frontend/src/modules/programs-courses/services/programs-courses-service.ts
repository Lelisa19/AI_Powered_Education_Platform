import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import { PERMISSIONS } from '../../../constants/permissions';
import type { PaginationMeta } from '../../../types/api.types';
import type { AuthenticatedUser, SchoolRole } from '../../../types/auth';
import { hasAnyPermission, hasPermission } from '../../../utils/authorization';
import { isAcademicBackendUnavailableError } from '../../academic/services/academic-structure-service';
import {
    isOfferingLifecycleStatus,
    isProgramType,
    isTeacherAssignmentScope,
    sortProgramCourses,
} from '../schemas/programs-courses-schema';
import type {
    AddProgramCourseRequest,
    AssignableTeacher,
    AssignableTeacherListResponse,
    AssignableTeachersQuery,
    CatalogAuditSummary,
    Course,
    CourseListResponse,
    CourseMutationResponse,
    CreateCourseRequest,
    CreateProgramRequest,
    CreateTeacherAssignmentRequest,
    DeleteCatalogRecordResponse,
    DeleteTeacherAssignmentResponse,
    ListCoursesQuery,
    ListProgramsQuery,
    ListTeacherAssignmentsQuery,
    OfferingLifecycleStatus,
    Program,
    ProgramCourse,
    ProgramCourseListResponse,
    ProgramCourseMutationResponse,
    ProgramListResponse,
    ProgramMutationResponse,
    RemoveProgramCourseResponse,
    ReorderProgramCoursesRequest,
    TeacherAssignmentListResponse,
    TeacherAssignmentMutationResponse,
    TeacherAssignmentScope,
    TeacherCourseAssignment,
    UpdateCourseRequest,
    UpdateProgramCourseRequest,
    UpdateProgramRequest,
} from '../types/programs-courses.types';

export const isCatalogBackendUnavailableError = isAcademicBackendUnavailableError;

const FORBIDDEN_CATALOG_SECRET_KEYS = [
    'token',
    'secret',
    'password',
    'passwordHash',
    'storagePath',
    'diskPath',
    'localPath',
    'accessKey',
    'privateKey',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoExposedSensitiveFields(obj: Record<string, unknown>, context: string): void {
    for (const key of FORBIDDEN_CATALOG_SECRET_KEYS) {
        if (key in obj && obj[key] !== undefined && obj[key] !== null) {
            throw new ApiError(
                `Security violation: ${context} response exposed sensitive metadata.`,
                502
            );
        }
    }
}

function assertCatalogActorAuthorized(
    actor: AuthenticatedUser | null,
    expectedTenantId: string | null | undefined,
    requiredPermission: string
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

    if (!hasPermission(actor, requiredPermission)) {
        throw new ApiError(`Forbidden: Missing ${requiredPermission} permission.`, 403);
    }

    return cleanTenantId;
}

function assertCatalogActorAuthorizedAny(
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
        throw new ApiError(`Invalid catalog payload: missing '${fieldName}'.`, 502);
    }
    return value.trim();
}

function parseOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
}

function parseOptionalNullableString(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function parseOptionalNonNegativeInt(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
        return value;
    }
    return undefined;
}

function parseOptionalCreditHours(value: unknown): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }
    throw new ApiError("Invalid catalog payload: 'creditHours' must be a positive number.", 502);
}

function parseAuditSummary(value: unknown): CatalogAuditSummary | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value) || typeof value.id !== 'string' || value.id.trim() === '') {
        return undefined;
    }
    return {
        id: value.id.trim(),
        name: parseOptionalNullableString(value.name),
        email: parseOptionalNullableString(value.email),
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

    const page = typeof raw.page === 'number' && Number.isInteger(raw.page) && raw.page >= 1
        ? raw.page
        : fallbackPage;
    const limit = typeof raw.limit === 'number' && Number.isInteger(raw.limit) && raw.limit >= 1
        ? raw.limit
        : fallbackLimit;
    const total = typeof raw.total === 'number' && Number.isInteger(raw.total) && raw.total >= 0
        ? raw.total
        : fallbackTotal;
    const totalPages =
        typeof raw.totalPages === 'number' && Number.isInteger(raw.totalPages) && raw.totalPages >= 1
            ? raw.totalPages
            : Math.max(1, Math.ceil(total / limit));

    return { page, limit, total, totalPages };
}

function extractListResponse(
    payload: unknown,
    itemKeys: readonly string[],
    page?: number,
    limit?: number
): { rawItems: unknown[]; pagination: PaginationMeta } {
    if (Array.isArray(payload)) {
        return {
            rawItems: payload,
            pagination: parsePaginationMeta(undefined, payload.length, page, limit),
        };
    }

    if (!isPlainObject(payload)) {
        throw new ApiError('Invalid backend catalog list response.', 502);
    }
    assertNoExposedSensitiveFields(payload, 'Catalog list');

    for (const key of itemKeys) {
        if (Array.isArray(payload[key])) {
            const rawItems = payload[key] as unknown[];
            return {
                rawItems,
                pagination: parsePaginationMeta(
                    payload.pagination,
                    rawItems.length,
                    page,
                    limit
                ),
            };
        }
    }

    throw new ApiError('Backend catalog list response did not contain items array.', 502);
}

function extractRecordCandidate(payload: unknown, keys: readonly string[]): Record<string, unknown> {
    if (!isPlainObject(payload)) {
        throw new ApiError('Invalid backend catalog record response.', 502);
    }
    assertNoExposedSensitiveFields(payload, 'Catalog record');

    for (const key of keys) {
        if (key in payload && isPlainObject(payload[key])) {
            const inner = payload[key] as Record<string, unknown>;
            assertNoExposedSensitiveFields(inner, 'Catalog record');
            return inner;
        }
    }
    return payload;
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

function parseProgramRecord(data: unknown, expectedTenantId: string): Program {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend program payload.', 502);
    }
    assertNoExposedSensitiveFields(data, 'Program');

    const id = parseRequiredString(data.id, 'program.id');
    const tenantId = parseRequiredString(data.tenantId, 'program.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'program');

    const name = parseRequiredString(data.name, 'program.name');
    if (!isProgramType(data.programType)) {
        throw new ApiError('Invalid backend program payload: unrecognized programType.', 502);
    }
    if (!isOfferingLifecycleStatus(data.status)) {
        throw new ApiError('Invalid backend program payload: unrecognized status.', 502);
    }

    const rawClassId = parseOptionalNullableString(data.academicClassId);
    if (data.programType === 'GRADE_BASED' && !rawClassId) {
        throw new ApiError(
            'Invalid backend program payload: GRADE_BASED program must reference an AcademicClass.',
            502
        );
    }
    if (data.programType === 'SKILL_BASED' && rawClassId) {
        throw new ApiError(
            'Invalid backend program payload: SKILL_BASED program must not bind an AcademicClass.',
            502
        );
    }

    return {
        id,
        tenantId,
        name,
        code: parseOptionalString(data.code),
        programType: data.programType,
        academicClassId: data.programType === 'GRADE_BASED' ? rawClassId : null,
        academicClassName:
            data.programType === 'GRADE_BASED'
                ? parseOptionalNullableString(data.academicClassName)
                : null,
        academicClassCode:
            data.programType === 'GRADE_BASED'
                ? parseOptionalNullableString(data.academicClassCode)
                : null,
        description: parseOptionalString(data.description),
        status: data.status,
        courseCount: parseOptionalNonNegativeInt(data.courseCount),
        enrollmentCount: parseOptionalNonNegativeInt(data.enrollmentCount),
        createdAt: parseOptionalNullableString(data.createdAt),
        updatedAt: parseOptionalNullableString(data.updatedAt),
        updatedBy: parseAuditSummary(data.updatedBy),
    };
}

function parseCourseRecord(data: unknown, expectedTenantId: string): Course {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend course payload.', 502);
    }
    assertNoExposedSensitiveFields(data, 'Course');

    if (
        ('programId' in data && data.programId !== undefined && data.programId !== null) ||
        ('teacherId' in data && data.teacherId !== undefined && data.teacherId !== null)
    ) {
        throw new ApiError(
            'Contract violation: Course payload must remain reusable without scalar programId or teacherId binding.',
            502
        );
    }

    const id = parseRequiredString(data.id, 'course.id');
    const tenantId = parseRequiredString(data.tenantId, 'course.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'course');

    const title = parseRequiredString(data.title, 'course.title');
    if (typeof data.allowStandalone !== 'boolean') {
        throw new ApiError(
            'Invalid backend course payload: missing boolean allowStandalone flag.',
            502
        );
    }
    if (!isOfferingLifecycleStatus(data.status)) {
        throw new ApiError('Invalid backend course payload: unrecognized status.', 502);
    }

    return {
        id,
        tenantId,
        title,
        code: parseOptionalString(data.code),
        description: parseOptionalString(data.description),
        creditHours: parseOptionalCreditHours(data.creditHours),
        allowStandalone: data.allowStandalone,
        status: data.status,
        programCount: parseOptionalNonNegativeInt(data.programCount),
        standaloneTeacherCount: parseOptionalNonNegativeInt(data.standaloneTeacherCount),
        enrollmentCount: parseOptionalNonNegativeInt(data.enrollmentCount),
        createdAt: parseOptionalNullableString(data.createdAt),
        updatedAt: parseOptionalNullableString(data.updatedAt),
        updatedBy: parseAuditSummary(data.updatedBy),
    };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function formatCatalogOperationError(error: unknown, fallbackMessage: string): string {
    if (error instanceof ApiError) {
        if (error.statusCode === 409) {
            return error.message && error.message.trim() !== ''
                ? `Dependency conflict: ${error.message}`
                : 'Dependency conflict (HTTP 409): This record cannot be modified or deleted while referenced by dependent programs, courses, teacher assignments, or enrollments. Consider archiving instead.';
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

// ==================== PROGRAMS ====================

export async function listPrograms(
    query: ListProgramsQuery,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<ProgramListResponse> {
    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        'programs.read'
    );

    const params: Record<string, string | number> = {};
    if (query.page !== undefined) params.page = query.page;
    if (query.limit !== undefined) params.limit = query.limit;
    if (query.search !== undefined && query.search.trim() !== '') {
        params.search = query.search.trim();
    }
    if (query.programType !== undefined) params.programType = query.programType;
    if (query.status !== undefined) params.status = query.status;

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.ACADEMIC.PROGRAMS, {
            params,
            signal,
        });
        const { rawItems, pagination } = extractListResponse(
            response.data,
            ['programs', 'items'],
            query.page,
            query.limit
        );
        return {
            items: rawItems.map((item) => parseProgramRecord(item, cleanTenantId)),
            pagination,
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function getProgramById(
    programId: string,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<Program> {
    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        'programs.read'
    );
    const cleanId = programId.trim();
    if (!cleanId) {
        throw new ApiError('Program identifier is required.', 400);
    }

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.ACADEMIC.PROGRAM_BY_ID(cleanId),
            { signal }
        );
        const candidate = extractRecordCandidate(response.data, ['program']);
        return parseProgramRecord(candidate, cleanTenantId);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function createProgram(
    request: CreateProgramRequest,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<ProgramMutationResponse> {
    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        'programs.create'
    );

    try {
        const response = await apiClient.post<unknown>(API_ENDPOINTS.ACADEMIC.PROGRAMS, request);
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['program']);
        return {
            program: parseProgramRecord(candidate, cleanTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateProgram(
    programId: string,
    request: UpdateProgramRequest,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<ProgramMutationResponse> {
    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        'programs.update'
    );
    const cleanId = programId.trim();
    if (!cleanId) {
        throw new ApiError('Program identifier is required.', 400);
    }

    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.ACADEMIC.PROGRAM_BY_ID(cleanId),
            request
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['program']);
        return {
            program: parseProgramRecord(candidate, cleanTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateProgramStatus(
    programId: string,
    status: OfferingLifecycleStatus,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<ProgramMutationResponse> {
    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        'programs.update'
    );
    const cleanId = programId.trim();
    if (!cleanId) {
        throw new ApiError('Program identifier is required.', 400);
    }

    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.ACADEMIC.PROGRAM_STATUS(cleanId),
            { status }
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['program']);
        return {
            program: parseProgramRecord(candidate, cleanTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function deleteProgram(
    programId: string,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<DeleteCatalogRecordResponse> {
    assertCatalogActorAuthorized(actor, expectedTenantId, 'programs.delete');
    const cleanId = programId.trim();
    if (!cleanId) {
        throw new ApiError('Program identifier is required.', 400);
    }

    try {
        const response = await apiClient.delete<unknown>(
            API_ENDPOINTS.ACADEMIC.PROGRAM_BY_ID(cleanId)
        );
        return {
            deletedId: cleanId,
            ...(extractMessage(response.data) ? { message: extractMessage(response.data) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

// ==================== COURSES ====================

export async function listCourses(
    query: ListCoursesQuery,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<CourseListResponse> {
    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        'courses.read'
    );

    const params: Record<string, string | number | boolean> = {};
    if (query.page !== undefined) params.page = query.page;
    if (query.limit !== undefined) params.limit = query.limit;
    if (query.search !== undefined && query.search.trim() !== '') {
        params.search = query.search.trim();
    }
    if (query.allowStandalone !== undefined) params.allowStandalone = query.allowStandalone;
    if (query.status !== undefined) params.status = query.status;

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.ACADEMIC.COURSES, {
            params,
            signal,
        });
        const { rawItems, pagination } = extractListResponse(
            response.data,
            ['courses', 'items'],
            query.page,
            query.limit
        );
        return {
            items: rawItems.map((item) => parseCourseRecord(item, cleanTenantId)),
            pagination,
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function getCourseById(
    courseId: string,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<Course> {
    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        'courses.read'
    );
    const cleanId = courseId.trim();
    if (!cleanId) {
        throw new ApiError('Course identifier is required.', 400);
    }

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.ACADEMIC.COURSE_BY_ID(cleanId),
            { signal }
        );
        const candidate = extractRecordCandidate(response.data, ['course']);
        return parseCourseRecord(candidate, cleanTenantId);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function createCourse(
    request: CreateCourseRequest,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<CourseMutationResponse> {
    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        'courses.create'
    );

    try {
        const response = await apiClient.post<unknown>(API_ENDPOINTS.ACADEMIC.COURSES, request);
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['course']);
        return {
            course: parseCourseRecord(candidate, cleanTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateCourse(
    courseId: string,
    request: UpdateCourseRequest,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<CourseMutationResponse> {
    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        'courses.update'
    );
    const cleanId = courseId.trim();
    if (!cleanId) {
        throw new ApiError('Course identifier is required.', 400);
    }

    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.ACADEMIC.COURSE_BY_ID(cleanId),
            request
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['course']);
        return {
            course: parseCourseRecord(candidate, cleanTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateCourseStatus(
    courseId: string,
    status: OfferingLifecycleStatus,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<CourseMutationResponse> {
    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        'courses.update'
    );
    const cleanId = courseId.trim();
    if (!cleanId) {
        throw new ApiError('Course identifier is required.', 400);
    }

    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.ACADEMIC.COURSE_STATUS(cleanId),
            { status }
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['course']);
        return {
            course: parseCourseRecord(candidate, cleanTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function deleteCourse(
    courseId: string,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<DeleteCatalogRecordResponse> {
    assertCatalogActorAuthorized(actor, expectedTenantId, 'courses.delete');
    const cleanId = courseId.trim();
    if (!cleanId) {
        throw new ApiError('Course identifier is required.', 400);
    }

    try {
        const response = await apiClient.delete<unknown>(
            API_ENDPOINTS.ACADEMIC.COURSE_BY_ID(cleanId)
        );
        return {
            deletedId: cleanId,
            ...(extractMessage(response.data) ? { message: extractMessage(response.data) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

// ==================== PROGRAM CURRICULUM (PROGRAM <-> COURSE) ====================

function parseProgramCourseRecord(
    data: unknown,
    expectedTenantId: string,
    expectedProgramId?: string
): ProgramCourse {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend program-course payload.', 502);
    }
    assertNoExposedSensitiveFields(data, 'ProgramCourse');

    const id = parseRequiredString(data.id, 'programCourse.id');
    const tenantId = parseRequiredString(data.tenantId, 'programCourse.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'program curriculum record');

    const programId = parseRequiredString(data.programId, 'programCourse.programId');
    if (expectedProgramId && programId !== expectedProgramId) {
        throw new ApiError(
            'Security violation: Program curriculum entry belongs to a different program.',
            502
        );
    }

    const courseId = parseRequiredString(data.courseId, 'programCourse.courseId');

    const embeddedCourse = isPlainObject(data.course) ? data.course : null;
    if (embeddedCourse) {
        assertNoExposedSensitiveFields(embeddedCourse, 'Embedded course');
    }

    const courseTitle = parseRequiredString(
        data.courseTitle ?? embeddedCourse?.title,
        'programCourse.courseTitle'
    );
    const courseCode = parseOptionalNullableString(data.courseCode ?? embeddedCourse?.code);

    const rawCourseStatus = data.courseStatus ?? embeddedCourse?.status;
    const courseStatus = isOfferingLifecycleStatus(rawCourseStatus)
        ? rawCourseStatus
        : undefined;

    const rawAllowStandalone = data.allowStandalone ?? embeddedCourse?.allowStandalone;
    const allowStandalone =
        typeof rawAllowStandalone === 'boolean' ? rawAllowStandalone : undefined;

    if (typeof data.isRequired !== 'boolean') {
        throw new ApiError(
            'Invalid backend program-course payload: missing boolean isRequired.',
            502
        );
    }

    if (
        typeof data.displayOrder !== 'number' ||
        !Number.isInteger(data.displayOrder) ||
        data.displayOrder < 1
    ) {
        throw new ApiError(
            'Invalid backend program-course payload: displayOrder must be a positive integer.',
            502
        );
    }

    return {
        id,
        tenantId,
        programId,
        courseId,
        courseTitle,
        courseCode,
        ...(courseStatus !== undefined ? { courseStatus } : {}),
        ...(allowStandalone !== undefined ? { allowStandalone } : {}),
        isRequired: data.isRequired,
        displayOrder: data.displayOrder,
        notes: parseOptionalNullableString(data.notes),
        assignedTeachersCount: parseOptionalNonNegativeInt(data.assignedTeachersCount),
        createdAt: parseOptionalNullableString(data.createdAt),
        updatedAt: parseOptionalNullableString(data.updatedAt),
    };
}

export async function listProgramCourses(
    programId: string,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<ProgramCourseListResponse> {
    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        'programs.read'
    );
    const cleanProgramId = programId.trim();
    if (!cleanProgramId) {
        throw new ApiError('Program identifier is required.', 400);
    }

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.ACADEMIC.PROGRAM_COURSES(cleanProgramId),
            { signal }
        );
        const { rawItems } = extractListResponse(response.data, [
            'programCourses',
            'courses',
            'items',
        ]);
        const parsed = rawItems.map((item) =>
            parseProgramCourseRecord(item, cleanTenantId, cleanProgramId)
        );
        return {
            items: sortProgramCourses(parsed),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function addCourseToProgram(
    programId: string,
    request: AddProgramCourseRequest,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<ProgramCourseMutationResponse> {
    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        'programs.assign_courses'
    );
    const cleanProgramId = programId.trim();
    if (!cleanProgramId) {
        throw new ApiError('Program identifier is required.', 400);
    }
    if (!request.courseId || request.courseId.trim() === '') {
        throw new ApiError('Course identifier is required.', 400);
    }

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.ACADEMIC.PROGRAM_COURSES(cleanProgramId),
            request
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['programCourse', 'item']);
        return {
            programCourse: parseProgramCourseRecord(candidate, cleanTenantId, cleanProgramId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateProgramCourse(
    programId: string,
    programCourseId: string,
    request: UpdateProgramCourseRequest,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<ProgramCourseMutationResponse> {
    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        'programs.assign_courses'
    );
    const cleanProgramId = programId.trim();
    const cleanMembershipId = programCourseId.trim();
    if (!cleanProgramId || !cleanMembershipId) {
        throw new ApiError('Program and curriculum item identifiers are required.', 400);
    }

    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.ACADEMIC.PROGRAM_COURSE_BY_ID(cleanProgramId, cleanMembershipId),
            request
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['programCourse', 'item']);
        return {
            programCourse: parseProgramCourseRecord(candidate, cleanTenantId, cleanProgramId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function reorderProgramCourses(
    programId: string,
    orderedProgramCourseIds: readonly string[],
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<ProgramCourseListResponse & { message?: string }> {
    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        'programs.assign_courses'
    );
    const cleanProgramId = programId.trim();
    if (!cleanProgramId) {
        throw new ApiError('Program identifier is required.', 400);
    }
    if (
        orderedProgramCourseIds.length < 2 ||
        new Set(orderedProgramCourseIds).size !== orderedProgramCourseIds.length
    ) {
        throw new ApiError('Invalid curriculum order list.', 400);
    }

    const requestBody: ReorderProgramCoursesRequest = {
        orderedProgramCourseIds: [...orderedProgramCourseIds],
    };

    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.ACADEMIC.PROGRAM_COURSES_REORDER(cleanProgramId),
            requestBody
        );
        const payload = response.data;
        const { rawItems } = extractListResponse(payload, ['programCourses', 'courses', 'items']);
        const parsed = rawItems.map((item) =>
            parseProgramCourseRecord(item, cleanTenantId, cleanProgramId)
        );
        return {
            items: sortProgramCourses(parsed),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function removeCourseFromProgram(
    programId: string,
    programCourseId: string,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<RemoveProgramCourseResponse> {
    assertCatalogActorAuthorized(actor, expectedTenantId, 'programs.assign_courses');
    const cleanProgramId = programId.trim();
    const cleanMembershipId = programCourseId.trim();
    if (!cleanProgramId || !cleanMembershipId) {
        throw new ApiError('Program and curriculum item identifiers are required.', 400);
    }

    try {
        const response = await apiClient.delete<unknown>(
            API_ENDPOINTS.ACADEMIC.PROGRAM_COURSE_BY_ID(cleanProgramId, cleanMembershipId)
        );
        return {
            removedId: cleanMembershipId,
            ...(extractMessage(response.data) ? { message: extractMessage(response.data) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

const VALID_SCHOOL_ROLES: ReadonlySet<SchoolRole> = new Set([
    'SCHOOL_ADMIN',
    'TEACHER',
    'STUDENT',
    'SCHOOL_ACCOUNTANT',
]);

function parseAssignableTeacherRecord(
    data: unknown,
    expectedTenantId: string
): AssignableTeacher | null {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid assignable teacher payload.', 502);
    }
    assertNoExposedSensitiveFields(data, 'Assignable teacher');

    const id = parseRequiredString(data.id, 'assignableTeacher.id');
    const tenantId = parseRequiredString(data.tenantId, 'assignableTeacher.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'assignableTeacher');

    const firstName = parseRequiredString(data.firstName, 'assignableTeacher.firstName');
    const lastName = parseRequiredString(data.lastName, 'assignableTeacher.lastName');
    const email = parseRequiredString(data.email, 'assignableTeacher.email');

    const rawRoles = Array.isArray(data.roles) ? data.roles : [];
    const roles = rawRoles.filter(
        (role): role is SchoolRole =>
            typeof role === 'string' && VALID_SCHOOL_ROLES.has(role as SchoolRole)
    );

    const status = typeof data.status === 'string' ? data.status.trim().toUpperCase() : '';

    // Strictly admit only verified ACTIVE accounts carrying the TEACHER role
    // (preserving multi-role SCHOOL_ADMIN + TEACHER accounts).
    if (status !== 'ACTIVE' || !roles.includes('TEACHER')) {
        return null;
    }

    return {
        id,
        tenantId,
        firstName,
        lastName,
        email,
        department: parseOptionalNullableString(data.department),
        roles,
        status: 'ACTIVE',
    };
}

function parseTeacherCourseAssignmentRecord(
    data: unknown,
    expectedTenantId: string,
    expectedScope?: TeacherAssignmentScope,
    expectedProgramId?: string,
    expectedCourseId?: string
): TeacherCourseAssignment {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend teacher assignment payload.', 502);
    }
    assertNoExposedSensitiveFields(data, 'Teacher assignment');

    const id = parseRequiredString(data.id, 'assignment.id');
    const tenantId = parseRequiredString(data.tenantId, 'assignment.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'teacher assignment');

    if (!isTeacherAssignmentScope(data.scope)) {
        throw new ApiError(
            'Invalid backend teacher assignment payload: unrecognized scope.',
            502
        );
    }
    if (expectedScope && data.scope !== expectedScope) {
        throw new ApiError(
            `Contract violation: Expected '${expectedScope}' teacher assignment scope.`,
            502
        );
    }

    const courseId = parseRequiredString(data.courseId, 'assignment.courseId');
    if (expectedCourseId && courseId !== expectedCourseId) {
        throw new ApiError(
            'Security violation: Teacher assignment belongs to a different course.',
            502
        );
    }
    const courseTitle = parseRequiredString(data.courseTitle, 'assignment.courseTitle');
    const teacherId = parseRequiredString(data.teacherId, 'assignment.teacherId');
    const teacherName = parseRequiredString(data.teacherName, 'assignment.teacherName');

    const programCourseId = parseOptionalNullableString(data.programCourseId) ?? null;
    const programId = parseOptionalNullableString(data.programId) ?? null;
    if (expectedProgramId && programId !== expectedProgramId) {
        throw new ApiError(
            'Security violation: Teacher assignment belongs to a different program.',
            502
        );
    }
    const academicYearId = parseOptionalNullableString(data.academicYearId) ?? null;
    const termId = parseOptionalNullableString(data.termId) ?? null;
    const sectionId = parseOptionalNullableString(data.sectionId) ?? null;

    const rawProgramType = data.programType;
    const programType =
        rawProgramType === undefined || rawProgramType === null
            ? null
            : isProgramType(rawProgramType)
              ? rawProgramType
              : (() => {
                    throw new ApiError(
                        'Invalid backend teacher assignment payload: unrecognized programType.',
                        502
                    );
                })();

    if (data.scope === 'PROGRAM_COURSE') {
        if (!programCourseId || !programId) {
            throw new ApiError(
                'Contract violation: PROGRAM_COURSE teacher assignment requires programId and programCourseId.',
                502
            );
        }
        if (programType === 'SKILL_BASED' && sectionId) {
            throw new ApiError(
                'Contract violation: SKILL_BASED Program teacher assignment must not bind a Grade Section.',
                502
            );
        }
    } else {
        if (programId || programCourseId || sectionId) {
            throw new ApiError(
                'Contract violation: STANDALONE_COURSE teacher assignment must not bind Program, ProgramCourse, or Section.',
                502
            );
        }
    }

    if (termId && !academicYearId) {
        throw new ApiError(
            'Contract violation: Term-scoped teacher assignment must also include academicYearId.',
            502
        );
    }

    return {
        id,
        tenantId,
        scope: data.scope,
        programCourseId,
        programId,
        programName: parseOptionalNullableString(data.programName) ?? null,
        programType,
        courseId,
        courseTitle,
        courseCode: parseOptionalNullableString(data.courseCode) ?? null,
        teacherId,
        teacherName,
        teacherEmail: parseOptionalNullableString(data.teacherEmail) ?? null,
        teacherDepartment: parseOptionalNullableString(data.teacherDepartment) ?? null,
        academicYearId,
        academicYearName: parseOptionalNullableString(data.academicYearName) ?? null,
        termId,
        termName: parseOptionalNullableString(data.termName) ?? null,
        sectionId,
        sectionName: parseOptionalNullableString(data.sectionName) ?? null,
        isPrimaryInstructor:
            typeof data.isPrimaryInstructor === 'boolean' ? data.isPrimaryInstructor : undefined,
        createdAt: parseOptionalNullableString(data.createdAt),
        updatedAt: parseOptionalNullableString(data.updatedAt),
        assignedBy: parseAuditSummary(data.assignedBy),
    };
}

/**
 * Queries the dedicated lightweight `/academic/assignable-teachers` lookup endpoint
 * returning minimal verified ACTIVE accounts carrying the TEACHER role.
 * Never depends on `teachers.read` and never falls back to full staff endpoints.
 */
export async function listAssignableTeachers(
    query: AssignableTeachersQuery,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<AssignableTeacherListResponse> {
    const cleanTenantId = assertCatalogActorAuthorizedAny(actor, expectedTenantId, [
        PERMISSIONS.PROGRAMS.ASSIGN_TEACHERS,
        PERMISSIONS.COURSES.ASSIGN_TEACHERS,
    ]);

    const params: Record<string, string | number> = {};
    if (query.search && query.search.trim() !== '') {
        params.search = query.search.trim();
    }
    if (typeof query.page === 'number' && query.page >= 1) {
        params.page = query.page;
    }
    if (typeof query.limit === 'number' && query.limit >= 1) {
        params.limit = query.limit;
    }

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.ACADEMIC.ASSIGNABLE_TEACHERS,
            {
                params,
                signal,
            }
        );
        const { rawItems, pagination } = extractListResponse(
            response.data,
            ['teachers', 'assignableTeachers', 'items'],
            query.page ?? 1,
            query.limit ?? 20
        );
        const items = rawItems
            .map((item) => parseAssignableTeacherRecord(item, cleanTenantId))
            .filter((item): item is AssignableTeacher => item !== null);
        return {
            items,
            pagination,
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function listTeacherAssignments(
    query: ListTeacherAssignmentsQuery,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<TeacherAssignmentListResponse> {
    const requiredPermissions =
        query.scope === 'PROGRAM_COURSE'
            ? [PERMISSIONS.PROGRAMS.READ, PERMISSIONS.PROGRAMS.ASSIGN_TEACHERS]
            : query.scope === 'STANDALONE_COURSE'
              ? [PERMISSIONS.COURSES.READ, PERMISSIONS.COURSES.ASSIGN_TEACHERS]
              : [
                    PERMISSIONS.PROGRAMS.READ,
                    PERMISSIONS.PROGRAMS.ASSIGN_TEACHERS,
                    PERMISSIONS.COURSES.READ,
                    PERMISSIONS.COURSES.ASSIGN_TEACHERS,
                ];

    const cleanTenantId = assertCatalogActorAuthorizedAny(
        actor,
        expectedTenantId,
        requiredPermissions
    );

    const params: Record<string, string> = {};
    if (query.scope) params.scope = query.scope;
    if (query.programId?.trim()) params.programId = query.programId.trim();
    if (query.programCourseId?.trim()) params.programCourseId = query.programCourseId.trim();
    if (query.courseId?.trim()) params.courseId = query.courseId.trim();
    if (query.teacherId?.trim()) params.teacherId = query.teacherId.trim();
    if (query.academicYearId?.trim()) params.academicYearId = query.academicYearId.trim();
    if (query.termId?.trim()) params.termId = query.termId.trim();
    if (query.sectionId?.trim()) params.sectionId = query.sectionId.trim();

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.ACADEMIC.TEACHER_ASSIGNMENTS,
            {
                params,
                signal,
            }
        );
        const { rawItems } = extractListResponse(response.data, [
            'assignments',
            'teacherAssignments',
            'items',
        ]);
        const items = rawItems.map((item) =>
            parseTeacherCourseAssignmentRecord(
                item,
                cleanTenantId,
                query.scope,
                query.programId?.trim(),
                query.courseId?.trim()
            )
        );
        return { items };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function createTeacherAssignment(
    request: CreateTeacherAssignmentRequest,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    context?: {
        program?: Program | null;
        course?: Pick<Course, 'id' | 'allowStandalone'> | null;
    }
): Promise<TeacherAssignmentMutationResponse> {
    const requiredPermission =
        request.scope === 'PROGRAM_COURSE'
            ? PERMISSIONS.PROGRAMS.ASSIGN_TEACHERS
            : PERMISSIONS.COURSES.ASSIGN_TEACHERS;

    const cleanTenantId = assertCatalogActorAuthorized(
        actor,
        expectedTenantId,
        requiredPermission
    );

    if (!request.courseId?.trim() || !request.teacherId?.trim()) {
        throw new ApiError('Course and Teacher identifiers are required.', 400);
    }

    if (request.scope === 'STANDALONE_COURSE') {
        if (context?.course && !context.course.allowStandalone) {
            throw new ApiError(
                'Standalone teacher assignment denied: Course has allowStandalone set to false.',
                400
            );
        }
        if (request.programId || request.programCourseId || request.sectionId) {
            throw new ApiError(
                'Invalid standalone assignment payload: Program and Section must be omitted.',
                400
            );
        }
    } else {
        if (!request.programId?.trim() || !request.programCourseId?.trim()) {
            throw new ApiError(
                'Program and Program-Course identifiers are required for Program teacher assignments.',
                400
            );
        }
        if (context?.program?.programType === 'GRADE_BASED' && !request.academicYearId?.trim()) {
            throw new ApiError(
                'Academic Year is required for Grade-based Program teacher assignments.',
                400
            );
        }
        if (context?.program?.programType === 'SKILL_BASED' && request.sectionId?.trim()) {
            throw new ApiError(
                'Skill-based Program teacher assignments cannot be scoped to a Grade Section.',
                400
            );
        }
    }

    if (request.termId?.trim() && !request.academicYearId?.trim()) {
        throw new ApiError(
            'Academic Year is required when selecting a Term for a teacher assignment.',
            400
        );
    }

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.ACADEMIC.TEACHER_ASSIGNMENTS,
            request
        );
        const candidate = extractRecordCandidate(response.data, [
            'assignment',
            'teacherAssignment',
            'data',
        ]);
        const assignment = parseTeacherCourseAssignmentRecord(
            candidate,
            cleanTenantId,
            request.scope
        );
        return {
            assignment,
            ...(extractMessage(response.data) ? { message: extractMessage(response.data) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function deleteTeacherAssignment(
    assignmentId: string,
    scope: TeacherAssignmentScope,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<DeleteTeacherAssignmentResponse> {
    const requiredPermission =
        scope === 'PROGRAM_COURSE'
            ? PERMISSIONS.PROGRAMS.ASSIGN_TEACHERS
            : PERMISSIONS.COURSES.ASSIGN_TEACHERS;

    assertCatalogActorAuthorized(actor, expectedTenantId, requiredPermission);

    const cleanAssignmentId = assignmentId.trim();
    if (!cleanAssignmentId) {
        throw new ApiError('Teacher assignment identifier is required.', 400);
    }

    try {
        const response = await apiClient.delete<unknown>(
            API_ENDPOINTS.ACADEMIC.TEACHER_ASSIGNMENT_BY_ID(cleanAssignmentId)
        );
        return {
            removedId: cleanAssignmentId,
            ...(extractMessage(response.data) ? { message: extractMessage(response.data) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}


