import React, { useMemo, useState } from 'react';
import { PERMISSIONS } from '../../../constants/permissions';
import { ApiError } from '../../../services/api/api-error';
import { AcademicModalShell } from '../../academic/components/AcademicConfirmDialog';
import type { AcademicSection, AcademicYear } from '../../academic/types/academic-structure.types';
import type { Course, Program } from '../../programs-courses/types/programs-courses.types';
import { formatStudentFullName } from '../../students/schemas/student-management-schema';
import type { StudentDirectoryItem } from '../../students/types/student-management.types';
import type {
    EnrollmentFetchError,
    EnrollmentMutationOutcome,
} from '../hooks/useStudentEnrollments';
import {
    ENROLLMENT_LIMITS,
    ENROLLMENT_TYPES,
    createEmptyEnrollmentFormValues,
    findActiveGradeProgramForYear,
    findDuplicateGradeProgramEnrollment,
    findDuplicateSkillProgramEnrollment,
    findDuplicateStandaloneCourseEnrollment,
    formatEnrollmentTypeLabel,
    mapBackendFieldValidationErrors,
    validateEnrollmentForm,
} from '../schemas/enrollment-schema';
import type {
    CreateProgramEnrollmentRequest,
    CreateStandaloneCourseEnrollmentRequest,
    EnrollmentFieldErrors,
    EnrollmentFieldName,
    EnrollmentFormValues,
    EnrollmentType,
    StudentEnrollmentRecord,
} from '../types/enrollment.types';

const ENROLLMENT_ERROR_FIELDS: readonly EnrollmentFieldName[] = [
    'enrollmentType',
    'programId',
    'academicYearId',
    'sectionId',
    'courseId',
    'notes',
];

const ENROLLMENT_TYPE_DESCRIPTIONS: Readonly<Record<EnrollmentType, string>> = {
    GRADE_BASED_PROGRAM:
        'Requires an ACTIVE Grade-Based Program, an ACTIVE or PLANNED Academic Year, uses the Program’s fixed Academic Class, and allows an optional Section.',
    SKILL_BASED_PROGRAM:
        'Enroll in an ACTIVE Skill-Based Program independently of Academic Year, Class, and Section.',
    STANDALONE_COURSE:
        'Enroll directly in an ACTIVE standalone-enabled Course (allowStandalone = true), independent of Program curriculum membership.',
};

interface EnrollmentCreationModalProps {
    student: StudentDirectoryItem;
    canReadEnrollments: boolean;
    canCreateEnrollments: boolean;
    canReadPrograms: boolean;
    canReadCourses: boolean;
    canReadAcademicYears: boolean;
    canReadSections: boolean;
    enrollmentsLoaded: boolean;
    existingEnrollments: readonly StudentEnrollmentRecord[];
    programs: readonly Program[];
    isLoadingPrograms: boolean;
    programsError: EnrollmentFetchError | null;
    standaloneCourses: readonly Course[];
    isLoadingCourses: boolean;
    coursesError: EnrollmentFetchError | null;
    academicYears: readonly AcademicYear[];
    isLoadingYears: boolean;
    yearsError: EnrollmentFetchError | null;
    sections: readonly AcademicSection[];
    isLoadingSections: boolean;
    sectionsError: EnrollmentFetchError | null;
    isSubmitting: boolean;
    onCreationTypeChange: (nextType: '' | EnrollmentType) => void;
    onSelectedClassChange: (nextClassId: string | null) => void;
    onRetryPrograms: () => void;
    onRetryCourses: () => void;
    onRetryYears: () => void;
    onRetrySections: () => void;
    onSubmitProgramEnrollment: (
        request: CreateProgramEnrollmentRequest,
        context: {
            program: Program;
            academicYear?: AcademicYear | null;
            section?: AcademicSection | null;
        }
    ) => Promise<EnrollmentMutationOutcome>;
    onSubmitStandaloneCourseEnrollment: (
        request: CreateStandaloneCourseEnrollmentRequest,
        context: {
            course: Course;
        }
    ) => Promise<EnrollmentMutationOutcome>;
    onClose: () => void;
}

export const EnrollmentCreationModal: React.FC<EnrollmentCreationModalProps> = ({
    student,
    canReadEnrollments,
    canCreateEnrollments,
    canReadPrograms,
    canReadCourses,
    canReadAcademicYears,
    canReadSections,
    enrollmentsLoaded,
    existingEnrollments,
    programs,
    isLoadingPrograms,
    programsError,
    standaloneCourses,
    isLoadingCourses,
    coursesError,
    academicYears,
    isLoadingYears,
    yearsError,
    sections,
    isLoadingSections,
    sectionsError,
    isSubmitting,
    onCreationTypeChange,
    onSelectedClassChange,
    onRetryPrograms,
    onRetryCourses,
    onRetryYears,
    onRetrySections,
    onSubmitProgramEnrollment,
    onSubmitStandaloneCourseEnrollment,
    onClose,
}) => {
    const [values, setValues] = useState<EnrollmentFormValues>(() =>
        createEmptyEnrollmentFormValues()
    );
    const [fieldErrors, setFieldErrors] = useState<EnrollmentFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const fullName = formatStudentFullName(
        student.firstName,
        student.lastName,
        student.email
    );

    const selectedProgram = useMemo(
        () => programs.find((item) => item.id === values.programId.trim()) ?? null,
        [programs, values.programId]
    );

    const activeGradeConflict = useMemo(() => {
        if (
            values.enrollmentType !== 'GRADE_BASED_PROGRAM' ||
            !enrollmentsLoaded ||
            !values.academicYearId.trim()
        ) {
            return null;
        }
        return findActiveGradeProgramForYear(existingEnrollments, values.academicYearId);
    }, [enrollmentsLoaded, existingEnrollments, values.academicYearId, values.enrollmentType]);

    const handleTypeSelect = (nextType: EnrollmentType) => {
        if (isSubmitting) return;
        setSubmitError(null);
        setFieldErrors({});
        setValues((prev) => ({
            ...createEmptyEnrollmentFormValues(),
            enrollmentType: nextType,
            notes: prev.notes,
        }));
        onCreationTypeChange(nextType);
        onSelectedClassChange(null);
    };

    const handleProgramSelect = (nextProgramId: string) => {
        setSubmitError(null);
        setFieldErrors((prev) => ({
            ...prev,
            programId: undefined,
            sectionId: undefined,
        }));
        setValues((prev) => ({
            ...prev,
            programId: nextProgramId,
            sectionId: '',
        }));

        if (values.enrollmentType === 'GRADE_BASED_PROGRAM') {
            const matched = programs.find((item) => item.id === nextProgramId.trim());
            onSelectedClassChange(matched?.academicClassId ?? null);
        } else {
            onSelectedClassChange(null);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        setSubmitError(null);
        const validation = validateEnrollmentForm({
            student,
            values,
            canCreateEnrollments,
            canReadPrograms,
            canReadCourses,
            canReadAcademicYears,
            canReadSections,
            programs,
            courses: standaloneCourses,
            academicYears,
            sections,
            enrollmentsLoaded,
            existingEnrollments,
        });

        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            if (validation.generalError) {
                setSubmitError(validation.generalError);
            }
            return;
        }
        setFieldErrors({});

        const outcome =
            validation.kind === 'PROGRAM'
                ? await onSubmitProgramEnrollment(validation.payload, {
                      program: validation.selectedProgram,
                      academicYear: validation.selectedYear,
                      section: validation.selectedSection,
                  })
                : await onSubmitStandaloneCourseEnrollment(validation.payload, {
                      course: validation.selectedCourse,
                  });

        if (outcome.ok) {
            onClose();
            return;
        }

        if (outcome.error instanceof ApiError && outcome.error.validationErrors) {
            setFieldErrors(
                mapBackendFieldValidationErrors(
                    outcome.error.validationErrors,
                    ENROLLMENT_ERROR_FIELDS
                )
            );
        }
        setSubmitError(outcome.errorMessage ?? 'Unable to create student enrollment.');
    };

    const hasMissingRequiredCatalogForSelection =
        (values.enrollmentType === 'GRADE_BASED_PROGRAM' &&
            (!canReadPrograms || !canReadAcademicYears)) ||
        (values.enrollmentType === 'SKILL_BASED_PROGRAM' && !canReadPrograms) ||
        (values.enrollmentType === 'STANDALONE_COURSE' && !canReadCourses);

    return (
        <AcademicModalShell
            title={`Add Enrollment: ${fullName}`}
            subtitle="Direct School Admin enrollments start in ACTIVE status and keep payment verification separate."
            isSubmitting={isSubmitting}
            onClose={onClose}
            maxWidthClass="max-w-2xl"
        >
            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-sm text-gray-700">
                <div
                    role="note"
                    className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950"
                >
                    <p>
                        Enrolling an eligible <strong>ACTIVE</strong> student creates an{' '}
                        <code className="font-mono">ACTIVE</code> enrollment record. Payment status
                        and fee verification remain separate.
                    </p>
                    {!canReadEnrollments && (
                        <p className="mt-1 text-blue-900">
                            Note: Because <code className="font-mono">{PERMISSIONS.ENROLLMENTS.READ}</code>{' '}
                            is not granted, duplicate and one-active-grade-program-per-year rules
                            are enforced server-side on submit.
                        </p>
                    )}
                </div>

                {submitError && (
                    <div
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                    >
                        {submitError}
                    </div>
                )}

                {/* Step 1: Select Enrollment Type First */}
                <fieldset className="space-y-2">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        1. Select Enrollment Type <span className="text-red-600">*</span>
                    </legend>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        {ENROLLMENT_TYPES.map((typeOption) => {
                            const isSelected = values.enrollmentType === typeOption;
                            return (
                                <button
                                    key={typeOption}
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => handleTypeSelect(typeOption)}
                                    aria-pressed={isSelected}
                                    className={`rounded-md border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                                        isSelected
                                            ? 'border-blue-600 bg-blue-50 text-blue-950'
                                            : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="block text-xs font-semibold">
                                        {formatEnrollmentTypeLabel(typeOption)}
                                    </span>
                                    <span className="mt-1 block text-[11px] leading-snug text-gray-600">
                                        {ENROLLMENT_TYPE_DESCRIPTIONS[typeOption]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {fieldErrors.enrollmentType && (
                        <p role="alert" className="text-xs text-red-600">
                            {fieldErrors.enrollmentType}
                        </p>
                    )}
                </fieldset>

                {/* Step 2: Fields specific to Grade-Based Program */}
                {values.enrollmentType === 'GRADE_BASED_PROGRAM' && (
                    <div className="space-y-3.5 rounded-md border border-indigo-200 bg-indigo-50/30 p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-950">
                            2. Grade-Based Program Placement
                        </h3>

                        {/* Program selector */}
                        <div>
                            <label
                                htmlFor="enroll-grade-program"
                                className="block text-xs font-medium text-gray-700"
                            >
                                Active Grade-Based Program <span className="text-red-600">*</span>
                            </label>
                            {!canReadPrograms ? (
                                <p role="alert" className="mt-1 text-xs text-red-700">
                                    Viewing Programs requires{' '}
                                    <code className="font-mono">{PERMISSIONS.PROGRAMS.READ}</code>{' '}
                                    permission.
                                </p>
                            ) : isLoadingPrograms ? (
                                <p className="mt-1 text-xs text-gray-600">
                                    Loading active Grade-Based Programs...
                                </p>
                            ) : programsError ? (
                                <div className="mt-1 space-y-1 text-xs text-red-700">
                                    <p>{programsError.message}</p>
                                    <button
                                        type="button"
                                        onClick={onRetryPrograms}
                                        className="font-medium underline"
                                    >
                                        Retry loading Programs
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <select
                                        id="enroll-grade-program"
                                        disabled={isSubmitting || programs.length === 0}
                                        value={values.programId}
                                        onChange={(e) => handleProgramSelect(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                                    >
                                        <option value="">
                                            {programs.length === 0
                                                ? 'No active Grade-Based Programs available'
                                                : 'Select an active Grade-Based Program...'}
                                        </option>
                                        {programs.map((program) => {
                                            const dup =
                                                enrollmentsLoaded && values.academicYearId.trim()
                                                    ? findDuplicateGradeProgramEnrollment(
                                                          existingEnrollments,
                                                          program.id,
                                                          values.academicYearId
                                                      )
                                                    : null;
                                            return (
                                                <option key={program.id} value={program.id}>
                                                    {program.name}
                                                    {program.code ? ` (${program.code})` : ''}
                                                    {program.academicClassName
                                                        ? ` · Class: ${program.academicClassName}`
                                                        : ''}
                                                    {dup ? ' [Already Enrolled]' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {fieldErrors.programId && (
                                        <p role="alert" className="mt-1 text-xs text-red-600">
                                            {fieldErrors.programId}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Read-only Academic Class */}
                        {selectedProgram && (
                            <div className="rounded-md border border-indigo-200 bg-white p-3 text-xs">
                                <p className="font-medium text-gray-500">
                                    Associated Academic Class (Read-Only from Program)
                                </p>
                                <p className="mt-0.5 font-semibold text-gray-900">
                                    {selectedProgram.academicClassName ??
                                        selectedProgram.academicClassId ??
                                        'Missing Class'}
                                    {selectedProgram.academicClassCode
                                        ? ` (${selectedProgram.academicClassCode})`
                                        : ''}
                                </p>
                                <p className="mt-0.5 text-[11px] text-gray-500">
                                    Class placement is inherited directly from the selected Program
                                    and cannot be overridden here.
                                </p>
                            </div>
                        )}

                        {/* Academic Year selector */}
                        <div>
                            <label
                                htmlFor="enroll-academic-year"
                                className="block text-xs font-medium text-gray-700"
                            >
                                Academic Year (ACTIVE or PLANNED){' '}
                                <span className="text-red-600">*</span>
                            </label>
                            {!canReadAcademicYears ? (
                                <p role="alert" className="mt-1 text-xs text-red-700">
                                    Viewing Academic Years requires{' '}
                                    <code className="font-mono">
                                        {PERMISSIONS.ACADEMIC_YEARS.READ}
                                    </code>{' '}
                                    permission.
                                </p>
                            ) : isLoadingYears ? (
                                <p className="mt-1 text-xs text-gray-600">
                                    Loading eligible Academic Years...
                                </p>
                            ) : yearsError ? (
                                <div className="mt-1 space-y-1 text-xs text-red-700">
                                    <p>{yearsError.message}</p>
                                    <button
                                        type="button"
                                        onClick={onRetryYears}
                                        className="font-medium underline"
                                    >
                                        Retry loading Academic Years
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <select
                                        id="enroll-academic-year"
                                        disabled={isSubmitting || academicYears.length === 0}
                                        value={values.academicYearId}
                                        onChange={(e) => {
                                            setSubmitError(null);
                                            setFieldErrors((prev) => ({
                                                ...prev,
                                                academicYearId: undefined,
                                                programId: undefined,
                                            }));
                                            setValues((prev) => ({
                                                ...prev,
                                                academicYearId: e.target.value,
                                            }));
                                        }}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                                    >
                                        <option value="">
                                            {academicYears.length === 0
                                                ? 'No ACTIVE or PLANNED Academic Years available'
                                                : 'Select Academic Year...'}
                                        </option>
                                        {academicYears.map((year) => {
                                            const existingActive = enrollmentsLoaded
                                                ? findActiveGradeProgramForYear(
                                                      existingEnrollments,
                                                      year.id
                                                  )
                                                : null;
                                            return (
                                                <option key={year.id} value={year.id}>
                                                    {year.name} ({year.status})
                                                    {existingActive
                                                        ? ` — Active Program: ${
                                                              existingActive.programName ??
                                                              existingActive.programId
                                                          }`
                                                        : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {activeGradeConflict && (
                                        <p
                                            role="note"
                                            className="mt-1 text-xs font-medium text-amber-800"
                                        >
                                            Blocked: Student already has an ACTIVE Grade-Based
                                            Program ({activeGradeConflict.programName ?? 'assigned'})
                                            for this Academic Year. Only one ACTIVE Grade-Based
                                            Program per Academic Year is permitted.
                                        </p>
                                    )}
                                    {fieldErrors.academicYearId && (
                                        <p role="alert" className="mt-1 text-xs text-red-600">
                                            {fieldErrors.academicYearId}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Optional Section selector */}
                        <div>
                            <label
                                htmlFor="enroll-section"
                                className="block text-xs font-medium text-gray-700"
                            >
                                Section{' '}
                                <span className="font-normal text-gray-500">
                                    (Optional · filtered to Program’s Academic Class)
                                </span>
                            </label>
                            {!canReadSections ? (
                                <p className="mt-1 text-xs text-gray-600">
                                    Browsing Sections requires{' '}
                                    <code className="font-mono">{PERMISSIONS.SECTIONS.READ}</code>.
                                    You may still submit without assigning a Section.
                                </p>
                            ) : !selectedProgram ? (
                                <p className="mt-1 text-xs text-gray-500">
                                    Select a Grade-Based Program first to load Sections for its
                                    Academic Class.
                                </p>
                            ) : isLoadingSections ? (
                                <p className="mt-1 text-xs text-gray-600">
                                    Loading active Sections for{' '}
                                    {selectedProgram.academicClassName ?? 'Academic Class'}...
                                </p>
                            ) : sectionsError ? (
                                <div className="mt-1 space-y-1 text-xs text-red-700">
                                    <p>{sectionsError.message}</p>
                                    <button
                                        type="button"
                                        onClick={onRetrySections}
                                        className="font-medium underline"
                                    >
                                        Retry loading Sections
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <select
                                        id="enroll-section"
                                        disabled={isSubmitting}
                                        value={values.sectionId}
                                        onChange={(e) => {
                                            setFieldErrors((prev) => ({
                                                ...prev,
                                                sectionId: undefined,
                                            }));
                                            setValues((prev) => ({
                                                ...prev,
                                                sectionId: e.target.value,
                                            }));
                                        }}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                                    >
                                        <option value="">
                                            No Section assigned (Optional)
                                        </option>
                                        {sections.map((section) => (
                                            <option key={section.id} value={section.id}>
                                                {section.name}
                                                {section.code ? ` (${section.code})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {fieldErrors.sectionId && (
                                        <p role="alert" className="mt-1 text-xs text-red-600">
                                            {fieldErrors.sectionId}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Fields specific to Skill-Based Program */}
                {values.enrollmentType === 'SKILL_BASED_PROGRAM' && (
                    <div className="space-y-3 rounded-md border border-teal-200 bg-teal-50/30 p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-950">
                            2. Skill-Based Program Selection
                        </h3>
                        <div>
                            <label
                                htmlFor="enroll-skill-program"
                                className="block text-xs font-medium text-gray-700"
                            >
                                Active Skill-Based Program <span className="text-red-600">*</span>
                            </label>
                            {!canReadPrograms ? (
                                <p role="alert" className="mt-1 text-xs text-red-700">
                                    Viewing Programs requires{' '}
                                    <code className="font-mono">{PERMISSIONS.PROGRAMS.READ}</code>{' '}
                                    permission.
                                </p>
                            ) : isLoadingPrograms ? (
                                <p className="mt-1 text-xs text-gray-600">
                                    Loading active Skill-Based Programs...
                                </p>
                            ) : programsError ? (
                                <div className="mt-1 space-y-1 text-xs text-red-700">
                                    <p>{programsError.message}</p>
                                    <button
                                        type="button"
                                        onClick={onRetryPrograms}
                                        className="font-medium underline"
                                    >
                                        Retry loading Programs
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <select
                                        id="enroll-skill-program"
                                        disabled={isSubmitting || programs.length === 0}
                                        value={values.programId}
                                        onChange={(e) => handleProgramSelect(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                                    >
                                        <option value="">
                                            {programs.length === 0
                                                ? 'No active Skill-Based Programs available'
                                                : 'Select an active Skill-Based Program...'}
                                        </option>
                                        {programs.map((program) => {
                                            const dup = enrollmentsLoaded
                                                ? findDuplicateSkillProgramEnrollment(
                                                      existingEnrollments,
                                                      program.id
                                                  )
                                                : null;
                                            return (
                                                <option key={program.id} value={program.id}>
                                                    {program.name}
                                                    {program.code ? ` (${program.code})` : ''}
                                                    {dup ? ' [Already Enrolled]' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {fieldErrors.programId && (
                                        <p role="alert" className="mt-1 text-xs text-red-600">
                                            {fieldErrors.programId}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-600">
                            Skill-Based Programs do not bind to Academic Years, Classes, or Sections
                            and may coexist with the student’s Grade-Based or other Skill Programs.
                        </p>
                    </div>
                )}

                {/* Step 2: Fields specific to Standalone Course */}
                {values.enrollmentType === 'STANDALONE_COURSE' && (
                    <div className="space-y-3 rounded-md border border-violet-200 bg-violet-50/30 p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-950">
                            2. Standalone Course Selection
                        </h3>
                        <div>
                            <label
                                htmlFor="enroll-standalone-course"
                                className="block text-xs font-medium text-gray-700"
                            >
                                Eligible Active Course (allowStandalone = true){' '}
                                <span className="text-red-600">*</span>
                            </label>
                            {!canReadCourses ? (
                                <p role="alert" className="mt-1 text-xs text-red-700">
                                    Viewing standalone Courses requires{' '}
                                    <code className="font-mono">{PERMISSIONS.COURSES.READ}</code>{' '}
                                    permission.
                                </p>
                            ) : isLoadingCourses ? (
                                <p className="mt-1 text-xs text-gray-600">
                                    Loading eligible standalone Courses...
                                </p>
                            ) : coursesError ? (
                                <div className="mt-1 space-y-1 text-xs text-red-700">
                                    <p>{coursesError.message}</p>
                                    <button
                                        type="button"
                                        onClick={onRetryCourses}
                                        className="font-medium underline"
                                    >
                                        Retry loading Courses
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <select
                                        id="enroll-standalone-course"
                                        disabled={isSubmitting || standaloneCourses.length === 0}
                                        value={values.courseId}
                                        onChange={(e) => {
                                            setSubmitError(null);
                                            setFieldErrors((prev) => ({
                                                ...prev,
                                                courseId: undefined,
                                            }));
                                            setValues((prev) => ({
                                                ...prev,
                                                courseId: e.target.value,
                                            }));
                                        }}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                                    >
                                        <option value="">
                                            {standaloneCourses.length === 0
                                                ? 'No active standalone Courses available'
                                                : 'Select an eligible standalone Course...'}
                                        </option>
                                        {standaloneCourses.map((course) => {
                                            const dup = enrollmentsLoaded
                                                ? findDuplicateStandaloneCourseEnrollment(
                                                      existingEnrollments,
                                                      course.id
                                                  )
                                                : null;
                                            return (
                                                <option key={course.id} value={course.id}>
                                                    {course.title}
                                                    {course.code ? ` (${course.code})` : ''}
                                                    {dup ? ' [Already Enrolled]' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {fieldErrors.courseId && (
                                        <p role="alert" className="mt-1 text-xs text-red-600">
                                            {fieldErrors.courseId}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-600">
                            Only ACTIVE Courses flagged with <code className="font-mono">allowStandalone = true</code>{' '}
                            are listed. Courses inside a Program are not treated as standalone unless
                            separately enrolled here.
                        </p>
                    </div>
                )}

                {values.enrollmentType !== '' && (
                    <div>
                        <label
                            htmlFor="enroll-notes"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Administrative Notes{' '}
                            <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <textarea
                            id="enroll-notes"
                            rows={2}
                            disabled={isSubmitting}
                            maxLength={ENROLLMENT_LIMITS.NOTES_MAX}
                            value={values.notes}
                            onChange={(e) => {
                                setFieldErrors((prev) => ({ ...prev, notes: undefined }));
                                setValues((prev) => ({ ...prev, notes: e.target.value }));
                            }}
                            placeholder="Optional internal enrollment note..."
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.notes && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.notes}
                            </p>
                        )}
                    </div>
                )}

                <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={
                            isSubmitting ||
                            values.enrollmentType === '' ||
                            hasMissingRequiredCatalogForSelection ||
                            Boolean(activeGradeConflict)
                        }
                        className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? 'Creating Enrollment...' : 'Enroll Student (ACTIVE)'}
                    </button>
                </div>
            </form>
        </AcademicModalShell>
    );
};

