import type { ValidationErrors } from '../../../services/api/api-error';
import type {
    AcademicCalendarStatus,
    AcademicClass,
    AcademicClassFieldErrors,
    AcademicClassFormValues,
    AcademicSection,
    AcademicSectionFieldErrors,
    AcademicSectionFormValues,
    AcademicTerm,
    AcademicTermFieldErrors,
    AcademicTermFormValues,
    AcademicUnitStatus,
    AcademicYear,
    AcademicYearFieldErrors,
    AcademicYearFormValues,
    CreateAcademicClassRequest,
    CreateAcademicSectionRequest,
    CreateAcademicTermRequest,
    CreateAcademicYearRequest,
    DependencyEligibility,
} from '../types/academic-structure.types';

export const ACADEMIC_STRUCTURE_LIMITS = {
    YEAR_NAME_MIN: 2,
    YEAR_NAME_MAX: 100,
    TERM_NAME_MIN: 2,
    TERM_NAME_MAX: 100,
    CLASS_NAME_MIN: 1,
    CLASS_NAME_MAX: 100,
    SECTION_NAME_MIN: 1,
    SECTION_NAME_MAX: 80,
    CODE_MAX: 30,
    DESCRIPTION_MAX: 500,
    DISPLAY_ORDER_MAX: 9999,
    CAPACITY_MAX: 1000,
} as const;

export const ACADEMIC_CALENDAR_STATUSES: readonly AcademicCalendarStatus[] = [
    'PLANNED',
    'ACTIVE',
    'COMPLETED',
    'ARCHIVED',
];

export const ACADEMIC_UNIT_STATUSES: readonly AcademicUnitStatus[] = ['ACTIVE', 'INACTIVE'];

const CALENDAR_STATUS_TRANSITIONS: Readonly<
    Record<AcademicCalendarStatus, readonly AcademicCalendarStatus[]>
> = {
    PLANNED: ['ACTIVE', 'ARCHIVED'],
    ACTIVE: ['COMPLETED', 'ARCHIVED'],
    COMPLETED: ['ACTIVE', 'ARCHIVED'],
    ARCHIVED: ['PLANNED'],
};

const UNIT_STATUS_TRANSITIONS: Readonly<Record<AcademicUnitStatus, readonly AcademicUnitStatus[]>> = {
    ACTIVE: ['INACTIVE'],
    INACTIVE: ['ACTIVE'],
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,29}$/;

export function isAcademicCalendarStatus(value: unknown): value is AcademicCalendarStatus {
    return (
        value === 'PLANNED' ||
        value === 'ACTIVE' ||
        value === 'COMPLETED' ||
        value === 'ARCHIVED'
    );
}

export function isAcademicUnitStatus(value: unknown): value is AcademicUnitStatus {
    return value === 'ACTIVE' || value === 'INACTIVE';
}

export function getAllowedCalendarStatusTransitions(
    current: AcademicCalendarStatus
): readonly AcademicCalendarStatus[] {
    return CALENDAR_STATUS_TRANSITIONS[current] ?? [];
}

export function isCalendarStatusTransitionAllowed(
    current: AcademicCalendarStatus,
    next: AcademicCalendarStatus
): boolean {
    if (current === next) return false;
    return getAllowedCalendarStatusTransitions(current).includes(next);
}

export function getAllowedUnitStatusTransitions(
    current: AcademicUnitStatus
): readonly AcademicUnitStatus[] {
    return UNIT_STATUS_TRANSITIONS[current] ?? [];
}

export function isValidIsoDate(raw: string): boolean {
    const trimmed = raw.trim();
    const match = ISO_DATE_PATTERN.exec(trimmed);
    if (!match) return false;

    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return false;
    }

    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day
    );
}

export function compareIsoDates(left: string, right: string): number {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
}

export function doDateRangesOverlap(
    aStart: string,
    aEnd: string,
    bStart: string,
    bEnd: string
): boolean {
    return compareIsoDates(aStart, bEnd) <= 0 && compareIsoDates(aEnd, bStart) >= 0;
}

function normalizeOptionalString(raw: string): string | undefined {
    const trimmed = raw.trim();
    return trimmed === '' ? undefined : trimmed;
}

// ---------- Academic Year Forms & Validation ----------

export function createEmptyAcademicYearFormValues(): AcademicYearFormValues {
    return {
        name: '',
        startDate: '',
        endDate: '',
        status: 'PLANNED',
        description: '',
    };
}

export function toAcademicYearFormValues(year: AcademicYear): AcademicYearFormValues {
    return {
        name: year.name,
        startDate: year.startDate,
        endDate: year.endDate,
        status: year.status,
        description: year.description ?? '',
    };
}

export type AcademicYearValidationResult =
    | { valid: true; payload: CreateAcademicYearRequest }
    | { valid: false; fieldErrors: AcademicYearFieldErrors };

export function validateAcademicYearForm(options: {
    values: AcademicYearFormValues;
    existingYears: readonly AcademicYear[];
    editingYearId?: string | null;
    loadedTermsForYear?: readonly AcademicTerm[];
    allowStatusSelection?: boolean;
}): AcademicYearValidationResult {
    const {
        values,
        existingYears,
        editingYearId = null,
        loadedTermsForYear = [],
        allowStatusSelection = true,
    } = options;
    const fieldErrors: AcademicYearFieldErrors = {};

    const name = values.name.trim();
    if (
        name.length < ACADEMIC_STRUCTURE_LIMITS.YEAR_NAME_MIN ||
        name.length > ACADEMIC_STRUCTURE_LIMITS.YEAR_NAME_MAX
    ) {
        fieldErrors.name = `Academic year name must be between ${ACADEMIC_STRUCTURE_LIMITS.YEAR_NAME_MIN} and ${ACADEMIC_STRUCTURE_LIMITS.YEAR_NAME_MAX} characters.`;
    } else {
        const lower = name.toLowerCase();
        const duplicate = existingYears.find(
            (item) => item.id !== editingYearId && item.name.trim().toLowerCase() === lower
        );
        if (duplicate) {
            fieldErrors.name = `An academic year named "${duplicate.name}" already exists for this school.`;
        }
    }

    const startDate = values.startDate.trim();
    const endDate = values.endDate.trim();
    const startValid = isValidIsoDate(startDate);
    const endValid = isValidIsoDate(endDate);

    if (!startDate) {
        fieldErrors.startDate = 'Start date is required.';
    } else if (!startValid) {
        fieldErrors.startDate = 'Enter a valid calendar date in YYYY-MM-DD format.';
    }

    if (!endDate) {
        fieldErrors.endDate = 'End date is required.';
    } else if (!endValid) {
        fieldErrors.endDate = 'Enter a valid calendar date in YYYY-MM-DD format.';
    } else if (startValid && compareIsoDates(endDate, startDate) <= 0) {
        fieldErrors.endDate = 'End date must be later than start date.';
    }

    // Check existing child terms do not fall outside updated academic year range
    if (editingYearId && startValid && endValid && compareIsoDates(endDate, startDate) > 0) {
        for (const term of loadedTermsForYear) {
            if (term.academicYearId !== editingYearId) continue;
            if (compareIsoDates(term.startDate, startDate) < 0) {
                fieldErrors.startDate = `Start date cannot be later than existing term "${term.name}" start date (${term.startDate}).`;
                break;
            }
            if (compareIsoDates(term.endDate, endDate) > 0) {
                fieldErrors.endDate = `End date cannot be earlier than existing term "${term.name}" end date (${term.endDate}).`;
                break;
            }
        }
    }

    const description = values.description.trim();
    if (description.length > ACADEMIC_STRUCTURE_LIMITS.DESCRIPTION_MAX) {
        fieldErrors.description = `Description must be ${ACADEMIC_STRUCTURE_LIMITS.DESCRIPTION_MAX} characters or fewer.`;
    }

    if (
        allowStatusSelection &&
        values.status !== 'PLANNED' &&
        values.status !== 'ACTIVE' &&
        !editingYearId
    ) {
        fieldErrors.status = 'New academic years can only start as Planned or Active.';
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        payload: {
            name,
            startDate,
            endDate,
            status: values.status === 'ACTIVE' ? 'ACTIVE' : 'PLANNED',
            ...(description ? { description } : {}),
        },
    };
}

export function evaluateAcademicYearDeleteEligibility(options: {
    year: AcademicYear;
    loadedTerms: readonly AcademicTerm[];
    canDeletePermission: boolean;
}): DependencyEligibility {
    const { year, loadedTerms, canDeletePermission } = options;

    if (!canDeletePermission) {
        return {
            allowed: false,
            reason: 'Requires academic_years.delete permission.',
        };
    }

    if (year.status === 'ACTIVE') {
        return {
            allowed: false,
            reason: 'Active academic years cannot be deleted directly. Mark as Completed or Archived first.',
        };
    }

    const childTermsInMemory = loadedTerms.filter((term) => term.academicYearId === year.id);
    if (childTermsInMemory.length > 0 || (year.termCount ?? 0) > 0) {
        const count = Math.max(childTermsInMemory.length, year.termCount ?? 0);
        return {
            allowed: false,
            reason: `Cannot delete "${year.name}" because ${count} associated term(s) exist. Remove its terms first.`,
        };
    }

    return { allowed: true, reason: null };
}

// ---------- Term Forms & Validation ----------

export function createEmptyAcademicTermFormValues(
    defaultAcademicYearId = ''
): AcademicTermFormValues {
    return {
        academicYearId: defaultAcademicYearId,
        name: '',
        startDate: '',
        endDate: '',
        status: 'PLANNED',
        description: '',
    };
}

export function toAcademicTermFormValues(term: AcademicTerm): AcademicTermFormValues {
    return {
        academicYearId: term.academicYearId,
        name: term.name,
        startDate: term.startDate,
        endDate: term.endDate,
        status: term.status,
        description: term.description ?? '',
    };
}

export type AcademicTermValidationResult =
    | { valid: true; payload: CreateAcademicTermRequest }
    | { valid: false; fieldErrors: AcademicTermFieldErrors };

export function validateAcademicTermForm(options: {
    values: AcademicTermFormValues;
    academicYears: readonly AcademicYear[];
    existingTermsInYear: readonly AcademicTerm[];
    editingTermId?: string | null;
    allowStatusSelection?: boolean;
}): AcademicTermValidationResult {
    const {
        values,
        academicYears,
        existingTermsInYear,
        editingTermId = null,
        allowStatusSelection = true,
    } = options;
    const fieldErrors: AcademicTermFieldErrors = {};

    const academicYearId = values.academicYearId.trim();
    const parentYear = academicYears.find((year) => year.id === academicYearId);
    if (!academicYearId || !parentYear) {
        fieldErrors.academicYearId = 'Select a valid parent academic year.';
    }

    const name = values.name.trim();
    if (
        name.length < ACADEMIC_STRUCTURE_LIMITS.TERM_NAME_MIN ||
        name.length > ACADEMIC_STRUCTURE_LIMITS.TERM_NAME_MAX
    ) {
        fieldErrors.name = `Term name must be between ${ACADEMIC_STRUCTURE_LIMITS.TERM_NAME_MIN} and ${ACADEMIC_STRUCTURE_LIMITS.TERM_NAME_MAX} characters.`;
    } else if (parentYear) {
        const lower = name.toLowerCase();
        const duplicate = existingTermsInYear.find(
            (item) =>
                item.academicYearId === parentYear.id &&
                item.id !== editingTermId &&
                item.name.trim().toLowerCase() === lower
        );
        if (duplicate) {
            fieldErrors.name = `A term named "${duplicate.name}" already exists in ${parentYear.name}.`;
        }
    }

    const startDate = values.startDate.trim();
    const endDate = values.endDate.trim();
    const startValid = isValidIsoDate(startDate);
    const endValid = isValidIsoDate(endDate);

    if (!startDate) {
        fieldErrors.startDate = 'Start date is required.';
    } else if (!startValid) {
        fieldErrors.startDate = 'Enter a valid calendar date in YYYY-MM-DD format.';
    }

    if (!endDate) {
        fieldErrors.endDate = 'End date is required.';
    } else if (!endValid) {
        fieldErrors.endDate = 'Enter a valid calendar date in YYYY-MM-DD format.';
    } else if (startValid && compareIsoDates(endDate, startDate) <= 0) {
        fieldErrors.endDate = 'Term end date must be later than its start date.';
    }

    // Must fall strictly inside selected academic year date boundaries
    if (parentYear && startValid && endValid && compareIsoDates(endDate, startDate) > 0) {
        if (compareIsoDates(startDate, parentYear.startDate) < 0) {
            fieldErrors.startDate = `Term start date cannot precede ${parentYear.name} (${parentYear.startDate}).`;
        }
        if (compareIsoDates(endDate, parentYear.endDate) > 0) {
            fieldErrors.endDate = `Term end date cannot exceed ${parentYear.name} (${parentYear.endDate}).`;
        }

        // Overlap detection against sibling terms in same academic year
        if (!fieldErrors.startDate && !fieldErrors.endDate) {
            const conflictingTerm = existingTermsInYear.find(
                (other) =>
                    other.academicYearId === parentYear.id &&
                    other.id !== editingTermId &&
                    doDateRangesOverlap(startDate, endDate, other.startDate, other.endDate)
            );
            if (conflictingTerm) {
                fieldErrors.startDate = `Dates overlap with existing term "${conflictingTerm.name}" (${conflictingTerm.startDate} to ${conflictingTerm.endDate}).`;
            }
        }
    }

    const description = values.description.trim();
    if (description.length > ACADEMIC_STRUCTURE_LIMITS.DESCRIPTION_MAX) {
        fieldErrors.description = `Description must be ${ACADEMIC_STRUCTURE_LIMITS.DESCRIPTION_MAX} characters or fewer.`;
    }

    if (
        allowStatusSelection &&
        values.status !== 'PLANNED' &&
        values.status !== 'ACTIVE' &&
        !editingTermId
    ) {
        fieldErrors.status = 'New terms can only start as Planned or Active.';
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        payload: {
            academicYearId,
            name,
            startDate,
            endDate,
            status: values.status === 'ACTIVE' ? 'ACTIVE' : 'PLANNED',
            ...(description ? { description } : {}),
        },
    };
}

export function evaluateTermDeleteEligibility(options: {
    term: AcademicTerm;
    canDeletePermission: boolean;
}): DependencyEligibility {
    if (!options.canDeletePermission) {
        return {
            allowed: false,
            reason: 'Requires terms.delete permission.',
        };
    }

    if (options.term.status === 'ACTIVE') {
        return {
            allowed: false,
            reason: 'Active terms cannot be deleted directly. Mark as Completed or Archived first.',
        };
    }

    return { allowed: true, reason: null };
}

// ---------- Class / Grade-Level Forms & Validation ----------

export function createEmptyAcademicClassFormValues(nextDisplayOrder = 1): AcademicClassFormValues {
    return {
        name: '',
        code: '',
        displayOrder: String(nextDisplayOrder),
        status: 'ACTIVE',
        description: '',
    };
}

export function toAcademicClassFormValues(academicClass: AcademicClass): AcademicClassFormValues {
    return {
        name: academicClass.name,
        code: academicClass.code ?? '',
        displayOrder: String(academicClass.displayOrder),
        status: academicClass.status,
        description: academicClass.description ?? '',
    };
}

export type AcademicClassValidationResult =
    | { valid: true; payload: CreateAcademicClassRequest }
    | { valid: false; fieldErrors: AcademicClassFieldErrors };

export function validateAcademicClassForm(options: {
    values: AcademicClassFormValues;
    existingClasses: readonly AcademicClass[];
    editingClassId?: string | null;
}): AcademicClassValidationResult {
    const { values, existingClasses, editingClassId = null } = options;
    const fieldErrors: AcademicClassFieldErrors = {};

    const name = values.name.trim();
    if (
        name.length < ACADEMIC_STRUCTURE_LIMITS.CLASS_NAME_MIN ||
        name.length > ACADEMIC_STRUCTURE_LIMITS.CLASS_NAME_MAX
    ) {
        fieldErrors.name = `Class or level name must be between ${ACADEMIC_STRUCTURE_LIMITS.CLASS_NAME_MIN} and ${ACADEMIC_STRUCTURE_LIMITS.CLASS_NAME_MAX} characters.`;
    } else {
        const lower = name.toLowerCase();
        const duplicate = existingClasses.find(
            (item) => item.id !== editingClassId && item.name.trim().toLowerCase() === lower
        );
        if (duplicate) {
            fieldErrors.name = `A class or level named "${duplicate.name}" already exists.`;
        }
    }

    const code = normalizeOptionalString(values.code);
    if (code) {
        if (code.length > ACADEMIC_STRUCTURE_LIMITS.CODE_MAX || !CODE_PATTERN.test(code)) {
            fieldErrors.code = `Class code must be 1-${ACADEMIC_STRUCTURE_LIMITS.CODE_MAX} alphanumeric characters (spaces, -, _ allowed).`;
        } else {
            const lowerCode = code.toLowerCase();
            const duplicateCode = existingClasses.find(
                (item) =>
                    item.id !== editingClassId &&
                    item.code &&
                    item.code.trim().toLowerCase() === lowerCode
            );
            if (duplicateCode) {
                fieldErrors.code = `Class code "${duplicateCode.code}" is already used by ${duplicateCode.name}.`;
            }
        }
    }

    const displayOrderRaw = values.displayOrder.trim();
    const displayOrderNum = Number(displayOrderRaw);
    if (
        !displayOrderRaw ||
        !Number.isInteger(displayOrderNum) ||
        displayOrderNum < 0 ||
        displayOrderNum > ACADEMIC_STRUCTURE_LIMITS.DISPLAY_ORDER_MAX
    ) {
        fieldErrors.displayOrder = `Display order must be a whole number from 0 to ${ACADEMIC_STRUCTURE_LIMITS.DISPLAY_ORDER_MAX}.`;
    }

    if (!isAcademicUnitStatus(values.status)) {
        fieldErrors.status = 'Select a valid status.';
    }

    const description = values.description.trim();
    if (description.length > ACADEMIC_STRUCTURE_LIMITS.DESCRIPTION_MAX) {
        fieldErrors.description = `Description must be ${ACADEMIC_STRUCTURE_LIMITS.DESCRIPTION_MAX} characters or fewer.`;
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        payload: {
            name,
            ...(code ? { code } : {}),
            displayOrder: displayOrderNum,
            status: values.status,
            ...(description ? { description } : {}),
        },
    };
}

export function evaluateClassDeleteEligibility(options: {
    academicClass: AcademicClass;
    loadedSections: readonly AcademicSection[];
    canDeletePermission: boolean;
}): DependencyEligibility {
    const { academicClass, loadedSections, canDeletePermission } = options;

    if (!canDeletePermission) {
        return {
            allowed: false,
            reason: 'Requires classes.delete permission.',
        };
    }

    const childSectionsInMemory = loadedSections.filter(
        (section) => section.classId === academicClass.id
    );
    if (childSectionsInMemory.length > 0 || (academicClass.sectionCount ?? 0) > 0) {
        const count = Math.max(childSectionsInMemory.length, academicClass.sectionCount ?? 0);
        return {
            allowed: false,
            reason: `Cannot delete "${academicClass.name}" because ${count} section(s) depend on it. Delete or reassign its sections first.`,
        };
    }

    return { allowed: true, reason: null };
}

// ---------- Section Forms & Validation ----------

export function createEmptyAcademicSectionFormValues(
    defaultClassId = ''
): AcademicSectionFormValues {
    return {
        classId: defaultClassId,
        name: '',
        code: '',
        capacity: '',
        status: 'ACTIVE',
        description: '',
    };
}

export function toAcademicSectionFormValues(section: AcademicSection): AcademicSectionFormValues {
    return {
        classId: section.classId,
        name: section.name,
        code: section.code ?? '',
        capacity:
            typeof section.capacity === 'number' && Number.isFinite(section.capacity)
                ? String(section.capacity)
                : '',
        status: section.status,
        description: section.description ?? '',
    };
}

export type AcademicSectionValidationResult =
    | { valid: true; payload: CreateAcademicSectionRequest }
    | { valid: false; fieldErrors: AcademicSectionFieldErrors };

export function validateAcademicSectionForm(options: {
    values: AcademicSectionFormValues;
    classes: readonly AcademicClass[];
    existingSectionsInSchool: readonly AcademicSection[];
    editingSectionId?: string | null;
    previousClassId?: string | null;
}): AcademicSectionValidationResult {
    const {
        values,
        classes,
        existingSectionsInSchool,
        editingSectionId = null,
        previousClassId = null,
    } = options;
    const fieldErrors: AcademicSectionFieldErrors = {};

    const classId = values.classId.trim();
    const parentClass = classes.find((cls) => cls.id === classId);
    if (!classId || !parentClass) {
        fieldErrors.classId = 'Select an existing parent class or grade level.';
    } else if (
        parentClass.status === 'INACTIVE' &&
        (!editingSectionId || previousClassId !== parentClass.id)
    ) {
        fieldErrors.classId = `Parent class "${parentClass.name}" is inactive. Activate it before assigning new sections to it.`;
    }

    const name = values.name.trim();
    if (
        name.length < ACADEMIC_STRUCTURE_LIMITS.SECTION_NAME_MIN ||
        name.length > ACADEMIC_STRUCTURE_LIMITS.SECTION_NAME_MAX
    ) {
        fieldErrors.name = `Section name must be between ${ACADEMIC_STRUCTURE_LIMITS.SECTION_NAME_MIN} and ${ACADEMIC_STRUCTURE_LIMITS.SECTION_NAME_MAX} characters.`;
    } else if (parentClass) {
        const lower = name.toLowerCase();
        const duplicate = existingSectionsInSchool.find(
            (item) =>
                item.classId === parentClass.id &&
                item.id !== editingSectionId &&
                item.name.trim().toLowerCase() === lower
        );
        if (duplicate) {
            fieldErrors.name = `Section "${duplicate.name}" already exists inside ${parentClass.name}.`;
        }
    }

    const code = normalizeOptionalString(values.code);
    if (code) {
        if (code.length > ACADEMIC_STRUCTURE_LIMITS.CODE_MAX || !CODE_PATTERN.test(code)) {
            fieldErrors.code = `Section code must be 1-${ACADEMIC_STRUCTURE_LIMITS.CODE_MAX} alphanumeric characters (spaces, -, _ allowed).`;
        } else if (parentClass) {
            const lowerCode = code.toLowerCase();
            const duplicateCode = existingSectionsInSchool.find(
                (item) =>
                    item.classId === parentClass.id &&
                    item.id !== editingSectionId &&
                    item.code &&
                    item.code.trim().toLowerCase() === lowerCode
            );
            if (duplicateCode) {
                fieldErrors.code = `Section code "${duplicateCode.code}" is already used in ${parentClass.name}.`;
            }
        }
    }

    const capacityRaw = values.capacity.trim();
    let capacityValue: number | null = null;
    if (capacityRaw !== '') {
        const parsedCap = Number(capacityRaw);
        if (
            !Number.isInteger(parsedCap) ||
            parsedCap < 1 ||
            parsedCap > ACADEMIC_STRUCTURE_LIMITS.CAPACITY_MAX
        ) {
            fieldErrors.capacity = `Capacity must be a whole number between 1 and ${ACADEMIC_STRUCTURE_LIMITS.CAPACITY_MAX}.`;
        } else {
            capacityValue = parsedCap;
        }
    }

    if (!isAcademicUnitStatus(values.status)) {
        fieldErrors.status = 'Select a valid status.';
    }

    const description = values.description.trim();
    if (description.length > ACADEMIC_STRUCTURE_LIMITS.DESCRIPTION_MAX) {
        fieldErrors.description = `Description must be ${ACADEMIC_STRUCTURE_LIMITS.DESCRIPTION_MAX} characters or fewer.`;
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        payload: {
            classId,
            name,
            ...(code ? { code } : {}),
            capacity: capacityValue,
            status: values.status,
            ...(description ? { description } : {}),
        },
    };
}

export function evaluateSectionDeleteEligibility(options: {
    section: AcademicSection;
    canDeletePermission: boolean;
}): DependencyEligibility {
    if (!options.canDeletePermission) {
        return {
            allowed: false,
            reason: 'Requires sections.delete permission.',
        };
    }

    return { allowed: true, reason: null };
}

// ---------- Formatting & Error Mapping ----------

export function mapBackendFieldValidationErrors<TField extends string>(
    validationErrors: ValidationErrors | undefined,
    allowedFields: readonly TField[]
): Partial<Record<TField, string>> {
    if (!validationErrors) return {};

    const allowedSet = new Set<string>(allowedFields);
    const mapped: Partial<Record<TField, string>> = {};
    for (const [key, messages] of Object.entries(validationErrors)) {
        if (allowedSet.has(key) && Array.isArray(messages) && messages.length > 0) {
            mapped[key as TField] = messages[0];
        }
    }
    return mapped;
}

export function formatIsoDateDisplay(isoDate?: string | null): string {
    if (!isoDate || !isValidIsoDate(isoDate)) return '—';
    const [y, m, d] = isoDate.split('-').map((n) => Number.parseInt(n, 10));
    const utcDate = new Date(Date.UTC(y, m - 1, d));
    return utcDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

const CALENDAR_STATUS_LABELS: Readonly<Record<AcademicCalendarStatus, string>> = {
    PLANNED: 'Planned',
    ACTIVE: 'Active',
    COMPLETED: 'Completed',
    ARCHIVED: 'Archived',
};

export function formatCalendarStatusLabel(status: AcademicCalendarStatus): string {
    return CALENDAR_STATUS_LABELS[status] ?? status;
}

export function formatAcademicTimestamp(value?: string | null): string | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
