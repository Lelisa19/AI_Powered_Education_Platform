import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DashboardEmptyState } from '../../../components/Dashboards/DashboardEmptyState';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import {
    ALL_PLATFORM_PERMISSIONS,
    PLATFORM_PERMISSIONS,
    type PlatformPermissionKey,
} from '../../../constants/permissions';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { AdminTierBadge } from '../components/AdminStatusBadge';
import {
    DashboardMetricSummaryCard,
    type DashboardMetricRow,
} from '../components/DashboardMetricSummaryCard';
import { usePlatformDashboardSummary } from '../hooks/usePlatformDashboardSummary';
import type { PlatformAttentionSeverity } from '../types/platform-dashboard.types';
import {
    formatDashboardTimestamp,
    isReportedMetricNumber,
    PLATFORM_QUICK_ACTIONS,
    resolveAuthorizedAttentionNotices,
} from '../utils/platform-dashboard-helpers';

interface SummaryCardConfig {
    id: string;
    title: string;
    description: string;
    status: 'loading' | 'unavailable' | 'error' | 'loaded';
    primaryLabel: string;
    primaryValue: number | null | undefined;
    breakdownRows: DashboardMetricRow[];
    actionLabel: string;
    actionTo: string;
    unavailableMessage: string;
}

const SEVERITY_BADGE_MAP: Record<
    PlatformAttentionSeverity,
    { label: string; badgeClasses: string }
> = {
    HIGH: {
        label: 'Action Required',
        badgeClasses: 'border-red-200 bg-red-50 text-red-700',
    },
    MEDIUM: {
        label: 'Pending Action',
        badgeClasses: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    INFO: {
        label: 'Notice',
        badgeClasses: 'border-blue-200 bg-blue-50 text-blue-700',
    },
};

export const PlatformDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const { hasPermission, isPlatformAdmin, isPlatformSuperAdmin } = usePermissions();

    const canManageTenants = hasPermission(PLATFORM_PERMISSIONS.TENANTS_MANAGE);
    const canManageDomains = hasPermission(PLATFORM_PERMISSIONS.DOMAINS_MANAGE);
    const canManageOnboarding = hasPermission(PLATFORM_PERMISSIONS.ONBOARDING_MANAGE);
    const canManageAdmins = hasPermission(PLATFORM_PERMISSIONS.ADMINS_MANAGE);

    const hasAnyOverviewPermission =
        canManageTenants || canManageDomains || canManageOnboarding || canManageAdmins;
    const hasRestrictedOverviewScope =
        isPlatformAdmin &&
        ALL_PLATFORM_PERMISSIONS.some((permission) => !hasPermission(permission));

    const { summary, isLoading, error, reloadSummary } =
        usePlatformDashboardSummary(hasAnyOverviewPermission);

    const authorizedQuickActions = useMemo(
        () => PLATFORM_QUICK_ACTIONS.filter((action) => hasPermission(action.permission)),
        [hasPermission]
    );

    const attentionResolution = useMemo(
        () =>
            resolveAuthorizedAttentionNotices(summary, (permission: PlatformPermissionKey) =>
                hasPermission(permission)
            ),
        [summary, hasPermission]
    );

    const summaryCards = useMemo<SummaryCardConfig[]>(() => {
        const resolveCardStatus = (
            hasSectionData: boolean
        ): 'loading' | 'unavailable' | 'error' | 'loaded' => {
            if (isLoading) return 'loading';
            if (error) return error.isBackendUnavailable ? 'unavailable' : 'error';
            return hasSectionData ? 'loaded' : 'unavailable';
        };

        const resolveUnavailableReason = (): string =>
            error?.isBackendUnavailable
                ? 'Unavailable until GET /api/platform/dashboard/summary is implemented.'
                : 'Metrics for this area are not yet reported by the backend summary response.';

        const cards: SummaryCardConfig[] = [];

        if (canManageTenants) {
            const tenants = summary?.tenants ?? null;
            const tenantRows: DashboardMetricRow[] = [
                {
                    label: 'Active Schools',
                    value: tenants?.active,
                    tone: 'positive',
                },
                {
                    label: 'Pending or Inactive',
                    value: tenants?.pendingOrInactive,
                    tone: 'warning',
                },
            ];

            if (tenants && tenants.suspended !== undefined && tenants.suspended !== null) {
                tenantRows.push({
                    label: 'Suspended',
                    value: tenants.suspended,
                    tone: 'danger',
                });
            }

            cards.push({
                id: 'schools-tenants',
                title: 'Schools / Tenants',
                description: 'Registered school tenants and current operational status.',
                status: resolveCardStatus(Boolean(tenants)),
                primaryLabel: 'Total Schools',
                primaryValue: tenants?.total,
                breakdownRows: tenantRows,
                actionLabel: 'Manage Schools',
                actionTo: '/dashboard/tenants',
                unavailableMessage: resolveUnavailableReason(),
            });
        }

        if (canManageDomains) {
            const domains = summary?.domains ?? null;
            cards.push({
                id: 'domains',
                title: 'Domains',
                description: 'Registered school hostnames and backend verification states.',
                status: resolveCardStatus(Boolean(domains)),
                primaryLabel: 'Total Registered Domains',
                primaryValue: domains?.total,
                breakdownRows: [
                    {
                        label: 'Verified Domains',
                        value: domains?.verified,
                        tone: 'positive',
                    },
                    {
                        label: 'Pending Verification',
                        value: domains?.pendingVerification,
                        tone: 'warning',
                    },
                    {
                        label: 'Failed Verification',
                        value: domains?.failedVerification,
                        tone: 'danger',
                    },
                ],
                actionLabel: 'Manage Domains',
                actionTo: '/dashboard/domains',
                unavailableMessage: resolveUnavailableReason(),
            });
        }

        if (canManageOnboarding) {
            const onboarding = summary?.onboarding ?? null;
            cards.push({
                id: 'onboarding',
                title: 'School Onboarding',
                description: 'Provisioned school setup progress and launch readiness pipeline.',
                status: resolveCardStatus(Boolean(onboarding)),
                primaryLabel: 'Total Onboarding Processes',
                primaryValue: onboarding?.total,
                breakdownRows: [
                    {
                        label: 'In Progress',
                        value: onboarding?.inProgress,
                        tone: 'neutral',
                    },
                    {
                        label: 'Completed',
                        value: onboarding?.completed,
                        tone: 'positive',
                    },
                    {
                        label: 'Blocked / Attention Needed',
                        value: onboarding?.blocked,
                        tone: 'danger',
                    },
                ],
                actionLabel: 'View School Onboarding',
                actionTo: '/dashboard/onboarding',
                unavailableMessage: resolveUnavailableReason(),
            });
        }

        if (canManageAdmins) {
            const administrators = summary?.administrators ?? null;
            cards.push({
                id: 'administrators',
                title: 'Platform Administrators',
                description: 'Administrator accounts and pending invitation activations.',
                status: resolveCardStatus(Boolean(administrators)),
                primaryLabel: 'Total Administrator Accounts',
                primaryValue: administrators?.total,
                breakdownRows: [
                    {
                        label: 'Active Administrators',
                        value: administrators?.active,
                        tone: 'positive',
                    },
                    {
                        label: 'Pending Invitations',
                        value: administrators?.pendingInvitations,
                        tone: 'warning',
                    },
                ],
                actionLabel: 'Manage Platform Administrators',
                actionTo: '/dashboard/administrators',
                unavailableMessage: resolveUnavailableReason(),
            });
        }

        return cards;
    }, [
        canManageAdmins,
        canManageDomains,
        canManageOnboarding,
        canManageTenants,
        error,
        isLoading,
        summary,
    ]);

    const generatedAtLabel = formatDashboardTimestamp(summary?.generatedAt);

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <DashboardPageHeader
                        title="Platform Dashboard"
                        subtitle={`Welcome back, ${user?.firstName || 'Admin'}. Operational overview across registered schools, domains, onboarding, and platform administration.`}
                    />
                    <div className="-mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        {isPlatformAdmin && <AdminTierBadge isSuperAdmin={isPlatformSuperAdmin} />}
                        {generatedAtLabel && (
                            <span>Summary updated: {generatedAtLabel}</span>
                        )}
                    </div>
                </div>

                {hasAnyOverviewPermission && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={reloadSummary}
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isLoading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                )}
            </div>

            {hasRestrictedOverviewScope && (
                <div
                    role="status"
                    className="rounded-md border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700"
                >
                    Operational cards, attention notices, and quick actions are scoped to your effective platform permissions.
                </div>
            )}

            {hasAnyOverviewPermission && error && (
                error.isBackendUnavailable ? (
                    <div
                        role="status"
                        className="rounded-lg border border-amber-200 bg-amber-50 p-5"
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-base font-semibold text-amber-900">
                                    Platform Dashboard Summary API Pending Backend Implementation
                                </h2>
                                <p className="mt-1 text-sm text-amber-800">
                                    The dashboard failed closed without displaying fabricated numbers because{' '}
                                    <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                                        GET /api/platform/dashboard/summary
                                    </code>{' '}
                                    is unavailable ({error.message}).
                                </p>
                            </div>
                            <div className="shrink-0">
                                <button
                                    type="button"
                                    onClick={reloadSummary}
                                    className="rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
                                >
                                    Retry Connection
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 p-5"
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-base font-semibold text-red-900">
                                    Unable to Load Platform Dashboard Summary
                                </h2>
                                <p className="mt-1 text-sm text-red-700">{error.message}</p>
                            </div>
                            <div className="shrink-0">
                                <button
                                    type="button"
                                    onClick={reloadSummary}
                                    className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 shadow-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    </div>
                )
            )}

            <section aria-labelledby="operational-summary-heading" className="space-y-4">
                <h2
                    id="operational-summary-heading"
                    className="text-lg font-semibold text-gray-900"
                >
                    Operational Summary
                </h2>

                {summaryCards.length === 0 ? (
                    <DashboardEmptyState
                        headingLevel="h3"
                        title="No Operational Summary Sections Permitted"
                        description="Your administrator account currently restricts access to schools, domains, onboarding, and platform administrator metrics."
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {summaryCards.map((card) => (
                            <DashboardMetricSummaryCard
                                key={card.id}
                                title={card.title}
                                description={card.description}
                                status={card.status}
                                primaryLabel={card.primaryLabel}
                                primaryValue={card.primaryValue}
                                breakdownRows={card.breakdownRows}
                                actionLabel={card.actionLabel}
                                actionTo={card.actionTo}
                                unavailableMessage={card.unavailableMessage}
                            />
                        ))}
                    </div>
                )}
            </section>

            <section aria-label="Attention and operational notices">
                <DashboardOverviewCard
                    title="Attention & Operational Notices"
                    headingLevel="h2"
                >
                    {!hasAnyOverviewPermission ? (
                        <p className="text-sm text-gray-600">
                            No operational attention areas are enabled for your current permission scope.
                        </p>
                    ) : isLoading ? (
                        <div
                            role="status"
                            className="flex items-center gap-3 py-2 text-sm text-gray-600"
                        >
                            <div
                                className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
                                aria-hidden="true"
                            />
                            <span>Checking backend operational attention items...</span>
                        </div>
                    ) : error ? (
                        error.isBackendUnavailable ? (
                            <p className="text-sm text-amber-800">
                                Operational attention notices require backend support from{' '}
                                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                                    GET /api/platform/dashboard/summary
                                </code>
                                . No synthetic alerts are shown while the backend is unavailable.
                            </p>
                        ) : (
                            <p className="text-sm text-red-700">
                                Unable to evaluate operational attention items until the summary request succeeds.
                            </p>
                        )
                    ) : !attentionResolution.isSupportedByBackend ? (
                        <p className="text-sm text-gray-600">
                            Attention metrics (such as failed domain verifications, blocked onboarding processes, or pending invitations) were not reported by the backend summary response.
                        </p>
                    ) : attentionResolution.items.length === 0 ? (
                        <DashboardEmptyState
                            headingLevel="h3"
                            title="No Operational Items Requiring Attention"
                            description="No failed domain verifications, blocked onboarding stages, or pending invitations requiring action were reported for your authorized areas."
                        />
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {attentionResolution.items.map((notice) => {
                                const severityConfig = SEVERITY_BADGE_MAP[notice.severity];
                                return (
                                    <li
                                        key={notice.id}
                                        className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${severityConfig.badgeClasses}`}
                                                >
                                                    {severityConfig.label}
                                                </span>
                                                <h3 className="text-sm font-semibold text-gray-900">
                                                    {notice.title}
                                                </h3>
                                                {isReportedMetricNumber(notice.count) && (
                                                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-700">
                                                        Count: {notice.count.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            {notice.description && (
                                                <p className="text-sm text-gray-600">
                                                    {notice.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="shrink-0">
                                            <Link
                                                to={notice.to}
                                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                            >
                                                {notice.actionLabel}
                                            </Link>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </DashboardOverviewCard>
            </section>

            <section aria-labelledby="quick-actions-heading" className="space-y-4">
                <h2
                    id="quick-actions-heading"
                    className="text-lg font-semibold text-gray-900"
                >
                    Quick Actions
                </h2>

                {authorizedQuickActions.length === 0 ? (
                    <DashboardEmptyState
                        headingLevel="h3"
                        title="No Management Quick Actions Available"
                        description="Your current effective platform permissions do not grant access to any platform management sections."
                    />
                ) : (
                    <nav
                        aria-label="Platform management quick actions"
                        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
                    >
                        {authorizedQuickActions.map((action) => (
                            <Link
                                key={action.id}
                                to={action.to}
                                className="group flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                            >
                                <div className="space-y-2">
                                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-700">
                                        {action.title}
                                    </h3>
                                    <p className="text-sm text-gray-600">{action.description}</p>
                                </div>
                                <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:text-blue-700">
                                    <span>{action.actionLabel}</span>
                                    <svg
                                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </div>
                            </Link>
                        ))}
                    </nav>
                )}
            </section>
        </div>
    );
};
