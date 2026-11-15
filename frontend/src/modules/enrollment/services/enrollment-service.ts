import { PERMISSIONS } from '../../../constants/permissions';
import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import type { PaginationMeta } from '../../../types/api.types';
import type { AuthenticatedUser } from '../../../types/auth';
import { hasAnyPermission, hasPermission } from '../../../utils/authorization';
import { isAcademicCalendarStatus } from '../../academic/schemas/academic-structure-schema';
import {
    isAcademicBackendUnavailableError,
    listAcademicYears,
    listSections,
} from '../../academic/services/academic-structure-service';
import type {
    AcademicCalendarStatus,
    AcademicSection,
    AcademicYear,
} from '../../academic/types/academic-structure.types';
import {
    listCourses,
    listPrograms,
} from '../../programs-courses/services/programs-courses-service';
import type {
    Course,
    Program,
    ProgramType,
} from '../../programs-courses/types/programs-courses.types';
import { isStudentEligibleForEnrollment } from '../../students/schemas/student-management-schema';
import type { StudentDirectoryItem } from '../../students/types/student-management.types';
import {
    evaluateEnrollmentLifecycleEligibility,
    evaluateProgramChangeDecisionEligibility,
    evaluateProgramChangeRequestEligibility,
    evaluateSectionTransferEligibility,
    isAcademicYearClosedForEnrollmentMutation,
    isAcademicYearEligibleForGradeEnrollment,
    isEnrollmentLifecycleStatus,
    isEnrollmentType,
    isProgramChangeRequestStatus,
} from '../schemas/enrollment-schema';
import type {
    CreateProgramChangeRequestDto,
    CreateProgramChangeResponse,
    CreateProgramEnrollmentRequest,
    CreateStandaloneCourseEnrollmentRequest,
    CreateStudentEnrollmentResponse,
    EnrollmentAuditSummary,
    EnrollmentHistoryResponse,
    EnrollmentSectionTransferRecord,
    EnrollmentStatusUpdateRequest,
    EnrollmentStatusUpdateResponse,
    ListProgramChangeRequestsQuery,
    ProgramChangeDecisionRequest,
    ProgramChangeDecisionResponse,
    ProgramChangeRequestListResponse,
    ProgramChangeRequestRecord,
    ProgramChangeStudentSummary,
    SectionTransferRequest,
    SectionTransferResponse,
    StudentEnrollmentListResponse,
    StudentEnrollmentRecord,
} from '../types/enrollment.types';

/**
 * Backend Security & Integrity Requirements (for server implementation outside this step):
 * 1. PostgreSQL RLS: Enforce tenant_id isolation on student_enrollments,
 *    enrollment_section_transfers, enrollment_program_change_requests, and joined student,
 *    program, course, academic_year, academic_class, and section tables.
 * 2. Tenant-aware foreign keys: Composite (tenant_id, id) foreign keys across tenantId,
 *    studentId, programId, courseId, academicYearId, academicClassId, sectionId,
 *    sourceEnrollmentId, and targetEnrollmentId so cross-tenant links fail at the DB layer.
 * 3. Unique constraints & partial indexes:
 *    - Grade-based Program: Unique active enrollment per (tenant_id, student_id, academic_year_id)
 *      WHERE enrollment_type = 'GRADE_BASED_PROGRAM' AND status = 'ACTIVE' (strictly enforces
 *      one ACTIVE grade-based Program per student per Academic Year), plus unique non-withdrawn
 *      constraint per (tenant_id, student_id, program_id, academic_year_id).
 *    - Program Change Request: Unique pending request per (tenant_id, student_id, academic_year_id)
 *      WHERE status = 'PENDING' (strictly enforces max one PENDING request per student/year).
 *    - Skill-based Program: Unique open enrollment per (tenant_id, student_id, program_id)
 *      WHERE enrollment_type = 'SKILL_BASED_PROGRAM' AND status IN ('PENDING','ACTIVE','SUSPENDED').
 *    - Standalone Course: Unique open enrollment per (tenant_id, student_id, course_id)
 *      WHERE enrollment_type = 'STANDALONE_COURSE' AND status IN ('PENDING','ACTIVE','SUSPENDED').
 * 4. Transactional enforcement:
 *    - Creation: Lock student's scope rows, verify account ACTIVE + STUDENT role, Program/Course
 *      ACTIVE, allowStandalone === true, AcademicYear IN ('ACTIVE','PLANNED'), Program Class & Section match.
 *    - Section Transfer: Lock enrollment row, confirm ACTIVE GRADE_BASED_PROGRAM, non-closed Year,
 *      ACTIVE target Section in same academicClassId !== current sectionId, update sectionId in-place,
 *      and append immutable enrollment_section_transfers audit row.
 *    - Program Change Decision (APPROVE): Lock request + student's year enrollments; block
 *      self-approval (requested_by_id <> actor_id); verify Year ACTIVE/PLANNED; atomically move
 *      old ACTIVE -> WITHDRAWN and insert new ACTIVE enrollment linked via replaces_enrollment_id.
 * 5. Server-side authorization & separation: Enforce enrollments.read / enrollments.create /
 *    enrollments.update / enrollments.cancel / enrollments.approve_program_change independently.
 *    Never permanently delete enrollment records, block mutations on COMPLETED/ARCHIVED Academic Years,
 *    never trust client tenantId claims, and keep payment verification decoupled from enrollment status.
 */

export const isEnrollmentBackendUnavailableError = isAcademicBackendUnavailableError;

const FORBIDDEN_ENROLLMENT_SECRET_KEYS = [
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

const CATALOG_PAGE_LIMIT = 100;
const CATALOG_MAX_PAGES = 10;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoExposedSensitiveFields(obj: Record<string, unknown>, context: string): void {
    for (const key of FORBIDDEN_ENROLLMENT_SECRET_KEYS) {
        if (key in obj && obj[key] !== undefined && obj[key] !== null) {
            throw new ApiError(
                `Security violation: ${context} response exposed sensitive credential metadata.`,
                502
            );
        }
    }
}

function assertEnrollmentActorAuthorizedAny(
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

function assertEnrollmentActorAuthorized(
    actor: AuthenticatedUser | null,
    expectedTenantId: string | null | undefined,
    requiredPermission: string
): string {
    return assertEnrollmentActorAuthorizedAny(actor, expectedTenantId, [requiredPermission]);
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

function assertMatchingStudentId(actualStudentId: string, expectedStudentId: string): void {
    if (actualStudentId !== expectedStudentId) {
        throw new ApiError(
            'Security violation: Enrollment response studentId does not match the requested student.',
            502
        );
    }
}

function parseRequiredString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new ApiError(`Invalid backend enrollment payload: missing '${fieldName}'.`, 502);
    }
    return value.trim();
}

function parseOptionalNullableString(value: unknown, fieldName: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(
            `Invalid backend enrollment payload: '${fieldName}' must be a string or null.`,
            502
        );
    }
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function parseOptionalProgramType(raw: unknown): ProgramType | null | undefined {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    if (raw === 'GRADE_BASED' || raw === 'SKILL_BASED') return raw;
    throw new ApiError('Invalid backend enrollment payload: unrecognized programType.', 502);
}

function parseAuditSummary(raw: unknown): EnrollmentAuditSummary | null | undefined {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    if (!isPlainObject(raw) || typeof raw.id !== 'string' || raw.id.trim() === '') {
        return undefined;
    }
    assertNoExposedSensitiveFields(raw, 'Enrollment audit summary');
    return {
        id: raw.id.trim(),
        name: parseOptionalNullableString(raw.name, 'createdBy.name'),
        email: parseOptionalNullableString(raw.email, 'createdBy.email'),
    };
}

function parsePaginationMeta(
    raw: unknown,
    fallbackTotal: number,
    fallbackPage = 1,
    fallbackLimit = 50
): PaginationMeta | undefined {
    if (!isPlainObject(raw)) return undefined;
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

function parseStudentEnrollmentRecord(
    raw: unknown,
    expectedTenantId: string,
    expectedStudentId: string
): StudentEnrollmentRecord {
    if (!isPlainObject(raw)) {
        throw new ApiError('Invalid backend enrollment payload.', 502);
    }
    assertNoExposedSensitiveFields(raw, 'Student enrollment');

    const id = parseRequiredString(raw.id, 'enrollment.id');
    const tenantId = parseRequiredString(raw.tenantId, 'enrollment.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'enrollment');

    const studentId = parseRequiredString(raw.studentId, 'enrollment.studentId');
    assertMatchingStudentId(studentId, expectedStudentId);

    if (!isEnrollmentType(raw.enrollmentType)) {
        throw new ApiError(
            'Invalid backend enrollment payload: unrecognized enrollmentType.',
            502
        );
    }
    if (!isEnrollmentLifecycleStatus(raw.status)) {
        throw new ApiError(
            'Invalid backend enrollment payload: unrecognized enrollment status.',
            502
        );
    }

    const programId = parseOptionalNullableString(raw.programId, 'enrollment.programId');
    const programName = parseOptionalNullableString(raw.programName, 'enrollment.programName');
    const programCode = parseOptionalNullableString(raw.programCode, 'enrollment.programCode');
    const programType = parseOptionalProgramType(raw.programType);

    const academicYearId = parseOptionalNullableString(
        raw.academicYearId,
        'enrollment.academicYearId'
    );
    const academicYearName = parseOptionalNullableString(
        raw.academicYearName,
        'enrollment.academicYearName'
    );
    let academicYearStatus: AcademicCalendarStatus | null | undefined;
    if (raw.academicYearStatus === undefined || raw.academicYearStatus === null) {
        academicYearStatus = raw.academicYearStatus;
    } else if (isAcademicCalendarStatus(raw.academicYearStatus)) {
        academicYearStatus = raw.academicYearStatus;
    } else {
        throw new ApiError(
            'Invalid backend enrollment payload: unrecognized academicYearStatus.',
            502
        );
    }
    const academicClassId = parseOptionalNullableString(
        raw.academicClassId,
        'enrollment.academicClassId'
    );
    const academicClassName = parseOptionalNullableString(
        raw.academicClassName,
        'enrollment.academicClassName'
    );
    const sectionId = parseOptionalNullableString(raw.sectionId, 'enrollment.sectionId');
    const sectionName = parseOptionalNullableString(raw.sectionName, 'enrollment.sectionName');

    const courseId = parseOptionalNullableString(raw.courseId, 'enrollment.courseId');
    const courseTitle = parseOptionalNullableString(raw.courseTitle, 'enrollment.courseTitle');
    const courseCode = parseOptionalNullableString(raw.courseCode, 'enrollment.courseCode');
    const allowStandalone =
        typeof raw.allowStandalone === 'boolean' ? raw.allowStandalone : undefined;

    if (raw.enrollmentType === 'GRADE_BASED_PROGRAM') {
        if (!programId || !academicYearId || !academicClassId) {
            throw new ApiError(
                'Contract violation: Grade-Based Program enrollment requires programId, academicYearId, and academicClassId.',
                502
            );
        }
        if (programType === 'SKILL_BASED') {
            throw new ApiError(
                'Contract violation: GRADE_BASED_PROGRAM enrollment cannot reference a SKILL_BASED programType.',
                502
            );
        }
        if (courseId) {
            throw new ApiError(
                'Contract violation: Program enrollment cannot carry standalone courseId.',
                502
            );
        }
    } else if (raw.enrollmentType === 'SKILL_BASED_PROGRAM') {
        if (!programId) {
            throw new ApiError(
                'Contract violation: Skill-Based Program enrollment requires programId.',
                502
            );
        }
        if (programType === 'GRADE_BASED') {
            throw new ApiError(
                'Contract violation: SKILL_BASED_PROGRAM enrollment cannot reference a GRADE_BASED programType.',
                502
            );
        }
        if (academicYearId || academicClassId || sectionId || courseId) {
            throw new ApiError(
                'Contract violation: Skill-Based Program enrollment must not include Academic Year, Class, Section, or Course bindings.',
                502
            );
        }
    } else {
        // STANDALONE_COURSE
        if (!courseId) {
            throw new ApiError(
                'Contract violation: Standalone Course enrollment requires courseId.',
                502
            );
        }
        if (allowStandalone === false) {
            throw new ApiError(
                'Contract violation: Standalone Course enrollment returned allowStandalone = false.',
                502
            );
        }
        if (
            programId ||
            ('programCourseId' in raw &&
                raw.programCourseId !== undefined &&
                raw.programCourseId !== null)
        ) {
            throw new ApiError(
                'Contract violation: Standalone Course enrollment must remain independent of Program and ProgramCourse membership.',
                502
            );
        }
    }

    return {
        id,
        tenantId,
        studentId,
        enrollmentType: raw.enrollmentType,
        status: raw.status,
        programId: programId ?? null,
        programName: programName ?? null,
        programCode: programCode ?? null,
        programType: programType ?? null,
        academicYearId: academicYearId ?? null,
        academicYearName: academicYearName ?? null,
        academicYearStatus: academicYearStatus ?? null,
        academicClassId: academicClassId ?? null,
        academicClassName: academicClassName ?? null,
        sectionId: sectionId ?? null,
        sectionName: sectionName ?? null,
        courseId: courseId ?? null,
        courseTitle: courseTitle ?? null,
        courseCode: courseCode ?? null,
        ...(allowStandalone !== undefined ? { allowStandalone } : {}),
        enrolledAt: parseOptionalNullableString(raw.enrolledAt, 'enrollment.enrolledAt') ?? null,
        createdAt: parseOptionalNullableString(raw.createdAt, 'enrollment.createdAt') ?? null,
        updatedAt: parseOptionalNullableString(raw.updatedAt, 'enrollment.updatedAt') ?? null,
        createdBy: parseAuditSummary(raw.createdBy),
        updatedBy: parseAuditSummary(raw.updatedBy),
        approvedAt: parseOptionalNullableString(raw.approvedAt, 'enrollment.approvedAt') ?? null,
        approvedBy: parseAuditSummary(raw.approvedBy),
        suspendedAt:
            parseOptionalNullableString(raw.suspendedAt, 'enrollment.suspendedAt') ?? null,
        suspendedBy: parseAuditSummary(raw.suspendedBy),
        suspendedReason:
            parseOptionalNullableString(raw.suspendedReason, 'enrollment.suspendedReason') ??
            null,
        completedAt:
            parseOptionalNullableString(raw.completedAt, 'enrollment.completedAt') ?? null,
        completedBy: parseAuditSummary(raw.completedBy),
        completionNote:
            parseOptionalNullableString(raw.completionNote, 'enrollment.completionNote') ?? null,
        withdrawnAt:
            parseOptionalNullableString(raw.withdrawnAt, 'enrollment.withdrawnAt') ?? null,
        withdrawnBy: parseAuditSummary(raw.withdrawnBy),
        withdrawnReason:
            parseOptionalNullableString(raw.withdrawnReason, 'enrollment.withdrawnReason') ??
            null,
        rejectedAt: parseOptionalNullableString(raw.rejectedAt, 'enrollment.rejectedAt') ?? null,
        rejectedBy: parseAuditSummary(raw.rejectedBy),
        rejectionReason:
            parseOptionalNullableString(raw.rejectionReason, 'enrollment.rejectionReason') ??
            null,
        replacesEnrollmentId:
            parseOptionalNullableString(
                raw.replacesEnrollmentId,
                'enrollment.replacesEnrollmentId'
            ) ?? null,
        replacedByEnrollmentId:
            parseOptionalNullableString(
                raw.replacedByEnrollmentId,
                'enrollment.replacedByEnrollmentId'
            ) ?? null,
        notes: parseOptionalNullableString(raw.notes, 'enrollment.notes') ?? null,
    };
}

function parseRequiredAuditSummary(
    raw: unknown,
    fieldName: string
): EnrollmentAuditSummary {
    const parsed = parseAuditSummary(raw);
    if (!parsed) {
        throw new ApiError(`Invalid backend enrollment payload: missing '${fieldName}'.`, 502);
    }
    return parsed;
}

function parseOptionalStudentSummary(
    raw: unknown
): ProgramChangeStudentSummary | null | undefined {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    if (!isPlainObject(raw)) {
        throw new ApiError('Invalid backend program change payload: malformed student.', 502);
    }
    assertNoExposedSensitiveFields(raw, 'Program change student summary');
    return {
        id: parseRequiredString(raw.id, 'student.id'),
        firstName: parseRequiredString(raw.firstName, 'student.firstName'),
        lastName: parseRequiredString(raw.lastName, 'student.lastName'),
        email: parseRequiredString(raw.email, 'student.email'),
        studentCode: parseOptionalNullableString(raw.studentCode, 'student.studentCode') ?? null,
    };
}

function parseSectionTransferRecord(
    raw: unknown,
    expectedTenantId: string,
    expectedStudentId?: string,
    expectedEnrollmentId?: string
): EnrollmentSectionTransferRecord {
    if (!isPlainObject(raw)) {
        throw new ApiError('Invalid backend section transfer payload.', 502);
    }
    assertNoExposedSensitiveFields(raw, 'Section transfer');

    const id = parseRequiredString(raw.id, 'transfer.id');
    const tenantId = parseRequiredString(raw.tenantId, 'transfer.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'section transfer');

    const enrollmentId = parseRequiredString(raw.enrollmentId, 'transfer.enrollmentId');
    if (expectedEnrollmentId && enrollmentId !== expectedEnrollmentId) {
        throw new ApiError(
            'Security violation: Section transfer enrollmentId mismatch.',
            502
        );
    }

    const studentId = parseRequiredString(raw.studentId, 'transfer.studentId');
    if (expectedStudentId) {
        assertMatchingStudentId(studentId, expectedStudentId);
    }

    return {
        id,
        tenantId,
        enrollmentId,
        studentId,
        programId: parseRequiredString(raw.programId, 'transfer.programId'),
        academicYearId: parseRequiredString(raw.academicYearId, 'transfer.academicYearId'),
        academicClassId: parseRequiredString(raw.academicClassId, 'transfer.academicClassId'),
        fromSectionId:
            parseOptionalNullableString(raw.fromSectionId, 'transfer.fromSectionId') ?? null,
        fromSectionName:
            parseOptionalNullableString(raw.fromSectionName, 'transfer.fromSectionName') ?? null,
        toSectionId: parseRequiredString(raw.toSectionId, 'transfer.toSectionId'),
        toSectionName:
            parseOptionalNullableString(raw.toSectionName, 'transfer.toSectionName') ?? null,
        reason: parseRequiredString(raw.reason, 'transfer.reason'),
        transferredBy: parseRequiredAuditSummary(raw.transferredBy, 'transfer.transferredBy'),
        transferredAt: parseRequiredString(raw.transferredAt, 'transfer.transferredAt'),
    };
}

function parseProgramChangeRequestRecord(
    raw: unknown,
    expectedTenantId: string,
    expectedStudentId?: string
): ProgramChangeRequestRecord {
    if (!isPlainObject(raw)) {
        throw new ApiError('Invalid backend program change request payload.', 502);
    }
    assertNoExposedSensitiveFields(raw, 'Program change request');

    const id = parseRequiredString(raw.id, 'programChange.id');
    const tenantId = parseRequiredString(raw.tenantId, 'programChange.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'program change request');

    const studentId = parseRequiredString(raw.studentId, 'programChange.studentId');
    if (expectedStudentId) {
        assertMatchingStudentId(studentId, expectedStudentId);
    }

    if (!isProgramChangeRequestStatus(raw.status)) {
        throw new ApiError(
            'Invalid backend program change payload: unrecognized request status.',
            502
        );
    }

    let academicYearStatus: AcademicCalendarStatus | null | undefined;
    if (raw.academicYearStatus === undefined || raw.academicYearStatus === null) {
        academicYearStatus = raw.academicYearStatus;
    } else if (isAcademicCalendarStatus(raw.academicYearStatus)) {
        academicYearStatus = raw.academicYearStatus;
    } else {
        throw new ApiError(
            'Invalid backend program change payload: unrecognized academicYearStatus.',
            502
        );
    }

    const sourceProgramId = parseRequiredString(
        raw.sourceProgramId,
        'programChange.sourceProgramId'
    );
    const targetProgramId = parseRequiredString(
        raw.targetProgramId,
        'programChange.targetProgramId'
    );
    if (sourceProgramId === targetProgramId) {
        throw new ApiError(
            'Contract violation: Program change sourceProgramId and targetProgramId must differ.',
            502
        );
    }

    return {
        id,
        tenantId,
        studentId,
        student: parseOptionalStudentSummary(raw.student),
        academicYearId: parseRequiredString(raw.academicYearId, 'programChange.academicYearId'),
        academicYearName:
            parseOptionalNullableString(
                raw.academicYearName,
                'programChange.academicYearName'
            ) ?? null,
        academicYearStatus: academicYearStatus ?? null,
        sourceEnrollmentId: parseRequiredString(
            raw.sourceEnrollmentId,
            'programChange.sourceEnrollmentId'
        ),
        sourceProgramId,
        sourceProgramName:
            parseOptionalNullableString(
                raw.sourceProgramName,
                'programChange.sourceProgramName'
            ) ?? null,
        sourceProgramCode:
            parseOptionalNullableString(
                raw.sourceProgramCode,
                'programChange.sourceProgramCode'
            ) ?? null,
        sourceAcademicClassId: parseRequiredString(
            raw.sourceAcademicClassId,
            'programChange.sourceAcademicClassId'
        ),
        sourceAcademicClassName:
            parseOptionalNullableString(
                raw.sourceAcademicClassName,
                'programChange.sourceAcademicClassName'
            ) ?? null,
        sourceSectionId:
            parseOptionalNullableString(
                raw.sourceSectionId,
                'programChange.sourceSectionId'
            ) ?? null,
        sourceSectionName:
            parseOptionalNullableString(
                raw.sourceSectionName,
                'programChange.sourceSectionName'
            ) ?? null,
        targetProgramId,
        targetProgramName:
            parseOptionalNullableString(
                raw.targetProgramName,
                'programChange.targetProgramName'
            ) ?? null,
        targetProgramCode:
            parseOptionalNullableString(
                raw.targetProgramCode,
                'programChange.targetProgramCode'
            ) ?? null,
        targetAcademicClassId: parseRequiredString(
            raw.targetAcademicClassId,
            'programChange.targetAcademicClassId'
        ),
        targetAcademicClassName:
            parseOptionalNullableString(
                raw.targetAcademicClassName,
                'programChange.targetAcademicClassName'
            ) ?? null,
        targetSectionId:
            parseOptionalNullableString(
                raw.targetSectionId,
                'programChange.targetSectionId'
            ) ?? null,
        targetSectionName:
            parseOptionalNullableString(
                raw.targetSectionName,
                'programChange.targetSectionName'
            ) ?? null,
        status: raw.status,
        reason: parseRequiredString(raw.reason, 'programChange.reason'),
        requestedBy: parseRequiredAuditSummary(raw.requestedBy, 'programChange.requestedBy'),
        requestedAt: parseRequiredString(raw.requestedAt, 'programChange.requestedAt'),
        reviewedBy: parseAuditSummary(raw.reviewedBy) ?? null,
        reviewedAt:
            parseOptionalNullableString(raw.reviewedAt, 'programChange.reviewedAt') ?? null,
        decisionNote:
            parseOptionalNullableString(raw.decisionNote, 'programChange.decisionNote') ?? null,
        resultingEnrollmentId:
            parseOptionalNullableString(
                raw.resultingEnrollmentId,
                'programChange.resultingEnrollmentId'
            ) ?? null,
    };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function formatEnrollmentOperationError(error: unknown, fallbackMessage: string): string {
    if (error instanceof ApiError) {
        if (error.statusCode === 409) {
            return error.message && error.message.trim() !== ''
                ? `Enrollment conflict: ${error.message}`
                : 'Enrollment conflict (HTTP 409): Duplicate enrollment detected or student already has an ACTIVE Grade-Based Program for this Academic Year.';
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
 * Lists enrollments belonging to a single verified student within the active school tenant.
 * Strictly requires `enrollments.read` (never treats `students.read` as a substitute).
 */
export async function listStudentEnrollments(
    studentId: string,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<StudentEnrollmentListResponse> {
    const cleanTenantId = assertEnrollmentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.ENROLLMENTS.READ
    );

    const cleanStudentId = studentId.trim();
    if (!cleanStudentId) {
        throw new ApiError('Student identifier is required.', 400);
    }

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.SCHOOL_STUDENTS.ENROLLMENTS(cleanStudentId),
            { signal }
        );
        const data = response.data;

        if (Array.isArray(data)) {
            return {
                items: data.map((item) =>
                    parseStudentEnrollmentRecord(item, cleanTenantId, cleanStudentId)
                ),
            };
        }

        if (!isPlainObject(data)) {
            throw new ApiError('Invalid backend student enrollment list response.', 502);
        }
        assertNoExposedSensitiveFields(data, 'Student enrollment list');

        const rawItems = Array.isArray(data.enrollments)
            ? data.enrollments
            : Array.isArray(data.items)
              ? data.items
              : null;

        if (!rawItems) {
            throw new ApiError(
                'Backend student enrollment list response did not contain items array.',
                502
            );
        }

        const items = rawItems.map((item) =>
            parseStudentEnrollmentRecord(item, cleanTenantId, cleanStudentId)
        );
        const pagination = parsePaginationMeta(data.pagination, items.length);

        return {
            items,
            ...(pagination ? { pagination } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Creates a Grade-Based or Skill-Based Program enrollment starting in ACTIVE status.
 * Enforces actor permission (`enrollments.create`), tenant matching, target student eligibility,
 * active catalog status, and Grade/Year/Class/Section integrity prior to and after the call.
 */
export async function createProgramEnrollment(
    student: Pick<StudentDirectoryItem, 'id' | 'tenantId' | 'roles' | 'status'>,
    request: CreateProgramEnrollmentRequest,
    context: {
        program: Program;
        academicYear?: AcademicYear | null;
        section?: AcademicSection | null;
    },
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<CreateStudentEnrollmentResponse> {
    const cleanTenantId = assertEnrollmentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.ENROLLMENTS.CREATE
    );

    assertMatchingTenantId(student.tenantId, cleanTenantId, 'student');
    const eligibility = isStudentEligibleForEnrollment(student);
    if (!eligibility.allowed) {
        throw new ApiError(
            eligibility.reason ?? 'Target student account is not eligible for enrollment.',
            400
        );
    }

    if (request.initialStatus !== 'ACTIVE') {
        throw new ApiError(
            'School Admin-created enrollments must use initialStatus ACTIVE.',
            400
        );
    }

    const { program, academicYear, section } = context;
    assertMatchingTenantId(program.tenantId, cleanTenantId, 'program');
    if (program.id !== request.programId || program.status !== 'ACTIVE') {
        throw new ApiError('Only existing ACTIVE Programs can receive new enrollments.', 400);
    }

    if (request.enrollmentKind === 'GRADE_BASED') {
        if (program.programType !== 'GRADE_BASED' || !program.academicClassId?.trim()) {
            throw new ApiError(
                'Grade-based enrollment requires an ACTIVE Grade-Based Program with a valid Academic Class.',
                400
            );
        }
        if (
            !academicYear ||
            academicYear.id !== request.academicYearId ||
            academicYear.tenantId !== cleanTenantId ||
            !isAcademicYearEligibleForGradeEnrollment(academicYear)
        ) {
            throw new ApiError(
                'Grade-based enrollment requires an ACTIVE or PLANNED Academic Year belonging to this school.',
                400
            );
        }
        if (request.sectionId !== null) {
            if (
                !section ||
                section.id !== request.sectionId ||
                section.tenantId !== cleanTenantId ||
                section.classId !== program.academicClassId ||
                section.status !== 'ACTIVE'
            ) {
                throw new ApiError(
                    'Selected Section must be ACTIVE and belong to the Grade-Based Program Academic Class.',
                    400
                );
            }
        }
    } else {
        if (program.programType !== 'SKILL_BASED' || program.academicClassId) {
            throw new ApiError(
                'Skill-based enrollment requires an ACTIVE Skill-Based Program without an Academic Class.',
                400
            );
        }
    }

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.SCHOOL_STUDENTS.PROGRAM_ENROLLMENTS(student.id),
            request
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend program enrollment mutation response.', 502);
        }
        assertNoExposedSensitiveFields(payload, 'Program enrollment mutation');

        const rawEnrollment = isPlainObject(payload.enrollment)
            ? payload.enrollment
            : isPlainObject(payload.data)
              ? payload.data
              : payload;

        const enrollment = parseStudentEnrollmentRecord(rawEnrollment, cleanTenantId, student.id);
        const expectedType =
            request.enrollmentKind === 'GRADE_BASED'
                ? 'GRADE_BASED_PROGRAM'
                : 'SKILL_BASED_PROGRAM';

        if (enrollment.enrollmentType !== expectedType) {
            throw new ApiError(
                `Contract violation: Expected ${expectedType} enrollmentType in response.`,
                502
            );
        }
        if (enrollment.programId !== request.programId) {
            throw new ApiError(
                'Contract violation: Returned enrollment programId does not match the request.',
                502
            );
        }
        if (enrollment.status !== 'ACTIVE') {
            throw new ApiError(
                'Contract violation: Newly created School Admin Program enrollment must return ACTIVE status.',
                502
            );
        }

        if (request.enrollmentKind === 'GRADE_BASED') {
            if (enrollment.academicYearId !== request.academicYearId) {
                throw new ApiError(
                    'Contract violation: Returned academicYearId mismatch on Grade-Based enrollment.',
                    502
                );
            }
            if (enrollment.academicClassId !== program.academicClassId) {
                throw new ApiError(
                    'Contract violation: Returned academicClassId does not match the selected Program Academic Class.',
                    502
                );
            }
            if ((enrollment.sectionId ?? null) !== request.sectionId) {
                throw new ApiError(
                    'Contract violation: Returned sectionId does not match the submitted section.',
                    502
                );
            }
        }

        return {
            enrollment,
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Creates an independent Standalone Course enrollment starting in ACTIVE status.
 * Strictly verifies `allowStandalone === true` and `status === 'ACTIVE'`.
 */
export async function createStandaloneCourseEnrollment(
    student: Pick<StudentDirectoryItem, 'id' | 'tenantId' | 'roles' | 'status'>,
    request: CreateStandaloneCourseEnrollmentRequest,
    context: {
        course: Course;
    },
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<CreateStudentEnrollmentResponse> {
    const cleanTenantId = assertEnrollmentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.ENROLLMENTS.CREATE
    );

    assertMatchingTenantId(student.tenantId, cleanTenantId, 'student');
    const eligibility = isStudentEligibleForEnrollment(student);
    if (!eligibility.allowed) {
        throw new ApiError(
            eligibility.reason ?? 'Target student account is not eligible for enrollment.',
            400
        );
    }

    if (request.initialStatus !== 'ACTIVE') {
        throw new ApiError(
            'School Admin-created enrollments must use initialStatus ACTIVE.',
            400
        );
    }

    const { course } = context;
    assertMatchingTenantId(course.tenantId, cleanTenantId, 'course');
    if (course.id !== request.courseId || course.status !== 'ACTIVE' || !course.allowStandalone) {
        throw new ApiError(
            'Standalone Course enrollment requires an existing ACTIVE Course with allowStandalone = true.',
            400
        );
    }

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.SCHOOL_STUDENTS.STANDALONE_COURSE_ENROLLMENTS(student.id),
            request
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError(
                'Invalid backend standalone course enrollment mutation response.',
                502
            );
        }
        assertNoExposedSensitiveFields(payload, 'Standalone course enrollment mutation');

        const rawEnrollment = isPlainObject(payload.enrollment)
            ? payload.enrollment
            : isPlainObject(payload.data)
              ? payload.data
              : payload;

        const enrollment = parseStudentEnrollmentRecord(rawEnrollment, cleanTenantId, student.id);
        if (enrollment.enrollmentType !== 'STANDALONE_COURSE') {
            throw new ApiError(
                'Contract violation: Expected STANDALONE_COURSE enrollmentType in response.',
                502
            );
        }
        if (enrollment.courseId !== request.courseId) {
            throw new ApiError(
                'Contract violation: Returned enrollment courseId does not match the request.',
                502
            );
        }
        if (enrollment.status !== 'ACTIVE') {
            throw new ApiError(
                'Contract violation: Newly created School Admin standalone Course enrollment must return ACTIVE status.',
                502
            );
        }

        return {
            enrollment,
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Updates enrollment lifecycle status (`ACTIVE -> SUSPENDED | COMPLETED | WITHDRAWN` or
 * `SUSPENDED -> ACTIVE | WITHDRAWN`). Uses `enrollments.cancel` for withdrawal and
 * `enrollments.update` for suspend/reactivate/complete.
 */
export async function updateEnrollmentStatus(
    student: Pick<StudentDirectoryItem, 'id' | 'tenantId' | 'roles' | 'status'>,
    enrollment: StudentEnrollmentRecord,
    request: EnrollmentStatusUpdateRequest,
    context: {
        existingEnrollments: readonly StudentEnrollmentRecord[];
        academicYear?: AcademicYear | null;
    },
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<EnrollmentStatusUpdateResponse> {
    const requiredPermission =
        request.targetStatus === 'WITHDRAWN'
            ? PERMISSIONS.ENROLLMENTS.CANCEL
            : PERMISSIONS.ENROLLMENTS.UPDATE;

    const cleanTenantId = assertEnrollmentActorAuthorized(
        actor,
        expectedTenantId,
        requiredPermission
    );

    assertMatchingTenantId(student.tenantId, cleanTenantId, 'student');
    assertMatchingTenantId(enrollment.tenantId, cleanTenantId, 'enrollment');
    assertMatchingStudentId(enrollment.studentId, student.id);

    const eligibility = evaluateEnrollmentLifecycleEligibility({
        enrollment,
        targetStatus: request.targetStatus,
        student,
        existingEnrollments: context.existingEnrollments,
        academicYear: context.academicYear,
        canUpdateEnrollments: hasPermission(actor, PERMISSIONS.ENROLLMENTS.UPDATE),
        canCancelEnrollments: hasPermission(actor, PERMISSIONS.ENROLLMENTS.CANCEL),
    });
    if (!eligibility.allowed) {
        throw new ApiError(
            eligibility.reason ?? 'Enrollment lifecycle transition is not permitted.',
            400
        );
    }

    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.SCHOOL_STUDENTS.ENROLLMENT_STATUS(student.id, enrollment.id),
            request
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend enrollment status update response.', 502);
        }
        assertNoExposedSensitiveFields(payload, 'Enrollment status update');

        const rawEnrollment = isPlainObject(payload.enrollment)
            ? payload.enrollment
            : isPlainObject(payload.data)
              ? payload.data
              : payload;

        const updated = parseStudentEnrollmentRecord(rawEnrollment, cleanTenantId, student.id);
        if (updated.id !== enrollment.id) {
            throw new ApiError(
                'Security violation: Returned enrollment ID mismatch after status update.',
                502
            );
        }
        if (updated.status !== request.targetStatus) {
            throw new ApiError(
                `Contract violation: Expected ${request.targetStatus} status after lifecycle update.`,
                502
            );
        }

        return {
            enrollment: updated,
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Performs an immediate Section Transfer within the same ACTIVE Grade-Based Program,
 * Academic Class, and Academic Year while preserving the enrollment ID and logging immutable history.
 */
export async function transferEnrollmentSection(
    student: Pick<StudentDirectoryItem, 'id' | 'tenantId' | 'roles' | 'status'>,
    enrollment: StudentEnrollmentRecord,
    request: SectionTransferRequest,
    context: {
        targetSection: AcademicSection;
        academicYear?: AcademicYear | null;
    },
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<SectionTransferResponse> {
    const cleanTenantId = assertEnrollmentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.ENROLLMENTS.UPDATE
    );
    if (!hasPermission(actor, PERMISSIONS.SECTIONS.READ)) {
        throw new ApiError('Forbidden: Missing sections.read permission.', 403);
    }

    assertMatchingTenantId(student.tenantId, cleanTenantId, 'student');
    assertMatchingTenantId(enrollment.tenantId, cleanTenantId, 'enrollment');
    assertMatchingStudentId(enrollment.studentId, student.id);

    const eligibility = evaluateSectionTransferEligibility({
        enrollment,
        student,
        academicYear: context.academicYear,
        canUpdateEnrollments: true,
        canReadSections: true,
    });
    if (!eligibility.allowed) {
        throw new ApiError(eligibility.reason ?? 'Section transfer is not permitted.', 400);
    }

    const { targetSection } = context;
    assertMatchingTenantId(targetSection.tenantId, cleanTenantId, 'section');
    if (
        targetSection.id !== request.targetSectionId ||
        targetSection.classId !== enrollment.academicClassId ||
        targetSection.status !== 'ACTIVE' ||
        targetSection.id === (enrollment.sectionId ?? '')
    ) {
        throw new ApiError(
            'Target Section must be an ACTIVE Section in the same Academic Class and differ from the current Section.',
            400
        );
    }

    const cleanReason = request.reason.trim();
    if (!cleanReason) {
        throw new ApiError('A transfer reason is required.', 400);
    }

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.SCHOOL_STUDENTS.ENROLLMENT_SECTION_TRANSFER(student.id, enrollment.id),
            {
                targetSectionId: targetSection.id,
                reason: cleanReason,
            }
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend section transfer response.', 502);
        }
        assertNoExposedSensitiveFields(payload, 'Section transfer');

        const updated = parseStudentEnrollmentRecord(payload.enrollment, cleanTenantId, student.id);
        if (
            updated.id !== enrollment.id ||
            updated.enrollmentType !== 'GRADE_BASED_PROGRAM' ||
            updated.programId !== enrollment.programId ||
            updated.academicClassId !== enrollment.academicClassId ||
            updated.academicYearId !== enrollment.academicYearId ||
            updated.sectionId !== targetSection.id
        ) {
            throw new ApiError(
                'Contract violation: Section transfer altered enrollment identity, Program, Class, Year, or failed to set targetSectionId.',
                502
            );
        }

        const transfer = parseSectionTransferRecord(
            payload.transfer,
            cleanTenantId,
            student.id,
            enrollment.id
        );
        if (transfer.toSectionId !== targetSection.id) {
            throw new ApiError(
                'Contract violation: Section transfer history toSectionId mismatch.',
                502
            );
        }

        return {
            enrollment: updated,
            transfer,
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Retrieves Section Transfer and Grade-Based Program Change history for a student enrollment.
 * Strictly requires `enrollments.read`; viewing history remains allowed for COMPLETED/ARCHIVED years.
 */
export async function getEnrollmentHistory(
    studentId: string,
    enrollmentId: string,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<EnrollmentHistoryResponse> {
    const cleanTenantId = assertEnrollmentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.ENROLLMENTS.READ
    );

    const cleanStudentId = studentId.trim();
    const cleanEnrollmentId = enrollmentId.trim();
    if (!cleanStudentId || !cleanEnrollmentId) {
        throw new ApiError('Student and enrollment identifiers are required.', 400);
    }

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.SCHOOL_STUDENTS.ENROLLMENT_HISTORY(cleanStudentId, cleanEnrollmentId),
            { signal }
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend enrollment history response.', 502);
        }
        assertNoExposedSensitiveFields(payload, 'Enrollment history');

        const rawTransfers = Array.isArray(payload.sectionTransfers)
            ? payload.sectionTransfers
            : [];
        const rawChanges = Array.isArray(payload.programChangeRequests)
            ? payload.programChangeRequests
            : [];

        return {
            sectionTransfers: rawTransfers.map((item) =>
                parseSectionTransferRecord(item, cleanTenantId, cleanStudentId, cleanEnrollmentId)
            ),
            programChangeRequests: rawChanges.map((item) =>
                parseProgramChangeRequestRecord(item, cleanTenantId, cleanStudentId)
            ),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function listStudentProgramChangeRequests(
    studentId: string,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<ProgramChangeRequestListResponse> {
    const cleanTenantId = assertEnrollmentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.ENROLLMENTS.READ
    );

    const cleanStudentId = studentId.trim();
    if (!cleanStudentId) {
        throw new ApiError('Student identifier is required.', 400);
    }

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.SCHOOL_STUDENTS.PROGRAM_CHANGE_REQUESTS(cleanStudentId),
            { signal }
        );
        const payload = response.data;
        if (Array.isArray(payload)) {
            return {
                items: payload.map((item) =>
                    parseProgramChangeRequestRecord(item, cleanTenantId, cleanStudentId)
                ),
            };
        }
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend program change request list response.', 502);
        }
        assertNoExposedSensitiveFields(payload, 'Program change request list');

        const rawItems = Array.isArray(payload.requests)
            ? payload.requests
            : Array.isArray(payload.items)
              ? payload.items
              : null;
        if (!rawItems) {
            throw new ApiError(
                'Backend program change request list did not contain items array.',
                502
            );
        }

        const items = rawItems.map((item) =>
            parseProgramChangeRequestRecord(item, cleanTenantId, cleanStudentId)
        );
        return {
            items,
            ...(parsePaginationMeta(payload.pagination, items.length)
                ? { pagination: parsePaginationMeta(payload.pagination, items.length) }
                : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Lists Program Change Requests across students in the active school tenant for the
 * cross-student approval queue inside `/admin/students`.
 * Strictly requires `enrollments.approve_program_change` (`enrollments.read` alone does not grant queue access).
 */
export async function listPendingProgramChangeQueue(
    query: ListProgramChangeRequestsQuery,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<ProgramChangeRequestListResponse> {
    const cleanTenantId = assertEnrollmentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.ENROLLMENTS.APPROVE_PROGRAM_CHANGE
    );

    const params: Record<string, string | number> = {};
    if (query.status && query.status !== 'ALL') params.status = query.status;
    if (query.page !== undefined) params.page = query.page;
    if (query.limit !== undefined) params.limit = query.limit;
    if (query.search && query.search.trim() !== '') params.search = query.search.trim();

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.ACADEMIC.PROGRAM_CHANGE_REQUESTS,
            { params, signal }
        );
        const payload = response.data;
        if (Array.isArray(payload)) {
            return {
                items: payload.map((item) => parseProgramChangeRequestRecord(item, cleanTenantId)),
            };
        }
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend program change queue response.', 502);
        }
        assertNoExposedSensitiveFields(payload, 'Program change queue');

        const rawItems = Array.isArray(payload.requests)
            ? payload.requests
            : Array.isArray(payload.items)
              ? payload.items
              : null;
        if (!rawItems) {
            throw new ApiError(
                'Backend program change queue response did not contain items array.',
                502
            );
        }

        const items = rawItems.map((item) => parseProgramChangeRequestRecord(item, cleanTenantId));
        return {
            items,
            ...(parsePaginationMeta(payload.pagination, items.length, query.page, query.limit)
                ? {
                      pagination: parsePaginationMeta(
                          payload.pagination,
                          items.length,
                          query.page,
                          query.limit
                      ),
                  }
                : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Initiates a PENDING Grade-Based Program Change Request without altering the source ACTIVE enrollment
 * and never auto-approving regardless of actor permissions.
 */
export async function createProgramChangeRequest(
    student: Pick<StudentDirectoryItem, 'id' | 'tenantId' | 'roles' | 'status'>,
    sourceEnrollment: StudentEnrollmentRecord,
    request: CreateProgramChangeRequestDto,
    context: {
        targetProgram: Program;
        targetSection?: AcademicSection | null;
        academicYear?: AcademicYear | null;
        existingRequests: readonly ProgramChangeRequestRecord[];
    },
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<CreateProgramChangeResponse> {
    const cleanTenantId = assertEnrollmentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.ENROLLMENTS.UPDATE
    );

    assertMatchingTenantId(student.tenantId, cleanTenantId, 'student');
    assertMatchingTenantId(sourceEnrollment.tenantId, cleanTenantId, 'source enrollment');
    assertMatchingStudentId(sourceEnrollment.studentId, student.id);

    const eligibility = evaluateProgramChangeRequestEligibility({
        sourceEnrollment,
        student,
        academicYear: context.academicYear,
        existingProgramChangeRequests: context.existingRequests,
        canUpdateEnrollments: true,
    });
    if (!eligibility.allowed) {
        throw new ApiError(
            eligibility.reason ?? 'Program Change Request is not permitted.',
            400
        );
    }

    const { targetProgram, targetSection } = context;
    assertMatchingTenantId(targetProgram.tenantId, cleanTenantId, 'target program');
    if (
        targetProgram.id !== request.targetProgramId ||
        targetProgram.id === sourceEnrollment.programId ||
        targetProgram.programType !== 'GRADE_BASED' ||
        targetProgram.status !== 'ACTIVE' ||
        !targetProgram.academicClassId?.trim()
    ) {
        throw new ApiError(
            'Target Program must be a different ACTIVE Grade-Based Program with a valid Academic Class.',
            400
        );
    }

    if (request.targetSectionId !== null) {
        if (
            !targetSection ||
            targetSection.id !== request.targetSectionId ||
            targetSection.tenantId !== cleanTenantId ||
            targetSection.classId !== targetProgram.academicClassId ||
            targetSection.status !== 'ACTIVE'
        ) {
            throw new ApiError(
                'Target Section must be ACTIVE and belong to the target Program’s Academic Class.',
                400
            );
        }
    }

    const cleanReason = request.reason.trim();
    if (!cleanReason) {
        throw new ApiError('A reason is required when initiating a Program Change Request.', 400);
    }

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.SCHOOL_STUDENTS.ENROLLMENT_PROGRAM_CHANGE_REQUESTS(
                student.id,
                sourceEnrollment.id
            ),
            {
                targetProgramId: targetProgram.id,
                targetSectionId: request.targetSectionId,
                reason: cleanReason,
            }
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend program change creation response.', 502);
        }
        assertNoExposedSensitiveFields(payload, 'Program change creation');

        const rawRequest = isPlainObject(payload.request)
            ? payload.request
            : isPlainObject(payload.data)
              ? payload.data
              : payload;

        const parsed = parseProgramChangeRequestRecord(rawRequest, cleanTenantId, student.id);
        if (parsed.status !== 'PENDING') {
            throw new ApiError(
                'Contract violation: Newly submitted Program Change Request must start as PENDING and never auto-approve.',
                502
            );
        }
        if (
            parsed.sourceEnrollmentId !== sourceEnrollment.id ||
            parsed.targetProgramId !== targetProgram.id ||
            parsed.targetAcademicClassId !== targetProgram.academicClassId ||
            parsed.academicYearId !== sourceEnrollment.academicYearId
        ) {
            throw new ApiError(
                'Contract violation: Returned Program Change Request source, target, or Academic Year mismatch.',
                502
            );
        }

        return {
            request: parsed,
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Approves or rejects a PENDING Grade-Based Program Change Request (`enrollments.approve_program_change`).
 * Strictly blocks self-approval/self-rejection by the requester and validates atomic swap results on APPROVE.
 */
export async function decideProgramChangeRequest(
    requestRecord: ProgramChangeRequestRecord,
    decisionPayload: ProgramChangeDecisionRequest,
    context: {
        student?: Pick<StudentDirectoryItem, 'id' | 'tenantId' | 'roles' | 'status'> | null;
        sourceEnrollment?: StudentEnrollmentRecord | null;
        academicYear?: AcademicYear | null;
    },
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null
): Promise<ProgramChangeDecisionResponse> {
    const cleanTenantId = assertEnrollmentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.ENROLLMENTS.APPROVE_PROGRAM_CHANGE
    );

    assertMatchingTenantId(requestRecord.tenantId, cleanTenantId, 'program change request');
    if (context.student) {
        assertMatchingTenantId(context.student.tenantId, cleanTenantId, 'student');
        assertMatchingStudentId(requestRecord.studentId, context.student.id);
    }

    const eligibility = evaluateProgramChangeDecisionEligibility({
        request: requestRecord,
        decision: decisionPayload.decision,
        currentActorId: actor?.id,
        canApproveProgramChange: true,
        academicYear: context.academicYear,
        student: context.student,
        sourceEnrollment: context.sourceEnrollment,
    });
    if (!eligibility.allowed) {
        throw new ApiError(
            eligibility.reason ?? 'Program Change decision is not permitted.',
            403
        );
    }

    const cleanNote = decisionPayload.note?.trim() ?? null;
    if (decisionPayload.decision === 'REJECT' && !cleanNote) {
        throw new ApiError(
            'A decision note is required when rejecting a Program Change Request.',
            400
        );
    }
    if (isAcademicYearClosedForEnrollmentMutation(context.academicYear?.status ?? requestRecord.academicYearStatus)) {
        throw new ApiError(
            'Program Change decisions are blocked for Completed or Archived Academic Years.',
            400
        );
    }

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.SCHOOL_STUDENTS.PROGRAM_CHANGE_DECISION(
                requestRecord.studentId,
                requestRecord.id
            ),
            {
                decision: decisionPayload.decision,
                note: cleanNote,
            }
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend program change decision response.', 502);
        }
        assertNoExposedSensitiveFields(payload, 'Program change decision');

        const parsedRequest = parseProgramChangeRequestRecord(
            payload.request,
            cleanTenantId,
            requestRecord.studentId
        );
        const expectedStatus = decisionPayload.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        if (parsedRequest.id !== requestRecord.id || parsedRequest.status !== expectedStatus) {
            throw new ApiError(
                `Contract violation: Expected ${expectedStatus} Program Change Request response.`,
                502
            );
        }

        let withdrawnEnrollment: StudentEnrollmentRecord | null = null;
        let activatedEnrollment: StudentEnrollmentRecord | null = null;

        if (decisionPayload.decision === 'APPROVE') {
            if (!isPlainObject(payload.withdrawnEnrollment) || !isPlainObject(payload.activatedEnrollment)) {
                throw new ApiError(
                    'Contract violation: Approved Program Change must atomically return both withdrawnEnrollment and activatedEnrollment.',
                    502
                );
            }
            withdrawnEnrollment = parseStudentEnrollmentRecord(
                payload.withdrawnEnrollment,
                cleanTenantId,
                requestRecord.studentId
            );
            activatedEnrollment = parseStudentEnrollmentRecord(
                payload.activatedEnrollment,
                cleanTenantId,
                requestRecord.studentId
            );

            if (
                withdrawnEnrollment.id !== requestRecord.sourceEnrollmentId ||
                withdrawnEnrollment.status !== 'WITHDRAWN'
            ) {
                throw new ApiError(
                    'Contract violation: Original source enrollment must be preserved as WITHDRAWN on approval.',
                    502
                );
            }
            if (
                activatedEnrollment.status !== 'ACTIVE' ||
                activatedEnrollment.enrollmentType !== 'GRADE_BASED_PROGRAM' ||
                activatedEnrollment.programId !== requestRecord.targetProgramId ||
                activatedEnrollment.academicYearId !== requestRecord.academicYearId ||
                activatedEnrollment.academicClassId !== requestRecord.targetAcademicClassId ||
                (activatedEnrollment.sectionId ?? null) !== (requestRecord.targetSectionId ?? null)
            ) {
                throw new ApiError(
                    'Contract violation: Activated enrollment does not match approved Program Change target parameters.',
                    502
                );
            }
        }

        return {
            request: parsedRequest,
            ...(withdrawnEnrollment ? { withdrawnEnrollment } : {}),
            ...(activatedEnrollment ? { activatedEnrollment } : {}),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Reuses existing Programs catalog service with strict permission checks
 * (`enrollments.create` or `enrollments.update` + `programs.read`).
 */
export async function listEnrollableActivePrograms(
    programType: ProgramType,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<Program[]> {
    const cleanTenantId = assertEnrollmentActorAuthorizedAny(actor, expectedTenantId, [
        PERMISSIONS.ENROLLMENTS.CREATE,
        PERMISSIONS.ENROLLMENTS.UPDATE,
    ]);
    if (!hasPermission(actor, PERMISSIONS.PROGRAMS.READ)) {
        throw new ApiError('Forbidden: Missing programs.read permission.', 403);
    }

    const collected: Program[] = [];
    const seenIds = new Set<string>();

    const firstPage = await listPrograms(
        {
            page: 1,
            limit: CATALOG_PAGE_LIMIT,
            programType,
            status: 'ACTIVE',
        },
        cleanTenantId,
        actor,
        signal
    );

    const appendValid = (items: readonly Program[]) => {
        for (const item of items) {
            if (
                item.status === 'ACTIVE' &&
                item.programType === programType &&
                !seenIds.has(item.id)
            ) {
                if (programType === 'GRADE_BASED' && !item.academicClassId?.trim()) {
                    continue;
                }
                seenIds.add(item.id);
                collected.push(item);
            }
        }
    };

    appendValid(firstPage.items);
    const totalPages = Math.min(firstPage.pagination.totalPages, CATALOG_MAX_PAGES);
    for (let page = 2; page <= totalPages; page += 1) {
        const next = await listPrograms(
            {
                page,
                limit: CATALOG_PAGE_LIMIT,
                programType,
                status: 'ACTIVE',
            },
            cleanTenantId,
            actor,
            signal
        );
        appendValid(next.items);
    }

    return collected;
}

/**
 * Reuses existing Courses catalog service with strict permission checks (`enrollments.create` + `courses.read`).
 * Strictly filters to ACTIVE courses with allowStandalone === true.
 */
export async function listEnrollableStandaloneCourses(
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<Course[]> {
    const cleanTenantId = assertEnrollmentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.ENROLLMENTS.CREATE
    );
    if (!hasPermission(actor, PERMISSIONS.COURSES.READ)) {
        throw new ApiError('Forbidden: Missing courses.read permission.', 403);
    }

    const collected: Course[] = [];
    const seenIds = new Set<string>();

    const firstPage = await listCourses(
        {
            page: 1,
            limit: CATALOG_PAGE_LIMIT,
            allowStandalone: true,
            status: 'ACTIVE',
        },
        cleanTenantId,
        actor,
        signal
    );

    const appendValid = (items: readonly Course[]) => {
        for (const item of items) {
            if (item.status === 'ACTIVE' && item.allowStandalone && !seenIds.has(item.id)) {
                seenIds.add(item.id);
                collected.push(item);
            }
        }
    };

    appendValid(firstPage.items);
    const totalPages = Math.min(firstPage.pagination.totalPages, CATALOG_MAX_PAGES);
    for (let page = 2; page <= totalPages; page += 1) {
        const next = await listCourses(
            {
                page,
                limit: CATALOG_PAGE_LIMIT,
                allowStandalone: true,
                status: 'ACTIVE',
            },
            cleanTenantId,
            actor,
            signal
        );
        appendValid(next.items);
    }

    return collected;
}

/**
 * Reuses existing Academic Structure Years service with strict permission checks (`enrollments.create` + `academic_years.read`).
 * Returns strictly ACTIVE and PLANNED years per confirmed business decision.
 */
export async function listEligibleEnrollmentAcademicYears(
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<AcademicYear[]> {
    const cleanTenantId = assertEnrollmentActorAuthorized(
        actor,
        expectedTenantId,
        PERMISSIONS.ENROLLMENTS.CREATE
    );
    if (!hasPermission(actor, PERMISSIONS.ACADEMIC_YEARS.READ)) {
        throw new ApiError('Forbidden: Missing academic_years.read permission.', 403);
    }

    const response = await listAcademicYears(cleanTenantId, signal);
    return response.academicYears.filter((year) => isAcademicYearEligibleForGradeEnrollment(year));
}

/**
 * Reuses existing Academic Structure Sections service with strict permission checks
 * (`enrollments.create` or `enrollments.update` + `sections.read`).
 * Returns only ACTIVE sections belonging to the target Academic Class.
 */
export async function listActiveSectionsForClass(
    classId: string,
    expectedTenantId: string | null,
    actor: AuthenticatedUser | null,
    signal?: AbortSignal
): Promise<AcademicSection[]> {
    const cleanTenantId = assertEnrollmentActorAuthorizedAny(actor, expectedTenantId, [
        PERMISSIONS.ENROLLMENTS.CREATE,
        PERMISSIONS.ENROLLMENTS.UPDATE,
    ]);
    if (!hasPermission(actor, PERMISSIONS.SECTIONS.READ)) {
        throw new ApiError('Forbidden: Missing sections.read permission.', 403);
    }

    const cleanClassId = classId.trim();
    if (!cleanClassId) {
        throw new ApiError('Academic Class identifier is required to load sections.', 400);
    }

    const response = await listSections({
        classId: cleanClassId,
        expectedTenantId: cleanTenantId,
        signal,
    });
    return response.sections.filter(
        (section) => section.classId === cleanClassId && section.status === 'ACTIVE'
    );
}

