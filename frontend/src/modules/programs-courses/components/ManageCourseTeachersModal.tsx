import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PERMISSIONS } from '../../../constants/permissions';
import type { AuthenticatedUser } from '../../../types/auth';
import type { PaginationMeta } from '../../../types/api.types';
import { ApiError } from '../../../services/api/api-error';
import {
    AcademicConfirmDialog,
    AcademicModalShell,
} from '../../academic/components/AcademicConfirmDialog';
import { AcademicAsyncContent } from '../../academic/components/AcademicAsyncContent';
import {
    isAcademicBackendUnavailableError,
    listTermsByAcademicYear,
} from '../../academic/services/academic-structure-service';
import type {
    AcademicSection,
    AcademicTerm,
    AcademicYear,
} from '../../academic/types/academic-structure.types';
import type {
    BatchAssignmentOutcome,
    CatalogFetchError,
    CatalogSubmitOutcome,
} from '../hooks/useProgramsAndCourses';
import {
    buildAssignmentScopeKey,
    formatAcademicTimestamp,
    isDuplicateAssignmentScope,
    validateTeacherAssignmentForm,
} from '../schemas/programs-courses-schema';
import {
    formatCatalogOperationError,
    isCatalogBackendUnavailableError,
    listAssignableTeachers,
} from '../services/programs-courses-service';
import type {
    AssignableTeacher,
    Course,
    CreateTeacherAssignmentRequest,
    Program,
    ProgramCourse,
    TeacherAssignmentFieldErrors,
    TeacherCourseAssignment,
} from '../types/programs-courses.types';
import { ProgramTypeBadge } from './CatalogBadgesAndPagination';

export type TeacherAssignmentModalTarget =
    | {
          scope: 'PROGRAM_COURSE';
          program: Program;
          programCourse: ProgramCourse;
      }
    | {
          scope: 'STANDALONE_COURSE';
          course: Course;
      };

interface ManageCourseTeachersModalProps {
    target: TeacherAssignmentModalTarget;
    actor: AuthenticatedUser | null;
    tenantId: string | null;
    canAssignTeachers: boolean;
    assignments: readonly TeacherCourseAssignment[];
    isLoadingAssignments: boolean;
    assignmentsError: CatalogFetchError | null;
    academicYears: readonly AcademicYear[];
    isLoadingYears: boolean;
    yearsError: CatalogFetchError | null;
    canReadYears: boolean;
    sections: readonly AcademicSection[];
    isLoadingSections: boolean;
    sectionsError: CatalogFetchError | null;
    canReadSections: boolean;
    canReadTerms: boolean;
    isMutating: boolean;
    onRetryAssignments: () => void;
    onRetryYears: () => void;
    onRetrySections: () => void;
    onAssignBatch: (
        requests: CreateTeacherAssignmentRequest[],
        context: {
            program?: Program | null;
            course: Pick<Course, 'id' | 'allowStandalone'>;
        }
    ) => Promise<BatchAssignmentOutcome>;
    onRemoveAssignment: (
        assignment: TeacherCourseAssignment
    ) => Promise<CatalogSubmitOutcome>;
    onClose: () => void;
}

const ASSIGNABLE_PAGE_SIZE = 10;

export const ManageCourseTeachersModal: React.FC<ManageCourseTeachersModalProps> = ({
    target,
    actor,
    tenantId,
    canAssignTeachers,
    assignments,
    isLoadingAssignments,
    assignmentsError,
    academicYears,
    isLoadingYears,
    yearsError,
    canReadYears,
    sections,
    isLoadingSections,
    sectionsError,
    canReadSections,
    canReadTerms,
    isMutating,
    onRetryAssignments,
    onRetryYears,
    onRetrySections,
    onAssignBatch,
    onRemoveAssignment,
    onClose,
}) => {
    const isProgramScope = target.scope === 'PROGRAM_COURSE';
    const program = isProgramScope ? target.program : null;
    const programCourse = isProgramScope ? target.programCourse : null;
    const courseSummary: Pick<Course, 'id' | 'title' | 'code' | 'allowStandalone' | 'status'> =
        isProgramScope
            ? {
                  id: target.programCourse.courseId,
                  title: target.programCourse.courseTitle,
                  code: target.programCourse.courseCode ?? undefined,
                  allowStandalone: target.programCourse.allowStandalone ?? false,
                  status: target.programCourse.courseStatus ?? 'ACTIVE',
              }
            : target.course;

    const isGradeBasedProgram =
        isProgramScope && program?.programType === 'GRADE_BASED';

    const archivedAssignmentBlocker =
        isProgramScope && program?.status === 'ARCHIVED'
            ? 'This Program is Archived. Existing assignments can still be inspected or removed, while new teacher assignments are disabled.'
            : courseSummary.status === 'ARCHIVED'
              ? 'This Course is Archived. Existing assignments can still be inspected or removed, while new teacher assignments are disabled.'
              : null;

    // Scope form fields
    const [academicYearId, setAcademicYearId] = useState('');
    const [termId, setTermId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [isPrimaryInstructor, setIsPrimaryInstructor] = useState(false);

    // Terms lookup scoped to chosen Academic Year
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [termsError, setTermsError] = useState<CatalogFetchError | null>(null);
    const [settledTermsKey, setSettledTermsKey] = useState<string | null>(null);
    const [termsReload, setTermsReload] = useState(0);
    const termsVersionRef = useRef(0);

    const termsLoadKey =
        canAssignTeachers &&
        !archivedAssignmentBlocker &&
        canReadTerms &&
        academicYearId.trim() !== '' &&
        tenantId
            ? `${tenantId}:${academicYearId.trim()}:${termsReload}`
            : null;

    useEffect(() => {
        if (!termsLoadKey || !academicYearId.trim() || !tenantId) return;

        const controller = new AbortController();
        const version = ++termsVersionRef.current;

        listTermsByAcademicYear(academicYearId.trim(), tenantId, controller.signal)
            .then((res) => {
                if (version !== termsVersionRef.current) return;
                setTerms(res.terms);
                setTermsError(null);
                setSettledTermsKey(termsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== termsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setTerms([]);
                setTermsError({
                    message:
                        error instanceof Error && error.message
                            ? error.message
                            : 'Unable to load academic terms.',
                    isBackendUnavailable: isAcademicBackendUnavailableError(error),
                });
                setSettledTermsKey(termsLoadKey);
            });

        return () => controller.abort();
    }, [academicYearId, tenantId, termsLoadKey]);

    const assignableYears = useMemo(
        () =>
            academicYears.filter(
                (year) => year.status === 'ACTIVE' || year.status === 'PLANNED'
            ),
        [academicYears]
    );

    const effectiveTerms = useMemo(() => {
        if (!termsLoadKey) return [];
        return terms.filter(
            (t) =>
                t.academicYearId === academicYearId.trim() &&
                (t.status === 'ACTIVE' || t.status === 'PLANNED')
        );
    }, [academicYearId, terms, termsLoadKey]);

    const isLoadingTerms = Boolean(termsLoadKey && settledTermsKey !== termsLoadKey);

    // Assignable teacher lookup state
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [teacherPage, setTeacherPage] = useState(1);
    const [teacherReload, setTeacherReload] = useState(0);
    const [assignableTeachers, setAssignableTeachers] = useState<AssignableTeacher[]>([]);
    const [teacherPagination, setTeacherPagination] = useState<PaginationMeta | null>(null);
    const [teacherLookupError, setTeacherLookupError] = useState<CatalogFetchError | null>(null);
    const [settledTeacherKey, setSettledTeacherKey] = useState<string | null>(null);
    const teacherVersionRef = useRef(0);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
            setTeacherPage(1);
        }, 250);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const teacherLoadKey =
        canAssignTeachers && !archivedAssignmentBlocker && tenantId && actor
            ? JSON.stringify({
                  tenantId,
                  search: debouncedSearch,
                  page: teacherPage,
                  reload: teacherReload,
              })
            : null;

    useEffect(() => {
        if (!teacherLoadKey || !tenantId || !actor) return;

        const controller = new AbortController();
        const version = ++teacherVersionRef.current;

        listAssignableTeachers(
            {
                ...(debouncedSearch ? { search: debouncedSearch } : {}),
                page: teacherPage,
                limit: ASSIGNABLE_PAGE_SIZE,
            },
            tenantId,
            actor,
            controller.signal
        )
            .then((res) => {
                if (version !== teacherVersionRef.current) return;
                setAssignableTeachers(res.items);
                setTeacherPagination(res.pagination);
                setTeacherLookupError(null);
                setSettledTeacherKey(teacherLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== teacherVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setAssignableTeachers([]);
                setTeacherPagination(null);
                setTeacherLookupError({
                    message: formatCatalogOperationError(
                        error,
                        'Unable to load assignable teachers.'
                    ),
                    isBackendUnavailable: isCatalogBackendUnavailableError(error),
                });
                setSettledTeacherKey(teacherLoadKey);
            });

        return () => controller.abort();
    }, [actor, debouncedSearch, teacherLoadKey, teacherPage, tenantId]);

    const isLoadingTeachers = Boolean(teacherLoadKey && settledTeacherKey !== teacherLoadKey);

    // Selected teachers preserved cleanly across searches & pagination
    const [selectedTeacherMap, setSelectedTeacherMap] = useState<
        Record<string, AssignableTeacher>
    >({});
    const [fieldErrors, setFieldErrors] = useState<TeacherAssignmentFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitNotice, setSubmitNotice] = useState<string | null>(null);
    const [pendingRemoval, setPendingRemoval] = useState<TeacherCourseAssignment | null>(null);

    const programAcademicClassId = program?.academicClassId ?? null;
    const eligibleSections = useMemo(() => {
        if (!isGradeBasedProgram || !programAcademicClassId) return [];
        return sections.filter(
            (section) =>
                section.classId === programAcademicClassId && section.status === 'ACTIVE'
        );
    }, [isGradeBasedProgram, programAcademicClassId, sections]);

    const effectiveSelectedEntries = useMemo(() => {
        const list = Object.values(selectedTeacherMap);
        return list.map((teacher) => {
            const isAlreadyAssignedInScope = isDuplicateAssignmentScope(
                {
                    scope: target.scope,
                    programId: isProgramScope ? program?.id ?? null : null,
                    programCourseId: isProgramScope ? programCourse?.id ?? null : null,
                    courseId: courseSummary.id,
                    teacherId: teacher.id,
                    academicYearId: academicYearId.trim() || null,
                    termId: academicYearId.trim() ? termId.trim() || null : null,
                    sectionId: isGradeBasedProgram ? sectionId.trim() || null : null,
                },
                assignments
            );
            return { teacher, isAlreadyAssignedInScope };
        });
    }, [
        academicYearId,
        assignments,
        courseSummary.id,
        isGradeBasedProgram,
        isProgramScope,
        program?.id,
        programCourse?.id,
        sectionId,
        selectedTeacherMap,
        target.scope,
        termId,
    ]);

    const selectedEligibleTeacherIds = useMemo(
        () =>
            effectiveSelectedEntries
                .filter((entry) => !entry.isAlreadyAssignedInScope)
                .map((entry) => entry.teacher.id),
        [effectiveSelectedEntries]
    );

    const selectedConflictCount = useMemo(
        () =>
            effectiveSelectedEntries.filter((entry) => entry.isAlreadyAssignedInScope).length,
        [effectiveSelectedEntries]
    );

    const isYearRequirementBlocked = isGradeBasedProgram && !canReadYears;

    const toggleTeacherSelection = (teacher: AssignableTeacher) => {
        setFieldErrors((prev) => ({ ...prev, teacherIds: undefined }));
        setSubmitError(null);
        setSelectedTeacherMap((prev) => {
            const next = { ...prev };
            if (next[teacher.id]) {
                delete next[teacher.id];
            } else {
                next[teacher.id] = teacher;
            }
            return next;
        });
    };

    const handleAcademicYearChange = (nextYearId: string) => {
        setAcademicYearId(nextYearId);
        // Clear dependent Term when Academic Year changes or clears
        setTermId('');
        setFieldErrors((prev) => ({
            ...prev,
            academicYearId: undefined,
            termId: undefined,
            teacherIds: undefined,
        }));
        setSubmitError(null);
    };

    const handleSubmitBatch = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canAssignTeachers || isMutating || isYearRequirementBlocked) return;

        setSubmitError(null);
        setSubmitNotice(null);

        const validation = validateTeacherAssignmentForm({
            scope: target.scope,
            program,
            programCourse,
            course: courseSummary,
            selectedTeacherIds: selectedEligibleTeacherIds,
            values: {
                academicYearId,
                termId,
                sectionId: isGradeBasedProgram ? sectionId : '',
                isPrimaryInstructor,
            },
            academicYears,
            terms: effectiveTerms,
            sections: eligibleSections,
            existingAssignments: assignments,
            canReadYears,
        });

        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            if (validation.generalError) {
                setSubmitError(validation.generalError);
            }
            return;
        }

        setFieldErrors({});
        const outcome = await onAssignBatch(validation.requests, {
            program,
            course: courseSummary,
        });

        // Remove only teachers whose assignments succeeded; preserve failed selections on partial/network errors.
        if (outcome.createdTeacherIds.length > 0) {
            setSelectedTeacherMap((prev) => {
                const next = { ...prev };
                for (const createdId of outcome.createdTeacherIds) {
                    delete next[createdId];
                }
                return next;
            });
        }

        if (outcome.createdCount > 0 && outcome.failedTeacherErrors.length === 0) {
            setSubmitNotice(
                `Assigned ${outcome.createdCount} teacher${outcome.createdCount === 1 ? '' : 's'} successfully.`
            );
            setIsPrimaryInstructor(false);
        } else if (outcome.failedTeacherErrors.length > 0) {
            const firstFailure = outcome.failedTeacherErrors[0];
            const conflictHappened = outcome.failedTeacherErrors.some((e) => e.isConflict);
            if (outcome.createdCount > 0) {
                setSubmitNotice(
                    `Assigned ${outcome.createdCount} teacher${outcome.createdCount === 1 ? '' : 's'}; ${outcome.failedTeacherErrors.length} could not be assigned.`
                );
            }
            setSubmitError(
                conflictHappened
                    ? 'One or more teachers were already assigned for this exact course and scope (conflict detected; assignments list refreshed).'
                    : firstFailure?.message || outcome.errorMessage
            );
        } else if (outcome.errorMessage) {
            setSubmitError(outcome.errorMessage);
        }
    };

    const modalTitle = isProgramScope
        ? `Manage Teachers — ${courseSummary.title}`
        : `Manage Standalone Teachers — ${courseSummary.title}`;

    const totalPages = teacherPagination?.totalPages ?? 1;

    return (
        <>
            <AcademicModalShell
                title={modalTitle}
                isSubmitting={isMutating}
                onClose={onClose}
                maxWidthClass="max-w-3xl"
            >
                <div className="space-y-5 text-sm text-gray-700">
                    {/* Context Summary Banner */}
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-gray-900">
                                        {courseSummary.title}
                                    </span>
                                    {courseSummary.code && (
                                        <span className="font-mono text-gray-500">
                                            ({courseSummary.code})
                                        </span>
                                    )}
                                    {isProgramScope && program ? (
                                        <ProgramTypeBadge programType={program.programType} />
                                    ) : (
                                        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-800">
                                            Standalone Course Scope
                                        </span>
                                    )}
                                </div>
                                {isProgramScope && program ? (
                                    <p className="text-gray-600">
                                        Program:{' '}
                                        <span className="font-medium text-gray-900">
                                            {program.name}
                                        </span>
                                        {program.programType === 'GRADE_BASED' &&
                                        program.academicClassName
                                            ? ` · Class: ${program.academicClassName}`
                                            : ''}
                                        . Assignments made here apply only to this Program–Course
                                        pairing.
                                    </p>
                                ) : (
                                    <p className="text-gray-600">
                                        Independent standalone course offering. Assignments made here
                                        do not alter Program-scoped curriculum assignments.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {submitNotice && (
                        <div
                            role="status"
                            className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"
                        >
                            {submitNotice}
                        </div>
                    )}

                    {submitError && (
                        <div
                            role="alert"
                            className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                        >
                            {submitError}
                        </div>
                    )}

                    {/* Section A: Existing Assignments */}
                    <section aria-labelledby="current-course-teachers-heading" className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h3
                                id="current-course-teachers-heading"
                                className="text-sm font-semibold text-gray-900"
                            >
                                Assigned Teachers ({assignments.length})
                            </h3>
                            <button
                                type="button"
                                disabled={isMutating || isLoadingAssignments}
                                onClick={onRetryAssignments}
                                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
                            >
                                Refresh List
                            </button>
                        </div>

                        <AcademicAsyncContent
                            canRead={true}
                            requiredPermission={
                                isProgramScope
                                    ? PERMISSIONS.PROGRAMS.READ
                                    : PERMISSIONS.COURSES.READ
                            }
                            isLoading={isLoadingAssignments}
                            loadingMessage="Loading assigned teachers..."
                            loadError={assignmentsError}
                            backendPendingEndpoint="GET /api/academic/teacher-assignments"
                            isEmpty={assignments.length === 0}
                            emptyTitle="No teachers assigned yet"
                            emptyDescription={
                                isProgramScope
                                    ? 'Assign one or more active teachers to teach this course inside this program.'
                                    : 'Assign one or more active teachers to deliver this standalone course.'
                            }
                            onRetry={onRetryAssignments}
                        >
                            <div className="overflow-x-auto rounded-md border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 text-xs">
                                    <thead className="bg-gray-50 text-left font-medium text-gray-500">
                                        <tr>
                                            <th className="px-3 py-2">Teacher</th>
                                            <th className="px-3 py-2">Academic Period</th>
                                            {isGradeBasedProgram && (
                                                <th className="px-3 py-2">Section</th>
                                            )}
                                            <th className="px-3 py-2">Assigned</th>
                                            {canAssignTeachers && (
                                                <th className="px-3 py-2 text-right">Actions</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {assignments.map((assignment) => {
                                            const periodText =
                                                [
                                                    assignment.academicYearName,
                                                    assignment.termName,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ') || 'All Periods';
                                            const createdLabel = formatAcademicTimestamp(
                                                assignment.createdAt
                                            );

                                            return (
                                                <tr key={assignment.id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="font-medium text-gray-900">
                                                                {assignment.teacherName}
                                                            </span>
                                                            {assignment.isPrimaryInstructor && (
                                                                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                                                                    Primary
                                                                </span>
                                                            )}
                                                        </div>
                                                        {assignment.teacherEmail && (
                                                            <div className="text-[11px] text-gray-500">
                                                                {assignment.teacherEmail}
                                                                {assignment.teacherDepartment
                                                                    ? ` · ${assignment.teacherDepartment}`
                                                                    : ''}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-700">
                                                        {periodText}
                                                    </td>
                                                    {isGradeBasedProgram && (
                                                        <td className="px-3 py-2 text-gray-700">
                                                            {assignment.sectionName ??
                                                                'All Sections'}
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-2 text-gray-500">
                                                        {createdLabel ?? '—'}
                                                    </td>
                                                    {canAssignTeachers && (
                                                        <td className="px-3 py-2 text-right">
                                                            <button
                                                                type="button"
                                                                disabled={isMutating}
                                                                onClick={() =>
                                                                    setPendingRemoval(assignment)
                                                                }
                                                                className="rounded border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                                            >
                                                                Remove
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </AcademicAsyncContent>
                    </section>

                    {/* Section B: Assign New Teachers */}
                    {canAssignTeachers && !archivedAssignmentBlocker ? (
                        <form
                            onSubmit={handleSubmitBatch}
                            className="space-y-4 rounded-md border border-gray-200 bg-white p-4"
                        >
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Assign Eligible Teachers
                                </h3>
                                <p className="mt-0.5 text-xs text-gray-500">
                                    Select the target academic scope, pick one or more verified
                                    active Teachers (including multi-role School Admins with Teacher
                                    role), and submit together.
                                </p>
                            </div>

                            {/* Scope Selectors */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {/* Academic Year */}
                                <div>
                                    <label
                                        htmlFor="teacher-assignment-year"
                                        className="block text-xs font-medium text-gray-700"
                                    >
                                        Academic Year{' '}
                                        {isGradeBasedProgram ? (
                                            <span className="text-red-600">*</span>
                                        ) : (
                                            <span className="text-gray-400">(Optional)</span>
                                        )}
                                    </label>
                                    {!canReadYears ? (
                                        <div className="mt-1 rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
                                            Requires{' '}
                                            <code className="font-mono">
                                                {PERMISSIONS.ACADEMIC_YEARS.READ}
                                            </code>
                                            .{' '}
                                            {isGradeBasedProgram
                                                ? 'Required before assigning teachers to Grade-based Programs.'
                                                : 'Assignments will omit Academic Year.'}
                                        </div>
                                    ) : (
                                        <>
                                            <select
                                                id="teacher-assignment-year"
                                                disabled={isMutating || isLoadingYears}
                                                value={academicYearId}
                                                onChange={(e) =>
                                                    handleAcademicYearChange(e.target.value)
                                                }
                                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                                            >
                                                <option value="">
                                                    {isGradeBasedProgram
                                                        ? 'Select Academic Year...'
                                                        : 'All / Unscoped'}
                                                </option>
                                                {assignableYears.map((year) => (
                                                    <option key={year.id} value={year.id}>
                                                        {year.name} ({year.status})
                                                    </option>
                                                ))}
                                            </select>
                                            {yearsError && (
                                                <p className="mt-1 text-[11px] text-red-700">
                                                    {yearsError.message}{' '}
                                                    <button
                                                        type="button"
                                                        onClick={onRetryYears}
                                                        className="underline"
                                                    >
                                                        Retry
                                                    </button>
                                                </p>
                                            )}
                                            {fieldErrors.academicYearId && (
                                                <p className="mt-1 text-[11px] text-red-700">
                                                    {fieldErrors.academicYearId}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Academic Term (depends on Academic Year) */}
                                <div>
                                    <label
                                        htmlFor="teacher-assignment-term"
                                        className="block text-xs font-medium text-gray-700"
                                    >
                                        Term <span className="text-gray-400">(Optional)</span>
                                    </label>
                                    {!canReadTerms ? (
                                        <div className="mt-1 rounded border border-gray-200 bg-gray-50 p-2 text-[11px] text-gray-600">
                                            Term lookup requires{' '}
                                            <code className="font-mono">
                                                {PERMISSIONS.TERMS.READ}
                                            </code>
                                            . Term will remain unscoped.
                                        </div>
                                    ) : (
                                        <>
                                            <select
                                                id="teacher-assignment-term"
                                                disabled={
                                                    isMutating ||
                                                    !academicYearId.trim() ||
                                                    isLoadingTerms
                                                }
                                                value={termId}
                                                onChange={(e) => {
                                                    setTermId(e.target.value);
                                                    setFieldErrors((prev) => ({
                                                        ...prev,
                                                        termId: undefined,
                                                        teacherIds: undefined,
                                                    }));
                                                }}
                                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                                            >
                                                <option value="">
                                                    {!academicYearId.trim()
                                                        ? 'Choose Academic Year first'
                                                        : isLoadingTerms
                                                          ? 'Loading terms...'
                                                          : 'All Terms / Full Year'}
                                                </option>
                                                {effectiveTerms.map((term) => (
                                                    <option key={term.id} value={term.id}>
                                                        {term.name} ({term.status})
                                                    </option>
                                                ))}
                                            </select>
                                            {termsError && (
                                                <p className="mt-1 text-[11px] text-red-700">
                                                    {termsError.message}{' '}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setTermsReload((c) => c + 1)
                                                        }
                                                        className="underline"
                                                    >
                                                        Retry
                                                    </button>
                                                </p>
                                            )}
                                            {fieldErrors.termId && (
                                                <p className="mt-1 text-[11px] text-red-700">
                                                    {fieldErrors.termId}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Section (strictly GRADE_BASED Program only) */}
                                {isGradeBasedProgram && (
                                    <div>
                                        <label
                                            htmlFor="teacher-assignment-section"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Grade Section{' '}
                                            <span className="text-gray-400">(Optional)</span>
                                        </label>
                                        {!canReadSections ? (
                                            <div className="mt-1 rounded border border-gray-200 bg-gray-50 p-2 text-[11px] text-gray-600">
                                                Section lookup requires{' '}
                                                <code className="font-mono">
                                                    {PERMISSIONS.SECTIONS.READ}
                                                </code>
                                                . Section will remain unscoped.
                                            </div>
                                        ) : (
                                            <>
                                                <select
                                                    id="teacher-assignment-section"
                                                    disabled={isMutating || isLoadingSections}
                                                    value={sectionId}
                                                    onChange={(e) => {
                                                        setSectionId(e.target.value);
                                                        setFieldErrors((prev) => ({
                                                            ...prev,
                                                            sectionId: undefined,
                                                            teacherIds: undefined,
                                                        }));
                                                    }}
                                                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                                                >
                                                    <option value="">
                                                        {isLoadingSections
                                                            ? 'Loading sections...'
                                                            : 'All / No Specific Section'}
                                                    </option>
                                                    {eligibleSections.map((section) => (
                                                        <option key={section.id} value={section.id}>
                                                            {section.name}
                                                            {section.code
                                                                ? ` (${section.code})`
                                                                : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {sectionsError && (
                                                    <p className="mt-1 text-[11px] text-red-700">
                                                        {sectionsError.message}{' '}
                                                        <button
                                                            type="button"
                                                            onClick={onRetrySections}
                                                            className="underline"
                                                        >
                                                            Retry
                                                        </button>
                                                    </p>
                                                )}
                                                {fieldErrors.sectionId && (
                                                    <p className="mt-1 text-[11px] text-red-700">
                                                        {fieldErrors.sectionId}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                                <input
                                    type="checkbox"
                                    disabled={isMutating}
                                    checked={isPrimaryInstructor}
                                    onChange={(e) => setIsPrimaryInstructor(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Mark newly assigned teacher(s) as Primary Instructor
                            </label>

                            {/* Searchable Assignable Teacher Multi-Select Picker */}
                            <div className="space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <label
                                        htmlFor="assignable-teacher-search"
                                        className="text-xs font-medium text-gray-700"
                                    >
                                        Eligible Active Teachers
                                    </label>
                                    <span className="text-[11px] text-gray-500">
                                        Source: <code className="font-mono">/academic/assignable-teachers</code>
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        id="assignable-teacher-search"
                                        type="search"
                                        value={searchInput}
                                        disabled={isMutating}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        placeholder="Search active teachers by name, email, or department..."
                                        className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        disabled={isLoadingTeachers || isMutating}
                                        onClick={() => setTeacherReload((c) => c + 1)}
                                        className="shrink-0 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Refresh
                                    </button>
                                </div>

                                {Object.keys(selectedTeacherMap).length > 0 && (
                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-950">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-medium">
                                                Selected ({selectedEligibleTeacherIds.length} ready
                                                {selectedConflictCount > 0
                                                    ? `, ${selectedConflictCount} already assigned in this scope`
                                                    : ''}
                                                ):
                                            </span>
                                            <button
                                                type="button"
                                                disabled={isMutating}
                                                onClick={() => setSelectedTeacherMap({})}
                                                className="text-[11px] font-medium text-blue-700 underline hover:text-blue-900"
                                            >
                                                Clear selection
                                            </button>
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {effectiveSelectedEntries.map(
                                                ({ teacher, isAlreadyAssignedInScope }) => (
                                                    <span
                                                        key={teacher.id}
                                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                                            isAlreadyAssignedInScope
                                                                ? 'border-amber-300 bg-amber-100 text-amber-900'
                                                                : 'border-blue-300 bg-white text-blue-900'
                                                        }`}
                                                    >
                                                        {teacher.firstName} {teacher.lastName}
                                                        {isAlreadyAssignedInScope
                                                            ? ' (duplicate scope)'
                                                            : ''}
                                                        <button
                                                            type="button"
                                                            aria-label={`Remove ${teacher.firstName} ${teacher.lastName} from selection`}
                                                            disabled={isMutating}
                                                            onClick={() =>
                                                                toggleTeacherSelection(teacher)
                                                            }
                                                            className="ml-0.5 text-gray-500 hover:text-gray-800"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}

                                <AcademicAsyncContent
                                    canRead={canAssignTeachers}
                                    requiredPermission={
                                        isProgramScope
                                            ? PERMISSIONS.PROGRAMS.ASSIGN_TEACHERS
                                            : PERMISSIONS.COURSES.ASSIGN_TEACHERS
                                    }
                                    isLoading={isLoadingTeachers}
                                    loadingMessage="Searching active eligible teachers..."
                                    loadError={teacherLookupError}
                                    backendPendingEndpoint="GET /api/academic/assignable-teachers"
                                    isEmpty={assignableTeachers.length === 0}
                                    emptyTitle="No matching active teachers found"
                                    emptyDescription="Only ACTIVE user accounts holding the TEACHER role in this school are eligible for teaching assignments."
                                    onRetry={() => setTeacherReload((c) => c + 1)}
                                >
                                    <div className="max-h-56 divide-y divide-gray-200 overflow-y-auto rounded-md border border-gray-200">
                                        {assignableTeachers.map((teacher) => {
                                            const scopeKey = buildAssignmentScopeKey({
                                                scope: target.scope,
                                                programId: isProgramScope
                                                    ? program?.id ?? null
                                                    : null,
                                                programCourseId: isProgramScope
                                                    ? programCourse?.id ?? null
                                                    : null,
                                                courseId: courseSummary.id,
                                                teacherId: teacher.id,
                                                academicYearId: academicYearId.trim() || null,
                                                termId: academicYearId.trim()
                                                    ? termId.trim() || null
                                                    : null,
                                                sectionId: isGradeBasedProgram
                                                    ? sectionId.trim() || null
                                                    : null,
                                            });
                                            const alreadyAssigned = assignments.some(
                                                (existing) =>
                                                    buildAssignmentScopeKey(existing) === scopeKey
                                            );
                                            const isChecked = Boolean(
                                                selectedTeacherMap[teacher.id]
                                            );
                                            const isMultiRoleAdmin =
                                                teacher.roles.includes('SCHOOL_ADMIN');

                                            return (
                                                <label
                                                    key={teacher.id}
                                                    className={`flex items-center justify-between gap-3 px-3 py-2 text-xs ${
                                                        alreadyAssigned
                                                            ? 'cursor-not-allowed bg-gray-50 text-gray-400'
                                                            : 'cursor-pointer bg-white hover:bg-blue-50/40'
                                                    }`}
                                                >
                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        <input
                                                            type="checkbox"
                                                            disabled={
                                                                alreadyAssigned || isMutating
                                                            }
                                                            checked={
                                                                !alreadyAssigned && isChecked
                                                            }
                                                            onChange={() =>
                                                                toggleTeacherSelection(teacher)
                                                            }
                                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-1.5 font-medium text-gray-900">
                                                                <span className="truncate">
                                                                    {teacher.firstName}{' '}
                                                                    {teacher.lastName}
                                                                </span>
                                                                {isMultiRoleAdmin && (
                                                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                                                                        Admin + Teacher
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="truncate text-[11px] text-gray-500">
                                                                {teacher.email}
                                                                {teacher.department
                                                                    ? ` · ${teacher.department}`
                                                                    : ''}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {alreadyAssigned && (
                                                        <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                                            Assigned in Scope
                                                        </span>
                                                    )}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </AcademicAsyncContent>

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between text-xs text-gray-600">
                                        <span>
                                            Page {teacherPage} of {totalPages}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={
                                                    teacherPage <= 1 ||
                                                    isLoadingTeachers ||
                                                    isMutating
                                                }
                                                onClick={() =>
                                                    setTeacherPage((p) => Math.max(1, p - 1))
                                                }
                                                className="rounded border border-gray-300 bg-white px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                type="button"
                                                disabled={
                                                    teacherPage >= totalPages ||
                                                    isLoadingTeachers ||
                                                    isMutating
                                                }
                                                onClick={() =>
                                                    setTeacherPage((p) =>
                                                        Math.min(totalPages, p + 1)
                                                    )
                                                }
                                                className="rounded border border-gray-300 bg-white px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {fieldErrors.teacherIds && (
                                    <p className="text-xs text-red-700">{fieldErrors.teacherIds}</p>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-3">
                                <button
                                    type="button"
                                    disabled={isMutating}
                                    onClick={onClose}
                                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        isMutating ||
                                        isYearRequirementBlocked ||
                                        selectedEligibleTeacherIds.length === 0
                                    }
                                    className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isMutating
                                        ? 'Assigning...'
                                        : `Assign Selected Teachers (${selectedEligibleTeacherIds.length})`}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            {canAssignTeachers && archivedAssignmentBlocker && (
                                <div
                                    role="status"
                                    className="rounded-md border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900"
                                >
                                    {archivedAssignmentBlocker}
                                </div>
                            )}
                            <div className="flex items-center justify-end border-t border-gray-200 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-md bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                                >
                                    Close
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </AcademicModalShell>

            {pendingRemoval && (
                <AcademicConfirmDialog
                    title={`Remove Teacher Assignment: ${pendingRemoval.teacherName}`}
                    message={`Remove ${pendingRemoval.teacherName} from "${courseSummary.title}"${
                        isProgramScope && program ? ` inside "${program.name}"` : ' (Standalone Course)'
                    }?`}
                    warningNote="Only this specific teaching assignment is removed. The teacher user account, staff roles, permissions, and any other course or program assignments remain untouched."
                    confirmLabel="Remove Assignment"
                    tone="danger"
                    isSubmitting={isMutating}
                    onCancel={() => setPendingRemoval(null)}
                    onConfirm={async () => {
                        const targetAssignment = pendingRemoval;
                        setSubmitError(null);
                        setSubmitNotice(null);
                        const outcome = await onRemoveAssignment(targetAssignment);
                        setPendingRemoval(null);
                        if (outcome.ok) {
                            setSubmitNotice(
                                `Removed ${targetAssignment.teacherName} from this assignment.`
                            );
                        } else {
                            setSubmitError(outcome.errorMessage);
                        }
                    }}
                />
            )}
        </>
    );
};

