import React from 'react';
import { PERMISSIONS } from '../../../constants/permissions';
import { AcademicAsyncContent } from '../../academic/components/AcademicAsyncContent';
import type { CatalogFetchError, CatalogMutationError } from '../hooks/useProgramsAndCourses';
import type {
    Program,
    ProgramCourse,
    TeacherCourseAssignment,
} from '../types/programs-courses.types';
import {
    OfferingLifecycleBadge,
    StandaloneEligibilityBadge,
} from './CatalogBadgesAndPagination';

interface ProgramCurriculumSectionProps {
    program: Program;
    programCourses: readonly ProgramCourse[];
    programAssignments: readonly TeacherCourseAssignment[];
    isLoadingAssignments: boolean;
    assignmentsError: CatalogFetchError | null;
    isLoading: boolean;
    loadError: CatalogFetchError | null;
    isMutating: boolean;
    mutationNotice: string | null;
    mutationError: CatalogMutationError | null;
    canReadPrograms: boolean;
    canReadCourses: boolean;
    canAssignCourses: boolean;
    canAssignProgramTeachers: boolean;
    onRetry: () => void;
    onRetryAssignments: () => void;
    onOpenAddCourse: () => void;
    onOpenManageTeachers: (programCourse: ProgramCourse) => void;
    onViewCourse: (programCourse: ProgramCourse) => void;
    onOpenEditSettings: (programCourse: ProgramCourse) => void;
    onMoveCourse: (programCourseId: string, direction: 'up' | 'down') => void;
    onRequestRemoveCourse: (programCourse: ProgramCourse) => void;
}

export const ProgramCurriculumSection: React.FC<ProgramCurriculumSectionProps> = ({
    program,
    programCourses,
    programAssignments,
    isLoadingAssignments,
    assignmentsError,
    isLoading,
    loadError,
    isMutating,
    mutationNotice,
    mutationError,
    canReadPrograms,
    canReadCourses,
    canAssignCourses,
    canAssignProgramTeachers,
    onRetry,
    onRetryAssignments,
    onOpenAddCourse,
    onOpenManageTeachers,
    onViewCourse,
    onOpenEditSettings,
    onMoveCourse,
    onRequestRemoveCourse,
}) => {
    const showTeachersColumn =
        canReadPrograms ||
        canAssignProgramTeachers ||
        programCourses.some((item) => typeof item.assignedTeachersCount === 'number');

    return (
        <section
            aria-labelledby="program-curriculum-heading"
            className="space-y-3.5 border-t border-gray-200 pt-5"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h3
                            id="program-curriculum-heading"
                            className="text-sm font-semibold text-gray-900"
                        >
                            Program Curriculum Courses
                        </h3>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                            {programCourses.length} linked
                        </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                        Reusable courses linked to <span className="font-medium">{program.name}</span>. Removing a course here detaches it only from this program.
                    </p>
                </div>

                {canAssignCourses && (
                    <button
                        type="button"
                        disabled={isMutating || !canReadCourses}
                        title={
                            !canReadCourses
                                ? `Requires ${PERMISSIONS.COURSES.READ} to browse the Course catalog`
                                : 'Link an existing Course to this Program'
                        }
                        onClick={onOpenAddCourse}
                        className="shrink-0 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        + Add Course to Program
                    </button>
                )}
            </div>

            {!canAssignCourses && (
                <div
                    role="note"
                    className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900"
                >
                    Read-only curriculum view: Adding, editing, reordering, or removing courses from
                    this program requires the{' '}
                    <code className="rounded bg-blue-100 px-1 py-0.5 font-mono">
                        {PERMISSIONS.PROGRAMS.ASSIGN_COURSES}
                    </code>{' '}
                    permission.
                </div>
            )}

            {canAssignCourses && !canReadCourses && (
                <div
                    role="note"
                    className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"
                >
                    Course Catalog Search Restricted: Adding existing courses requires both{' '}
                    <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">
                        {PERMISSIONS.PROGRAMS.ASSIGN_COURSES}
                    </code>{' '}
                    and{' '}
                    <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">
                        {PERMISSIONS.COURSES.READ}
                    </code>{' '}
                    permissions. You may still adjust settings, reorder, or unlink already
                    assigned courses below.
                </div>
            )}

            {mutationNotice && (
                <div
                    role="status"
                    className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"
                >
                    {mutationNotice}
                </div>
            )}

            {mutationError && (
                <div
                    role={mutationError.isBackendUnavailable ? 'status' : 'alert'}
                    className={`rounded-md border p-3 text-xs ${
                        mutationError.isBackendUnavailable
                            ? 'border-amber-200 bg-amber-50 text-amber-900'
                            : 'border-red-200 bg-red-50 text-red-800'
                    }`}
                >
                    {mutationError.isBackendUnavailable
                        ? `Curriculum endpoint is pending backend implementation (${mutationError.message}). No local changes were persisted.`
                        : mutationError.message}
                </div>
            )}

            <AcademicAsyncContent
                canRead={canReadPrograms}
                requiredPermission={PERMISSIONS.PROGRAMS.READ}
                isLoading={isLoading}
                loadingMessage="Loading linked courses for this program..."
                loadError={loadError}
                backendPendingEndpoint={`GET /api/academic/programs/${program.id}/courses`}
                onRetry={onRetry}
                isEmpty={programCourses.length === 0}
                emptyTitle="No Courses Linked to This Program"
                emptyDescription={
                    canAssignCourses && canReadCourses
                        ? 'Use "+ Add Course to Program" to link reusable courses from the Course catalog.'
                        : 'Courses linked to this program will appear here once configured.'
                }
            >
                <div className="overflow-x-auto rounded-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                        <thead className="bg-gray-50 font-semibold uppercase tracking-wide text-gray-500">
                            <tr>
                                <th scope="col" className="px-3 py-2.5">
                                    Order
                                </th>
                                <th scope="col" className="px-3 py-2.5">
                                    Course
                                </th>
                                <th scope="col" className="px-3 py-2.5">
                                    Requirement
                                </th>
                                {showTeachersColumn && (
                                    <th scope="col" className="px-3 py-2.5">
                                        Teachers
                                    </th>
                                )}
                                <th scope="col" className="px-3 py-2.5 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {programCourses.map((item, index) => {
                                const isFirst = index === 0;
                                const isLast = index === programCourses.length - 1;
                                const rowAssignments = programAssignments.filter(
                                    (assignment) => assignment.programCourseId === item.id
                                );
                                const resolvedCount =
                                    rowAssignments.length > 0 ||
                                    (!isLoadingAssignments && !assignmentsError)
                                        ? rowAssignments.length
                                        : item.assignedTeachersCount;

                                return (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2.5 font-semibold text-gray-900">
                                            #{item.displayOrder}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="font-medium text-gray-900">
                                                    {item.courseTitle}
                                                </span>
                                                {item.courseCode && (
                                                    <span className="font-mono text-[11px] text-gray-500">
                                                        ({item.courseCode})
                                                    </span>
                                                )}
                                                {item.courseStatus && (
                                                    <OfferingLifecycleBadge
                                                        status={item.courseStatus}
                                                    />
                                                )}
                                                {typeof item.allowStandalone === 'boolean' && (
                                                    <StandaloneEligibilityBadge
                                                        allowStandalone={item.allowStandalone}
                                                    />
                                                )}
                                            </div>
                                            {item.notes && (
                                                <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-600">
                                                    Notes: {item.notes}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span
                                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                                    item.isRequired
                                                        ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                                                        : 'border-gray-200 bg-gray-100 text-gray-700'
                                                }`}
                                            >
                                                {item.isRequired ? 'Required' : 'Elective'}
                                            </span>
                                        </td>
                                        {showTeachersColumn && (
                                            <td className="px-3 py-2.5 text-gray-700">
                                                {isLoadingAssignments && rowAssignments.length === 0 ? (
                                                    <span className="text-[11px] text-gray-400">
                                                        Loading...
                                                    </span>
                                                ) : rowAssignments.length > 0 ? (
                                                    <div className="space-y-1">
                                                        <span className="font-medium text-gray-900">
                                                            {rowAssignments.length} assigned
                                                        </span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {rowAssignments
                                                                .slice(0, 3)
                                                                .map((assignment) => {
                                                                    const scopeHint = [
                                                                        assignment.academicYearName,
                                                                        assignment.termName,
                                                                        assignment.sectionName,
                                                                    ]
                                                                        .filter(Boolean)
                                                                        .join(' · ');

                                                                    return (
                                                                        <span
                                                                            key={assignment.id}
                                                                            title={
                                                                                scopeHint ||
                                                                                'All periods'
                                                                            }
                                                                            className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700"
                                                                        >
                                                                            {assignment.teacherName}
                                                                            {assignment.sectionName
                                                                                ? ` (${assignment.sectionName})`
                                                                                : ''}
                                                                        </span>
                                                                    );
                                                                })}
                                                            {rowAssignments.length > 3 && (
                                                                <span className="text-[10px] text-gray-500">
                                                                    +{rowAssignments.length - 3} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : assignmentsError &&
                                                  typeof resolvedCount !== 'number' ? (
                                                    <button
                                                        type="button"
                                                        onClick={onRetryAssignments}
                                                        className="text-[11px] text-amber-700 underline hover:text-amber-900"
                                                    >
                                                        Unavailable (retry)
                                                    </button>
                                                ) : typeof resolvedCount === 'number' ? (
                                                    <span>{resolvedCount} assigned</span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        )}
                                        <td className="px-3 py-2.5 text-right">
                                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                                {(canAssignProgramTeachers ||
                                                    rowAssignments.length > 0) && (
                                                    <button
                                                        type="button"
                                                        disabled={isMutating}
                                                        onClick={() => onOpenManageTeachers(item)}
                                                        className="rounded border border-blue-300 bg-blue-50 px-2 py-1 font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                                                    >
                                                        {canAssignProgramTeachers
                                                            ? 'Manage Teachers'
                                                            : 'View Teachers'}
                                                    </button>
                                                )}
                                                {canReadCourses && (
                                                    <button
                                                        type="button"
                                                        disabled={isMutating}
                                                        onClick={() => onViewCourse(item)}
                                                        className="rounded border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                    >
                                                        View Course
                                                    </button>
                                                )}

                                                {canAssignCourses && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            disabled={isMutating}
                                                            onClick={() => onOpenEditSettings(item)}
                                                            className="rounded border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            Edit Settings
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isMutating || isFirst}
                                                            aria-label={`Move ${item.courseTitle} up`}
                                                            onClick={() =>
                                                                onMoveCourse(item.id, 'up')
                                                            }
                                                            className="rounded border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            Up
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isMutating || isLast}
                                                            aria-label={`Move ${item.courseTitle} down`}
                                                            onClick={() =>
                                                                onMoveCourse(item.id, 'down')
                                                            }
                                                            className="rounded border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            Down
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isMutating}
                                                            onClick={() =>
                                                                onRequestRemoveCourse(item)
                                                            }
                                                            className="rounded border border-red-300 bg-white px-2 py-1 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                                        >
                                                            Remove
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </AcademicAsyncContent>
        </section>
    );
};

