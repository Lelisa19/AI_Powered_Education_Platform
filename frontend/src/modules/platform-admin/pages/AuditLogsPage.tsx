import React, { useState } from 'react';
import { DashboardEmptyState } from '../../../components/Dashboards/DashboardEmptyState';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PLATFORM_PERMISSIONS } from '../../../constants/permissions';
import { usePermissions } from '../../../hooks/usePermissions';
import { AuditLogDetailModal } from '../components/AuditLogDetailModal';
import { AuditOutcomeBadge } from '../components/AuditOutcomeBadge';
import {
    type AuditLogQueryState,
    usePlatformAuditLogs,
} from '../hooks/usePlatformAuditLogs';
import {
    isProposedAuditActionCategory,
    isProposedAuditOutcome,
    isProposedAuditResourceType,
} from '../services/platform-audit-log-service';
import {
    PROPOSED_AUDIT_ACTION_CATEGORIES,
    PROPOSED_AUDIT_OUTCOMES,
    PROPOSED_AUDIT_RESOURCE_TYPES,
    type AuditSortOrder,
    type PlatformAuditLogRecord,
} from '../types/platform-audit-log.types';
import {
    formatActorAccountType,
    formatActorPrimaryDisplay,
    formatAuditActionCategory,
    formatAuditActionLabel,
    formatAuditOutcomeLabel,
    formatAuditResourceType,
    formatAuditTimestamp,
    formatOptionalAuditText,
    formatResourceIdentifierDisplay,
} from '../utils/platform-audit-log-formatters';

const INITIAL_QUERY: AuditLogQueryState = {
    page: 1,
    search: '',
    actor: '',
    actionCategory: '',
    resourceType: '',
    outcome: '',
    fromDate: '',
    toDate: '',
    sortOrder: 'desc',
};

export const AuditLogsPage: React.FC = () => {
    const { hasPermission } = usePermissions();
    const canViewAuditLogs = hasPermission(PLATFORM_PERMISSIONS.AUDIT_LOGS_VIEW);

    const [query, setQuery] = useState<AuditLogQueryState>(INITIAL_QUERY);

    const [searchInput, setSearchInput] = useState('');
    const [actorInput, setActorInput] = useState('');
    const [fromDateInput, setFromDateInput] = useState('');
    const [toDateInput, setToDateInput] = useState('');
    const [filterValidationError, setFilterValidationError] = useState<string | null>(null);

    const [selectedRecord, setSelectedRecord] = useState<PlatformAuditLogRecord | null>(null);

    const { records, pagination, isLoading, fetchError, reload } = usePlatformAuditLogs(
        canViewAuditLogs,
        query
    );

    const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const normalizedFrom = fromDateInput.trim();
        const normalizedTo = toDateInput.trim();
        if (normalizedFrom && normalizedTo && normalizedFrom > normalizedTo) {
            setFilterValidationError('Start date cannot be later than end date.');
            return;
        }

        setFilterValidationError(null);
        setQuery((prev) => ({
            ...prev,
            page: 1,
            search: searchInput.trim(),
            actor: actorInput.trim(),
            fromDate: normalizedFrom,
            toDate: normalizedTo,
        }));
    };

    const handleActionCategoryChange = (rawCategory: string) => {
        setFilterValidationError(null);
        setQuery((prev) => ({
            ...prev,
            page: 1,
            actionCategory: isProposedAuditActionCategory(rawCategory) ? rawCategory : '',
        }));
    };

    const handleResourceTypeChange = (rawType: string) => {
        setFilterValidationError(null);
        setQuery((prev) => ({
            ...prev,
            page: 1,
            resourceType: isProposedAuditResourceType(rawType) ? rawType : '',
        }));
    };

    const handleOutcomeChange = (rawOutcome: string) => {
        setFilterValidationError(null);
        setQuery((prev) => ({
            ...prev,
            page: 1,
            outcome: isProposedAuditOutcome(rawOutcome) ? rawOutcome : '',
        }));
    };

    const handleSortOrderChange = (rawOrder: string) => {
        const nextSort: AuditSortOrder = rawOrder === 'asc' ? 'asc' : 'desc';
        setQuery((prev) => ({
            ...prev,
            page: 1,
            sortOrder: nextSort,
        }));
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setActorInput('');
        setFromDateInput('');
        setToDateInput('');
        setFilterValidationError(null);
        setQuery({
            ...INITIAL_QUERY,
            sortOrder: query.sortOrder,
        });
    };

    const hasActiveFilters = Boolean(
        query.search ||
            query.actor ||
            query.actionCategory ||
            query.resourceType ||
            query.outcome ||
            query.fromDate ||
            query.toDate
    );

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <DashboardPageHeader
                    title="Platform Audit Logs"
                    subtitle="Read-only historical record of platform-level administrative actions, resource changes, and security outcomes."
                />

                {canViewAuditLogs && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={reload}
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isLoading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                )}
            </div>

            {!canViewAuditLogs ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access denied: Viewing platform audit logs requires the{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PLATFORM_PERMISSIONS.AUDIT_LOGS_VIEW}
                    </code>{' '}
                    permission.
                </div>
            ) : (
                <>
                    <div
                        role="note"
                        className="rounded-md border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700"
                    >
                        Read-only audit trail: Platform audit entries reflect immutable platform-level administrative activity and cannot be edited or deleted from this interface.
                    </div>

                    <DashboardOverviewCard title="Audit Log Directory" headingLevel="h2">
                        <div className="space-y-6">
                            <form onSubmit={handleFilterSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                        <label
                                            htmlFor="audit-search"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Search Events
                                        </label>
                                        <input
                                            id="audit-search"
                                            type="search"
                                            value={searchInput}
                                            onChange={(event) => setSearchInput(event.target.value)}
                                            placeholder="Action, resource ID, request ID..."
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="audit-actor"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Actor
                                        </label>
                                        <input
                                            id="audit-actor"
                                            type="search"
                                            value={actorInput}
                                            onChange={(event) => setActorInput(event.target.value)}
                                            placeholder="Actor name, email, or ID"
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="audit-from-date"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            From Date
                                        </label>
                                        <input
                                            id="audit-from-date"
                                            type="date"
                                            value={fromDateInput}
                                            onChange={(event) => {
                                                setFilterValidationError(null);
                                                setFromDateInput(event.target.value);
                                            }}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="audit-to-date"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            To Date
                                        </label>
                                        <input
                                            id="audit-to-date"
                                            type="date"
                                            value={toDateInput}
                                            onChange={(event) => {
                                                setFilterValidationError(null);
                                                setToDateInput(event.target.value);
                                            }}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                                    <div>
                                        <label
                                            htmlFor="audit-category-filter"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Action Category
                                        </label>
                                        <select
                                            id="audit-category-filter"
                                            value={query.actionCategory}
                                            onChange={(event) =>
                                                handleActionCategoryChange(event.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        >
                                            <option value="">All Categories</option>
                                            {PROPOSED_AUDIT_ACTION_CATEGORIES.map((category) => (
                                                <option key={category} value={category}>
                                                    {formatAuditActionCategory(category)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="audit-resource-filter"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Resource Type
                                        </label>
                                        <select
                                            id="audit-resource-filter"
                                            value={query.resourceType}
                                            onChange={(event) =>
                                                handleResourceTypeChange(event.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        >
                                            <option value="">All Resource Types</option>
                                            {PROPOSED_AUDIT_RESOURCE_TYPES.map((resourceType) => (
                                                <option key={resourceType} value={resourceType}>
                                                    {formatAuditResourceType(resourceType)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="audit-outcome-filter"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Outcome
                                        </label>
                                        <select
                                            id="audit-outcome-filter"
                                            value={query.outcome}
                                            onChange={(event) =>
                                                handleOutcomeChange(event.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        >
                                            <option value="">All Outcomes</option>
                                            {PROPOSED_AUDIT_OUTCOMES.map((outcome) => (
                                                <option key={outcome} value={outcome}>
                                                    {formatAuditOutcomeLabel(outcome)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="audit-sort-order"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Sort Order
                                        </label>
                                        <select
                                            id="audit-sort-order"
                                            value={query.sortOrder}
                                            onChange={(event) =>
                                                handleSortOrderChange(event.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        >
                                            <option value="desc">Newest First</option>
                                            <option value="asc">Oldest First</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="submit"
                                            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        >
                                            Apply Filters
                                        </button>
                                        {hasActiveFilters && (
                                            <button
                                                type="button"
                                                onClick={handleClearFilters}
                                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {filterValidationError && (
                                    <p role="alert" className="text-xs font-medium text-red-700">
                                        {filterValidationError}
                                    </p>
                                )}
                            </form>

                            {isLoading ? (
                                <div
                                    role="status"
                                    className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-12 text-center"
                                >
                                    <div
                                        className="mb-3 h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
                                        aria-hidden="true"
                                    />
                                    <p className="text-sm font-medium text-gray-700">
                                        Loading platform audit logs...
                                    </p>
                                </div>
                            ) : fetchError ? (
                                fetchError.isBackendUnavailable ? (
                                    <div
                                        role="status"
                                        className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                                    >
                                        <h3 className="text-base font-semibold text-amber-900">
                                            Platform Audit Logs API Pending Backend Implementation
                                        </h3>
                                        <p className="mx-auto mt-2 max-w-xl text-sm text-amber-800">
                                            The frontend failed closed without displaying synthetic activity because{' '}
                                            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                                                GET /api/platform/audit-logs
                                            </code>{' '}
                                            is unavailable ({fetchError.message}).
                                        </p>
                                        <div className="mt-4">
                                            <button
                                                type="button"
                                                onClick={reload}
                                                className="rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
                                            >
                                                Retry Connection
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        role="alert"
                                        className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
                                    >
                                        <h3 className="text-base font-semibold text-red-900">
                                            Unable to Load Platform Audit Logs
                                        </h3>
                                        <p className="mx-auto mt-2 max-w-xl text-sm text-red-700">
                                            {fetchError.message}
                                        </p>
                                        <div className="mt-4">
                                            <button
                                                type="button"
                                                onClick={reload}
                                                className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 shadow-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    </div>
                                )
                            ) : records.length === 0 ? (
                                <DashboardEmptyState
                                    headingLevel="h3"
                                    title={
                                        hasActiveFilters
                                            ? 'No Matching Audit Records'
                                            : 'No Platform Audit Logs Recorded Yet'
                                    }
                                    description={
                                        hasActiveFilters
                                            ? 'No platform audit records match the active search or filter criteria.'
                                            : 'Recorded platform administrative actions will appear here once emitted by the backend audit service.'
                                    }
                                />
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                <tr>
                                                    <th scope="col" className="px-4 py-3">
                                                        Timestamp
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Actor
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Action / Event
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Affected Resource
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Outcome
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Request Context
                                                    </th>
                                                    <th scope="col" className="px-4 py-3 text-right">
                                                        Details
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                {records.map((record) => {
                                                    const actorDisplay =
                                                        formatActorPrimaryDisplay(record);
                                                    const resourceDisplay =
                                                        formatResourceIdentifierDisplay(record);

                                                    return (
                                                        <tr
                                                            key={record.id}
                                                            className="hover:bg-gray-50"
                                                        >
                                                            <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-700">
                                                                {formatAuditTimestamp(
                                                                    record.occurredAt
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <div className="font-medium text-gray-900">
                                                                    {actorDisplay.primary}
                                                                </div>
                                                                {actorDisplay.secondary && (
                                                                    <div className="text-xs text-gray-500">
                                                                        {actorDisplay.secondary}
                                                                    </div>
                                                                )}
                                                                <div className="mt-0.5 text-xs text-gray-500">
                                                                    {formatActorAccountType(
                                                                        record.actorAccountType
                                                                    )}
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <div className="font-medium text-gray-900">
                                                                    {formatAuditActionLabel(
                                                                        record.action
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {formatAuditActionCategory(
                                                                        record.actionCategory
                                                                    )}
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                                    {formatAuditResourceType(
                                                                        record.resourceType
                                                                    )}
                                                                </div>
                                                                <div className="text-sm text-gray-900">
                                                                    {resourceDisplay.primary}
                                                                </div>
                                                                {resourceDisplay.secondary && (
                                                                    <div className="font-mono text-xs text-gray-500">
                                                                        {resourceDisplay.secondary}
                                                                    </div>
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <AuditOutcomeBadge
                                                                    outcome={record.outcome}
                                                                />
                                                            </td>

                                                            <td className="px-4 py-3 text-xs text-gray-600">
                                                                <div>
                                                                    IP:{' '}
                                                                    <span className="font-mono">
                                                                        {formatOptionalAuditText(
                                                                            record.sourceIp
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    Req:{' '}
                                                                    <span className="font-mono">
                                                                        {formatOptionalAuditText(
                                                                            record.requestId
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelectedRecord(record)
                                                                    }
                                                                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                                                >
                                                                    View Details
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {pagination && pagination.totalPages > 1 && (
                                        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 sm:flex-row">
                                            <p className="text-xs text-gray-600">
                                                Page {pagination.page} of {pagination.totalPages} (
                                                {pagination.total.toLocaleString()} total)
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={pagination.page <= 1 || isLoading}
                                                    onClick={() =>
                                                        setQuery((prev) => ({
                                                            ...prev,
                                                            page: pagination.page - 1,
                                                        }))
                                                    }
                                                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={
                                                        pagination.page >= pagination.totalPages ||
                                                        isLoading
                                                    }
                                                    onClick={() =>
                                                        setQuery((prev) => ({
                                                            ...prev,
                                                            page: pagination.page + 1,
                                                        }))
                                                    }
                                                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </DashboardOverviewCard>
                </>
            )}

            {selectedRecord && (
                <AuditLogDetailModal
                    key={selectedRecord.id}
                    record={selectedRecord}
                    onClose={() => setSelectedRecord(null)}
                />
            )}
        </div>
    );
};

