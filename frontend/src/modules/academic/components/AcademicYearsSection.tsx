import React, { useMemo, useState } from 'react';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { PERMISSIONS } from '../../../constants/permissions';
import type { AcademicFetchError } from '../hooks/useAcademicStructure';
import {
    ACADEMIC_CALENDAR_STATUSES,
    evaluateAcademicYearDeleteEligibility,
    formatCalendarStatusLabel,
    formatIsoDateDisplay,
    getAllowedCalendarStatusTransitions,
} from '../schemas/academic-structure-schema';
import type {
    AcademicCalendarStatus,
    AcademicTerm,
    AcademicYear,
} from '../types/academic-structure.types';
import { AcademicAsyncContent } from './AcademicAsyncContent';
import { AcademicCalendarStatusBadge } from './AcademicStatusBadge';

interface AcademicYearsSectionProps {
    academicYears: readonly AcademicYear[];
    activeAcademicYear: AcademicYear | null;
    loadedTerms: readonly AcademicTerm[];
    isLoading: boolean;
    loadError: AcademicFetchError | null;
    isMutating: boolean;
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canActivate: boolean;
    canDelete: boolean;
    canReadTerms: boolean;
    onRetry: () => void;
    onOpenCreate: () => void;
    onOpenEdit: (year: AcademicYear) => void;
    onOpenDetails: (year: AcademicYear) => void;
    onOpenTermsForYear: (yearId: string) => void;
    onRequestStatusChange: (year: AcademicYear, nextStatus: AcademicCalendarStatus) => void;
    onRequestDelete: (year: AcademicYear) => void;
}

export const AcademicYearsSection: React.FC<AcademicYearsSectionProps> = ({
    academicYears,
    activeAcademicYear,
    loadedTerms,
    isLoading,
    loadError,
    isMutating,
    canRead,
    canCreate,
    canUpdate,
    canActivate,
    canDelete,
    canReadTerms,
    onRetry,
    onOpenCreate,
    onOpenEdit,
    onOpenDetails,
    onOpenTermsForYear,
    onRequestStatusChange,
    onRequestDelete,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | AcademicCalendarStatus>('ALL');

    const filteredYears = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase();
        return academicYears.filter((item) => {
            if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
            if (!needle) return true;
            return (
                item.name.toLowerCase().includes(needle) ||
                (item.description && item.description.toLowerCase().includes(needle))
            );
        });
    }, [academicYears, searchQuery, statusFilter]);

    return (
        <DashboardOverviewCard title="Academic Years">
            <div className="space-y-5">
                {canRead && activeAcademicYear && (
                    <div className="flex flex-col gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <span className="font-semibold">Current Active Academic Year:</span>{' '}
                            {activeAcademicYear.name} (
                            {formatIsoDateDisplay(activeAcademicYear.startDate)} –{' '}
                            {formatIsoDateDisplay(activeAcademicYear.endDate)})
                        </div>
                        {canReadTerms && (
                            <button
                                type="button"
                                onClick={() => onOpenTermsForYear(activeAcademicYear.id)}
                                className="self-start font-semibold text-emerald-800 hover:underline sm:self-auto"
                            >
                                Manage Terms →
                            </button>
                        )}
                    </div>
                )}

                {canRead && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search academic years..."
                                aria-label="Search academic years"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:max-w-xs"
                            />

                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value as 'ALL' | AcademicCalendarStatus)
                                }
                                aria-label="Filter academic years by status"
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                            >
                                <option value="ALL">All Statuses</option>
                                {ACADEMIC_CALENDAR_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                        {formatCalendarStatusLabel(status)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {canCreate && (
                            <button
                                type="button"
                                disabled={isMutating}
                                onClick={onOpenCreate}
                                className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                            >
                                + Create Academic Year
                            </button>
                        )}
                    </div>
                )}

                <AcademicAsyncContent
                    canRead={canRead}
                    requiredPermission={PERMISSIONS.ACADEMIC_YEARS.READ}
                    isLoading={isLoading}
                    loadingMessage="Loading academic years..."
                    loadError={loadError}
                    backendPendingEndpoint="GET /api/academic/academic-years"
                    onRetry={onRetry}
                    isEmpty={filteredYears.length === 0}
                    emptyTitle={
                        academicYears.length === 0
                            ? 'No Academic Years Configured'
                            : 'No Matching Academic Years'
                    }
                    emptyDescription={
                        academicYears.length === 0
                            ? 'Define your first institutional academic calendar year before organizing terms.'
                            : 'Try clearing or adjusting your search query and status filter.'
                    }
                >
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                <tr>
                                    <th className="px-4 py-3">Academic Year</th>
                                    <th className="px-4 py-3">Date Range</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Terms</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredYears.map((year) => {
                                    const transitions = getAllowedCalendarStatusTransitions(
                                        year.status
                                    );
                                    const deleteEligibility = evaluateAcademicYearDeleteEligibility({
                                        year,
                                        loadedTerms,
                                        canDeletePermission: canDelete,
                                    });
                                    const loadedTermCount = loadedTerms.filter(
                                        (t) => t.academicYearId === year.id
                                    ).length;
                                    const termDisplayCount =
                                        loadedTermCount > 0 ? loadedTermCount : year.termCount;

                                    return (
                                        <tr key={year.id} className="hover:bg-gray-50/70">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-gray-900">
                                                    {year.name}
                                                </div>
                                                {year.description && (
                                                    <div className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                                                        {year.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">
                                                {formatIsoDateDisplay(year.startDate)} –{' '}
                                                {formatIsoDateDisplay(year.endDate)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <AcademicCalendarStatusBadge status={year.status} />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">
                                                {canReadTerms ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenTermsForYear(year.id)}
                                                        className="font-medium text-blue-700 hover:underline"
                                                    >
                                                        {typeof termDisplayCount === 'number'
                                                            ? `${termDisplayCount} term(s)`
                                                            : 'View Terms'}
                                                    </button>
                                                ) : typeof termDisplayCount === 'number' ? (
                                                    `${termDisplayCount} term(s)`
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenDetails(year)}
                                                        className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                    >
                                                        View
                                                    </button>

                                                    {canUpdate && (
                                                        <button
                                                            type="button"
                                                            disabled={isMutating}
                                                            onClick={() => onOpenEdit(year)}
                                                            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            Edit
                                                        </button>
                                                    )}

                                                    {canActivate &&
                                                        transitions.map((nextStatus) => (
                                                            <button
                                                                key={nextStatus}
                                                                type="button"
                                                                disabled={isMutating}
                                                                onClick={() =>
                                                                    onRequestStatusChange(
                                                                        year,
                                                                        nextStatus
                                                                    )
                                                                }
                                                                className={`rounded border px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                                                                    nextStatus === 'ACTIVE'
                                                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                                                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                                                }`}
                                                            >
                                                                {nextStatus === 'ACTIVE'
                                                                    ? 'Activate'
                                                                    : nextStatus === 'COMPLETED'
                                                                      ? 'Complete'
                                                                      : nextStatus === 'ARCHIVED'
                                                                        ? 'Archive'
                                                                        : 'Restore'}
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
                                                                'Delete academic year'
                                                            }
                                                            onClick={() => onRequestDelete(year)}
                                                            className="rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                </AcademicAsyncContent>
            </div>
        </DashboardOverviewCard>
    );
};
