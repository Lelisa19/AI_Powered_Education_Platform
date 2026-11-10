/**
 * Platform System Monitoring contracts (read-only, pending backend API implementation).
 * Monitors shared platform operational health, metrics, and incidents.
 * Excludes school-specific educational data, infrastructure secrets, tokens, and connection strings.
 */

export type ProposedMonitoringHealthStatus =
    | 'HEALTHY'
    | 'DEGRADED'
    | 'UNAVAILABLE'
    | 'UNKNOWN';

export const PROPOSED_MONITORING_HEALTH_STATUSES: readonly ProposedMonitoringHealthStatus[] = [
    'HEALTHY',
    'DEGRADED',
    'UNAVAILABLE',
    'UNKNOWN',
];

export type ProposedIncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ProposedIncidentStatus = 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';

export interface OverallPlatformHealthSummary {
    status: ProposedMonitoringHealthStatus | (string & {});
    lastCheckedAt?: string | null;
    healthyServicesCount?: number | null;
    degradedServicesCount?: number | null;
    unavailableServicesCount?: number | null;
    totalMonitoredServices?: number | null;
}

export interface MonitoredServiceHealth {
    id: string;
    key: string;
    name: string;
    status: ProposedMonitoringHealthStatus | (string & {});
    category?: string | null;
    latencyMs?: number | null;
    uptimePercentage?: number | null;
    lastCheckedAt?: string | null;
    message?: string | null;
}

export interface CustomOperationalMetric {
    id: string;
    key: string;
    label: string;
    value: number | string | null;
    unit?: string | null;
    status?: ProposedMonitoringHealthStatus | (string & {}) | null;
    description?: string | null;
}

export interface PlatformMonitoringMetrics {
    apiResponseTimeMs?: number | null;
    requestErrorRatePercent?: number | null;
    databaseConnectionStatus?: ProposedMonitoringHealthStatus | (string & {}) | null;
    databaseLatencyMs?: number | null;
    backgroundQueueStatus?: string | null;
    backgroundQueuePendingJobs?: number | null;
    cpuUtilizationPercent?: number | null;
    memoryUtilizationPercent?: number | null;
    serviceUptimePercent?: number | null;
    customMetrics?: CustomOperationalMetric[] | null;
}

export interface MonitoringIncident {
    id: string;
    title: string;
    summary?: string | null;
    affectedService: string;
    severity: ProposedIncidentSeverity | (string & {});
    status: ProposedIncidentStatus | (string & {});
    startedAt: string;
    resolvedAt?: string | null;
}

export interface PlatformMonitoringSummary {
    overallHealth: OverallPlatformHealthSummary;
    services?: MonitoredServiceHealth[] | null;
    metrics?: PlatformMonitoringMetrics | null;
    incidents?: MonitoringIncident[] | null;
    generatedAt?: string | null;
}

export interface PlatformMonitoringSummaryResponse {
    summary: PlatformMonitoringSummary;
}

