import React, { useState } from 'react';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { PERMISSIONS } from '../../../constants/permissions';
import type { PaginationMeta } from '../../../types/api.types';
import { AcademicAsyncContent } from '../../academic/components/AcademicAsyncContent';
import type { CatalogFetchError, CoursesQueryState } from '../hooks/useProgramsAndCourses';
import {
    OFFERING_LIFECYCLE_STATUSES,
    evaluateCourseDeleteEligibility,
    formatOfferingStatusLabel,
    getAllowedOfferingStatusTransitions,
} from '../schemas/programs-courses-schema';
import type {
    Course,
    OfferingLifecycleStatus,
    StandaloneFilterValue,
} from '../types/programs-courses.types';
import {
    CatalogPaginationBar,
    OfferingLifecycleBadge,
    StandaloneEligibilityBadge,
} from './CatalogBadgesAndPagination';

interface CoursesDirectorySectionProps {
    courses: readonly Course[];
    pagination: PaginationMeta | null;
    query: CoursesQueryState;
    isLoading: boolean;
    loadError: CatalogFetchError | null;
    isMutating: boolean;
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    onUpdateQuery: (updater: (prev: CoursesQueryState) => CoursesQueryState) => void;
    onRetry: () => void;
    onOpenCreate: () => void;
    onOpenDetails: (course: Course) => void;
    onOpenEdit: (course: Course) => void;
    onRequestStatusChange: (course: Course, nextStatus: OfferingLifecycleStatus) => void;
    onRequestDelete: (course: Course) => void;
}

export const CoursesDirectorySection: React.FC<CoursesDirectorySectionProps> = ({
    courses,
    pagination,
    query,
    isLoading,
    loadError,
    isMutating,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    onUpdateQuery,
    onRetry,
    onOpenCreate,
    onOpenDetails,
    onOpenEdit,
    onRequestStatusChange,
    onRequestDelete,
}) => {
    const [searchInput, setSearchInput] = useState(query.search);

    const hasActiveFilters =
        query.search.trim() !== '' || query.allowStandalone !== 'ALL' || query.status !== 'ALL';

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onUpdateQuery((prev) => ({
            ...prev,
            page: 1,
            search: searchInput.trim(),
        }));
    };

    const handleResetFilters = () => {
        setSearchInput('');
        onUpdateQuery((prev) => ({
            ...prev,
            page: 1,
            search: '',
            allowStandalone: 'ALL',
            status: 'ALL',
        }));
    };

    return (
        <DashboardOverviewCard title="Reusable Courses Catalog">
            <div className="space-y-5">
                {canRead && (
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <form
                            onSubmit={handleSearchSubmit}
                            className="flex flex-1 flex-wrap items-end gap-2.5"
                        >
                            <div className="min-w-[200px] flex-1">
                                <label
                                    htmlFor="courses-search-input"
                                    className="block text-xs font-medium text-gray-600"
                                >
                                    Search Courses
                                </label>
                                <input
                                    id="courses-search-input"
                                    type="search"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Search by course title or code..."
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="courses-standalone-filter"
                                    className="block text-xs font-medium text-gray-600"
                                >
                                    Standalone Availability
                                </label>
                                <select
                                    id="courses-standalone-filter"
                                    value={query.allowStandalone}
                                    onChange={(e) =>
                                        onUpdateQuery((prev) => ({
                                            ...prev,
                                            page: 1,
                                            allowStandalone: e.target
                                                .value as StandaloneFilterValue,
                                        }))
                                    }
                                    className="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                >
                                    <option value="ALL">All Courses</option>
                                    <option value="STANDALONE_ONLY">Standalone Eligible</option>
                                    <option value="PROGRAM_ONLY">Program-Only Courses</option>
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="courses-status-filter"
                                    className="block text-xs font-medium text-gray-600"
                                >
                                    Lifecycle Status
                                </label>
                                <select
                                    id="courses-status-filter"
                                    value={query.status}
                                    onChange={(e) =>
                                        onUpdateQuery((prev) => ({
                                            ...prev,
                                            page: 1,
                                            status: e.target.value as
                                                | 'ALL'
                                                | OfferingLifecycleStatus,
                                        }))
                                    }
                                    className="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                >
                                    <option value="ALL">All Statuses</option>
                                    {OFFERING_LIFECYCLE_STATUSES.map((status) => (
                                        <option key={status} value={status}>
                                            {formatOfferingStatusLabel(status)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="submit"
                                    className="rounded-md bg-gray-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
                                >
                                    Search
                                </button>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </form>

                        {canCreate && (
                            <button
                                type="button"
                                disabled={isMutating}
                                onClick={onOpenCreate}
                                className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                            >
                                + Create Course
                            </button>
                        )}
                    </div>
                )}

                <AcademicAsyncContent
                    canRead={canRead}
                    requiredPermission={PERMISSIONS.COURSES.READ}
                    isLoading={isLoading}
                    loadingMessage="Loading reusable courses catalog..."
                    loadError={loadError}
                    backendPendingEndpoint="GET /api/academic/courses"
                    onRetry={onRetry}
                    isEmpty={courses.length === 0}
                    emptyTitle={
                        hasActiveFilters ? 'No Matching Courses Found' : 'No Courses Created Yet'
                    }
                    emptyDescription={
                        hasActiveFilters
                            ? 'Try adjusting your search query, standalone eligibility filter, or lifecycle status.'
                            : 'Create reusable courses that can be linked across multiple programs and/or offered standalone.'
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th scope="col" className="px-4 py-3">
                                        Course
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Standalone
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Credits / Hours
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Usage
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Status
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {courses.map((course) => {
                                    const transitions = canUpdate
                                        ? getAllowedOfferingStatusTransitions(course.status)
                                        : [];

                                    const deleteEligibility = evaluateCourseDeleteEligibility({
                                        course,
                                        canDeletePermission: canDelete,
                                    });

                                    const usageParts: string[] = [];
                                    if (typeof course.programCount === 'number') {
                                        usageParts.push(`${course.programCount} program(s)`);
                                    }
                                    if (typeof course.standaloneTeacherCount === 'number') {
                                        usageParts.push(
                                            `${course.standaloneTeacherCount} standalone teacher(s)`
                                        );
                                    }
                                    if (typeof course.enrollmentCount === 'number') {
                                        usageParts.push(`${course.enrollmentCount} enrollment(s)`);
                                    }

                                    return (
                                        <tr key={course.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">
                                                    {course.title}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {course.code ? `Code: ${course.code}` : 'No code'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <StandaloneEligibilityBadge
                                                    allowStandalone={course.allowStandalone}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-700">
                                                {typeof course.creditHours === 'number'
                                                    ? course.creditHours
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600">
                                                {usageParts.length > 0 ? usageParts.join(' · ') : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <OfferingLifecycleBadge status={course.status} />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenDetails(course)}
                                                        className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                    >
                                                        Details
                                                    </button>

                                                    {canUpdate && (
                                                        <button
                                                            type="button"
                                                            disabled={isMutating}
                                                            onClick={() => onOpenEdit(course)}
                                                            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            Edit
                                                        </button>
                                                    )}

                                                    {transitions.map((nextStatus) => (
                                                        <button
                                                            key={nextStatus}
                                                            type="button"
                                                            disabled={isMutating}
                                                            onClick={() =>
                                                                onRequestStatusChange(
                                                                    course,
                                                                    nextStatus
                                                                )
                                                            }
                                                            className="rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                                                        >
                                                            {nextStatus === 'ACTIVE'
                                                                ? 'Activate'
                                                                : nextStatus === 'INACTIVE'
                                                                  ? 'Deactivate'
                                                                  : 'Archive'}
                                                        </button>
                                                    ))}

                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                isMutating ||
                                                                !deleteEligibility.allowed
                                                            }
                                                            title={
                                                                deleteEligibility.reason ??
                                                                'Request course deletion'
                                                            }
                                                            onClick={() => onRequestDelete(course)}
                                                            className="rounded border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <CatalogPaginationBar
                        pagination={pagination}
                        isLoading={isLoading}
                        itemLabel="courses"
                        onPageChange={(nextPage) =>
                            onUpdateQuery((prev) => ({
                                ...prev,
                                page: nextPage,
                            }))
                        }
                    />
                </AcademicAsyncContent>
            </div>
        </DashboardOverviewCard>
    );
};

