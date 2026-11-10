import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardEmptyState } from '../../../components/Dashboards/DashboardEmptyState';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PLATFORM_PERMISSIONS } from '../../../constants/permissions';
import { usePermissions } from '../../../hooks/usePermissions';
import type { PaginationMeta } from '../../../types/api.types';
import type { ManagedTenant } from '../../tenants/types/tenant-management.types';
import { DomainVerificationBadge } from '../../domains/components/DomainVerificationBadge';
import { InvitePrimaryAdminModal } from '../components/InvitePrimaryAdminModal';
import { OnboardingDetailModal } from '../components/OnboardingDetailModal';
import { OnboardingStatusBadge } from '../components/OnboardingStatusBadge';
import {
    isOnboardingBackendUnavailableError,
    isProposedOnboardingStage,
    isProposedOnboardingStatus,
    listOnboardingRecords,
} from '../services/onboarding-service';
import {
    PROPOSED_ONBOARDING_STAGES,
    PROPOSED_ONBOARDING_STATUSES,
    type PrimaryAdminInvitationResponse,
    type ProposedOnboardingStage,
    type ProposedOnboardingStatus,
    type SchoolOnboardingRecord,
} from '../types/onboarding.types';
import {
    formatOnboardingDate,
    formatOnboardingStageLabel,
    formatOnboardingStatusLabel,
} from '../utils/onboarding-formatters';

const DEFAULT_PAGE_SIZE = 10;

interface OnboardingQueryState {
    page: number;
    search: string;
    onboardingStatus: ProposedOnboardingStatus | '';
    currentStage: ProposedOnboardingStage | '';
}

interface OnboardingFetchError {
    message: string;
    isBackendUnavailable: boolean;
}

export const OnboardingPage: React.FC = () => {
    const { hasPermission } = usePermissions();
    const canManageOnboarding = hasPermission(PLATFORM_PERMISSIONS.ONBOARDING_MANAGE);

    const [query, setQuery] = useState<OnboardingQueryState>({
        page: 1,
        search: '',
        onboardingStatus: '',
        currentStage: '',
    });
    const [searchInput, setSearchInput] = useState('');
    const [reloadCounter, setReloadCounter] = useState(0);

    const [records, setRecords] = useState<SchoolOnboardingRecord[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<OnboardingFetchError | null>(null);

    const [selectedRecord, setSelectedRecord] = useState<SchoolOnboardingRecord | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteLockedTenant, setInviteLockedTenant] = useState<ManagedTenant | null>(null);
    const [statusNotice, setStatusNotice] = useState<string | null>(null);

    const requestVersionRef = useRef(0);

    useEffect(() => {
        const currentVersion = ++requestVersionRef.current;

        listOnboardingRecords({
            page: query.page,
            limit: DEFAULT_PAGE_SIZE,
            search: query.search || undefined,
            onboardingStatus: query.onboardingStatus || undefined,
            currentStage: query.currentStage || undefined,
        })
            .then((response) => {
                if (currentVersion !== requestVersionRef.current) return;
                setRecords(response.items);
                setPagination(response.pagination);
                setFetchError(null);
            })
            .catch((error: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                setRecords([]);
                setPagination(null);
                setFetchError({
                    isBackendUnavailable: isOnboardingBackendUnavailableError(error),
                    message:
                        error instanceof Error && error.message
                            ? error.message
                            : 'Failed to load onboarding directory.',
                });
            })
            .finally(() => {
                if (currentVersion === requestVersionRef.current) {
                    setIsLoading(false);
                }
            });
    }, [query, reloadCounter]);

    const triggerReload = useCallback((nextQuery?: OnboardingQueryState) => {
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
        const nextStatus = isProposedOnboardingStatus(rawStatus) ? rawStatus : '';
        triggerReload({
            ...query,
            page: 1,
            onboardingStatus: nextStatus,
        });
    };

    const handleStageFilterChange = (rawStage: string) => {
        setStatusNotice(null);
        const nextStage = isProposedOnboardingStage(rawStage) ? rawStage : '';
        triggerReload({
            ...query,
            page: 1,
            currentStage: nextStage,
        });
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setStatusNotice(null);
        triggerReload({
            page: 1,
            search: '',
            onboardingStatus: '',
            currentStage: '',
        });
    };

    const handleRecordUpdated = (updatedRecord: SchoolOnboardingRecord, notice?: string) => {
        setRecords((prev) =>
            prev.map((item) =>
                item.tenant.id === updatedRecord.tenant.id ? updatedRecord : item
            )
        );
        setSelectedRecord(updatedRecord);
        if (notice) {
            setStatusNotice(notice);
        }
    };

    const handleInviteSuccess = (response: PrimaryAdminInvitationResponse) => {
        setIsInviteModalOpen(false);
        setInviteLockedTenant(null);
        setStatusNotice(
            response.message ||
                `Primary School Admin invitation sent to ${response.invitation.email} (${response.invitation.status}).`
        );
        triggerReload();
    };

    const hasActiveFilters = Boolean(query.search || query.onboardingStatus || query.currentStage);

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <DashboardPageHeader
                    title="School Onboarding"
                    subtitle="Track school setup progress, domain readiness, and Primary School Admin invitations."
                />

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => triggerReload()}
                        className="rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    >
                        Refresh
                    </button>
                    {canManageOnboarding && (
                        <button
                            type="button"
                            onClick={() => {
                                setStatusNotice(null);
                                setInviteLockedTenant(null);
                                setIsInviteModalOpen(true);
                            }}
                            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                        >
                            Invite Primary Admin
                        </button>
                    )}
                </div>
            </div>

            {statusNotice && (
                <div
                    role="status"
                    className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
                >
                    {statusNotice}
                </div>
            )}

            <DashboardOverviewCard title="School Onboarding Directory">
                <div className="space-y-6">
                    <form
                        onSubmit={handleSearchSubmit}
                        className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end"
                    >
                        <div className="md:col-span-4">
                            <label
                                htmlFor="onboarding-search"
                                className="block text-xs font-medium text-gray-700"
                            >
                                Search Schools
                            </label>
                            <input
                                id="onboarding-search"
                                type="search"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Search by school name or identifier"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label
                                htmlFor="onboarding-status-filter"
                                className="block text-xs font-medium text-gray-700"
                            >
                                Onboarding Status
                            </label>
                            <select
                                id="onboarding-status-filter"
                                value={query.onboardingStatus}
                                onChange={(event) => handleStatusFilterChange(event.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                                <option value="">All Statuses</option>
                                {PROPOSED_ONBOARDING_STATUSES.map((statusValue) => (
                                    <option key={statusValue} value={statusValue}>
                                        {formatOnboardingStatusLabel(statusValue)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-3">
                            <label
                                htmlFor="onboarding-stage-filter"
                                className="block text-xs font-medium text-gray-700"
                            >
                                Current Stage
                            </label>
                            <select
                                id="onboarding-stage-filter"
                                value={query.currentStage}
                                onChange={(event) => handleStageFilterChange(event.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                                <option value="">All Stages</option>
                                {PROPOSED_ONBOARDING_STAGES.map((stageValue) => (
                                    <option key={stageValue} value={stageValue}>
                                        {formatOnboardingStageLabel(stageValue)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 md:col-span-2 md:justify-end">
                            <button
                                type="submit"
                                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                                Filter
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
                                Loading school onboarding directory...
                            </p>
                        </div>
                    ) : fetchError ? (
                        fetchError.isBackendUnavailable ? (
                            <div
                                role="status"
                                className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                            >
                                <h3 className="text-base font-semibold text-amber-900">
                                    School Onboarding API Pending Backend Implementation
                                </h3>
                                <p className="mx-auto mt-2 max-w-lg text-sm text-amber-800">
                                    The frontend failed closed because the backend onboarding service could not be reached or returned an unimplemented endpoint response ({fetchError.message}).
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
                                    Unable to Load Onboarding Directory
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
                    ) : records.length === 0 ? (
                        <DashboardEmptyState
                            headingLevel="h3"
                            title={
                                hasActiveFilters
                                    ? 'No Matching Onboarding Records'
                                    : 'No Schools in Onboarding Yet'
                            }
                            description={
                                hasActiveFilters
                                    ? 'No onboarding records match your current search or stage filters.'
                                    : 'Onboarding records will appear once schools are provisioned and tracked by the backend onboarding service.'
                            }
                        />
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                    <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th scope="col" className="px-4 py-3">School</th>
                                            <th scope="col" className="px-4 py-3">Associated Domain</th>
                                            <th scope="col" className="px-4 py-3">Onboarding</th>
                                            <th scope="col" className="px-4 py-3">Current Stage</th>
                                            <th scope="col" className="px-4 py-3">Progress</th>
                                            <th scope="col" className="px-4 py-3">Primary Admin Invite</th>
                                            <th scope="col" className="px-4 py-3">Updated</th>
                                            <th scope="col" className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {records.map((item) => {
                                            const progressSummary =
                                                item.progress.completedSteps !== undefined &&
                                                item.progress.completedSteps !== null &&
                                                item.progress.totalSteps !== undefined &&
                                                item.progress.totalSteps !== null
                                                    ? `${item.progress.completedSteps}/${item.progress.totalSteps}${
                                                          item.progress.percentage !== undefined &&
                                                          item.progress.percentage !== null
                                                              ? ` (${item.progress.percentage}%)`
                                                              : ''
                                                      }`
                                                    : '—';

                                            return (
                                                <tr key={item.tenant.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">
                                                            {item.tenant.name}
                                                        </div>
                                                        <div className="font-mono text-xs text-gray-500">
                                                            {item.tenant.slug}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {item.primaryDomain ? (
                                                            <div className="space-y-1">
                                                                <div className="font-mono text-xs text-gray-800">
                                                                    {item.primaryDomain.hostname}
                                                                </div>
                                                                <DomainVerificationBadge
                                                                    status={
                                                                        item.primaryDomain
                                                                            .verificationStatus
                                                                    }
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-500">
                                                                Not configured
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <OnboardingStatusBadge
                                                            kind="onboarding"
                                                            status={item.onboardingStatus}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-700">
                                                        {formatOnboardingStageLabel(item.currentStage)}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-700">
                                                        {progressSummary}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <OnboardingStatusBadge
                                                            kind="invitation"
                                                            status={
                                                                item.primaryAdminInvitation
                                                                    ?.status ?? 'NOT_SENT'
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {formatOnboardingDate(item.updatedAt)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedRecord(item)}
                                                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                                        >
                                                            Inspect
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

            {selectedRecord && (
                <OnboardingDetailModal
                    key={selectedRecord.tenant.id}
                    record={selectedRecord}
                    canManageOnboarding={canManageOnboarding}
                    onClose={() => setSelectedRecord(null)}
                    onRecordUpdated={handleRecordUpdated}
                    onOpenInviteModal={(targetRecord) => {
                        setSelectedRecord(null);
                        setInviteLockedTenant(targetRecord.tenant);
                        setIsInviteModalOpen(true);
                    }}
                />
            )}

            {isInviteModalOpen && (
                <InvitePrimaryAdminModal
                    lockedTenant={inviteLockedTenant}
                    onClose={() => {
                        setIsInviteModalOpen(false);
                        setInviteLockedTenant(null);
                    }}
                    onSuccess={handleInviteSuccess}
                />
            )}
        </div>
    );
};

