import React, { useMemo, useState } from 'react';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { PERMISSIONS } from '../../../constants/permissions';
import type { PaginationMeta } from '../../../types/api.types';
import { AcademicAsyncContent } from '../../academic/components/AcademicAsyncContent';
import type { AcademicClass } from '../../academic/types/academic-structure.types';
import type { CatalogFetchError, ProgramsQueryState } from '../hooks/useProgramsAndCourses';
import {
    OFFERING_LIFECYCLE_STATUSES,
    PROGRAM_TYPES,
    evaluateProgramDeleteEligibility,
    formatOfferingStatusLabel,
    formatProgramTypeLabel,
    getAllowedOfferingStatusTransitions,
} from '../schemas/programs-courses-schema';
import type { OfferingLifecycleStatus, Program, ProgramType } from '../types/programs-courses.types';
import {
    CatalogPaginationBar,
    OfferingLifecycleBadge,
    ProgramTypeBadge,
} from './CatalogBadgesAndPagination';

interface ProgramsDirectorySectionProps {
    programs: readonly Program[];
    pagination: PaginationMeta | null;
    query: ProgramsQueryState;
    classes: readonly AcademicClass[];
    canReadClasses: boolean;
    isLoading: boolean;
    loadError: CatalogFetchError | null;
    isMutating: boolean;
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    onUpdateQuery: (updater: (prev: ProgramsQueryState) => ProgramsQueryState) => void;
    onRetry: () => void;
    onOpenCreate: () => void;
    onOpenDetails: (program: Program) => void;
    onOpenEdit: (program: Program) => void;
    onRequestStatusChange: (program: Program, nextStatus: OfferingLifecycleStatus) => void;
    onRequestDelete: (program: Program) => void;
}

export const ProgramsDirectorySection: React.FC<ProgramsDirectorySectionProps> = ({
    programs,
    pagination,
    query,
    classes,
    canReadClasses,
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

    const classLookup = useMemo(() => {
        const map = new Map<string, AcademicClass>();
        for (const cls of classes) {
            map.set(cls.id, cls);
        }
        return map;
    }, [classes]);

    const hasActiveFilters =
        query.search.trim() !== '' || query.programType !== 'ALL' || query.status !== 'ALL';

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
            programType: 'ALL',
            status: 'ALL',
        }));
    };

    return (
        <DashboardOverviewCard title="Programs Directory">
            <div className="space-y-5">
                {canRead && (
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <form
                            onSubmit={handleSearchSubmit}
                            className="flex flex-1 flex-wrap items-end gap-2.5"
                        >
                            <div className="min-w-[200px] flex-1">
                                <label
                                    htmlFor="programs-search-input"
                                    className="block text-xs font-medium text-gray-600"
                                >
                                    Search Programs
                                </label>
                                <input
                                    id="programs-search-input"
                                    type="search"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Search by program name or code..."
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="programs-type-filter"
                                    className="block text-xs font-medium text-gray-600"
                                >
                                    Program Type
                                </label>
                                <select
                                    id="programs-type-filter"
                                    value={query.programType}
                                    onChange={(e) =>
                                        onUpdateQuery((prev) => ({
                                            ...prev,
                                            page: 1,
                                            programType: e.target.value as 'ALL' | ProgramType,
                                        }))
                                    }
                                    className="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                >
                                    <option value="ALL">All Types</option>
                                    {PROGRAM_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {formatProgramTypeLabel(type)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="programs-status-filter"
                                    className="block text-xs font-medium text-gray-600"
                                >
                                    Lifecycle Status
                                </label>
                                <select
                                    id="programs-status-filter"
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
                                + Create Program
                            </button>
                        )}
                    </div>
                )}

                <AcademicAsyncContent
                    canRead={canRead}
                    requiredPermission={PERMISSIONS.PROGRAMS.READ}
                    isLoading={isLoading}
                    loadingMessage="Loading school programs..."
                    loadError={loadError}
                    backendPendingEndpoint="GET /api/academic/programs"
                    onRetry={onRetry}
                    isEmpty={programs.length === 0}
                    emptyTitle={
                        hasActiveFilters ? 'No Matching Programs Found' : 'No Programs Configured Yet'
                    }
                    emptyDescription={
                        hasActiveFilters
                            ? 'Try adjusting your search term, program type, or lifecycle status filters.'
                            : 'Create Grade-Based or Skill-Based programs to organize reusable courses into structured offerings.'
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th scope="col" className="px-4 py-3">
                                        Program
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Type
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Academic Class
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Status
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Usage
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {programs.map((program) => {
                                    const linkedClass = program.academicClassId
                                        ? classLookup.get(program.academicClassId)
                                        : undefined;
                                    const classDisplay =
                                        program.programType === 'SKILL_BASED'
                                            ? 'Not applicable'
                                            : program.academicClassName ||
                                              linkedClass?.name ||
                                              (program.academicClassId
                                                  ? canReadClasses
                                                      ? program.academicClassId
                                                      : 'Class linked (classes.read restricted)'
                                                  : '—');

                                    const transitions = canUpdate
                                        ? getAllowedOfferingStatusTransitions(program.status)
                                        : [];

                                    const deleteEligibility = evaluateProgramDeleteEligibility({
                                        program,
                                        canDeletePermission: canDelete,
                                    });

                                    const usageParts: string[] = [];
                                    if (typeof program.courseCount === 'number') {
                                        usageParts.push(`${program.courseCount} course(s)`);
                                    }
                                    if (typeof program.enrollmentCount === 'number') {
                                        usageParts.push(`${program.enrollmentCount} enrollment(s)`);
                                    }

                                    return (
                                        <tr key={program.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">
                                                    {program.name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {program.code ? `Code: ${program.code}` : 'No code'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <ProgramTypeBadge programType={program.programType} />
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-700">
                                                {classDisplay}
                                            </td>
                                            <td className="px-4 py-3">
                                                <OfferingLifecycleBadge status={program.status} />
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600">
                                                {usageParts.length > 0 ? usageParts.join(' · ') : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenDetails(program)}
                                                        className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                    >
                                                        Curriculum &amp; Details
                                                    </button>

                                                    {canUpdate && (
                                                        <button
                                                            type="button"
                                                            disabled={isMutating}
                                                            onClick={() => onOpenEdit(program)}
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
                                                                    program,
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
                                                                'Request program deletion'
                                                            }
                                                            onClick={() => onRequestDelete(program)}
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
                        itemLabel="programs"
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

