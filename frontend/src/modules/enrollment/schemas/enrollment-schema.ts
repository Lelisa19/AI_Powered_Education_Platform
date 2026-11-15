import {
    formatAcademicTimestamp,
    mapBackendFieldValidationErrors,
} from '../../academic/schemas/academic-structure-schema';
import type {
    AcademicCalendarStatus,
    AcademicSection,
    AcademicYear,
} from '../../academic/types/academic-structure.types';
import type { Course, Program } from '../../programs-courses/types/programs-courses.types';
import { isStudentEligibleForEnrollment } from '../../students/schemas/student-management-schema';
import type { StudentDirectoryItem } from '../../students/types/student-management.types';
import type {
    CreateProgramChangeRequestDto,
    CreateProgramEnrollmentRequest,
    CreateStandaloneCourseEnrollmentRequest,
    EnrollmentActionEligibility,
    EnrollmentFieldErrors,
    EnrollmentFormValues,
    EnrollmentLifecycleStatus,
    EnrollmentStatusUpdateRequest,
    EnrollmentTransitionTargetStatus,
    EnrollmentType,
    GroupedStudentEnrollments,
    ProgramChangeDecisionFieldErrors,
    ProgramChangeDecisionFormValues,
    ProgramChangeDecisionRequest,
    ProgramChangeRequestFieldErrors,
    ProgramChangeRequestFormValues,
    ProgramChangeRequestRecord,
    ProgramChangeRequestStatus,
    SectionTransferFieldErrors,
    SectionTransferFormValues,
    SectionTransferRequest,
    StudentEnrollmentRecord,
} from '../types/enrollment.types';

export { formatAcademicTimestamp, mapBackendFieldValidationErrors };

export const ENROLLMENT_LIMITS = {
    NOTES_MAX: 500,
    ACTION_REASON_MAX: 500,
} as const;

export const ENROLLMENT_TYPES: readonly EnrollmentType[] = [
    'GRADE_BASED_PROGRAM',
    'SKILL_BASED_PROGRAM',
    'STANDALONE_COURSE',
];

export const ENROLLMENT_STATUSES: readonly EnrollmentLifecycleStatus[] = [
    'PENDING',
    'ACTIVE',
    'SUSPENDED',
    'COMPLETED',
    'WITHDRAWN',
    'REJECTED',
];

const ENROLLMENT_TYPE_LABELS: Readonly<Record<EnrollmentType, string>> = {
    GRADE_BASED_PROGRAM: 'Grade-Based Program',
    SKILL_BASED_PROGRAM: 'Skill-Based Program',
    STANDALONE_COURSE: 'Standalone Course',
};

const ENROLLMENT_STATUS_LABELS: Readonly<Record<EnrollmentLifecycleStatus, string>> = {
    PENDING: 'Pending',
    ACTIVE: 'Active',
    SUSPENDED: 'Suspended',
    COMPLETED: 'Completed',
    WITHDRAWN: 'Withdrawn',
    REJECTED: 'Rejected',
};

export function isEnrollmentType(value: unknown): value is EnrollmentType {
    return (
        value === 'GRADE_BASED_PROGRAM' ||
        value === 'SKILL_BASED_PROGRAM' ||
        value === 'STANDALONE_COURSE'
    );
}

export function isEnrollmentLifecycleStatus(value: unknown): value is EnrollmentLifecycleStatus {
    return (
        value === 'PENDING' ||
        value === 'ACTIVE' ||
        value === 'SUSPENDED' ||
        value === 'COMPLETED' ||
        value === 'WITHDRAWN' ||
        value === 'REJECTED'
    );
}

export function formatEnrollmentTypeLabel(type: EnrollmentType): string {
    return ENROLLMENT_TYPE_LABELS[type] ?? type;
}

export function formatEnrollmentStatusLabel(status: EnrollmentLifecycleStatus): string {
    return ENROLLMENT_STATUS_LABELS[status] ?? status;
}

export const PROGRAM_CHANGE_REQUEST_STATUSES: readonly ProgramChangeRequestStatus[] = [
    'PENDING',
    'APPROVED',
    'REJECTED',
];

const PROGRAM_CHANGE_STATUS_LABELS: Readonly<Record<ProgramChangeRequestStatus, string>> = {
    PENDING: 'Pending Approval',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
};

export function isProgramChangeRequestStatus(value: unknown): value is ProgramChangeRequestStatus {
    return value === 'PENDING' || value === 'APPROVED' || value === 'REJECTED';
}

export function formatProgramChangeStatusLabel(status: ProgramChangeRequestStatus): string {
    return PROGRAM_CHANGE_STATUS_LABELS[status] ?? status;
}

/**
 * Approved enrollment lifecycle transition matrix (Step 5.10.4):
 * - PENDING approval UI is deferred until student self-enrollment is implemented.
 * - ACTIVE -> SUSPENDED | COMPLETED | WITHDRAWN
 * - SUSPENDED -> ACTIVE | WITHDRAWN
 * - COMPLETED, WITHDRAWN, and REJECTED are strictly terminal.
 */
export const ALLOWED_ENROLLMENT_STATUS_TRANSITIONS: Readonly<
    Record<EnrollmentLifecycleStatus, readonly EnrollmentTransitionTargetStatus[]>
> = {
    PENDING: [],
    ACTIVE: ['SUSPENDED', 'COMPLETED', 'WITHDRAWN'],
    SUSPENDED: ['ACTIVE', 'WITHDRAWN'],
    COMPLETED: [],
    WITHDRAWN: [],
    REJECTED: [],
};

export function getAllowedEnrollmentStatusTransitions(
    current: EnrollmentLifecycleStatus
): readonly EnrollmentTransitionTargetStatus[] {
    return ALLOWED_ENROLLMENT_STATUS_TRANSITIONS[current] ?? [];
}

export function isEnrollmentTransitionAllowed(
    current: EnrollmentLifecycleStatus,
    next: EnrollmentTransitionTargetStatus
): boolean {
    return getAllowedEnrollmentStatusTransitions(current).includes(next);
}

export function isEnrollmentTransitionReasonRequired(
    targetStatus: EnrollmentTransitionTargetStatus
): boolean {
    return targetStatus === 'SUSPENDED' || targetStatus === 'WITHDRAWN';
}

export function isAcademicYearClosedForEnrollmentMutation(
    status?: AcademicCalendarStatus | null
): boolean {
    return status === 'COMPLETED' || status === 'ARCHIVED';
}

export function isAcademicYearEligibleForGradeEnrollment(
    year: Pick<AcademicYear, 'status'>
): boolean {
    return year.status === 'ACTIVE' || year.status === 'PLANNED';
}

function isOpenOrCompletedDuplicateStatus(status: EnrollmentLifecycleStatus): boolean {
    return status !== 'WITHDRAWN' && status !== 'REJECTED';
}

function isOpenEnrollmentStatus(status: EnrollmentLifecycleStatus): boolean {
    return status === 'PENDING' || status === 'ACTIVE' || status === 'SUSPENDED';
}

/**
 * Enforces the business rule: a student may hold only one ACTIVE grade-based Program
 * enrollment per Academic Year.
 */
export function findActiveGradeProgramForYear(
    existingEnrollments: readonly StudentEnrollmentRecord[],
    academicYearId: string
): StudentEnrollmentRecord | null {
    const cleanYearId = academicYearId.trim();
    if (!cleanYearId) return null;

    return (
        existingEnrollments.find(
            (record) =>
                record.enrollmentType === 'GRADE_BASED_PROGRAM' &&
                record.academicYearId === cleanYearId &&
                record.status === 'ACTIVE'
        ) ?? null
    );
}

export function findDuplicateGradeProgramEnrollment(
    existingEnrollments: readonly StudentEnrollmentRecord[],
    programId: string,
    academicYearId: string
): StudentEnrollmentRecord | null {
    const cleanProgramId = programId.trim();
    const cleanYearId = academicYearId.trim();
    if (!cleanProgramId || !cleanYearId) return null;

    return (
        existingEnrollments.find(
            (record) =>
                record.enrollmentType === 'GRADE_BASED_PROGRAM' &&
                record.programId === cleanProgramId &&
                record.academicYearId === cleanYearId &&
                isOpenOrCompletedDuplicateStatus(record.status)
        ) ?? null
    );
}

export function findDuplicateSkillProgramEnrollment(
    existingEnrollments: readonly StudentEnrollmentRecord[],
    programId: string
): StudentEnrollmentRecord | null {
    const cleanProgramId = programId.trim();
    if (!cleanProgramId) return null;

    return (
        existingEnrollments.find(
            (record) =>
                record.enrollmentType === 'SKILL_BASED_PROGRAM' &&
                record.programId === cleanProgramId &&
                isOpenEnrollmentStatus(record.status)
        ) ?? null
    );
}

export function findDuplicateStandaloneCourseEnrollment(
    existingEnrollments: readonly StudentEnrollmentRecord[],
    courseId: string
): StudentEnrollmentRecord | null {
    const cleanCourseId = courseId.trim();
    if (!cleanCourseId) return null;

    return (
        existingEnrollments.find(
            (record) =>
                record.enrollmentType === 'STANDALONE_COURSE' &&
                record.courseId === cleanCourseId &&
                isOpenEnrollmentStatus(record.status)
        ) ?? null
    );
}

export function groupAndSummarizeEnrollments(
    records: readonly StudentEnrollmentRecord[]
): GroupedStudentEnrollments {
    const gradeBased: StudentEnrollmentRecord[] = [];
    const skillBased: StudentEnrollmentRecord[] = [];
    const standaloneCourses: StudentEnrollmentRecord[] = [];

    let activeCount = 0;
    let activeGradeBasedCount = 0;
    let activeSkillBasedCount = 0;
    let activeStandaloneCourseCount = 0;

    for (const record of records) {
        if (record.status === 'ACTIVE') {
            activeCount += 1;
        }
        if (record.enrollmentType === 'GRADE_BASED_PROGRAM') {
            gradeBased.push(record);
            if (record.status === 'ACTIVE') activeGradeBasedCount += 1;
        } else if (record.enrollmentType === 'SKILL_BASED_PROGRAM') {
            skillBased.push(record);
            if (record.status === 'ACTIVE') activeSkillBasedCount += 1;
        } else if (record.enrollmentType === 'STANDALONE_COURSE') {
            standaloneCourses.push(record);
            if (record.status === 'ACTIVE') activeStandaloneCourseCount += 1;
        }
    }

    return {
        gradeBased,
        skillBased,
        standaloneCourses,
        summary: {
            totalCount: records.length,
            activeCount,
            gradeBasedCount: gradeBased.length,
            activeGradeBasedCount,
            skillBasedCount: skillBased.length,
            activeSkillBasedCount,
            standaloneCourseCount: standaloneCourses.length,
            activeStandaloneCourseCount,
        },
    };
}

export function createEmptyEnrollmentFormValues(): EnrollmentFormValues {
    return {
        enrollmentType: '',
        programId: '',
        academicYearId: '',
        sectionId: '',
        courseId: '',
        notes: '',
    };
}

function normalizeOptionalNotes(raw: string): string | null {
    const trimmed = raw.trim();
    return trimmed === '' ? null : trimmed;
}

export type EnrollmentFormValidationResult =
    | {
          valid: true;
          kind: 'PROGRAM';
          payload: CreateProgramEnrollmentRequest;
          selectedProgram: Program;
          selectedYear: AcademicYear | null;
          selectedSection: AcademicSection | null;
      }
    | {
          valid: true;
          kind: 'STANDALONE_COURSE';
          payload: CreateStandaloneCourseEnrollmentRequest;
          selectedCourse: Course;
      }
    | {
          valid: false;
          fieldErrors: EnrollmentFieldErrors;
          generalError?: string;
      };

export function validateEnrollmentForm(options: {
    student: Pick<StudentDirectoryItem, 'id' | 'roles' | 'status'>;
    values: EnrollmentFormValues;
    canCreateEnrollments: boolean;
    canReadPrograms: boolean;
    canReadCourses: boolean;
    canReadAcademicYears: boolean;
    canReadSections: boolean;
    programs: readonly Program[];
    courses: readonly Course[];
    academicYears: readonly AcademicYear[];
    sections: readonly AcademicSection[];
    enrollmentsLoaded: boolean;
    existingEnrollments: readonly StudentEnrollmentRecord[];
}): EnrollmentFormValidationResult {
    const {
        student,
        values,
        canCreateEnrollments,
        canReadPrograms,
        canReadCourses,
        canReadAcademicYears,
        canReadSections,
        programs,
        courses,
        academicYears,
        sections,
        enrollmentsLoaded,
        existingEnrollments,
    } = options;

    const fieldErrors: EnrollmentFieldErrors = {};

    if (!canCreateEnrollments) {
        return {
            valid: false,
            fieldErrors,
            generalError: 'Creating student enrollments requires enrollments.create permission.',
        };
    }

    const eligibility = isStudentEligibleForEnrollment(student);
    if (!eligibility.allowed) {
        return {
            valid: false,
            fieldErrors,
            generalError:
                eligibility.reason ??
                'Only active accounts holding the STUDENT role can be enrolled.',
        };
    }

    if (!isEnrollmentType(values.enrollmentType)) {
        fieldErrors.enrollmentType = 'Select the enrollment type before continuing.';
        return { valid: false, fieldErrors };
    }

    const trimmedNotes = values.notes.trim();
    if (trimmedNotes.length > ENROLLMENT_LIMITS.NOTES_MAX) {
        fieldErrors.notes = `Notes must be ${ENROLLMENT_LIMITS.NOTES_MAX} characters or fewer.`;
    }

    if (values.enrollmentType === 'GRADE_BASED_PROGRAM') {
        if (!canReadPrograms) {
            fieldErrors.programId = 'Viewing active Programs requires programs.read permission.';
        }
        if (!canReadAcademicYears) {
            fieldErrors.academicYearId =
                'Viewing Academic Years requires academic_years.read permission.';
        }

        const programId = values.programId.trim();
        const yearId = values.academicYearId.trim();
        const sectionId = values.sectionId.trim();

        let matchedProgram: Program | undefined;
        if (!programId) {
            if (!fieldErrors.programId) {
                fieldErrors.programId = 'Select an active Grade-Based Program.';
            }
        } else if (canReadPrograms) {
            matchedProgram = programs.find((item) => item.id === programId);
            if (!matchedProgram) {
                fieldErrors.programId = 'Selected Program was not found in the active catalog.';
            } else if (matchedProgram.programType !== 'GRADE_BASED') {
                fieldErrors.programId = 'Selected Program must be a Grade-Based Program.';
            } else if (matchedProgram.status !== 'ACTIVE') {
                fieldErrors.programId = 'Only ACTIVE Grade-Based Programs are open for enrollment.';
            } else if (!matchedProgram.academicClassId?.trim()) {
                fieldErrors.programId =
                    'Selected Grade-Based Program does not have a valid configured Academic Class.';
            }
        }

        let matchedYear: AcademicYear | undefined;
        if (!yearId) {
            if (!fieldErrors.academicYearId) {
                fieldErrors.academicYearId = 'Select an Academic Year for Grade-Based enrollment.';
            }
        } else if (canReadAcademicYears) {
            matchedYear = academicYears.find((item) => item.id === yearId);
            if (!matchedYear) {
                fieldErrors.academicYearId = 'Selected Academic Year was not found for this school.';
            } else if (!isAcademicYearEligibleForGradeEnrollment(matchedYear)) {
                fieldErrors.academicYearId =
                    'Completed or Archived Academic Years cannot accept new enrollments. Choose an ACTIVE or PLANNED Academic Year.';
            }
        }

        let matchedSection: AcademicSection | null = null;
        if (sectionId !== '') {
            if (!canReadSections) {
                fieldErrors.sectionId =
                    'Assigning a Section requires sections.read permission. Clear the section or request permission.';
            } else if (matchedProgram?.academicClassId) {
                const candidateSection = sections.find((item) => item.id === sectionId);
                if (
                    !candidateSection ||
                    candidateSection.classId !== matchedProgram.academicClassId
                ) {
                    fieldErrors.sectionId =
                        'Selected Section must belong to the Grade-Based Program’s Academic Class.';
                } else if (candidateSection.status !== 'ACTIVE') {
                    fieldErrors.sectionId =
                        'Selected Section is inactive. Choose an ACTIVE Section or leave unassigned.';
                } else {
                    matchedSection = candidateSection;
                }
            }
        }

        if (enrollmentsLoaded && matchedProgram && matchedYear) {
            const exactDuplicate = findDuplicateGradeProgramEnrollment(
                existingEnrollments,
                matchedProgram.id,
                matchedYear.id
            );
            if (exactDuplicate) {
                fieldErrors.programId = `This student already has a ${formatEnrollmentStatusLabel(
                    exactDuplicate.status
                )} enrollment in ${matchedProgram.name} for ${matchedYear.name}.`;
            } else {
                const activeConflict = findActiveGradeProgramForYear(
                    existingEnrollments,
                    matchedYear.id
                );
                if (activeConflict) {
                    fieldErrors.academicYearId = `Student already holds an ACTIVE Grade-Based Program (${
                        activeConflict.programName ?? activeConflict.programId ?? 'another program'
                    }) in ${matchedYear.name}. Only one ACTIVE Grade-Based Program per student per Academic Year is permitted.`;
                }
            }
        }

        if (
            Object.keys(fieldErrors).length > 0 ||
            !matchedProgram ||
            !matchedYear
        ) {
            return { valid: false, fieldErrors };
        }

        return {
            valid: true,
            kind: 'PROGRAM',
            selectedProgram: matchedProgram,
            selectedYear: matchedYear,
            selectedSection: matchedSection,
            payload: {
                programId: matchedProgram.id,
                enrollmentKind: 'GRADE_BASED',
                academicYearId: matchedYear.id,
                sectionId: matchedSection ? matchedSection.id : null,
                initialStatus: 'ACTIVE',
                notes: normalizeOptionalNotes(values.notes),
            },
        };
    }

    if (values.enrollmentType === 'SKILL_BASED_PROGRAM') {
        if (!canReadPrograms) {
            fieldErrors.programId = 'Viewing active Programs requires programs.read permission.';
        }

        const programId = values.programId.trim();
        let matchedProgram: Program | undefined;
        if (!programId) {
            if (!fieldErrors.programId) {
                fieldErrors.programId = 'Select an active Skill-Based Program.';
            }
        } else if (canReadPrograms) {
            matchedProgram = programs.find((item) => item.id === programId);
            if (!matchedProgram) {
                fieldErrors.programId = 'Selected Program was not found in the active catalog.';
            } else if (matchedProgram.programType !== 'SKILL_BASED') {
                fieldErrors.programId = 'Selected Program must be a Skill-Based Program.';
            } else if (matchedProgram.status !== 'ACTIVE') {
                fieldErrors.programId = 'Only ACTIVE Skill-Based Programs are open for enrollment.';
            } else if (matchedProgram.academicClassId) {
                fieldErrors.programId =
                    'Skill-Based Programs cannot carry a grade-level Academic Class binding.';
            }
        }

        if (enrollmentsLoaded && matchedProgram) {
            const duplicate = findDuplicateSkillProgramEnrollment(
                existingEnrollments,
                matchedProgram.id
            );
            if (duplicate) {
                fieldErrors.programId = `This student already holds an open (${formatEnrollmentStatusLabel(
                    duplicate.status
                )}) enrollment in ${matchedProgram.name}.`;
            }
        }

        if (Object.keys(fieldErrors).length > 0 || !matchedProgram) {
            return { valid: false, fieldErrors };
        }

        return {
            valid: true,
            kind: 'PROGRAM',
            selectedProgram: matchedProgram,
            selectedYear: null,
            selectedSection: null,
            payload: {
                programId: matchedProgram.id,
                enrollmentKind: 'SKILL_BASED',
                initialStatus: 'ACTIVE',
                notes: normalizeOptionalNotes(values.notes),
            },
        };
    }

    // STANDALONE_COURSE
    if (!canReadCourses) {
        fieldErrors.courseId =
            'Viewing standalone Courses requires courses.read permission.';
    }

    const courseId = values.courseId.trim();
    let matchedCourse: Course | undefined;
    if (!courseId) {
        if (!fieldErrors.courseId) {
            fieldErrors.courseId = 'Select an eligible active standalone Course.';
        }
    } else if (canReadCourses) {
        matchedCourse = courses.find((item) => item.id === courseId);
        if (!matchedCourse) {
            fieldErrors.courseId = 'Selected Course was not found in the eligible catalog.';
        } else if (matchedCourse.status !== 'ACTIVE') {
            fieldErrors.courseId = 'Only ACTIVE Courses can receive new enrollments.';
        } else if (!matchedCourse.allowStandalone) {
            fieldErrors.courseId =
                'Selected Course is not enabled for standalone enrollment (allowStandalone is false).';
        }
    }

    if (enrollmentsLoaded && matchedCourse) {
        const duplicate = findDuplicateStandaloneCourseEnrollment(
            existingEnrollments,
            matchedCourse.id
        );
        if (duplicate) {
            fieldErrors.courseId = `This student already holds an open (${formatEnrollmentStatusLabel(
                duplicate.status
            )}) standalone enrollment in ${matchedCourse.title}.`;
        }
    }

    if (Object.keys(fieldErrors).length > 0 || !matchedCourse) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        kind: 'STANDALONE_COURSE',
        selectedCourse: matchedCourse,
        payload: {
            courseId: matchedCourse.id,
            initialStatus: 'ACTIVE',
            notes: normalizeOptionalNotes(values.notes),
        },
    };
}

// ==================== Step 5.10.4: Lifecycle, Section Transfers & Program Changes ====================

function resolveEffectiveAcademicYearStatus(
    recordStatus?: AcademicCalendarStatus | null,
    academicYear?: Pick<AcademicYear, 'status'> | null
): AcademicCalendarStatus | null {
    return academicYear?.status ?? recordStatus ?? null;
}

export function validateEnrollmentStatusTransitionReason(
    targetStatus: EnrollmentTransitionTargetStatus,
    rawReason: string
):
    | { valid: true; reason: string | null }
    | { valid: false; error: string } {
    const trimmed = rawReason.trim();
    if (isEnrollmentTransitionReasonRequired(targetStatus) && trimmed === '') {
        return {
            valid: false,
            error:
                targetStatus === 'SUSPENDED'
                    ? 'A suspension reason is required.'
                    : 'A withdrawal reason is required.',
        };
    }
    if (trimmed.length > ENROLLMENT_LIMITS.ACTION_REASON_MAX) {
        return {
            valid: false,
            error: `Reason must be ${ENROLLMENT_LIMITS.ACTION_REASON_MAX} characters or fewer.`,
        };
    }
    return { valid: true, reason: trimmed === '' ? null : trimmed };
}

export function evaluateEnrollmentLifecycleEligibility(options: {
    enrollment: StudentEnrollmentRecord;
    targetStatus: EnrollmentTransitionTargetStatus;
    student: Pick<StudentDirectoryItem, 'status' | 'roles'>;
    existingEnrollments: readonly StudentEnrollmentRecord[];
    academicYear?: Pick<AcademicYear, 'id' | 'status' | 'name'> | null;
    canUpdateEnrollments: boolean;
    canCancelEnrollments: boolean;
}): EnrollmentActionEligibility {
    const {
        enrollment,
        targetStatus,
        student,
        existingEnrollments,
        academicYear,
        canUpdateEnrollments,
        canCancelEnrollments,
    } = options;

    if (targetStatus === 'WITHDRAWN') {
        if (!canCancelEnrollments) {
            return {
                allowed: false,
                reason: 'Withdrawing an enrollment requires enrollments.cancel permission.',
            };
        }
    } else if (!canUpdateEnrollments) {
        return {
            allowed: false,
            reason: 'Updating enrollment lifecycle status requires enrollments.update permission.',
        };
    }

    if (!isEnrollmentTransitionAllowed(enrollment.status, targetStatus)) {
        return {
            allowed: false,
            reason: `Enrollment cannot transition from ${formatEnrollmentStatusLabel(
                enrollment.status
            )} to ${formatEnrollmentStatusLabel(targetStatus)}.`,
        };
    }

    if (enrollment.enrollmentType === 'GRADE_BASED_PROGRAM') {
        const yearStatus = resolveEffectiveAcademicYearStatus(
            enrollment.academicYearStatus,
            academicYear
        );
        if (isAcademicYearClosedForEnrollmentMutation(yearStatus)) {
            return {
                allowed: false,
                reason:
                    'Enrollments belonging to Completed or Archived Academic Years are read-only and cannot be modified.',
            };
        }
    }

    if (targetStatus === 'ACTIVE') {
        const studentCheck = isStudentEligibleForEnrollment(student);
        if (!studentCheck.allowed) {
            return {
                allowed: false,
                reason:
                    studentCheck.reason ??
                    'Cannot reactivate enrollment while the student account is not ACTIVE.',
            };
        }

        if (
            enrollment.enrollmentType === 'GRADE_BASED_PROGRAM' &&
            enrollment.academicYearId
        ) {
            const activeOther = existingEnrollments.find(
                (item) =>
                    item.id !== enrollment.id &&
                    item.enrollmentType === 'GRADE_BASED_PROGRAM' &&
                    item.academicYearId === enrollment.academicYearId &&
                    item.status === 'ACTIVE'
            );
            if (activeOther) {
                return {
                    allowed: false,
                    reason: `Cannot reactivate because the student already holds an ACTIVE Grade-Based Program (${
                        activeOther.programName ?? activeOther.programId ?? 'another program'
                    }) in this Academic Year.`,
                };
            }
        }
    }

    return { allowed: true, reason: null };
}

export function validateEnrollmentStatusUpdateForm(options: {
    enrollment: StudentEnrollmentRecord;
    targetStatus: EnrollmentTransitionTargetStatus;
    rawReason: string;
    student: Pick<StudentDirectoryItem, 'status' | 'roles'>;
    existingEnrollments: readonly StudentEnrollmentRecord[];
    academicYear?: Pick<AcademicYear, 'id' | 'status' | 'name'> | null;
    canUpdateEnrollments: boolean;
    canCancelEnrollments: boolean;
}):
    | { valid: true; payload: EnrollmentStatusUpdateRequest }
    | { valid: false; error: string } {
    const eligibility = evaluateEnrollmentLifecycleEligibility(options);
    if (!eligibility.allowed) {
        return {
            valid: false,
            error: eligibility.reason ?? 'Enrollment lifecycle action is not permitted.',
        };
    }

    const reasonCheck = validateEnrollmentStatusTransitionReason(
        options.targetStatus,
        options.rawReason
    );
    if (!reasonCheck.valid) {
        return { valid: false, error: reasonCheck.error };
    }

    return {
        valid: true,
        payload: {
            targetStatus: options.targetStatus,
            reason: reasonCheck.reason,
        },
    };
}

export function evaluateSectionTransferEligibility(options: {
    enrollment: StudentEnrollmentRecord;
    student: Pick<StudentDirectoryItem, 'status' | 'roles'>;
    academicYear?: Pick<AcademicYear, 'id' | 'status' | 'name'> | null;
    canUpdateEnrollments: boolean;
    canReadSections: boolean;
}): EnrollmentActionEligibility {
    const { enrollment, student, academicYear, canUpdateEnrollments, canReadSections } = options;

    if (!canUpdateEnrollments) {
        return {
            allowed: false,
            reason: 'Section transfer requires enrollments.update permission.',
        };
    }
    if (!canReadSections) {
        return {
            allowed: false,
            reason: 'Selecting a target Section requires sections.read permission.',
        };
    }
    if (enrollment.enrollmentType !== 'GRADE_BASED_PROGRAM') {
        return {
            allowed: false,
            reason: 'Section transfers only apply to Grade-Based Program enrollments.',
        };
    }
    if (enrollment.status !== 'ACTIVE') {
        return {
            allowed: false,
            reason: 'Only ACTIVE Grade-Based Program enrollments can be transferred to another Section.',
        };
    }
    if (!enrollment.academicClassId || !enrollment.academicYearId) {
        return {
            allowed: false,
            reason: 'Enrollment is missing Academic Class or Academic Year scope for transfer.',
        };
    }

    const yearStatus = resolveEffectiveAcademicYearStatus(
        enrollment.academicYearStatus,
        academicYear
    );
    if (isAcademicYearClosedForEnrollmentMutation(yearStatus)) {
        return {
            allowed: false,
            reason:
                'Section transfers are blocked for Completed or Archived Academic Years.',
        };
    }

    const studentCheck = isStudentEligibleForEnrollment(student);
    if (!studentCheck.allowed) {
        return {
            allowed: false,
            reason:
                studentCheck.reason ??
                'Student account must remain ACTIVE with STUDENT role to perform a Section transfer.',
        };
    }

    return { allowed: true, reason: null };
}

export function validateSectionTransferForm(options: {
    enrollment: StudentEnrollmentRecord;
    values: SectionTransferFormValues;
    student: Pick<StudentDirectoryItem, 'status' | 'roles'>;
    academicYear?: Pick<AcademicYear, 'id' | 'status' | 'name'> | null;
    sections: readonly AcademicSection[];
    canUpdateEnrollments: boolean;
    canReadSections: boolean;
}):
    | { valid: true; payload: SectionTransferRequest; targetSection: AcademicSection }
    | { valid: false; fieldErrors: SectionTransferFieldErrors; generalError?: string } {
    const { enrollment, values, sections } = options;
    const fieldErrors: SectionTransferFieldErrors = {};

    const eligibility = evaluateSectionTransferEligibility(options);
    if (!eligibility.allowed) {
        return {
            valid: false,
            fieldErrors,
            generalError: eligibility.reason ?? 'Section transfer is not permitted.',
        };
    }

    const cleanTargetSectionId = values.targetSectionId.trim();
    let matchedSection: AcademicSection | undefined;
    if (!cleanTargetSectionId) {
        fieldErrors.targetSectionId =
            'Select a target ACTIVE Section (section cannot be cleared to null).';
    } else if (cleanTargetSectionId === (enrollment.sectionId ?? '')) {
        fieldErrors.targetSectionId =
            'Select a different Section than the student’s current Section.';
    } else {
        matchedSection = sections.find((item) => item.id === cleanTargetSectionId);
        if (!matchedSection) {
            fieldErrors.targetSectionId =
                'Selected Section was not found for this Academic Class.';
        } else if (matchedSection.classId !== enrollment.academicClassId) {
            fieldErrors.targetSectionId =
                'Target Section must belong to the same Academic Class as the current Program.';
        } else if (matchedSection.status !== 'ACTIVE') {
            fieldErrors.targetSectionId =
                'Target Section must be ACTIVE to accept a Section transfer.';
        }
    }

    const cleanReason = values.reason.trim();
    if (!cleanReason) {
        fieldErrors.reason = 'A transfer reason is required.';
    } else if (cleanReason.length > ENROLLMENT_LIMITS.ACTION_REASON_MAX) {
        fieldErrors.reason = `Transfer reason must be ${ENROLLMENT_LIMITS.ACTION_REASON_MAX} characters or fewer.`;
    }

    if (Object.keys(fieldErrors).length > 0 || !matchedSection) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        targetSection: matchedSection,
        payload: {
            targetSectionId: matchedSection.id,
            reason: cleanReason,
        },
    };
}

export function findPendingProgramChangeForYear(
    requests: readonly ProgramChangeRequestRecord[],
    studentId: string,
    academicYearId: string
): ProgramChangeRequestRecord | null {
    const cleanStudentId = studentId.trim();
    const cleanYearId = academicYearId.trim();
    if (!cleanStudentId || !cleanYearId) return null;

    return (
        requests.find(
            (item) =>
                item.studentId === cleanStudentId &&
                item.academicYearId === cleanYearId &&
                item.status === 'PENDING'
        ) ?? null
    );
}

export function evaluateProgramChangeRequestEligibility(options: {
    sourceEnrollment: StudentEnrollmentRecord;
    student: Pick<StudentDirectoryItem, 'id' | 'status' | 'roles'>;
    academicYear?: Pick<AcademicYear, 'id' | 'status' | 'name'> | null;
    existingProgramChangeRequests: readonly ProgramChangeRequestRecord[];
    canUpdateEnrollments: boolean;
}): EnrollmentActionEligibility {
    const {
        sourceEnrollment,
        student,
        academicYear,
        existingProgramChangeRequests,
        canUpdateEnrollments,
    } = options;

    if (!canUpdateEnrollments) {
        return {
            allowed: false,
            reason: 'Initiating a Grade-Based Program Change Request requires enrollments.update permission.',
        };
    }
    if (sourceEnrollment.enrollmentType !== 'GRADE_BASED_PROGRAM') {
        return {
            allowed: false,
            reason: 'Program Change Requests apply only to Grade-Based Program enrollments.',
        };
    }
    if (sourceEnrollment.status !== 'ACTIVE') {
        return {
            allowed: false,
            reason: 'Only an ACTIVE Grade-Based Program enrollment can initiate a Program Change Request.',
        };
    }
    if (
        !sourceEnrollment.programId ||
        !sourceEnrollment.academicYearId ||
        !sourceEnrollment.academicClassId
    ) {
        return {
            allowed: false,
            reason: 'Source enrollment is missing Program, Academic Year, or Academic Class identity.',
        };
    }

    const yearStatus = resolveEffectiveAcademicYearStatus(
        sourceEnrollment.academicYearStatus,
        academicYear
    );
    if (isAcademicYearClosedForEnrollmentMutation(yearStatus)) {
        return {
            allowed: false,
            reason:
                'Program Change Requests are blocked for Completed or Archived Academic Years.',
        };
    }

    const studentCheck = isStudentEligibleForEnrollment(student);
    if (!studentCheck.allowed) {
        return {
            allowed: false,
            reason:
                studentCheck.reason ??
                'Only ACTIVE student accounts holding the STUDENT role can submit a Program Change Request.',
        };
    }

    const existingPending = findPendingProgramChangeForYear(
        existingProgramChangeRequests,
        student.id,
        sourceEnrollment.academicYearId
    );
    if (existingPending) {
        return {
            allowed: false,
            reason: `A PENDING Grade-Based Program Change Request (${
                existingPending.targetProgramName ?? existingPending.targetProgramId
            }) already exists for this student in this Academic Year.`,
        };
    }

    return { allowed: true, reason: null };
}

export function validateProgramChangeRequestForm(options: {
    sourceEnrollment: StudentEnrollmentRecord;
    values: ProgramChangeRequestFormValues;
    student: Pick<StudentDirectoryItem, 'id' | 'status' | 'roles'>;
    academicYear?: Pick<AcademicYear, 'id' | 'status' | 'name'> | null;
    existingProgramChangeRequests: readonly ProgramChangeRequestRecord[];
    programs: readonly Program[];
    sections: readonly AcademicSection[];
    canUpdateEnrollments: boolean;
    canReadPrograms: boolean;
    canReadSections: boolean;
}):
    | {
          valid: true;
          payload: CreateProgramChangeRequestDto;
          targetProgram: Program;
          targetSection: AcademicSection | null;
      }
    | {
          valid: false;
          fieldErrors: ProgramChangeRequestFieldErrors;
          generalError?: string;
      } {
    const {
        sourceEnrollment,
        values,
        programs,
        sections,
        canReadPrograms,
        canReadSections,
    } = options;
    const fieldErrors: ProgramChangeRequestFieldErrors = {};

    const eligibility = evaluateProgramChangeRequestEligibility(options);
    if (!eligibility.allowed) {
        return {
            valid: false,
            fieldErrors,
            generalError: eligibility.reason ?? 'Program Change Request is not permitted.',
        };
    }

    if (!canReadPrograms) {
        fieldErrors.targetProgramId =
            'Selecting a target Program requires programs.read permission.';
    }

    const cleanTargetProgramId = values.targetProgramId.trim();
    let matchedProgram: Program | undefined;
    if (!cleanTargetProgramId) {
        if (!fieldErrors.targetProgramId) {
            fieldErrors.targetProgramId = 'Select another ACTIVE Grade-Based Program.';
        }
    } else if (canReadPrograms) {
        matchedProgram = programs.find((item) => item.id === cleanTargetProgramId);
        if (!matchedProgram) {
            fieldErrors.targetProgramId =
                'Selected target Program was not found in the active catalog.';
        } else if (matchedProgram.id === sourceEnrollment.programId) {
            fieldErrors.targetProgramId =
                'Target Program must differ from the student’s current Grade-Based Program.';
        } else if (matchedProgram.programType !== 'GRADE_BASED') {
            fieldErrors.targetProgramId =
                'Target Program must be a Grade-Based Program.';
        } else if (matchedProgram.status !== 'ACTIVE') {
            fieldErrors.targetProgramId =
                'Target Grade-Based Program must be ACTIVE.';
        } else if (!matchedProgram.academicClassId?.trim()) {
            fieldErrors.targetProgramId =
                'Target Grade-Based Program does not have a valid configured Academic Class.';
        }
    }

    const cleanTargetSectionId = values.targetSectionId.trim();
    let matchedSection: AcademicSection | null = null;
    if (cleanTargetSectionId !== '') {
        if (!canReadSections) {
            fieldErrors.targetSectionId =
                'Selecting an optional target Section requires sections.read permission.';
        } else if (matchedProgram?.academicClassId) {
            const candidate = sections.find((item) => item.id === cleanTargetSectionId);
            if (!candidate || candidate.classId !== matchedProgram.academicClassId) {
                fieldErrors.targetSectionId =
                    'Target Section must belong to the target Program’s Academic Class.';
            } else if (candidate.status !== 'ACTIVE') {
                fieldErrors.targetSectionId =
                    'Selected target Section is inactive. Choose an ACTIVE Section or leave unassigned.';
            } else {
                matchedSection = candidate;
            }
        }
    }

    const cleanReason = values.reason.trim();
    if (!cleanReason) {
        fieldErrors.reason = 'A reason for the Program Change Request is required.';
    } else if (cleanReason.length > ENROLLMENT_LIMITS.ACTION_REASON_MAX) {
        fieldErrors.reason = `Reason must be ${ENROLLMENT_LIMITS.ACTION_REASON_MAX} characters or fewer.`;
    }

    if (Object.keys(fieldErrors).length > 0 || !matchedProgram) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        targetProgram: matchedProgram,
        targetSection: matchedSection,
        payload: {
            targetProgramId: matchedProgram.id,
            targetSectionId: matchedSection ? matchedSection.id : null,
            reason: cleanReason,
        },
    };
}

export function evaluateProgramChangeDecisionEligibility(options: {
    request: Pick<
        ProgramChangeRequestRecord,
        'status' | 'requestedBy' | 'academicYearStatus'
    >;
    decision?: 'APPROVE' | 'REJECT';
    currentActorId: string | null | undefined;
    canApproveProgramChange: boolean;
    academicYear?: Pick<AcademicYear, 'status'> | null;
    student?: Pick<StudentDirectoryItem, 'status' | 'roles'> | null;
    sourceEnrollment?: Pick<StudentEnrollmentRecord, 'status'> | null;
}): EnrollmentActionEligibility {
    const {
        request,
        decision,
        currentActorId,
        canApproveProgramChange,
        academicYear,
        student,
        sourceEnrollment,
    } = options;

    if (!canApproveProgramChange) {
        return {
            allowed: false,
            reason: 'Reviewing Program Change Requests requires enrollments.approve_program_change permission.',
        };
    }
    if (request.status !== 'PENDING') {
        return {
            allowed: false,
            reason: `This Program Change Request has already been ${formatProgramChangeStatusLabel(
                request.status
            )}.`,
        };
    }
    if (currentActorId && request.requestedBy.id === currentActorId) {
        return {
            allowed: false,
            reason:
                'Separation of duties: The requester who submitted this Program Change Request cannot approve or reject it.',
        };
    }

    const yearStatus = resolveEffectiveAcademicYearStatus(
        request.academicYearStatus,
        academicYear
    );
    if (isAcademicYearClosedForEnrollmentMutation(yearStatus)) {
        return {
            allowed: false,
            reason:
                'Program Change decisions are blocked for Completed or Archived Academic Years.',
        };
    }

    if (decision === 'APPROVE') {
        if (student) {
            const studentCheck = isStudentEligibleForEnrollment(student);
            if (!studentCheck.allowed) {
                return {
                    allowed: false,
                    reason:
                        studentCheck.reason ??
                        'Student account must remain ACTIVE to approve a Program Change Request.',
                };
            }
        }
        if (sourceEnrollment && sourceEnrollment.status !== 'ACTIVE') {
            return {
                allowed: false,
                reason:
                    'Source Grade-Based Program enrollment is no longer ACTIVE and cannot be replaced.',
            };
        }
    }

    return { allowed: true, reason: null };
}

export function validateProgramChangeDecisionForm(options: {
    request: Pick<
        ProgramChangeRequestRecord,
        'status' | 'requestedBy' | 'academicYearStatus'
    >;
    decision: 'APPROVE' | 'REJECT';
    values: ProgramChangeDecisionFormValues;
    currentActorId: string | null | undefined;
    canApproveProgramChange: boolean;
    academicYear?: Pick<AcademicYear, 'status'> | null;
    student?: Pick<StudentDirectoryItem, 'status' | 'roles'> | null;
    sourceEnrollment?: Pick<StudentEnrollmentRecord, 'status'> | null;
}):
    | { valid: true; payload: ProgramChangeDecisionRequest }
    | {
          valid: false;
          fieldErrors: ProgramChangeDecisionFieldErrors;
          generalError?: string;
      } {
    const fieldErrors: ProgramChangeDecisionFieldErrors = {};

    const eligibility = evaluateProgramChangeDecisionEligibility(options);
    if (!eligibility.allowed) {
        return {
            valid: false,
            fieldErrors,
            generalError:
                eligibility.reason ?? 'Program Change decision is not permitted.',
        };
    }

    const trimmedNote = options.values.note.trim();
    if (options.decision === 'REJECT' && trimmedNote === '') {
        fieldErrors.note = 'A decision note is required when rejecting a Program Change Request.';
    } else if (trimmedNote.length > ENROLLMENT_LIMITS.ACTION_REASON_MAX) {
        fieldErrors.note = `Decision note must be ${ENROLLMENT_LIMITS.ACTION_REASON_MAX} characters or fewer.`;
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        payload: {
            decision: options.decision,
            note: trimmedNote === '' ? null : trimmedNote,
        },
    };
}
