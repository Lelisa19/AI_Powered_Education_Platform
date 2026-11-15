import React, { useState } from 'react';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { PERMISSIONS } from '../../../constants/permissions';
import type { PaginationMeta } from '../../../types/api.types';
import { AcademicAsyncContent } from '../../academic/components/AcademicAsyncContent';
import { formatStudentFullName } from '../../students/schemas/student-management-schema';
import type { ProgramChangeQueueQueryState } from '../hooks/useProgramChangeQueue';
import type { EnrollmentFetchError } from '../hooks/useStudentEnrollments';
import {
    PROGRAM_CHANGE_REQUEST_STATUSES,
    formatAcademicTimestamp,
    formatProgramChangeStatusLabel,
} from '../schemas/enrollment-schema';
import type { ProgramChangeRequestRecord } from '../types/enrollment.types';
import { ProgramChangeStatusBadge } from './EnrollmentBadges';

interface ProgramChangeQueueSectionProps {
    canApproveProgramChange: boolean;
    currentActorId: string | null | undefined;
    items: readonly ProgramChangeRequestRecord[];
    pagination: PaginationMeta | null;
    query: ProgramChangeQueueQueryState;
    isLoading: boolean;
    loadError: EnrollmentFetchError | null;
    isDeciding: boolean;
    notice: string | null;
    actionError: EnrollmentFetchError | null;
    onClearFeedback: () => void;
    onQueryChange: (updater: (prev: ProgramChangeQueueQueryState) => ProgramChangeQueueQueryState) => void;
    onRetry: () => void;
    onOpenReview: (item: ProgramChangeRequestRecord) => void;
}

export const ProgramChangeQueueSection: React.FC<ProgramChangeQueueSectionProps> = ({
    canApproveProgramChange,
    currentActorId,
    items,
    pagination,
    query,
    isLoading,
    loadError,
    isDeciding,
    notice,
    actionError,
    onClearFeedback,
    onQueryChange,
    onRetry,
    onOpenReview,
}) => {
    const [searchInput, setSearchInput] = useState(query.search);

    const hasActiveFilters = query.search.trim() !== '' || query.status !== 'PENDING';

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onQueryChange((prev) => ({
            ...prev,
            search: searchInput.trim(),
            page: 1,
        }));
    };

    const handleResetFilters = () => {
        setSearchInput('');
        onQueryChange((prev) => ({
            ...prev,
            search: '',
            status: 'PENDING',
            page: 1,
        }));
    };

    return (
        <DashboardOverviewCard title="Cross-Student Program Change Approval Queue">
            <div className="space-y-5">
                <p className="text-xs text-gray-600">
                    Review Grade-Based Program Change Requests across the school. Approvers cannot
                    approve or reject requests they submitted themselves.
                </p>

                {notice && (
                    <div
                        role="status"
                        className="flex items-start justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"
                    >
                        <span>{notice}</span>
                        <button
                            type="button"
                            onClick={onClearFeedback}
                            className="shrink-0 font-semibold underline"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {actionError && (
                    <div
                        role="alert"
                        className="flex items-start justify-between gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                    >
                        <span>
                            {actionError.message}
                            {actionError.isBackendUnavailable
                                ? ' (Backend endpoint: POST /api/academic/enrollments/program-change-requests/:requestId/decision)'
                                : ''}
                        </span>
                        <button
                            type="button"
                            onClick={onClearFeedback}
                            className="shrink-0 font-semibold underline"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {canApproveProgramChange && (
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <form
                            onSubmit={handleSearchSubmit}
                            className="flex flex-1 flex-wrap items-end gap-2.5"
                        >
                            <div className="min-w-[220px] flex-1">
                                <label
                                    htmlFor="program-change-queue-search"
                                    className="block text-xs font-medium text-gray-700"
                                >
                                    Search Queue
                                </label>
                                <input
                                    id="program-change-queue-search"
                                    type="search"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Student name, email, code, program, or reason..."
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                />
                            </div>

                            <div className="w-44">
                                <label
                                    htmlFor="program-change-queue-status"
                                    className="block text-xs font-medium text-gray-700"
                                >
                                    Request Status
                                </label>
                                <select
                                    id="program-change-queue-status"
                                    value={query.status}
                                    onChange={(e) => {
                                        const nextStatus = e.target
                                            .value as ProgramChangeQueueQueryState['status'];
                                        onQueryChange((prev) => ({
                                            ...prev,
                                            status: nextStatus,
                                            page: 1,
                                        }));
                                    }}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                >
                                    {PROGRAM_CHANGE_REQUEST_STATUSES.map((status) => (
                                        <option key={status} value={status}>
                                            {formatProgramChangeStatusLabel(status)}
                                        </option>
                                    ))}
                                    <option value="ALL">All Statuses</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                            >
                                Search
                            </button>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    Reset
                                </button>
                            )}
                        </form>

                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={onRetry}
                            className="self-start rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 lg:self-end"
                        >
                            {isLoading ? 'Refreshing...' : 'Refresh Queue'}
                        </button>
                    </div>
                )}

                <AcademicAsyncContent
                    canRead={canApproveProgramChange}
                    requiredPermission={PERMISSIONS.ENROLLMENTS.APPROVE_PROGRAM_CHANGE}
                    isLoading={isLoading}
                    loadingMessage="Loading Program Change approval queue..."
                    loadError={loadError}
                    backendPendingEndpoint="GET /api/academic/enrollments/program-change-requests"
                    onRetry={onRetry}
                    isEmpty={items.length === 0}
                    emptyTitle={
                        query.status === 'PENDING'
                            ? 'No Pending Program Change Requests'
                            : 'No Matching Program Change Requests'
                    }
                    emptyDescription={
                        hasActiveFilters
                            ? 'Try adjusting your search keywords or status filter.'
                            : 'Submitted Grade-Based Program Change Requests awaiting approval will appear here.'
                    }
                >
                    <div className="space-y-3">
                        {items.map((item) => {
                            const studentLabel = item.student
                                ? formatStudentFullName(
                                      item.student.firstName,
                                      item.student.lastName,
                                      item.student.email
                                  )
                                : item.studentId;
                            const isSelfSubmitted =
                                Boolean(currentActorId) && item.requestedBy.id === currentActorId;

                            return (
                                <div
                                    key={item.id}
                                    className="rounded-md border border-gray-200 bg-white p-4 shadow-sm"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {studentLabel}
                                                </span>
                                                <ProgramChangeStatusBadge status={item.status} />
                                                {isSelfSubmitted && item.status === 'PENDING' && (
                                                    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                                                        Submitted by you (self-review blocked)
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-600">
                                                {item.student?.email && (
                                                    <span>{item.student.email}</span>
                                                )}
                                                {item.student?.studentCode && (
                                                    <span className="font-mono">
                                                        Code: {item.student.studentCode}
                                                    </span>
                                                )}
                                                <span>
                                                    <strong>Academic Year:</strong>{' '}
                                                    {item.academicYearName ?? item.academicYearId}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2 rounded border border-gray-100 bg-gray-50 p-2.5 text-xs sm:grid-cols-2">
                                                <div>
                                                    <span className="font-medium text-gray-500">
                                                        From:{' '}
                                                    </span>
                                                    <span className="font-semibold text-gray-900">
                                                        {item.sourceProgramName ??
                                                            item.sourceProgramId}
                                                    </span>{' '}
                                                    <span className="text-gray-600">
                                                        (
                                                        {item.sourceAcademicClassName ??
                                                            item.sourceAcademicClassId}
                                                        {item.sourceSectionName
                                                            ? ` · ${item.sourceSectionName}`
                                                            : ''}
                                                        )
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-indigo-700">
                                                        To:{' '}
                                                    </span>
                                                    <span className="font-semibold text-gray-900">
                                                        {item.targetProgramName ??
                                                            item.targetProgramId}
                                                    </span>{' '}
                                                    <span className="text-gray-600">
                                                        (
                                                        {item.targetAcademicClassName ??
                                                            item.targetAcademicClassId}
                                                        {item.targetSectionName
                                                            ? ` · ${item.targetSectionName}`
                                                            : ' · Section Unassigned'}
                                                        )
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-gray-700">
                                                <strong>Reason:</strong> {item.reason}
                                            </p>

                                            <p className="text-[11px] text-gray-500">
                                                Requested by{' '}
                                                <span className="font-medium text-gray-700">
                                                    {item.requestedBy.name ??
                                                        item.requestedBy.email ??
                                                        item.requestedBy.id}
                                                </span>{' '}
                                                on {formatAcademicTimestamp(item.requestedAt)}
                                                {item.reviewedBy && (
                                                    <>
                                                        {' · '}Reviewed by{' '}
                                                        <span className="font-medium text-gray-700">
                                                            {item.reviewedBy.name ??
                                                                item.reviewedBy.email ??
                                                                item.reviewedBy.id}
                                                        </span>
                                                        {item.reviewedAt
                                                            ? ` on ${formatAcademicTimestamp(
                                                                  item.reviewedAt
                                                              )}`
                                                            : ''}
                                                    </>
                                                )}
                                            </p>
                                        </div>

                                        <div className="shrink-0">
                                            <button
                                                type="button"
                                                disabled={isDeciding}
                                                onClick={() => onOpenReview(item)}
                                                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold shadow-sm disabled:opacity-50 ${
                                                    item.status === 'PENDING'
                                                        ? 'bg-indigo-700 text-white hover:bg-indigo-800'
                                                        : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                {item.status === 'PENDING'
                                                    ? 'Review & Decide'
                                                    : 'View Details'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {pagination && (pagination.totalPages > 1 || pagination.total > 0) && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 text-xs text-gray-600 sm:flex-row">
                            <span>
                                Showing page{' '}
                                <span className="font-semibold text-gray-900">
                                    {pagination.page}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-gray-900">
                                    {Math.max(1, pagination.totalPages)}
                                </span>{' '}
                                ({pagination.total.toLocaleString()} total requests)
                            </span>
                            {pagination.totalPages > 1 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={isLoading || pagination.page <= 1}
                                        onClick={() =>
                                            onQueryChange((prev) => ({
                                                ...prev,
                                                page: Math.max(1, pagination.page - 1),
                                            }))
                                        }
                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        disabled={
                                            isLoading || pagination.page >= pagination.totalPages
                                        }
                                        onClick={() =>
                                            onQueryChange((prev) => ({
                                                ...prev,
                                                page: pagination.page + 1,
                                            }))
                                        }
                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </AcademicAsyncContent>
            </div>
        </DashboardOverviewCard>
    );
};

