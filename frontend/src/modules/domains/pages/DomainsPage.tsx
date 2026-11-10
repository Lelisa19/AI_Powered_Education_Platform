import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardEmptyState } from '../../../components/Dashboards/DashboardEmptyState';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PLATFORM_PERMISSIONS } from '../../../constants/permissions';
import { usePermissions } from '../../../hooks/usePermissions';
import type { PaginationMeta } from '../../../types/api.types';
import { DomainDetailModal } from '../components/DomainDetailModal';
import { DomainVerificationBadge } from '../components/DomainVerificationBadge';
import { RegisterDomainModal } from '../components/RegisterDomainModal';
import {
    isDomainBackendUnavailableError,
    isProposedDomainVerificationStatus,
    listDomains,
} from '../services/domain-management-service';
import {
    PROPOSED_DOMAIN_VERIFICATION_STATUSES,
    type ManagedDomain,
    type ProposedDomainVerificationStatus,
} from '../types/domain-management.types';
import { formatDomainDate, formatDomainVerificationLabel } from '../utils/domain-formatters';

const DEFAULT_PAGE_SIZE = 10;

interface DomainQueryState {
    page: number;
    search: string;
    verificationStatus: ProposedDomainVerificationStatus | '';
}

interface DomainFetchError {
    message: string;
    isBackendUnavailable: boolean;
}

export const DomainsPage: React.FC = () => {
    const { hasPermission } = usePermissions();
    const canManageDomains = hasPermission(PLATFORM_PERMISSIONS.DOMAINS_MANAGE);

    const [query, setQuery] = useState<DomainQueryState>({
        page: 1,
        search: '',
        verificationStatus: '',
    });
    const [searchInput, setSearchInput] = useState('');
    const [reloadCounter, setReloadCounter] = useState(0);

    const [domains, setDomains] = useState<ManagedDomain[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<DomainFetchError | null>(null);

    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [selectedDomain, setSelectedDomain] = useState<ManagedDomain | null>(null);
    const [statusNotice, setStatusNotice] = useState<string | null>(null);

    const requestVersionRef = useRef(0);

    useEffect(() => {
        const currentVersion = ++requestVersionRef.current;

        listDomains({
            page: query.page,
            limit: DEFAULT_PAGE_SIZE,
            search: query.search || undefined,
            verificationStatus: query.verificationStatus || undefined,
        })
            .then((response) => {
                if (currentVersion !== requestVersionRef.current) return;
                setDomains(response.items);
                setPagination(response.pagination);
                setFetchError(null);
            })
            .catch((error: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                setDomains([]);
                setPagination(null);
                setFetchError({
                    isBackendUnavailable: isDomainBackendUnavailableError(error),
                    message:
                        error instanceof Error && error.message
                            ? error.message
                            : 'Failed to load domain directory.',
                });
            })
            .finally(() => {
                if (currentVersion === requestVersionRef.current) {
                    setIsLoading(false);
                }
            });
    }, [query, reloadCounter]);

    const triggerReload = useCallback((nextQuery?: DomainQueryState) => {
        setIsLoading(true);
        setFetchError(null);
        if (nextQuery) {
            setQuery(nextQuery);
        } else {
            setReloadCounter((count) => count + 1);
        }
    }, []);

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setStatusNotice(null);
        triggerReload({
            ...query,
            page: 1,
            search: searchInput.trim(),
        });
    };

    const handleVerificationFilterChange = (rawStatus: string) => {
        setStatusNotice(null);
        const nextStatus = isProposedDomainVerificationStatus(rawStatus) ? rawStatus : '';
        triggerReload({
            ...query,
            page: 1,
            verificationStatus: nextStatus,
        });
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setStatusNotice(null);
        triggerReload({
            page: 1,
            search: '',
            verificationStatus: '',
        });
    };

    const handleRegisterSuccess = (createdDomain: ManagedDomain) => {
        setIsRegisterModalOpen(false);
        setStatusNotice(
            `Registered domain "${createdDomain.hostname}" with verification status: ${formatDomainVerificationLabel(createdDomain.verificationStatus)}.`
        );
        triggerReload({
            page: 1,
            search: '',
            verificationStatus: '',
        });
    };

    const handleDomainUpdated = (updatedDomain: ManagedDomain, notice?: string) => {
        setDomains((prev) =>
            prev.map((item) => (item.id === updatedDomain.id ? updatedDomain : item))
        );
        setSelectedDomain(updatedDomain);
        if (notice) {
            setStatusNotice(notice);
        }
    };

    const hasActiveFilters = Boolean(query.search || query.verificationStatus);

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <DashboardPageHeader
                    title="Domain Management"
                    subtitle="View registered school hostnames, inspect backend verification state, and associate domains with provisioned schools."
                />

                {canManageDomains && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setStatusNotice(null);
                                setIsRegisterModalOpen(true);
                            }}
                            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                        >
                            Register Domain
                        </button>
                    </div>
                )}
            </div>

            {statusNotice && (
                <div
                    role="status"
                    className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
                >
                    {statusNotice}
                </div>
            )}

            <DashboardOverviewCard title="Domain Directory">
                <div className="space-y-6">
                    <form
                        onSubmit={handleSearchSubmit}
                        className="flex flex-col gap-3 sm:flex-row sm:items-end"
                    >
                        <div className="flex-1">
                            <label
                                htmlFor="domain-search"
                                className="block text-xs font-medium text-gray-700"
                            >
                                Search Domains
                            </label>
                            <input
                                id="domain-search"
                                type="search"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Search by hostname"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                        </div>

                        <div className="sm:w-56">
                            <label
                                htmlFor="domain-verification-filter"
                                className="block text-xs font-medium text-gray-700"
                            >
                                Verification Status
                            </label>
                            <select
                                id="domain-verification-filter"
                                value={query.verificationStatus}
                                onChange={(event) => handleVerificationFilterChange(event.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                                <option value="">All Verification States</option>
                                {PROPOSED_DOMAIN_VERIFICATION_STATUSES.map((statusValue) => (
                                    <option key={statusValue} value={statusValue}>
                                        {formatDomainVerificationLabel(statusValue)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                                Search
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
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => triggerReload()}
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                            >
                                Refresh
                            </button>
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
                                Loading domain directory...
                            </p>
                        </div>
                    ) : fetchError ? (
                        fetchError.isBackendUnavailable ? (
                            <div
                                role="status"
                                className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                            >
                                <h3 className="text-base font-semibold text-amber-900">
                                    Domain Management API Pending Backend Implementation
                                </h3>
                                <p className="mx-auto mt-2 max-w-lg text-sm text-amber-800">
                                    The frontend failed closed because the backend domain management service could not be reached or returned an unimplemented endpoint response ({fetchError.message}).
                                </p>
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={() => triggerReload()}
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
                                    Unable to Load Domain Directory
                                </h3>
                                <p className="mx-auto mt-2 max-w-lg text-sm text-red-700">
                                    {fetchError.message}
                                </p>
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={() => triggerReload()}
                                        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 shadow-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        )
                    ) : domains.length === 0 ? (
                        <DashboardEmptyState
                            headingLevel="h3"
                            title={hasActiveFilters ? 'No Matching Domains' : 'No Domains Registered Yet'}
                            description={
                                hasActiveFilters
                                    ? 'No domain records match your current search or verification filter.'
                                    : 'No school domains are currently registered. Use Register Domain once backend domain and tenant endpoints are available.'
                            }
                        />
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                    <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th scope="col" className="px-4 py-3">Hostname</th>
                                            <th scope="col" className="px-4 py-3">Associated School</th>
                                            <th scope="col" className="px-4 py-3">Verification</th>
                                            <th scope="col" className="px-4 py-3">Primary</th>
                                            <th scope="col" className="px-4 py-3">Created</th>
                                            <th scope="col" className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {domains.map((domain) => (
                                            <tr key={domain.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                                                    {domain.hostname}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {domain.schoolName ? (
                                                        <div>
                                                            <span className="font-medium text-gray-900">
                                                                {domain.schoolName}
                                                            </span>
                                                            {domain.schoolSlug && (
                                                                <span className="ml-1.5 font-mono text-xs text-gray-500">
                                                                    ({domain.schoolSlug})
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="font-mono text-xs text-gray-600">
                                                            {domain.tenantId}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <DomainVerificationBadge status={domain.verificationStatus} />
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {domain.isPrimary ? 'Primary' : 'Secondary'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {formatDomainDate(domain.createdAt)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedDomain(domain)}
                                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                                    >
                                                        {canManageDomains ? 'View / Verify' : 'View Details'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {pagination && pagination.totalPages > 1 && (
                                <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 sm:flex-row">
                                    <p className="text-xs text-gray-600">
                                        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={pagination.page <= 1 || isLoading}
                                            onClick={() =>
                                                triggerReload({
                                                    ...query,
                                                    page: pagination.page - 1,
                                                })
                                            }
                                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            type="button"
                                            disabled={pagination.page >= pagination.totalPages || isLoading}
                                            onClick={() =>
                                                triggerReload({
                                                    ...query,
                                                    page: pagination.page + 1,
                                                })
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

            {isRegisterModalOpen && (
                <RegisterDomainModal
                    isOpen={isRegisterModalOpen}
                    onClose={() => setIsRegisterModalOpen(false)}
                    onSuccess={handleRegisterSuccess}
                />
            )}

            {selectedDomain && (
                <DomainDetailModal
                    key={selectedDomain.id}
                    domain={selectedDomain}
                    canManageDomains={canManageDomains}
                    onClose={() => setSelectedDomain(null)}
                    onDomainUpdated={handleDomainUpdated}
                />
            )}
        </div>
    );
};

