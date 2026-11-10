import React from 'react';
import { DashboardEmptyState } from '../../../components/Dashboards/DashboardEmptyState';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PLATFORM_PERMISSIONS } from '../../../constants/permissions';
import { usePermissions } from '../../../hooks/usePermissions';
import {
    IncidentSeverityBadge,
    IncidentStatusBadge,
    MonitoringHealthBadge,
} from '../components/MonitoringStatusBadge';
import { usePlatformMonitoring } from '../hooks/usePlatformMonitoring';
import type { PlatformMonitoringMetrics } from '../types/platform-monitoring.types';
import {
    formatMetricWithUnit,
    formatMonitoringTimestamp,
    formatNullableCount,
    formatOptionalMonitoringText,
    formatServiceCategoryLabel,
} from '../utils/platform-monitoring-formatters';

function renderOperationalMetricsContent(metrics: PlatformMonitoringMetrics | null | undefined) {
    if (!metrics) {
        return (
            <p className="text-sm text-gray-600">
                Operational performance metrics were not included in the backend monitoring summary response.
            </p>
        );
    }

    const metricCards: React.ReactNode[] = [];

    if (metrics.apiResponseTimeMs !== undefined) {
        metricCards.push(
            <div key="api-response-time" className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    API Response Time
                </dt>
                <dd className="mt-2 text-xl font-semibold tabular-nums text-gray-900">
                    {formatMetricWithUnit(metrics.apiResponseTimeMs, 'ms')}
                </dd>
            </div>
        );
    }

    if (metrics.requestErrorRatePercent !== undefined) {
        metricCards.push(
            <div key="request-error-rate" className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Request Error Rate
                </dt>
                <dd className="mt-2 text-xl font-semibold tabular-nums text-gray-900">
                    {formatMetricWithUnit(metrics.requestErrorRatePercent, '%')}
                </dd>
            </div>
        );
    }

    if (
        metrics.databaseConnectionStatus !== undefined ||
        metrics.databaseLatencyMs !== undefined
    ) {
        metricCards.push(
            <div key="database-health" className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Database Connection Health
                </dt>
                <dd className="mt-2 space-y-1.5">
                    <div>
                        <MonitoringHealthBadge status={metrics.databaseConnectionStatus} />
                    </div>
                    {metrics.databaseLatencyMs !== undefined && (
                        <div className="text-xs tabular-nums text-gray-600">
                            Query latency: {formatMetricWithUnit(metrics.databaseLatencyMs, 'ms')}
                        </div>
                    )}
                </dd>
            </div>
        );
    }

    if (
        metrics.backgroundQueueStatus !== undefined ||
        metrics.backgroundQueuePendingJobs !== undefined
    ) {
        metricCards.push(
            <div key="background-queue" className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Background Job Queue
                </dt>
                <dd className="mt-2 space-y-1">
                    <div className="text-base font-semibold text-gray-900">
                        {formatOptionalMonitoringText(metrics.backgroundQueueStatus)}
                    </div>
                    {metrics.backgroundQueuePendingJobs !== undefined && (
                        <div className="text-xs tabular-nums text-gray-600">
                            Queued jobs: {formatMetricWithUnit(metrics.backgroundQueuePendingJobs, 'jobs', 0)}
                        </div>
                    )}
                </dd>
            </div>
        );
    }

    if (
        metrics.cpuUtilizationPercent !== undefined ||
        metrics.memoryUtilizationPercent !== undefined
    ) {
        metricCards.push(
            <div key="resource-utilization" className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Resource Utilization
                </dt>
                <dd className="mt-2 space-y-1 text-sm text-gray-900">
                    {metrics.cpuUtilizationPercent !== undefined && (
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-600">CPU:</span>
                            <span className="font-semibold tabular-nums">
                                {formatMetricWithUnit(metrics.cpuUtilizationPercent, '%')}
                            </span>
                        </div>
                    )}
                    {metrics.memoryUtilizationPercent !== undefined && (
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-600">Memory:</span>
                            <span className="font-semibold tabular-nums">
                                {formatMetricWithUnit(metrics.memoryUtilizationPercent, '%')}
                            </span>
                        </div>
                    )}
                </dd>
            </div>
        );
    }

    if (metrics.serviceUptimePercent !== undefined) {
        metricCards.push(
            <div key="service-uptime" className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Service Uptime / Availability
                </dt>
                <dd className="mt-2 text-xl font-semibold tabular-nums text-gray-900">
                    {formatMetricWithUnit(metrics.serviceUptimePercent, '%')}
                </dd>
            </div>
        );
    }

    if (metrics.customMetrics && metrics.customMetrics.length > 0) {
        for (const item of metrics.customMetrics) {
            const displayValue =
                item.value === null
                    ? 'Not reported'
                    : typeof item.value === 'number'
                      ? formatMetricWithUnit(item.value, item.unit ?? '')
                      : item.unit
                        ? `${item.value} ${item.unit}`
                        : item.value;

            metricCards.push(
                <div key={item.id} className="rounded-md border border-gray-200 bg-gray-50 p-4">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {item.label}
                    </dt>
                    <dd className="mt-2 space-y-1.5">
                        <div className="text-lg font-semibold tabular-nums text-gray-900">
                            {displayValue}
                        </div>
                        {item.status && (
                            <div>
                                <MonitoringHealthBadge status={item.status} />
                            </div>
                        )}
                        {item.description && (
                            <p className="text-xs text-gray-600">{item.description}</p>
                        )}
                    </dd>
                </div>
            );
        }
    }

    if (metricCards.length === 0) {
        return (
            <DashboardEmptyState
                headingLevel="h3"
                title="No Operational Metrics Reported"
                description="No performance, queue, resource, or uptime metrics were reported by the backend monitoring service."
            />
        );
    }

    return <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{metricCards}</dl>;
}

export const SystemMonitoringPage: React.FC = () => {
    const { hasPermission } = usePermissions();
    const canAccessMonitoring = hasPermission(PLATFORM_PERMISSIONS.MONITORING_ACCESS);

    const { summary, isLoading, error, reloadMonitoring } =
        usePlatformMonitoring(canAccessMonitoring);

    const generatedAtDisplay = summary?.generatedAt
        ? formatMonitoringTimestamp(summary.generatedAt)
        : null;

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <DashboardPageHeader
                        title="System Monitoring"
                        subtitle="Read-only operational health status, infrastructure service telemetry, and recent incidents for the shared education platform."
                    />
                    {generatedAtDisplay && (
                        <p className="-mt-4 text-xs text-gray-500">
                            Summary updated: {generatedAtDisplay}
                        </p>
                    )}
                </div>

                {canAccessMonitoring && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={reloadMonitoring}
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isLoading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                )}
            </div>

            {!canAccessMonitoring ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access denied: Viewing system monitoring telemetry requires the{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PLATFORM_PERMISSIONS.MONITORING_ACCESS}
                    </code>{' '}
                    permission.
                </div>
            ) : (
                <>
                    <div
                        role="note"
                        className="rounded-md border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700"
                    >
                        Read-only operational view: Displays shared platform infrastructure health only. Unknown statuses are never reported as healthy, and school-specific educational data or system credentials are never exposed here.
                    </div>

                    {isLoading ? (
                        <DashboardOverviewCard title="Platform Health Overview" headingLevel="h2">
                            <div
                                role="status"
                                className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-12 text-center"
                            >
                                <div
                                    className="mb-3 h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
                                    aria-hidden="true"
                                />
                                <p className="text-sm font-medium text-gray-700">
                                    Loading platform system monitoring summary...
                                </p>
                            </div>
                        </DashboardOverviewCard>
                    ) : error ? (
                        error.isBackendUnavailable ? (
                            <div
                                role="status"
                                className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                            >
                                <h2 className="text-base font-semibold text-amber-900">
                                    System Monitoring API Pending Backend Implementation
                                </h2>
                                <p className="mx-auto mt-2 max-w-xl text-sm text-amber-800">
                                    The frontend failed closed without displaying fabricated health statuses or metrics because{' '}
                                    <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                                        GET /api/platform/monitoring/summary
                                    </code>{' '}
                                    is unavailable ({error.message}).
                                </p>
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={reloadMonitoring}
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
                                <h2 className="text-base font-semibold text-red-900">
                                    Unable to Load System Monitoring Summary
                                </h2>
                                <p className="mx-auto mt-2 max-w-xl text-sm text-red-700">
                                    {error.message}
                                </p>
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={reloadMonitoring}
                                        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 shadow-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        )
                    ) : summary ? (
                        <div className="space-y-6">
                            {/* A. Overall Platform Health */}
                            <DashboardOverviewCard title="Overall Platform Health" headingLevel="h2">
                                <div className="space-y-5">
                                    <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-sm font-medium text-gray-700">
                                                Overall Status:
                                            </span>
                                            <MonitoringHealthBadge
                                                status={summary.overallHealth.status}
                                            />
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            Last Health Check:{' '}
                                            <span className="font-medium text-gray-900">
                                                {formatMonitoringTimestamp(
                                                    summary.overallHealth.lastCheckedAt
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                Healthy Services
                                            </dt>
                                            <dd className="mt-1.5 text-xl font-semibold tabular-nums text-emerald-700">
                                                {formatNullableCount(
                                                    summary.overallHealth.healthyServicesCount
                                                )}
                                            </dd>
                                        </div>

                                        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                Degraded Services
                                            </dt>
                                            <dd className="mt-1.5 text-xl font-semibold tabular-nums text-amber-700">
                                                {formatNullableCount(
                                                    summary.overallHealth.degradedServicesCount
                                                )}
                                            </dd>
                                        </div>

                                        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                Unavailable Services
                                            </dt>
                                            <dd className="mt-1.5 text-xl font-semibold tabular-nums text-red-700">
                                                {formatNullableCount(
                                                    summary.overallHealth.unavailableServicesCount
                                                )}
                                            </dd>
                                        </div>

                                        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                Total Monitored
                                            </dt>
                                            <dd className="mt-1.5 text-xl font-semibold tabular-nums text-gray-900">
                                                {formatNullableCount(
                                                    summary.overallHealth.totalMonitoredServices
                                                )}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </DashboardOverviewCard>

                            {/* B. Infrastructure & Service Health */}
                            <DashboardOverviewCard
                                title="Infrastructure & Service Health"
                                headingLevel="h2"
                            >
                                {summary.services === null || summary.services === undefined ? (
                                    <p className="text-sm text-gray-600">
                                        Service-level health telemetry was not included in the backend monitoring summary response.
                                    </p>
                                ) : summary.services.length === 0 ? (
                                    <DashboardEmptyState
                                        headingLevel="h3"
                                        title="No Monitored Services Reported"
                                        description="The backend monitoring service did not report any configured infrastructure components."
                                    />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                <tr>
                                                    <th scope="col" className="px-4 py-3">
                                                        Service
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Category
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Status
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Latency
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Uptime
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Last Checked
                                                    </th>
                                                    <th scope="col" className="px-4 py-3">
                                                        Notes
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                {summary.services.map((service) => (
                                                    <tr key={service.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-gray-900">
                                                                {service.name}
                                                            </div>
                                                            <div className="font-mono text-xs text-gray-500">
                                                                {service.key}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-700">
                                                            {formatServiceCategoryLabel(
                                                                service.category
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <MonitoringHealthBadge
                                                                status={service.status}
                                                            />
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-gray-700">
                                                            {formatMetricWithUnit(
                                                                service.latencyMs,
                                                                'ms'
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-gray-700">
                                                            {formatMetricWithUnit(
                                                                service.uptimePercentage,
                                                                '%'
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">
                                                            {formatMonitoringTimestamp(
                                                                service.lastCheckedAt
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-600">
                                                            {formatOptionalMonitoringText(
                                                                service.message
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </DashboardOverviewCard>

                            {/* C. Operational Metrics */}
                            <DashboardOverviewCard title="Operational Metrics" headingLevel="h2">
                                {renderOperationalMetricsContent(summary.metrics)}
                            </DashboardOverviewCard>

                            {/* D. Recent Operational Incidents */}
                            <DashboardOverviewCard
                                title="Recent Operational Incidents"
                                headingLevel="h2"
                            >
                                {summary.incidents === null || summary.incidents === undefined ? (
                                    <p className="text-sm text-gray-600">
                                        Incident history was not included in the backend monitoring summary response.
                                    </p>
                                ) : summary.incidents.length === 0 ? (
                                    <DashboardEmptyState
                                        headingLevel="h3"
                                        title="No Recent Operational Incidents"
                                        description="No infrastructure incidents or service disruptions were reported by the backend monitoring service."
                                    />
                                ) : (
                                    <ul className="divide-y divide-gray-200">
                                        {summary.incidents.map((incident) => (
                                            <li key={incident.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-sm font-semibold text-gray-900">
                                                        {incident.title}
                                                    </h3>
                                                    <IncidentSeverityBadge
                                                        status={incident.severity}
                                                    />
                                                    <IncidentStatusBadge status={incident.status} />
                                                </div>

                                                {incident.summary && (
                                                    <p className="text-sm text-gray-600">
                                                        {incident.summary}
                                                    </p>
                                                )}

                                                <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
                                                    <div>
                                                        <dt className="inline font-medium text-gray-700">
                                                            Affected Service:{' '}
                                                        </dt>
                                                        <dd className="inline">
                                                            {incident.affectedService}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className="inline font-medium text-gray-700">
                                                            Started:{' '}
                                                        </dt>
                                                        <dd className="inline">
                                                            {formatMonitoringTimestamp(
                                                                incident.startedAt
                                                            )}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className="inline font-medium text-gray-700">
                                                            Resolved:{' '}
                                                        </dt>
                                                        <dd className="inline">
                                                            {formatMonitoringTimestamp(
                                                                incident.resolvedAt
                                                            )}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </DashboardOverviewCard>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
};

