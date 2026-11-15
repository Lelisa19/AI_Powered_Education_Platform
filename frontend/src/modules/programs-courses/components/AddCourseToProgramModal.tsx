import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PERMISSIONS } from '../../../constants/permissions';
import { ApiError } from '../../../services/api/api-error';
import type { AuthenticatedUser } from '../../../types/auth';
import { AcademicModalShell } from '../../academic/components/AcademicConfirmDialog';
import type { CatalogFetchError, CatalogSubmitOutcome } from '../hooks/useProgramsAndCourses';
import {
    CATALOG_LIMITS,
    createEmptyAddProgramCourseValues,
    mapBackendFieldValidationErrors,
    validateAddProgramCourseForm,
} from '../schemas/programs-courses-schema';
import {
    formatCatalogOperationError,
    isCatalogBackendUnavailableError,
    listCourses,
} from '../services/programs-courses-service';
import type {
    AddProgramCourseFormValues,
    AddProgramCourseRequest,
    Course,
    Program,
    ProgramCourse,
    ProgramCourseFieldErrors,
    ProgramCourseFieldName,
} from '../types/programs-courses.types';
import {
    OfferingLifecycleBadge,
    StandaloneEligibilityBadge,
} from './CatalogBadgesAndPagination';

const ADD_PROGRAM_COURSE_FIELDS: readonly ProgramCourseFieldName[] = [
    'courseId',
    'isRequired',
    'displayOrder',
    'notes',
];

interface AddCourseToProgramModalProps {
    program: Program;
    existingProgramCourses: readonly ProgramCourse[];
    actor: AuthenticatedUser | null;
    tenantId: string | null;
    canReadCourses: boolean;
    canCreateCourses: boolean;
    canAssignCourses: boolean;
    isSubmitting: boolean;
    onNavigateToCoursesCatalog: () => void;
    onClose: () => void;
    onSubmitAdd: (
        programId: string,
        payload: AddProgramCourseRequest
    ) => Promise<CatalogSubmitOutcome>;
}

export const AddCourseToProgramModal: React.FC<AddCourseToProgramModalProps> = ({
    program,
    existingProgramCourses,
    actor,
    tenantId,
    canReadCourses,
    canCreateCourses,
    canAssignCourses,
    isSubmitting,
    onNavigateToCoursesCatalog,
    onClose,
    onSubmitAdd,
}) => {
    const [searchInput, setSearchInput] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [reloadCounter, setReloadCounter] = useState(0);
    const [catalogCourses, setCatalogCourses] = useState<Course[]>([]);
    const [catalogError, setCatalogError] = useState<CatalogFetchError | null>(null);
    const [settledSearchKey, setSettledSearchKey] = useState<string | null>(null);

    const [values, setValues] = useState<AddProgramCourseFormValues>(() =>
        createEmptyAddProgramCourseValues(existingProgramCourses)
    );
    const [fieldErrors, setFieldErrors] = useState<ProgramCourseFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const fetchVersionRef = useRef(0);

    const searchLoadKey =
        canReadCourses && tenantId && actor
            ? JSON.stringify({ tenantId, search: appliedSearch, reload: reloadCounter })
            : null;

    useEffect(() => {
        if (!searchLoadKey || !tenantId || !actor) return;

        const controller = new AbortController();
        const version = ++fetchVersionRef.current;

        listCourses(
            {
                limit: 50,
                ...(appliedSearch !== '' ? { search: appliedSearch } : {}),
            },
            tenantId,
            actor,
            controller.signal
        )
            .then((res) => {
                if (version !== fetchVersionRef.current) return;
                setCatalogCourses(res.items);
                setCatalogError(null);
                setSettledSearchKey(searchLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== fetchVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setCatalogCourses([]);
                setCatalogError({
                    isBackendUnavailable: isCatalogBackendUnavailableError(error),
                    message: formatCatalogOperationError(
                        error,
                        'Unable to search reusable Course catalog.'
                    ),
                });
                setSettledSearchKey(searchLoadKey);
            });

        return () => controller.abort();
    }, [actor, appliedSearch, searchLoadKey, tenantId]);

    const isLoadingCatalog = Boolean(searchLoadKey && settledSearchKey !== searchLoadKey);

    const linkedCourseIds = useMemo(
        () => new Set(existingProgramCourses.map((item) => item.courseId)),
        [existingProgramCourses]
    );

    const eligibleCourses = useMemo(
        () =>
            catalogCourses.filter(
                (course) => course.status === 'ACTIVE' && !linkedCourseIds.has(course.id)
            ),
        [catalogCourses, linkedCourseIds]
    );

    const excludedAlreadyLinkedCount = useMemo(
        () => catalogCourses.filter((course) => linkedCourseIds.has(course.id)).length,
        [catalogCourses, linkedCourseIds]
    );

    const excludedInactiveCount = useMemo(
        () =>
            catalogCourses.filter(
                (course) => !linkedCourseIds.has(course.id) && course.status !== 'ACTIVE'
            ).length,
        [catalogCourses, linkedCourseIds]
    );

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setAppliedSearch(searchInput.trim());
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting || !canReadCourses || !canAssignCourses) return;
        setSubmitError(null);

        const validation = validateAddProgramCourseForm({
            values,
            existingProgramCourses,
            eligibleCourses,
        });

        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            return;
        }
        setFieldErrors({});

        const result = await onSubmitAdd(program.id, validation.payload);
        if (result.ok) {
            onClose();
            return;
        }

        if (result.error instanceof ApiError && result.error.validationErrors) {
            setFieldErrors(
                mapBackendFieldValidationErrors(
                    result.error.validationErrors,
                    ADD_PROGRAM_COURSE_FIELDS
                )
            );
        }
        setSubmitError(result.errorMessage);
    };

    return (
        <AcademicModalShell
            title={`Add Course to ${program.name}`}
            subtitle="Select an existing active Course from the reusable catalog. Courses already linked to this program are automatically excluded."
            isSubmitting={isSubmitting}
            onClose={onClose}
            maxWidthClass="max-w-2xl"
        >
            <div className="space-y-4">
                {!canAssignCourses ? (
                    <div
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                    >
                        Access Denied: Linking courses to a program requires{' '}
                        <code className="font-mono">{PERMISSIONS.PROGRAMS.ASSIGN_COURSES}</code>.
                    </div>
                ) : !canReadCourses ? (
                    <div
                        role="alert"
                        className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
                    >
                        Permission Dependency Notice: Browsing existing courses requires{' '}
                        <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
                            {PERMISSIONS.COURSES.READ}
                        </code>{' '}
                        in addition to{' '}
                        <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
                            {PERMISSIONS.PROGRAMS.ASSIGN_COURSES}
                        </code>
                        .
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                            <input
                                type="search"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search existing courses by title or code..."
                                aria-label="Search existing courses"
                                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                            />
                            <button
                                type="submit"
                                disabled={isLoadingCatalog}
                                className="rounded-md bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                            >
                                Search
                            </button>
                            {appliedSearch !== '' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchInput('');
                                        setAppliedSearch('');
                                    }}
                                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Clear
                                </button>
                            )}
                        </form>

                        <form
                            onSubmit={handleSubmit}
                            noValidate
                            aria-busy={isSubmitting}
                            className="space-y-4"
                        >
                            {submitError && (
                                <div
                                    role="alert"
                                    className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                                >
                                    {submitError}
                                </div>
                            )}

                            <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-700">
                                        Eligible Courses <span className="text-red-600">*</span>
                                    </span>
                                    {(excludedAlreadyLinkedCount > 0 || excludedInactiveCount > 0) && (
                                        <span className="text-[11px] text-gray-500">
                                            Excluded: {excludedAlreadyLinkedCount} already linked ·{' '}
                                            {excludedInactiveCount} inactive/archived
                                        </span>
                                    )}
                                </div>

                                {isLoadingCatalog ? (
                                    <div
                                        role="status"
                                        className="rounded-md border border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-600"
                                    >
                                        Searching Course catalog...
                                    </div>
                                ) : catalogError ? (
                                    <div
                                        role="alert"
                                        className={`space-y-2 rounded-md border p-4 text-xs ${
                                            catalogError.isBackendUnavailable
                                                ? 'border-amber-200 bg-amber-50 text-amber-900'
                                                : 'border-red-200 bg-red-50 text-red-800'
                                        }`}
                                    >
                                        <p>
                                            {catalogError.isBackendUnavailable
                                                ? `Course catalog endpoint (GET /api/academic/courses) is pending backend implementation (${catalogError.message}).`
                                                : catalogError.message}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setReloadCounter((c) => c + 1)}
                                            className="rounded border border-gray-300 bg-white px-2.5 py-1 font-medium text-gray-800 hover:bg-gray-50"
                                        >
                                            Retry Search
                                        </button>
                                    </div>
                                ) : eligibleCourses.length === 0 ? (
                                    <div className="space-y-2 rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-xs text-gray-600">
                                        <p className="font-medium text-gray-900">
                                            No Eligible Courses Found
                                        </p>
                                        <p>
                                            {appliedSearch !== ''
                                                ? 'No unlinked active courses matched your search.'
                                                : 'Every active course in the catalog is already linked, or no active courses have been created yet.'}
                                        </p>
                                        {canCreateCourses && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onClose();
                                                    onNavigateToCoursesCatalog();
                                                }}
                                                className="inline-flex items-center rounded-md border border-blue-300 bg-white px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-50"
                                            >
                                                Open Courses Catalog to Create a Course →
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="max-h-56 divide-y divide-gray-200 overflow-y-auto rounded-md border border-gray-200 bg-white">
                                        {eligibleCourses.map((course) => {
                                            const isSelected = values.courseId === course.id;
                                            return (
                                                <label
                                                    key={course.id}
                                                    className={`flex cursor-pointer items-start justify-between gap-3 px-3.5 py-2.5 hover:bg-gray-50 ${
                                                        isSelected ? 'bg-blue-50/70' : ''
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2.5">
                                                        <input
                                                            type="radio"
                                                            name="selectedCourseId"
                                                            disabled={isSubmitting}
                                                            checked={isSelected}
                                                            onChange={() => {
                                                                setSubmitError(null);
                                                                setValues((prev) => ({
                                                                    ...prev,
                                                                    courseId: course.id,
                                                                }));
                                                                setFieldErrors((prev) => ({
                                                                    ...prev,
                                                                    courseId: undefined,
                                                                }));
                                                            }}
                                                            className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                                                        />
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {course.title}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {course.code
                                                                    ? `Code: ${course.code}`
                                                                    : 'No code'}
                                                                {typeof course.creditHours ===
                                                                'number'
                                                                    ? ` · ${course.creditHours} credits/hrs`
                                                                    : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                                                        <OfferingLifecycleBadge
                                                            status={course.status}
                                                        />
                                                        <StandaloneEligibilityBadge
                                                            allowStandalone={course.allowStandalone}
                                                        />
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}

                                {fieldErrors.courseId && (
                                    <p role="alert" className="mt-1 text-xs text-red-600">
                                        {fieldErrors.courseId}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <span className="block text-xs font-medium text-gray-700">
                                        Requirement Status <span className="text-red-600">*</span>
                                    </span>
                                    <div className="mt-1.5 flex items-center gap-4 text-sm text-gray-800">
                                        <label className="inline-flex items-center gap-1.5">
                                            <input
                                                type="radio"
                                                name="addProgramCourseRequired"
                                                disabled={isSubmitting}
                                                checked={values.isRequired === true}
                                                onChange={() => {
                                                    setSubmitError(null);
                                                    setValues((prev) => ({
                                                        ...prev,
                                                        isRequired: true,
                                                    }));
                                                }}
                                            />
                                            <span>Required</span>
                                        </label>
                                        <label className="inline-flex items-center gap-1.5">
                                            <input
                                                type="radio"
                                                name="addProgramCourseRequired"
                                                disabled={isSubmitting}
                                                checked={values.isRequired === false}
                                                onChange={() => {
                                                    setSubmitError(null);
                                                    setValues((prev) => ({
                                                        ...prev,
                                                        isRequired: false,
                                                    }));
                                                }}
                                            />
                                            <span>Elective</span>
                                        </label>
                                    </div>
                                    {fieldErrors.isRequired && (
                                        <p role="alert" className="mt-1 text-xs text-red-600">
                                            {fieldErrors.isRequired}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="add-program-course-order"
                                        className="block text-xs font-medium text-gray-700"
                                    >
                                        Display Order <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        id="add-program-course-order"
                                        type="text"
                                        inputMode="numeric"
                                        disabled={isSubmitting}
                                        value={values.displayOrder}
                                        onChange={(e) => {
                                            setSubmitError(null);
                                            setValues((prev) => ({
                                                ...prev,
                                                displayOrder: e.target.value,
                                            }));
                                            setFieldErrors((prev) => ({
                                                ...prev,
                                                displayOrder: undefined,
                                            }));
                                        }}
                                        aria-invalid={Boolean(fieldErrors.displayOrder)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                                    />
                                    {fieldErrors.displayOrder && (
                                        <p role="alert" className="mt-1 text-xs text-red-600">
                                            {fieldErrors.displayOrder}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="add-program-course-notes"
                                    className="block text-xs font-medium text-gray-700"
                                >
                                    Curriculum Notes{' '}
                                    <span className="font-normal text-gray-400">(Optional)</span>
                                </label>
                                <textarea
                                    id="add-program-course-notes"
                                    rows={2}
                                    disabled={isSubmitting}
                                    maxLength={CATALOG_LIMITS.CURRICULUM_NOTES_MAX}
                                    value={values.notes}
                                    onChange={(e) => {
                                        setSubmitError(null);
                                        setValues((prev) => ({ ...prev, notes: e.target.value }));
                                        setFieldErrors((prev) => ({ ...prev, notes: undefined }));
                                    }}
                                    placeholder="Program-specific prerequisite or curriculum guidance..."
                                    aria-invalid={Boolean(fieldErrors.notes)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                                />
                                {fieldErrors.notes && (
                                    <p role="alert" className="mt-1 text-xs text-red-600">
                                        {fieldErrors.notes}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={onClose}
                                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || eligibleCourses.length === 0}
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Adding Course...' : 'Add Course to Program'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </AcademicModalShell>
    );
};

