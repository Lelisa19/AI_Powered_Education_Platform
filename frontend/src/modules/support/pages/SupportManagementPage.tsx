import React, { useState } from 'react';
import { DashboardEmptyState } from '../../../components/Dashboards/DashboardEmptyState';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PLATFORM_PERMISSIONS } from '../../../constants/permissions';
import { usePermissions } from '../../../hooks/usePermissions';
import { useAvailableTenants } from '../../domains/hooks/useAvailableTenants';
import {
    SupportTicketPriorityBadge,
    SupportTicketStatusBadge,
} from '../components/SupportStatusBadge';
import { SupportTicketDetailModal } from '../components/SupportTicketDetailModal';
import {
    type SupportTicketQueryState,
    usePlatformSupportTickets,
} from '../hooks/usePlatformSupportTickets';
import {
    isProposedSupportTicketPriority,
    isProposedSupportTicketStatus,
} from '../schemas/platform-support-validation';
import {
    isProposedSupportTicketCategory,
    isSupportSortField,
} from '../services/platform-support-service';
import {
    PROPOSED_SUPPORT_TICKET_CATEGORIES,
    PROPOSED_SUPPORT_TICKET_PRIORITIES,
    PROPOSED_SUPPORT_TICKET_STATUSES,
    SUPPORT_SORT_FIELDS,
    type PlatformSupportTicket,
    type SupportSortOrder,
} from '../types/platform-support.types';
import {
    formatAssigneeDisplay,
    formatSchoolTicketDisplay,
    formatSupportDate,
    formatSupportSortField,
    formatSupportTicketCategory,
    formatSupportTicketPriority,
    formatSupportTicketStatus,
} from '../utils/platform-support-formatters';

const INITIAL_QUERY: SupportTicketQueryState = {
    page: 1,
    search: '',
    status: '',
    priority: '',
    category: '',
    tenantId: '',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
};

export const SupportManagementPage: React.FC = () => {
    const { hasPermission } = usePermissions();
    const canManageSupport = hasPermission(PLATFORM_PERMISSIONS.SUPPORT_MANAGE);
    const canManageTenants = hasPermission(PLATFORM_PERMISSIONS.TENANTS_MANAGE);
    const canManageAdmins = hasPermission(PLATFORM_PERMISSIONS.ADMINS_MANAGE);

    const [query, setQuery] = useState<SupportTicketQueryState>(INITIAL_QUERY);
    const [searchInput, setSearchInput] = useState('');
    const [tenantInput, setTenantInput] = useState('');

    const [selectedTicket, setSelectedTicket] = useState<PlatformSupportTicket | null>(null);
    const [statusNotice, setStatusNotice] = useState<string | null>(null);

    const { tickets, pagination, isLoading, fetchError, reloadTickets, replaceTicketInList } =
        usePlatformSupportTickets(canManageSupport, query);

    const { tenants, isTenantsBackendUnavailable } = useAvailableTenants(
        canManageSupport && canManageTenants
    );

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setStatusNotice(null);
        setQuery((prev) => ({
            ...prev,
            page: 1,
            search: searchInput.trim(),
            ...(tenants.length === 0 ? { tenantId: tenantInput.trim() } : {}),
        }));
    };

    const handleStatusChange = (rawStatus: string) => {
        setStatusNotice(null);
        setQuery((prev) => ({
            ...prev,
            page: 1,
            status: isProposedSupportTicketStatus(rawStatus) ? rawStatus : '',
        }));
    };

    const handlePriorityChange = (rawPriority: string) => {
        setStatusNotice(null);
        setQuery((prev) => ({
            ...prev,
            page: 1,
            priority: isProposedSupportTicketPriority(rawPriority) ? rawPriority : '',
        }));
    };

    const handleCategoryChange = (rawCategory: string) => {
        setStatusNotice(null);
        setQuery((prev) => ({
            ...prev,
            page: 1,
            category: isProposedSupportTicketCategory(rawCategory) ? rawCategory : '',
        }));
    };

    const handleSchoolSelectChange = (rawTenantId: string) => {
        setStatusNotice(null);
        setTenantInput(rawTenantId);
        setQuery((prev) => ({
            ...prev,
            page: 1,
            tenantId: rawTenantId.trim(),
        }));
    };

    const handleSortByChange = (rawSortBy: string) => {
        setQuery((prev) => ({
            ...prev,
            page: 1,
            sortBy: isSupportSortField(rawSortBy) ? rawSortBy : 'updatedAt',
        }));
    };

    const handleSortOrderChange = (rawOrder: string) => {
        const nextOrder: SupportSortOrder = rawOrder === 'asc' ? 'asc' : 'desc';
        setQuery((prev) => ({
            ...prev,
            page: 1,
            sortOrder: nextOrder,
        }));
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setTenantInput('');
        setStatusNotice(null);
        setQuery({
            ...INITIAL_QUERY,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });
    };

    const handleTicketUpdated = (updatedTicket: PlatformSupportTicket, notice?: string) => {
        replaceTicketInList(updatedTicket);
        setSelectedTicket(updatedTicket);
        if (notice) {
            setStatusNotice(notice);
        }
    };

    const hasActiveFilters = Boolean(
        query.search || query.status || query.priority || query.category || query.tenantId
    );

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <DashboardPageHeader
                    title="Support Management"
                    subtitle="Review and manage platform support tickets submitted by registered schools, update ticket lifecycle state, and communicate official responses."
                />

                {canManageSupport && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={reloadTickets}
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isLoading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                )}
            </div>

            {!canManageSupport ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access denied: Managing school support requests requires the{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PLATFORM_PERMISSIONS.SUPPORT_MANAGE}
                    </code>{' '}
                    permission.
                </div>
            ) : (
                <>
                    <div
                        role="note"
                        className="rounded-md border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700"
                    >
                        Cross-tenant platform support operations are isolated strictly to support tickets and authorized ticket conversations. Each school can only access its own tickets when school-facing support is enabled on the backend.
                    </div>

                    {statusNotice && (
                        <div
                            role="status"
                            className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
                        >
                            {statusNotice}
                        </div>
                    )}

                    <DashboardOverviewCard title="Support Ticket Directory" headingLevel="h2">
                        <div className="space-y-6">
                            <form onSubmit={handleSearchSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="lg:col-span-2">
                                        <label
                                            htmlFor="support-search"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Search Tickets
                                        </label>
                                        <input
                                            id="support-search"
                                            type="search"
                                            value={searchInput}
                                            onChange={(event) => setSearchInput(event.target.value)}
                                            placeholder="Search by ticket reference number or subject"
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="support-school-filter"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            School
                                        </label>
                                        {canManageTenants && tenants.length > 0 ? (
                                            <select
                                                id="support-school-filter"
                                                value={query.tenantId}
                                                onChange={(event) =>
                                                    handleSchoolSelectChange(event.target.value)
                                                }
                                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                            >
                                                <option value="">All Schools</option>
                                                {tenants.map((tenant) => (
                                                    <option key={tenant.id} value={tenant.id}>
                                                        {tenant.name} ({tenant.slug})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <>
                                                <input
                                                    id="support-school-filter"
                                                    type="search"
                                                    value={tenantInput}
                                                    onChange={(event) =>
                                                        setTenantInput(event.target.value)
                                                    }
                                                    placeholder="Filter by school tenant ID"
                                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                                />
                                                {canManageTenants && isTenantsBackendUnavailable && (
                                                    <p className="mt-1 text-[11px] text-gray-500">
                                                        School directory pending backend API; filter by tenant ID.
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="support-category-filter"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Category
                                        </label>
                                        <select
                                            id="support-category-filter"
                                            value={query.category}
                                            onChange={(event) =>
                                                handleCategoryChange(event.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        >
                                            <option value="">All Categories</option>
                                            {PROPOSED_SUPPORT_TICKET_CATEGORIES.map((category) => (
                                                <option key={category} value={category}>
                                                    {formatSupportTicketCategory(category)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                                    <div>
                                        <label
                                            htmlFor="support-status-filter"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Status
                                        </label>
                                        <select
                                            id="support-status-filter"
                                            value={query.status}
                                            onChange={(event) =>
                                                handleStatusChange(event.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        >
                                            <option value="">All Statuses</option>
                                            {PROPOSED_SUPPORT_TICKET_STATUSES.map((statusOption) => (
                                                <option key={statusOption} value={statusOption}>
                                                    {formatSupportTicketStatus(statusOption)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="support-priority-filter"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Priority
                                        </label>
                                        <select
                                            id="support-priority-filter"
                                            value={query.priority}
                                            onChange={(event) =>
                                                handlePriorityChange(event.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        >
                                            <option value="">All Priorities</option>
                                            {PROPOSED_SUPPORT_TICKET_PRIORITIES.map(
                                                (priorityOption) => (
                                                    <option
                                                        key={priorityOption}
                                                        value={priorityOption}
                                                    >
                                                        {formatSupportTicketPriority(
                                                            priorityOption
                                                        )}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="support-sort-by"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Sort By
                                        </label>
                                        <select
                                            id="support-sort-by"
                                            value={query.sortBy}
                                            onChange={(event) =>
                                                handleSortByChange(event.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        >
                                            {SUPPORT_SORT_FIELDS.map((field) => (
                                                <option key={field} value={field}>
                                                    {formatSupportSortField(field)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="support-sort-order"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Order
                                        </label>
                                        <select
                                            id="support-sort-order"
                                            value={query.sortOrder}
                                            onChange={(event) =>
                                                handleSortOrderChange(event.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        >
                                            <option value="desc">Newest / Highest First</option>
                                            <option value="asc">Oldest / Lowest First</option>
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
                                        Loading support ticket directory...
                                    </p>
                                </div>
                            ) : fetchError ? (
                                fetchError.isBackendUnavailable ? (
                                    <div
                                        role="status"
                                        className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                                    >
                                        <h3 className="text-base font-semibold text-amber-900">
                                            Platform Support Management API Pending Backend Implementation
                                        </h3>
                                        <p className="mx-auto mt-2 max-w-xl text-sm text-amber-800">
                                            The frontend failed closed without displaying mock tickets because{' '}
                                            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                                                GET /api/platform/support/tickets
                                            </code>{' '}
                                            is unavailable ({fetchError.message}).
                                        </p>
                                        <div className="mt-4">
                                            <button
                                                type="button"
                                                onClick={reloadTickets}
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
                                            Unable to Load Support Tickets
                                        </h3>
                                        <p className="mx-auto mt-2 max-w-xl text-sm text-red-700">
                                            {fetchError.message}
                                        </p>
                                        <div className="mt-4">
                                            <button
                                                type="button"
                                                onClick={reloadTickets}
                                                className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 shadow-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    </div>
                                )
                            ) : tickets.length === 0 ? (
                                <DashboardEmptyState
                                    headingLevel="h3"
                                    title={
                                        hasActiveFilters
                                            ? 'No Matching Support Tickets'
                                            : 'No Support Tickets Found'
                                    }
                                    description={
                                        hasActiveFilters
                                            ? 'No support tickets match the active search or filter criteria.'
                                            : 'Support requests submitted by registered schools will appear here once handled by the backend support service.'
                                    }
                                />
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                <tr>
                                                    <th scope="col" className="px-4 py-3">
                                                        Ticket
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        School
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Subject &amp; Category
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Priority
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Status
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Assigned To
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Dates
                                                    </th>
                                                    <th scope="col" className="px-4 py-3 text-right">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                {tickets.map((ticket) => {
                                                    const schoolDisplay =
                                                        formatSchoolTicketDisplay(ticket);

                                                    return (
                                                        <tr
                                                            key={ticket.id}
                                                            className="hover:bg-gray-50"
                                                        >
                                                            <td className="whitespace-nowrap px-4 py-3">
                                                                <div className="font-mono text-xs font-semibold text-gray-900">
                                                                    {ticket.referenceNumber}
                                                                </div>
                                                                <div className="font-mono text-[11px] text-gray-500">
                                                                    {ticket.id}
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <div className="font-medium text-gray-900">
                                                                    {schoolDisplay.primary}
                                                                </div>
                                                                <div className="font-mono text-xs text-gray-500">
                                                                    {schoolDisplay.secondary}
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <div className="font-medium text-gray-900">
                                                                    {ticket.subject}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {formatSupportTicketCategory(
                                                                        ticket.category
                                                                    )}
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <SupportTicketPriorityBadge
                                                                    value={ticket.priority}
                                                                />
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <SupportTicketStatusBadge
                                                                    value={ticket.status}
                                                                />
                                                            </td>

                                                            <td className="px-4 py-3 text-xs text-gray-700">
                                                                {formatAssigneeDisplay(
                                                                    ticket.assignedAdmin
                                                                )}
                                                            </td>

                                                            <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">
                                                                <div>
                                                                    Created:{' '}
                                                                    {formatSupportDate(
                                                                        ticket.createdAt
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    Updated:{' '}
                                                                    {formatSupportDate(
                                                                        ticket.updatedAt
                                                                    )}
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelectedTicket(ticket)
                                                                    }
                                                                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                                                >
                                                                    Open Ticket
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

            {selectedTicket && (
                <SupportTicketDetailModal
                    key={selectedTicket.id}
                    ticket={selectedTicket}
                    canManageSupport={canManageSupport}
                    canManageAdmins={canManageAdmins}
                    onClose={() => setSelectedTicket(null)}
                    onTicketUpdated={handleTicketUpdated}
                />
            )}
        </div>
    );
};

