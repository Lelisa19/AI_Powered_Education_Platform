import React, { useMemo, useState } from 'react';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { PERMISSIONS } from '../../../constants/permissions';
import type { AcademicFetchError } from '../hooks/useAcademicStructure';
import {
    ACADEMIC_CALENDAR_STATUSES,
    evaluateTermDeleteEligibility,
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

interface TermsSectionProps {
    academicYears: readonly AcademicYear[];
    selectedYearId: string | null;
    selectedAcademicYear: AcademicYear | null;
    terms: readonly AcademicTerm[];
    isLoadingYears: boolean;
    isLoadingTerms: boolean;
    loadError: AcademicFetchError | null;
    isMutating: boolean;
    canReadYears: boolean;
    canReadTerms: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canActivate: boolean;
    canDelete: boolean;
    onSelectYear: (yearId: string) => void;
    onRetry: () => void;
    onOpenCreate: () => void;
    onOpenEdit: (term: AcademicTerm) => void;
    onOpenDetails: (term: AcademicTerm) => void;
    onRequestStatusChange: (term: AcademicTerm, nextStatus: AcademicCalendarStatus) => void;
    onRequestDelete: (term: AcademicTerm) => void;
}

export const TermsSection: React.FC<TermsSectionProps> = ({
    academicYears,
    selectedYearId,
    selectedAcademicYear,
    terms,
    isLoadingYears,
    isLoadingTerms,
    loadError,
    isMutating,
    canReadYears,
    canReadTerms,
    canCreate,
    canUpdate,
    canActivate,
    canDelete,
    onSelectYear,
    onRetry,
    onOpenCreate,
    onOpenEdit,
    onOpenDetails,
    onRequestStatusChange,
    onRequestDelete,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | AcademicCalendarStatus>('ALL');

    const filteredTerms = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase();
        return terms.filter((item) => {
            if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
            if (!needle) return true;
            return (
                item.name.toLowerCase().includes(needle) ||
                (item.description && item.description.toLowerCase().includes(needle))
            );
        });
    }, [terms, searchQuery, statusFilter]);

    if (canReadTerms && !canReadYears) {
        return (
            <DashboardOverviewCard title="Academic Terms / Periods">
                <div
                    role="alert"
                    className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
                >
                    Selecting a parent academic year to view and organize terms requires the{' '}
                    <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.ACADEMIC_YEARS.READ}
                    </code>{' '}
                    permission alongside{' '}
                    <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.TERMS.READ}
                    </code>
                    .
                </div>
            </DashboardOverviewCard>
        );
    }

    return (
        <DashboardOverviewCard title="Academic Terms / Periods">
            <div className="space-y-5">
                {canReadTerms && (
                    <>
                        <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-end sm:justify-between">
                            <div className="w-full sm:max-w-sm">
                                <label
                                    htmlFor="terms-year-selector"
                                    className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
                                >
                                    Parent Academic Year
                                </label>
                                <select
                                    id="terms-year-selector"
                                    disabled={isLoadingYears || academicYears.length === 0}
                                    value={selectedYearId ?? ''}
                                    onChange={(e) => onSelectYear(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                                >
                                    {academicYears.length === 0 ? (
                                        <option value="">No academic years available</option>
                                    ) : (
                                        academicYears.map((year) => (
                                            <option key={year.id} value={year.id}>
                                                {year.name} ({year.status})
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>

                            {selectedAcademicYear && (
                                <div className="text-xs text-gray-600">
                                    <span className="font-semibold text-gray-800">
                                        Allowed Term Window:
                                    </span>{' '}
                                    {formatIsoDateDisplay(selectedAcademicYear.startDate)} –{' '}
                                    {formatIsoDateDisplay(selectedAcademicYear.endDate)}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search terms in selected year..."
                                    aria-label="Search terms"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:max-w-xs"
                                />

                                <select
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(
                                            e.target.value as 'ALL' | AcademicCalendarStatus
                                        )
                                    }
                                    aria-label="Filter terms by status"
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
                                    disabled={isMutating || !selectedAcademicYear}
                                    title={
                                        !selectedAcademicYear
                                            ? 'Create or load an Academic Year before adding terms'
                                            : undefined
                                    }
                                    onClick={onOpenCreate}
                                    className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    + Create Term
                                </button>
                            )}
                        </div>
                    </>
                )}

                <AcademicAsyncContent
                    canRead={canReadTerms}
                    requiredPermission={PERMISSIONS.TERMS.READ}
                    isLoading={isLoadingTerms}
                    loadingMessage="Loading terms for selected academic year..."
                    loadError={loadError}
                    backendPendingEndpoint={
                        selectedYearId
                            ? `GET /api/academic/academic-years/${selectedYearId}/terms`
                            : 'GET /api/academic/terms'
                    }
                    onRetry={onRetry}
                    isEmpty={!selectedAcademicYear || filteredTerms.length === 0}
                    emptyTitle={
                        !selectedAcademicYear
                            ? 'Select or Create an Academic Year First'
                            : terms.length === 0
                              ? 'No Terms Defined for This Academic Year'
                              : 'No Matching Terms'
                    }
                    emptyDescription={
                        !selectedAcademicYear
                            ? 'Terms belong to a specific academic year. Configure an academic year first to schedule its semesters, quarters, or custom periods.'
                            : terms.length === 0
                              ? `Add any number of terms, semesters, or grading periods within ${selectedAcademicYear.name}.`
                              : 'Try adjusting your search query or status filter.'
                    }
                >
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                <tr>
                                    <th className="px-4 py-3">Term Name</th>
                                    <th className="px-4 py-3">Academic Year</th>
                                    <th className="px-4 py-3">Date Range</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredTerms.map((term) => {
                                    const transitions = getAllowedCalendarStatusTransitions(
                                        term.status
                                    );
                                    const deleteEligibility = evaluateTermDeleteEligibility({
                                        term,
                                        canDeletePermission: canDelete,
                                    });
                                    const parentLabel =
                                        selectedAcademicYear?.name ||
                                        term.academicYearName ||
                                        term.academicYearId;

                                    return (
                                        <tr key={term.id} className="hover:bg-gray-50/70">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-gray-900">
                                                    {term.name}
                                                </div>
                                                {term.description && (
                                                    <div className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                                                        {term.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">
                                                {parentLabel}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">
                                                {formatIsoDateDisplay(term.startDate)} –{' '}
                                                {formatIsoDateDisplay(term.endDate)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <AcademicCalendarStatusBadge status={term.status} />
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenDetails(term)}
                                                        className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                    >
                                                        View
                                                    </button>

                                                    {canUpdate && (
                                                        <button
                                                            type="button"
                                                            disabled={isMutating}
                                                            onClick={() => onOpenEdit(term)}
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
                                                                        term,
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
                                                                'Delete term'
                                                            }
                                                            onClick={() => onRequestDelete(term)}
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
