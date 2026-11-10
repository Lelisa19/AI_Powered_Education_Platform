import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardEmptyState } from '../../../components/Dashboards/DashboardEmptyState';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PLATFORM_PERMISSIONS } from '../../../constants/permissions';
import { usePermissions } from '../../../hooks/usePermissions';
import type { PaginationMeta } from '../../../types/api.types';
import { DomainDetailModal } from '../../domains/components/DomainDetailModal';
import { DomainVerificationBadge } from '../../domains/components/DomainVerificationBadge';
import {
    RegisterDomainModal,
    type PreselectedDomainTenant,
} from '../../domains/components/RegisterDomainModal';
import type { ManagedDomain } from '../../domains/types/domain-management.types';
import { formatDomainVerificationLabel } from '../../domains/utils/domain-formatters';
import { ProvisionTenantModal } from '../components/ProvisionTenantModal';
import { TenantDetailModal } from '../components/TenantDetailModal';
import { TenantStatusBadge } from '../components/TenantStatusBadge';
import {
    isProposedTenantStatus,
    isTenantBackendUnavailableError,
    listTenants,
} from '../services/tenant-management-service';
import {
    PROPOSED_TENANT_STATUSES,
    type ManagedTenant,
    type ProposedTenantStatus,
} from '../types/tenant-management.types';
import { formatTenantDate, formatTenantStatusLabel } from '../utils/tenant-formatters';

const DEFAULT_PAGE_SIZE = 10;

interface DirectoryQueryState {
    page: number;
    search: string;
    status: ProposedTenantStatus | '';
}

interface DirectoryFetchError {
    message: string;
    isBackendUnavailable: boolean;
}

export const TenantsPage: React.FC = () => {
    const { hasPermission } = usePermissions();
    const canManageTenants = hasPermission(PLATFORM_PERMISSIONS.TENANTS_MANAGE);
    const canManageDomains = hasPermission(PLATFORM_PERMISSIONS.DOMAINS_MANAGE);
    const canManageOnboarding = hasPermission(PLATFORM_PERMISSIONS.ONBOARDING_MANAGE);

    const [query, setQuery] = useState<DirectoryQueryState>({
        page: 1,
        search: '',
        status: '',
    });
    const [searchInput, setSearchInput] = useState('');
    const [reloadCounter, setReloadCounter] = useState(0);

    const [tenants, setTenants] = useState<ManagedTenant[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<DirectoryFetchError | null>(null);

    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<ManagedTenant | null>(null);
    const [statusNotice, setStatusNotice] = useState<string | null>(null);

    const [postProvisionTenant, setPostProvisionTenant] = useState<ManagedTenant | null>(null);
    const [postProvisionDomain, setPostProvisionDomain] = useState<ManagedDomain | null>(null);
    const [domainModalTenant, setDomainModalTenant] = useState<PreselectedDomainTenant | null>(null);
    const [selectedDomainForDetail, setSelectedDomainForDetail] = useState<ManagedDomain | null>(
        null
    );

    const requestVersionRef = useRef(0);

    useEffect(() => {
        const currentVersion = ++requestVersionRef.current;

        listTenants({
            page: query.page,
            limit: DEFAULT_PAGE_SIZE,
            search: query.search || undefined,
            status: query.status || undefined,
        })
            .then((response) => {
                if (currentVersion !== requestVersionRef.current) return;
                setTenants(response.items);
                setPagination(response.pagination);
                setFetchError(null);
            })
            .catch((error: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                setTenants([]);
                setPagination(null);
                setFetchError({
                    isBackendUnavailable: isTenantBackendUnavailableError(error),
                    message:
                        error instanceof Error && error.message
                            ? error.message
                            : 'Failed to load tenant directory.',
                });
            })
            .finally(() => {
                if (currentVersion === requestVersionRef.current) {
                    setIsLoading(false);
                }
            });
    }, [query, reloadCounter]);

    const triggerReload = useCallback((nextQuery?: DirectoryQueryState) => {
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

    const handleStatusFilterChange = (rawStatus: string) => {
        setStatusNotice(null);
        const nextStatus = isProposedTenantStatus(rawStatus) ? rawStatus : '';
        triggerReload({
            ...query,
            page: 1,
            status: nextStatus,
        });
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setStatusNotice(null);
        triggerReload({
            page: 1,
            search: '',
            status: '',
        });
    };

    const handleProvisionSuccess = (createdTenant: ManagedTenant) => {
        setIsProvisionModalOpen(false);
        setPostProvisionTenant(createdTenant);
        setPostProvisionDomain(null);
        setStatusNotice(
            canManageDomains
                ? `School tenant "${createdTenant.name}" was created. Proceed to register and verify its school domain before launch.`
                : `School tenant "${createdTenant.name}" was created. Domain registration requires platform.domains.manage permission.`
        );
        triggerReload({
            page: 1,
            search: '',
            status: '',
        });

        if (canManageDomains) {
            setDomainModalTenant({
                id: createdTenant.id,
                name: createdTenant.name,
                slug: createdTenant.slug,
            });
        }
    };

    const handleDomainRegistered = (createdDomain: ManagedDomain) => {
        setDomainModalTenant(null);
        setPostProvisionDomain(createdDomain);
        setStatusNotice(
            `Registered domain "${createdDomain.hostname}" with verification status: ${formatDomainVerificationLabel(
                createdDomain.verificationStatus
            )}.`
        );
        triggerReload();
    };

    const handleDomainDetailUpdated = (updatedDomain: ManagedDomain, notice?: string) => {
        setPostProvisionDomain(updatedDomain);
        setSelectedDomainForDetail(updatedDomain);
        if (notice) {
            setStatusNotice(notice);
        }
        triggerReload();
    };

    const handleTenantUpdated = (updatedTenant: ManagedTenant) => {
        setTenants((prev) =>
            prev.map((item) => (item.id === updatedTenant.id ? updatedTenant : item))
        );
        setSelectedTenant(updatedTenant);
        setStatusNotice(`Updated status for "${updatedTenant.name}".`);
    };

    const hasActiveFilters = Boolean(query.search || query.status);

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <DashboardPageHeader
                    title="Schools / Tenant Management"
                    subtitle="Browse provisioned school tenants, inspect status, and create initial tenant records."
                />

                {canManageTenants && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setStatusNotice(null);
                                setIsProvisionModalOpen(true);
                            }}
                            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                        >
                            Provision School
                        </button>
                    </div>
                )}
            </div>

            {statusNotice && (
                <div
                    role="status"
                    className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800"
                >
                    {statusNotice}
                </div>
            )}

            {postProvisionTenant && (
                <div
                    role="region"
                    aria-label="Newly provisioned school status"
                    className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 font-semibold">
                                <span>{postProvisionTenant.name}</span>
                                <span className="rounded-full border border-blue-200 bg-white px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                    Tenant Created
                                </span>
                                {postProvisionDomain ? (
                                    <DomainVerificationBadge
                                        status={postProvisionDomain.verificationStatus}
                                    />
                                ) : (
                                    <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                                        Domain Not Registered
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-blue-900">
                                {!postProvisionDomain
                                    ? 'Next step: Register a school domain and complete backend verification. A newly created tenant is not ready for launch until domain verification and onboarding requirements succeed.'
                                    : postProvisionDomain.verificationStatus === 'VERIFIED'
                                      ? `Domain "${postProvisionDomain.hostname}" is verified. Check School Onboarding to confirm all launch requirements are satisfied.`
                                      : `Domain "${postProvisionDomain.hostname}" is registered (${formatDomainVerificationLabel(
                                            postProvisionDomain.verificationStatus
                                        )}). Complete backend verification before launch.`}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {canManageDomains && !postProvisionDomain && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDomainModalTenant({
                                            id: postProvisionTenant.id,
                                            name: postProvisionTenant.name,
                                            slug: postProvisionTenant.slug,
                                        })
                                    }
                                    className="rounded-md bg-blue-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    Register School Domain
                                </button>
                            )}
                            {canManageDomains && postProvisionDomain && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedDomainForDetail(postProvisionDomain)}
                                    className="rounded-md bg-blue-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    Inspect &amp; Verify Domain
                                </button>
                            )}
                            {canManageDomains && (
                                <Link
                                    to="/dashboard/domains"
                                    className="rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-medium text-blue-900 hover:bg-blue-100"
                                >
                                    Domain Management
                                </Link>
                            )}
                            {canManageOnboarding && postProvisionDomain?.verificationStatus === 'VERIFIED' && (
                                <Link
                                    to="/dashboard/onboarding"
                                    className="rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-medium text-blue-900 hover:bg-blue-100"
                                >
                                    School Onboarding
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setPostProvisionTenant(null);
                                    setPostProvisionDomain(null);
                                }}
                                aria-label="Dismiss newly provisioned school banner"
                                className="rounded-md border border-blue-200 bg-white px-2.5 py-2 text-xs font-medium text-blue-800 hover:bg-blue-100"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DashboardOverviewCard title="School Directory">
                <div className="space-y-6">
                    <form
                        onSubmit={handleSearchSubmit}
                        className="flex flex-col gap-3 sm:flex-row sm:items-end"
                    >
                        <div className="flex-1">
                            <label
                                htmlFor="tenant-search"
                                className="block text-xs font-medium text-gray-700"
                            >
                                Search Schools
                            </label>
                            <input
                                id="tenant-search"
                                type="search"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Search by school name or identifier"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                        </div>

                        <div className="sm:w-48">
                            <label
                                htmlFor="tenant-status-filter"
                                className="block text-xs font-medium text-gray-700"
                            >
                                Status
                            </label>
                            <select
                                id="tenant-status-filter"
                                value={query.status}
                                onChange={(event) => handleStatusFilterChange(event.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                                <option value="">All Statuses</option>
                                {PROPOSED_TENANT_STATUSES.map((statusValue) => (
                                    <option key={statusValue} value={statusValue}>
                                        {formatTenantStatusLabel(statusValue)}
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
                                Loading school directory...
                            </p>
                        </div>
                    ) : fetchError ? (
                        fetchError.isBackendUnavailable ? (
                            <div
                                role="status"
                                className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                            >
                                <h3 className="text-base font-semibold text-amber-900">
                                    Tenant Directory API Pending Backend Implementation
                                </h3>
                                <p className="mx-auto mt-2 max-w-lg text-sm text-amber-800">
                                    The frontend failed closed because the backend tenant management service could not be reached or returned an unimplemented endpoint response ({fetchError.message}).
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
                                    Unable to Load School Directory
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
                    ) : tenants.length === 0 ? (
                        <DashboardEmptyState
                            headingLevel="h3"
                            title={hasActiveFilters ? 'No Matching Schools' : 'No Schools Provisioned Yet'}
                            description={
                                hasActiveFilters
                                    ? 'No tenant records match your current search or status filter.'
                                    : 'No school tenants are currently registered. Use Provision School to create the first tenant once the backend service is available.'
                            }
                        />
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                    <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th scope="col" className="px-4 py-3">School Name</th>
                                            <th scope="col" className="px-4 py-3">Identifier</th>
                                            <th scope="col" className="px-4 py-3">Domain</th>
                                            <th scope="col" className="px-4 py-3">Status</th>
                                            <th scope="col" className="px-4 py-3">Created</th>
                                            <th scope="col" className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {tenants.map((tenant) => (
                                            <tr key={tenant.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    {tenant.name}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                                    {tenant.slug}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {tenant.primaryDomain || 'Domain not registered'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <TenantStatusBadge status={tenant.status} />
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {formatTenantDate(tenant.createdAt)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedTenant(tenant)}
                                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                                    >
                                                        {canManageTenants ? 'View / Manage' : 'View Details'}
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

            {isProvisionModalOpen && (
                <ProvisionTenantModal
                    isOpen={isProvisionModalOpen}
                    onClose={() => setIsProvisionModalOpen(false)}
                    onSuccess={handleProvisionSuccess}
                />
            )}

            {selectedTenant && (
                <TenantDetailModal
                    key={selectedTenant.id}
                    tenant={selectedTenant}
                    canManageTenants={canManageTenants}
                    onClose={() => setSelectedTenant(null)}
                    onTenantUpdated={handleTenantUpdated}
                />
            )}

            {domainModalTenant && (
                <RegisterDomainModal
                    key={domainModalTenant.id}
                    isOpen={Boolean(domainModalTenant)}
                    preselectedTenant={domainModalTenant}
                    onClose={() => setDomainModalTenant(null)}
                    onSuccess={handleDomainRegistered}
                />
            )}

            {selectedDomainForDetail && (
                <DomainDetailModal
                    key={selectedDomainForDetail.id}
                    domain={selectedDomainForDetail}
                    canManageDomains={canManageDomains}
                    onClose={() => setSelectedDomainForDetail(null)}
                    onDomainUpdated={handleDomainDetailUpdated}
                />
            )}
        </div>
    );
};

