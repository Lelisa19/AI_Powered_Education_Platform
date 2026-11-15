import {
    formatAcademicTimestamp,
    mapBackendFieldValidationErrors,
} from '../../academic/schemas/academic-structure-schema';
import type {
    AcademicClass,
    AcademicSection,
    AcademicTerm,
    AcademicYear,
} from '../../academic/types/academic-structure.types';
import type {
    AddProgramCourseFormValues,
    AddProgramCourseRequest,
    CatalogDeleteEligibility,
    Course,
    CourseFieldErrors,
    CourseFormValues,
    CreateCourseRequest,
    CreateProgramRequest,
    CreateTeacherAssignmentRequest,
    EditProgramCourseFormValues,
    OfferingLifecycleStatus,
    Program,
    ProgramCourse,
    ProgramCourseFieldErrors,
    ProgramFieldErrors,
    ProgramFormValues,
    ProgramType,
    TeacherAssignmentFieldErrors,
    TeacherAssignmentFormValues,
    TeacherAssignmentScope,
    TeacherCourseAssignment,
    UpdateProgramCourseRequest,
} from '../types/programs-courses.types';

export { formatAcademicTimestamp, mapBackendFieldValidationErrors };

export const CATALOG_LIMITS = {
    PROGRAM_NAME_MIN: 2,
    PROGRAM_NAME_MAX: 120,
    COURSE_TITLE_MIN: 2,
    COURSE_TITLE_MAX: 150,
    CODE_MAX: 30,
    DESCRIPTION_MAX: 1000,
    CREDIT_HOURS_MIN: 0.5,
    CREDIT_HOURS_MAX: 1000,
    DISPLAY_ORDER_MIN: 1,
    DISPLAY_ORDER_MAX: 9999,
    CURRICULUM_NOTES_MAX: 500,
} as const;

export const PROGRAM_TYPES: readonly ProgramType[] = ['GRADE_BASED', 'SKILL_BASED'];

export const OFFERING_LIFECYCLE_STATUSES: readonly OfferingLifecycleStatus[] = [
    'ACTIVE',
    'INACTIVE',
    'ARCHIVED',
];

const LIFECYCLE_STATUS_TRANSITIONS: Readonly<
    Record<OfferingLifecycleStatus, readonly OfferingLifecycleStatus[]>
> = {
    ACTIVE: ['INACTIVE', 'ARCHIVED'],
    INACTIVE: ['ACTIVE', 'ARCHIVED'],
    ARCHIVED: ['INACTIVE', 'ACTIVE'],
};

const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,29}$/;
const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d{1,2})?$/;

const PROGRAM_TYPE_LABELS: Readonly<Record<ProgramType, string>> = {
    GRADE_BASED: 'Grade-Based Program',
    SKILL_BASED: 'Skill-Based Program',
};

const LIFECYCLE_STATUS_LABELS: Readonly<Record<OfferingLifecycleStatus, string>> = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    ARCHIVED: 'Archived',
};

export function isProgramType(value: unknown): value is ProgramType {
    return value === 'GRADE_BASED' || value === 'SKILL_BASED';
}

export function isOfferingLifecycleStatus(value: unknown): value is OfferingLifecycleStatus {
    return value === 'ACTIVE' || value === 'INACTIVE' || value === 'ARCHIVED';
}

export function formatProgramTypeLabel(type: ProgramType): string {
    return PROGRAM_TYPE_LABELS[type] ?? type;
}

export function formatOfferingStatusLabel(status: OfferingLifecycleStatus): string {
    return LIFECYCLE_STATUS_LABELS[status] ?? status;
}

export function getAllowedOfferingStatusTransitions(
    current: OfferingLifecycleStatus
): readonly OfferingLifecycleStatus[] {
    return LIFECYCLE_STATUS_TRANSITIONS[current] ?? [];
}

function normalizeNullableString(raw: string): string | null {
    const trimmed = raw.trim();
    return trimmed === '' ? null : trimmed;
}

// ==================== Program Forms & Validation ====================

export function createEmptyProgramFormValues(): ProgramFormValues {
    return {
        name: '',
        code: '',
        programType: 'GRADE_BASED',
        academicClassId: '',
        description: '',
        status: 'ACTIVE',
    };
}

export function toProgramFormValues(program: Program): ProgramFormValues {
    return {
        name: program.name,
        code: program.code ?? '',
        programType: program.programType,
        academicClassId:
            program.programType === 'GRADE_BASED' ? program.academicClassId ?? '' : '',
        description: program.description ?? '',
        status: program.status,
    };
}

export function validateProgramForm(options: {
    values: ProgramFormValues;
    classes: readonly AcademicClass[];
    classesLoaded: boolean;
    editingProgram?: Program | null;
}):
    | { valid: true; payload: CreateProgramRequest }
    | { valid: false; fieldErrors: ProgramFieldErrors } {
    const { values, classes, classesLoaded, editingProgram } = options;
    const fieldErrors: ProgramFieldErrors = {};

    const name = values.name.trim();
    if (name.length < CATALOG_LIMITS.PROGRAM_NAME_MIN) {
        fieldErrors.name = `Program name must be at least ${CATALOG_LIMITS.PROGRAM_NAME_MIN} characters.`;
    } else if (name.length > CATALOG_LIMITS.PROGRAM_NAME_MAX) {
        fieldErrors.name = `Program name must be ${CATALOG_LIMITS.PROGRAM_NAME_MAX} characters or fewer.`;
    }

    const code = values.code.trim();
    if (code.length > CATALOG_LIMITS.CODE_MAX) {
        fieldErrors.code = `Code must be ${CATALOG_LIMITS.CODE_MAX} characters or fewer.`;
    } else if (code !== '' && !CODE_PATTERN.test(code)) {
        fieldErrors.code =
            'Code may only use letters, numbers, spaces, hyphens, and underscores.';
    }

    if (!isProgramType(values.programType)) {
        fieldErrors.programType = 'Select either Grade-Based or Skill-Based program type.';
    }

    let resolvedClassId: string | null = null;
    const trimmedClassId = values.academicClassId.trim();

    if (values.programType === 'GRADE_BASED') {
        if (!trimmedClassId) {
            fieldErrors.academicClassId =
                'Grade-Based programs must be linked to an existing Academic Class.';
        } else {
            resolvedClassId = trimmedClassId;
            if (classesLoaded) {
                const matched = classes.find((cls) => cls.id === trimmedClassId);
                if (!matched) {
                    fieldErrors.academicClassId =
                        'Select a valid existing Academic Class from Academic Structure.';
                } else if (
                    matched.status !== 'ACTIVE' &&
                    editingProgram?.academicClassId !== matched.id
                ) {
                    fieldErrors.academicClassId =
                        'Selected Academic Class is inactive. Choose an active Academic Class.';
                }
            }
        }
    } else if (values.programType === 'SKILL_BASED') {
        if (trimmedClassId !== '') {
            fieldErrors.academicClassId =
                'Skill-Based programs cannot be linked to a grade-level Academic Class.';
        }
        resolvedClassId = null;
    }

    if (!isOfferingLifecycleStatus(values.status)) {
        fieldErrors.status = 'Select a valid program lifecycle status.';
    }

    const description = values.description.trim();
    if (description.length > CATALOG_LIMITS.DESCRIPTION_MAX) {
        fieldErrors.description = `Description must be ${CATALOG_LIMITS.DESCRIPTION_MAX} characters or fewer.`;
    }

    if (Object.keys(fieldErrors).length > 0 || !isProgramType(values.programType)) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        payload: {
            name,
            code: normalizeNullableString(values.code),
            programType: values.programType,
            academicClassId: values.programType === 'GRADE_BASED' ? resolvedClassId : null,
            description: normalizeNullableString(values.description),
            status: values.status,
        },
    };
}

export function evaluateProgramDeleteEligibility(options: {
    program: Program;
    canDeletePermission: boolean;
}): CatalogDeleteEligibility {
    const { program, canDeletePermission } = options;

    if (!canDeletePermission) {
        return {
            allowed: false,
            reason: 'Requires programs.delete permission.',
            warningNote: '',
        };
    }

    if (typeof program.courseCount === 'number' && program.courseCount > 0) {
        return {
            allowed: false,
            reason: `Cannot delete while ${program.courseCount} course(s) are linked to this program. Unlink courses first or archive the program.`,
            warningNote: '',
        };
    }

    if (typeof program.enrollmentCount === 'number' && program.enrollmentCount > 0) {
        return {
            allowed: false,
            reason: `Cannot delete while ${program.enrollmentCount} enrollment(s) reference this program. Archive the program instead.`,
            warningNote: '',
        };
    }

    return {
        allowed: true,
        reason: null,
        warningNote:
            'Hard deletion is subject to backend dependency verification. If this program has linked courses, teacher assignments, or student enrollments on the server, deletion will be rejected and Archiving should be used instead.',
    };
}

// ==================== Course Forms & Validation ====================

export function createEmptyCourseFormValues(): CourseFormValues {
    return {
        title: '',
        code: '',
        description: '',
        creditHours: '',
        allowStandalone: false,
        status: 'ACTIVE',
    };
}

export function toCourseFormValues(course: Course): CourseFormValues {
    return {
        title: course.title,
        code: course.code ?? '',
        description: course.description ?? '',
        creditHours:
            typeof course.creditHours === 'number' && Number.isFinite(course.creditHours)
                ? String(course.creditHours)
                : '',
        allowStandalone: course.allowStandalone,
        status: course.status,
    };
}

export function validateCourseForm(
    values: CourseFormValues
):
    | { valid: true; payload: CreateCourseRequest }
    | { valid: false; fieldErrors: CourseFieldErrors } {
    const fieldErrors: CourseFieldErrors = {};

    const title = values.title.trim();
    if (title.length < CATALOG_LIMITS.COURSE_TITLE_MIN) {
        fieldErrors.title = `Course title must be at least ${CATALOG_LIMITS.COURSE_TITLE_MIN} characters.`;
    } else if (title.length > CATALOG_LIMITS.COURSE_TITLE_MAX) {
        fieldErrors.title = `Course title must be ${CATALOG_LIMITS.COURSE_TITLE_MAX} characters or fewer.`;
    }

    const code = values.code.trim();
    if (code.length > CATALOG_LIMITS.CODE_MAX) {
        fieldErrors.code = `Code must be ${CATALOG_LIMITS.CODE_MAX} characters or fewer.`;
    } else if (code !== '' && !CODE_PATTERN.test(code)) {
        fieldErrors.code =
            'Code may only use letters, numbers, spaces, hyphens, and underscores.';
    }

    const rawCredits = values.creditHours.trim();
    let creditHours: number | null = null;
    if (rawCredits !== '') {
        if (!DECIMAL_NUMBER_PATTERN.test(rawCredits)) {
            fieldErrors.creditHours = 'Enter a valid positive number (up to 2 decimal places).';
        } else {
            const parsed = Number.parseFloat(rawCredits);
            if (
                !Number.isFinite(parsed) ||
                parsed < CATALOG_LIMITS.CREDIT_HOURS_MIN ||
                parsed > CATALOG_LIMITS.CREDIT_HOURS_MAX
            ) {
                fieldErrors.creditHours = `Credits / hours must be between ${CATALOG_LIMITS.CREDIT_HOURS_MIN} and ${CATALOG_LIMITS.CREDIT_HOURS_MAX}.`;
            } else {
                creditHours = parsed;
            }
        }
    }

    if (typeof values.allowStandalone !== 'boolean') {
        fieldErrors.allowStandalone = 'Specify whether this course may be offered standalone.';
    }

    if (!isOfferingLifecycleStatus(values.status)) {
        fieldErrors.status = 'Select a valid course lifecycle status.';
    }

    const description = values.description.trim();
    if (description.length > CATALOG_LIMITS.DESCRIPTION_MAX) {
        fieldErrors.description = `Description must be ${CATALOG_LIMITS.DESCRIPTION_MAX} characters or fewer.`;
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        payload: {
            title,
            code: normalizeNullableString(values.code),
            description: normalizeNullableString(values.description),
            creditHours,
            allowStandalone: values.allowStandalone,
            status: values.status,
        },
    };
}

export function evaluateCourseDeleteEligibility(options: {
    course: Course;
    canDeletePermission: boolean;
}): CatalogDeleteEligibility {
    const { course, canDeletePermission } = options;

    if (!canDeletePermission) {
        return {
            allowed: false,
            reason: 'Requires courses.delete permission.',
            warningNote: '',
        };
    }

    if (typeof course.programCount === 'number' && course.programCount > 0) {
        return {
            allowed: false,
            reason: `Cannot delete while linked to ${course.programCount} program(s). Unlink from all programs first or archive the course.`,
            warningNote: '',
        };
    }

    if (typeof course.standaloneTeacherCount === 'number' && course.standaloneTeacherCount > 0) {
        return {
            allowed: false,
            reason: `Cannot delete while ${course.standaloneTeacherCount} standalone teacher assignment(s) remain active.`,
            warningNote: '',
        };
    }

    if (typeof course.enrollmentCount === 'number' && course.enrollmentCount > 0) {
        return {
            allowed: false,
            reason: `Cannot delete while ${course.enrollmentCount} enrollment(s) reference this course. Archive the course instead.`,
            warningNote: '',
        };
    }

    return {
        allowed: true,
        reason: null,
        warningNote:
            'Hard deletion is subject to backend dependency checks. If this course is linked to any Program, teacher assignment, coursework, or student enrollment on the server, deletion will be rejected and Archiving should be used instead.',
    };
}

// ==================== Program Curriculum (ProgramCourse) ====================

export function sortProgramCourses(items: readonly ProgramCourse[]): ProgramCourse[] {
    return [...items].sort(
        (a, b) =>
            a.displayOrder - b.displayOrder ||
            a.courseTitle.localeCompare(b.courseTitle) ||
            a.id.localeCompare(b.id)
    );
}

export function getNextProgramCourseDisplayOrder(items: readonly ProgramCourse[]): number {
    if (items.length === 0) return 1;
    const maxOrder = Math.max(...items.map((item) => item.displayOrder));
    return Math.min(CATALOG_LIMITS.DISPLAY_ORDER_MAX, Math.max(1, maxOrder + 1));
}

export function createEmptyAddProgramCourseValues(
    existingProgramCourses: readonly ProgramCourse[]
): AddProgramCourseFormValues {
    return {
        courseId: '',
        isRequired: true,
        displayOrder: String(getNextProgramCourseDisplayOrder(existingProgramCourses)),
        notes: '',
    };
}

export function toEditProgramCourseFormValues(
    programCourse: ProgramCourse
): EditProgramCourseFormValues {
    return {
        isRequired: programCourse.isRequired,
        displayOrder: String(programCourse.displayOrder),
        notes: programCourse.notes ?? '',
    };
}

const DISPLAY_ORDER_PATTERN = /^\d+$/;

function validateCurriculumRelationshipFields(options: {
    isRequired: boolean;
    displayOrder: string;
    notes: string;
    existingProgramCourses: readonly ProgramCourse[];
    editingProgramCourseId?: string | null;
}):
    | {
          valid: true;
          isRequired: boolean;
          displayOrder: number;
          notes: string | null;
      }
    | { valid: false; fieldErrors: ProgramCourseFieldErrors } {
    const fieldErrors: ProgramCourseFieldErrors = {};

    if (typeof options.isRequired !== 'boolean') {
        fieldErrors.isRequired = 'Specify whether this course is required or elective.';
    }

    const rawOrder = options.displayOrder.trim();
    let parsedOrder = 0;
    if (rawOrder === '') {
        fieldErrors.displayOrder = 'Display order is required.';
    } else if (!DISPLAY_ORDER_PATTERN.test(rawOrder)) {
        fieldErrors.displayOrder = 'Display order must be a whole number.';
    } else {
        parsedOrder = Number.parseInt(rawOrder, 10);
        if (
            !Number.isInteger(parsedOrder) ||
            parsedOrder < CATALOG_LIMITS.DISPLAY_ORDER_MIN ||
            parsedOrder > CATALOG_LIMITS.DISPLAY_ORDER_MAX
        ) {
            fieldErrors.displayOrder = `Display order must be between ${CATALOG_LIMITS.DISPLAY_ORDER_MIN} and ${CATALOG_LIMITS.DISPLAY_ORDER_MAX}.`;
        } else {
            const conflicting = options.existingProgramCourses.find(
                (item) =>
                    item.id !== options.editingProgramCourseId && item.displayOrder === parsedOrder
            );
            if (conflicting) {
                fieldErrors.displayOrder = `Position ${parsedOrder} is already assigned to "${conflicting.courseTitle}". Choose a unique display order.`;
            }
        }
    }

    const trimmedNotes = options.notes.trim();
    if (trimmedNotes.length > CATALOG_LIMITS.CURRICULUM_NOTES_MAX) {
        fieldErrors.notes = `Notes must be ${CATALOG_LIMITS.CURRICULUM_NOTES_MAX} characters or fewer.`;
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        isRequired: options.isRequired,
        displayOrder: parsedOrder,
        notes: trimmedNotes === '' ? null : trimmedNotes,
    };
}

export function validateAddProgramCourseForm(options: {
    values: AddProgramCourseFormValues;
    existingProgramCourses: readonly ProgramCourse[];
    eligibleCourses: readonly Course[];
}):
    | { valid: true; payload: AddProgramCourseRequest }
    | { valid: false; fieldErrors: ProgramCourseFieldErrors } {
    const { values, existingProgramCourses, eligibleCourses } = options;
    const fieldErrors: ProgramCourseFieldErrors = {};

    const cleanCourseId = values.courseId.trim();
    if (!cleanCourseId) {
        fieldErrors.courseId = 'Select an existing Course to add to this Program.';
    } else if (existingProgramCourses.some((item) => item.courseId === cleanCourseId)) {
        fieldErrors.courseId = 'This Course is already linked to the selected Program.';
    } else if (
        eligibleCourses.length > 0 &&
        !eligibleCourses.some((course) => course.id === cleanCourseId)
    ) {
        fieldErrors.courseId = 'Selected Course is not eligible for addition to this Program.';
    }

    const sharedResult = validateCurriculumRelationshipFields({
        isRequired: values.isRequired,
        displayOrder: values.displayOrder,
        notes: values.notes,
        existingProgramCourses,
        editingProgramCourseId: null,
    });

    if (!sharedResult.valid) {
        Object.assign(fieldErrors, sharedResult.fieldErrors);
    }

    if (Object.keys(fieldErrors).length > 0 || !sharedResult.valid) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        payload: {
            courseId: cleanCourseId,
            isRequired: sharedResult.isRequired,
            displayOrder: sharedResult.displayOrder,
            ...(sharedResult.notes !== null ? { notes: sharedResult.notes } : {}),
        },
    };
}

export function validateEditProgramCourseForm(options: {
    values: EditProgramCourseFormValues;
    editingProgramCourse: ProgramCourse;
    existingProgramCourses: readonly ProgramCourse[];
}):
    | { valid: true; payload: UpdateProgramCourseRequest }
    | { valid: false; fieldErrors: ProgramCourseFieldErrors } {
    const sharedResult = validateCurriculumRelationshipFields({
        isRequired: options.values.isRequired,
        displayOrder: options.values.displayOrder,
        notes: options.values.notes,
        existingProgramCourses: options.existingProgramCourses,
        editingProgramCourseId: options.editingProgramCourse.id,
    });

    if (!sharedResult.valid) {
        return sharedResult;
    }

    return {
        valid: true,
        payload: {
            isRequired: sharedResult.isRequired,
            displayOrder: sharedResult.displayOrder,
            notes: sharedResult.notes,
        },
    };
}

export function buildReorderedProgramCourseIds(
    items: readonly ProgramCourse[],
    programCourseId: string,
    direction: 'up' | 'down'
): string[] | null {
    const sorted = sortProgramCourses(items);
    const currentIndex = sorted.findIndex((item) => item.id === programCourseId);
    if (currentIndex === -1) return null;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return null;

    const reordered = [...sorted];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    return reordered.map((item) => item.id);
}

export const TEACHER_ASSIGNMENT_SCOPES: readonly TeacherAssignmentScope[] = [
    'PROGRAM_COURSE',
    'STANDALONE_COURSE',
];

export function isTeacherAssignmentScope(value: unknown): value is TeacherAssignmentScope {
    return typeof value === 'string' && TEACHER_ASSIGNMENT_SCOPES.includes(value as TeacherAssignmentScope);
}

function normalizeScopePart(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
}

/**
 * Computes a canonical uniqueness key for one TeacherCourseAssignment across
 * Course, Scope, Program/ProgramCourse (when PROGRAM_COURSE), Teacher,
 * Academic Year, Term, and Section.
 */
export function buildAssignmentScopeKey(input: {
    scope: TeacherAssignmentScope;
    programCourseId?: string | null;
    programId?: string | null;
    courseId: string;
    teacherId: string;
    academicYearId?: string | null;
    termId?: string | null;
    sectionId?: string | null;
}): string {
    const programId = input.scope === 'PROGRAM_COURSE' ? normalizeScopePart(input.programId) : '';
    const programCourseId =
        input.scope === 'PROGRAM_COURSE' ? normalizeScopePart(input.programCourseId) : '';
    const sectionId = input.scope === 'PROGRAM_COURSE' ? normalizeScopePart(input.sectionId) : '';

    return [
        input.scope,
        programId,
        programCourseId,
        normalizeScopePart(input.courseId),
        normalizeScopePart(input.teacherId),
        normalizeScopePart(input.academicYearId),
        normalizeScopePart(input.termId),
        sectionId,
    ].join('|');
}

export function isDuplicateAssignmentScope(
    candidate: {
        scope: TeacherAssignmentScope;
        programCourseId?: string | null;
        programId?: string | null;
        courseId: string;
        teacherId: string;
        academicYearId?: string | null;
        termId?: string | null;
        sectionId?: string | null;
    },
    existingAssignments: readonly TeacherCourseAssignment[]
): boolean {
    const candidateKey = buildAssignmentScopeKey(candidate);
    return existingAssignments.some(
        (existing) => buildAssignmentScopeKey(existing) === candidateKey
    );
}

export function validateTeacherAssignmentForm(options: {
    scope: TeacherAssignmentScope;
    program: Program | null;
    programCourse: ProgramCourse | null;
    course: Pick<Course, 'id' | 'title' | 'allowStandalone' | 'status'>;
    selectedTeacherIds: readonly string[];
    values: TeacherAssignmentFormValues;
    academicYears: readonly AcademicYear[];
    terms: readonly AcademicTerm[];
    sections: readonly AcademicSection[];
    existingAssignments: readonly TeacherCourseAssignment[];
    canReadYears: boolean;
}):
    | { valid: true; requests: CreateTeacherAssignmentRequest[] }
    | { valid: false; fieldErrors: TeacherAssignmentFieldErrors; generalError?: string } {
    const {
        scope,
        program,
        programCourse,
        course,
        selectedTeacherIds,
        values,
        academicYears,
        terms,
        sections,
        existingAssignments,
        canReadYears,
    } = options;

    const fieldErrors: TeacherAssignmentFieldErrors = {};

    if (scope === 'PROGRAM_COURSE') {
        if (
            !program ||
            !programCourse ||
            programCourse.programId !== program.id ||
            programCourse.courseId !== course.id
        ) {
            return {
                valid: false,
                fieldErrors,
                generalError: 'Invalid Program-Course target for teacher assignment.',
            };
        }
        if (program.status === 'ARCHIVED') {
            return {
                valid: false,
                fieldErrors,
                generalError:
                    'New teacher assignments cannot be added to an Archived Program.',
            };
        }
    } else {
        if (!course.allowStandalone) {
            return {
                valid: false,
                fieldErrors,
                generalError:
                    'Standalone teacher assignments are disabled because this Course has allowStandalone = false.',
            };
        }
    }

    if (course.status === 'ARCHIVED') {
        return {
            valid: false,
            fieldErrors,
            generalError:
                'New teacher assignments cannot be added to an Archived Course.',
        };
    }

    const cleanYearId = values.academicYearId.trim() || null;
    const cleanTermId = values.termId.trim() || null;
    const cleanSectionId = values.sectionId.trim() || null;
    const isGradeBasedProgram = scope === 'PROGRAM_COURSE' && program?.programType === 'GRADE_BASED';

    if (isGradeBasedProgram) {
        if (!canReadYears) {
            fieldErrors.academicYearId =
                'Missing academic_years.read permission to select a required Academic Year for Grade-based Program assignments.';
        } else if (!cleanYearId) {
            fieldErrors.academicYearId =
                'Academic Year is required for Grade-based Program teacher assignments.';
        }
    }

    if (cleanYearId && academicYears.length > 0) {
        const matchedYear = academicYears.find((year) => year.id === cleanYearId);
        if (!matchedYear) {
            fieldErrors.academicYearId = 'Selected Academic Year was not found for this school.';
        } else if (matchedYear.status === 'ARCHIVED' || matchedYear.status === 'COMPLETED') {
            fieldErrors.academicYearId =
                'Selected Academic Year is closed/archived. Choose a Planned or Active Academic Year.';
        }
    }

    if (cleanTermId) {
        if (!cleanYearId) {
            fieldErrors.termId = 'Select an Academic Year before selecting a Term.';
        } else if (terms.length > 0) {
            const matchedTerm = terms.find((term) => term.id === cleanTermId);
            if (!matchedTerm || matchedTerm.academicYearId !== cleanYearId) {
                fieldErrors.termId = 'Selected Term must belong to the chosen Academic Year.';
            } else if (
                matchedTerm.status === 'ARCHIVED' ||
                matchedTerm.status === 'COMPLETED'
            ) {
                fieldErrors.termId =
                    'Selected Term is closed/archived. Choose a Planned or Active Term.';
            }
        }
    }

    if (cleanSectionId) {
        if (!isGradeBasedProgram) {
            fieldErrors.sectionId =
                'Grade Sections only apply to Grade-based Program assignments.';
        } else if (sections.length > 0) {
            const matchedSection = sections.find((section) => section.id === cleanSectionId);
            if (!matchedSection || matchedSection.classId !== program?.academicClassId) {
                fieldErrors.sectionId =
                    'Selected Section must belong to the Grade-based Program academic class.';
            } else if (matchedSection.status !== 'ACTIVE') {
                fieldErrors.sectionId =
                    'Selected Section is inactive. Choose an Active Grade Section.';
            }
        }
    }

    const uniqueTeacherIds = Array.from(
        new Set(selectedTeacherIds.map((id) => id.trim()).filter((id) => id !== ''))
    );
    if (uniqueTeacherIds.length === 0) {
        fieldErrors.teacherIds = 'Select at least one eligible active teacher to assign.';
    } else {
        const duplicates = uniqueTeacherIds.filter((teacherId) =>
            isDuplicateAssignmentScope(
                {
                    scope,
                    programId: scope === 'PROGRAM_COURSE' ? program?.id ?? null : null,
                    programCourseId: scope === 'PROGRAM_COURSE' ? programCourse?.id ?? null : null,
                    courseId: course.id,
                    teacherId,
                    academicYearId: cleanYearId,
                    termId: cleanTermId,
                    sectionId: isGradeBasedProgram ? cleanSectionId : null,
                },
                existingAssignments
            )
        );
        if (duplicates.length > 0) {
            fieldErrors.teacherIds =
                duplicates.length === 1
                    ? 'One selected teacher is already assigned for this exact course and academic scope.'
                    : 'One or more selected teachers are already assigned for this exact course and academic scope.';
        }
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    const requests: CreateTeacherAssignmentRequest[] = uniqueTeacherIds.map((teacherId) => ({
        scope,
        ...(scope === 'PROGRAM_COURSE'
            ? {
                  programCourseId: programCourse!.id,
                  programId: program!.id,
              }
            : {
                  programCourseId: null,
                  programId: null,
              }),
        courseId: course.id,
        teacherId,
        academicYearId: cleanYearId,
        termId: cleanYearId ? cleanTermId : null,
        sectionId: isGradeBasedProgram ? cleanSectionId : null,
        ...(values.isPrimaryInstructor ? { isPrimaryInstructor: true } : {}),
    }));

    return { valid: true, requests };
}


