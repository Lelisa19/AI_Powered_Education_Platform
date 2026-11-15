import type { PaginationMeta } from '../../../types/api.types';
import type { AcademicCalendarStatus } from '../../academic/types/academic-structure.types';
import type { ProgramType } from '../../programs-courses/types/programs-courses.types';

export type EnrollmentType =
    | 'GRADE_BASED_PROGRAM'
    | 'SKILL_BASED_PROGRAM'
    | 'STANDALONE_COURSE';

export type EnrollmentLifecycleStatus =
    | 'PENDING'
    | 'ACTIVE'
    | 'SUSPENDED'
    | 'COMPLETED'
    | 'WITHDRAWN'
    | 'REJECTED';

export interface EnrollmentAuditSummary {
    id: string;
    name?: string | null;
    email?: string | null;
}

/**
 * School-scoped student enrollment record (frontend contract awaiting backend implementation).
 * Deliberately separated from StudentAccountStatus and payment/billing verification state.
 */
export interface StudentEnrollmentRecord {
    id: string;
    tenantId: string;
    studentId: string;
    enrollmentType: EnrollmentType;
    status: EnrollmentLifecycleStatus;

    // Program-scoped identity (GRADE_BASED_PROGRAM & SKILL_BASED_PROGRAM)
    programId?: string | null;
    programName?: string | null;
    programCode?: string | null;
    programType?: ProgramType | null;

    // Grade-based academic structure placement (GRADE_BASED_PROGRAM only)
    academicYearId?: string | null;
    academicYearName?: string | null;
    academicYearStatus?: AcademicCalendarStatus | null;
    academicClassId?: string | null;
    academicClassName?: string | null;
    sectionId?: string | null;
    sectionName?: string | null;

    // Standalone course identity (STANDALONE_COURSE only; independent of ProgramCourse)
    courseId?: string | null;
    courseTitle?: string | null;
    courseCode?: string | null;
    allowStandalone?: boolean;

    enrolledAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    createdBy?: EnrollmentAuditSummary | null;
    updatedBy?: EnrollmentAuditSummary | null;
    approvedAt?: string | null;
    approvedBy?: EnrollmentAuditSummary | null;
    suspendedAt?: string | null;
    suspendedBy?: EnrollmentAuditSummary | null;
    suspendedReason?: string | null;
    completedAt?: string | null;
    completedBy?: EnrollmentAuditSummary | null;
    completionNote?: string | null;
    withdrawnAt?: string | null;
    withdrawnBy?: EnrollmentAuditSummary | null;
    withdrawnReason?: string | null;
    rejectedAt?: string | null;
    rejectedBy?: EnrollmentAuditSummary | null;
    rejectionReason?: string | null;
    replacesEnrollmentId?: string | null;
    replacedByEnrollmentId?: string | null;
    notes?: string | null;
}

export interface StudentEnrollmentSummary {
    totalCount: number;
    activeCount: number;
    gradeBasedCount: number;
    activeGradeBasedCount: number;
    skillBasedCount: number;
    activeSkillBasedCount: number;
    standaloneCourseCount: number;
    activeStandaloneCourseCount: number;
}

export interface GroupedStudentEnrollments {
    gradeBased: StudentEnrollmentRecord[];
    skillBased: StudentEnrollmentRecord[];
    standaloneCourses: StudentEnrollmentRecord[];
    summary: StudentEnrollmentSummary;
}

export interface StudentEnrollmentListResponse {
    items: StudentEnrollmentRecord[];
    pagination?: PaginationMeta;
}

/**
 * Program enrollment DTOs.
 * Grade-based programs derive AcademicClass strictly from Program.academicClassId on the server;
 * client does not pass an independent class override.
 * Client never sends tenantId as an authorization claim.
 */
export interface CreateGradeBasedProgramEnrollmentRequest {
    programId: string;
    enrollmentKind: 'GRADE_BASED';
    academicYearId: string;
    sectionId: string | null;
    initialStatus: 'ACTIVE';
    notes?: string | null;
}

export interface CreateSkillBasedProgramEnrollmentRequest {
    programId: string;
    enrollmentKind: 'SKILL_BASED';
    initialStatus: 'ACTIVE';
    notes?: string | null;
}

export type CreateProgramEnrollmentRequest =
    | CreateGradeBasedProgramEnrollmentRequest
    | CreateSkillBasedProgramEnrollmentRequest;

export interface CreateStandaloneCourseEnrollmentRequest {
    courseId: string;
    initialStatus: 'ACTIVE';
    notes?: string | null;
}

export interface CreateStudentEnrollmentResponse {
    enrollment: StudentEnrollmentRecord;
    message?: string;
}

export interface EnrollmentFormValues {
    enrollmentType: '' | EnrollmentType;
    programId: string;
    academicYearId: string;
    sectionId: string;
    courseId: string;
    notes: string;
}

export type EnrollmentFieldName = keyof EnrollmentFormValues;
export type EnrollmentFieldErrors = Partial<Record<EnrollmentFieldName, string>>;

// ==================== Step 5.10.4: Lifecycle, Section Transfers & Program Changes ====================

export type EnrollmentTransitionTargetStatus = Extract<
    EnrollmentLifecycleStatus,
    'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'WITHDRAWN'
>;

export type EnrollmentLifecycleActionKind =
    | 'SUSPEND'
    | 'REACTIVATE'
    | 'COMPLETE'
    | 'WITHDRAW';

export interface EnrollmentStatusUpdateRequest {
    targetStatus: EnrollmentTransitionTargetStatus;
    reason?: string | null;
}

export interface EnrollmentStatusUpdateResponse {
    enrollment: StudentEnrollmentRecord;
    message?: string;
}

/**
 * Immutable Section Transfer history record inside a single GRADE_BASED_PROGRAM enrollment.
 * Enrollment ID remains unchanged across Section transfers within the same Program, Class & Year.
 */
export interface EnrollmentSectionTransferRecord {
    id: string;
    tenantId: string;
    enrollmentId: string;
    studentId: string;
    programId: string;
    academicYearId: string;
    academicClassId: string;
    fromSectionId?: string | null;
    fromSectionName?: string | null;
    toSectionId: string;
    toSectionName?: string | null;
    reason: string;
    transferredBy: EnrollmentAuditSummary;
    transferredAt: string;
}

export interface SectionTransferRequest {
    targetSectionId: string;
    reason: string;
}

export interface SectionTransferResponse {
    enrollment: StudentEnrollmentRecord;
    transfer: EnrollmentSectionTransferRecord;
    message?: string;
}

export interface SectionTransferFormValues {
    targetSectionId: string;
    reason: string;
}

export type SectionTransferFieldName = keyof SectionTransferFormValues;
export type SectionTransferFieldErrors = Partial<Record<SectionTransferFieldName, string>>;

export type ProgramChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ProgramChangeStudentSummary {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    studentCode?: string | null;
}

/**
 * Separate Grade-Based Program Change request & audit decision record.
 * Never auto-approves on creation; source enrollment remains ACTIVE while status === 'PENDING'.
 */
export interface ProgramChangeRequestRecord {
    id: string;
    tenantId: string;
    studentId: string;
    student?: ProgramChangeStudentSummary | null;
    academicYearId: string;
    academicYearName?: string | null;
    academicYearStatus?: AcademicCalendarStatus | null;
    sourceEnrollmentId: string;
    sourceProgramId: string;
    sourceProgramName?: string | null;
    sourceProgramCode?: string | null;
    sourceAcademicClassId: string;
    sourceAcademicClassName?: string | null;
    sourceSectionId?: string | null;
    sourceSectionName?: string | null;
    targetProgramId: string;
    targetProgramName?: string | null;
    targetProgramCode?: string | null;
    targetAcademicClassId: string;
    targetAcademicClassName?: string | null;
    targetSectionId?: string | null;
    targetSectionName?: string | null;
    status: ProgramChangeRequestStatus;
    reason: string;
    requestedBy: EnrollmentAuditSummary;
    requestedAt: string;
    reviewedBy?: EnrollmentAuditSummary | null;
    reviewedAt?: string | null;
    decisionNote?: string | null;
    resultingEnrollmentId?: string | null;
}

export interface CreateProgramChangeRequestDto {
    targetProgramId: string;
    targetSectionId: string | null;
    reason: string;
}

export interface CreateProgramChangeResponse {
    request: ProgramChangeRequestRecord;
    message?: string;
}

export interface ProgramChangeDecisionRequest {
    decision: 'APPROVE' | 'REJECT';
    note?: string | null;
}

export interface ProgramChangeDecisionResponse {
    request: ProgramChangeRequestRecord;
    withdrawnEnrollment?: StudentEnrollmentRecord | null;
    activatedEnrollment?: StudentEnrollmentRecord | null;
    message?: string;
}

export interface ListProgramChangeRequestsQuery {
    status?: ProgramChangeRequestStatus | 'ALL';
    page?: number;
    limit?: number;
    search?: string;
}

export interface ProgramChangeRequestListResponse {
    items: ProgramChangeRequestRecord[];
    pagination?: PaginationMeta;
}

export interface EnrollmentHistoryResponse {
    sectionTransfers: EnrollmentSectionTransferRecord[];
    programChangeRequests: ProgramChangeRequestRecord[];
}

export interface ProgramChangeRequestFormValues {
    targetProgramId: string;
    targetSectionId: string;
    reason: string;
}

export type ProgramChangeRequestFieldName = keyof ProgramChangeRequestFormValues;
export type ProgramChangeRequestFieldErrors = Partial<
    Record<ProgramChangeRequestFieldName, string>
>;

export interface ProgramChangeDecisionFormValues {
    note: string;
}

export type ProgramChangeDecisionFieldErrors = Partial<
    Record<keyof ProgramChangeDecisionFormValues, string>
>;

export interface EnrollmentActionEligibility {
    allowed: boolean;
    reason: string | null;
}
