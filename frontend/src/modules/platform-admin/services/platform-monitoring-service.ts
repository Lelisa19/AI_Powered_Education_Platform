import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import type {
    CustomOperationalMetric,
    MonitoredServiceHealth,
    MonitoringIncident,
    OverallPlatformHealthSummary,
    PlatformMonitoringMetrics,
    PlatformMonitoringSummary,
    PlatformMonitoringSummaryResponse,
} from '../types/platform-monitoring.types';

/**
 * Security & operational integrity invariants for System Monitoring:
 * 1. Read-only surface: only GET monitoring summary requests are issued.
 * 2. Backend must enforce `PLATFORM_ADMIN` authentication and `platform.monitoring.access`.
 * 3. Monitoring responses must never expose secrets, credentials, tokens, environment
 *    variables, connection strings, or school-private educational records.
 * 4. Unknown service/overall status must remain `UNKNOWN` and never be coerced to `HEALTHY`.
 */

const FORBIDDEN_NORMALIZED_KEYS = new Set<string>([
    'password',
    'passwordhash',
    'hashedpassword',
    'salt',
    'token',
    'accesstoken',
    'refreshtoken',
    'idtoken',
    'sessiontoken',
    'jwt',
    'apikey',
    'secret',
    'secretkey',
    'privatekey',
    'signingkey',
    'webhooksecret',
    'clientsecret',
    'encryptionkey',
    'awsaccesskeyid',
    'awssecretaccesskey',
    'databaseurl',
    'dbpassword',
    'connectionstring',
    'redisurl',
    'smtpurl',
    'smtppassword',
    'authorization',
    'cookie',
    'setcookie',
    'headers',
    'requestheaders',
    'env',
    'environment',
    'envvars',
    'processenv',
    'credentials',
]);

const SENSITIVE_VALUE_PATTERN =
    /^(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?|amqps?|mssql):\/\/|^(?:jdbc:|(?:Bearer|Basic)\s+\S+)/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeKey(key: string): string {
    return key.replace(/[-_]/g, '').toLowerCase();
}

function assertNoProhibitedMonitoringData(value: unknown, depth = 0): void {
    if (depth > 6) return;

    if (typeof value === 'string') {
        if (SENSITIVE_VALUE_PATTERN.test(value.trim())) {
            throw new ApiError(
                'Security violation: Monitoring payload must not expose connection strings or credentials.',
                502
            );
        }
        return;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            assertNoProhibitedMonitoringData(item, depth + 1);
        }
        return;
    }

    if (!isPlainObject(value)) return;

    for (const [key, entryValue] of Object.entries(value)) {
        if (
            FORBIDDEN_NORMALIZED_KEYS.has(normalizeKey(key)) &&
            entryValue !== undefined &&
            entryValue !== null
        ) {
            throw new ApiError(
                'Security violation: Monitoring response must not expose secrets, tokens, environment variables, or connection strings.',
                502
            );
        }
        assertNoProhibitedMonitoringData(entryValue, depth + 1);
    }
}

function parseOptionalNullableString(value: unknown, fieldName: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(
            `Invalid backend monitoring payload: '${fieldName}' must be a string or null.`,
            502
        );
    }
    return value;
}

function parseOptionalCount(value: unknown, fieldName: string): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        throw new ApiError(
            `Invalid backend monitoring payload: '${fieldName}' must be a non-negative integer or null.`,
            502
        );
    }
    return value;
}

function parseOptionalNonNegativeNumber(
    value: unknown,
    fieldName: string
): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new ApiError(
            `Invalid backend monitoring payload: '${fieldName}' must be a non-negative number or null.`,
            502
        );
    }
    return value;
}

function parseOptionalPercentage(value: unknown, fieldName: string): number | null | undefined {
    const parsed = parseOptionalNonNegativeNumber(value, fieldName);
    if (parsed === undefined || parsed === null) return parsed;
    if (parsed > 100) {
        throw new ApiError(
            `Invalid backend monitoring payload: '${fieldName}' must not exceed 100.`,
            502
        );
    }
    return parsed;
}

function parseOverallHealth(value: unknown): OverallPlatformHealthSummary {
    if (!isPlainObject(value)) {
        throw new ApiError(
            'Invalid backend monitoring payload: missing overallHealth summary.',
            502
        );
    }
    assertNoProhibitedMonitoringData(value);

    const {
        status,
        lastCheckedAt,
        healthyServicesCount,
        degradedServicesCount,
        unavailableServicesCount,
        totalMonitoredServices,
    } = value;

    if (typeof status !== 'string' || status.trim() === '') {
        throw new ApiError(
            'Invalid backend monitoring payload: overallHealth.status must be a non-empty string.',
            502
        );
    }

    return {
        status: status.trim(),
        lastCheckedAt: parseOptionalNullableString(lastCheckedAt, 'overallHealth.lastCheckedAt'),
        healthyServicesCount: parseOptionalCount(
            healthyServicesCount,
            'overallHealth.healthyServicesCount'
        ),
        degradedServicesCount: parseOptionalCount(
            degradedServicesCount,
            'overallHealth.degradedServicesCount'
        ),
        unavailableServicesCount: parseOptionalCount(
            unavailableServicesCount,
            'overallHealth.unavailableServicesCount'
        ),
        totalMonitoredServices: parseOptionalCount(
            totalMonitoredServices,
            'overallHealth.totalMonitoredServices'
        ),
    };
}

function parseMonitoredService(value: unknown, index: number): MonitoredServiceHealth {
    if (!isPlainObject(value)) {
        throw new ApiError(
            `Invalid backend monitoring payload: services[${index}] is malformed.`,
            502
        );
    }
    assertNoProhibitedMonitoringData(value);

    const { id, key, name, status, category, latencyMs, uptimePercentage, lastCheckedAt, message } =
        value;

    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof key !== 'string' || key.trim() === '' ||
        typeof name !== 'string' || name.trim() === '' ||
        typeof status !== 'string' || status.trim() === ''
    ) {
        throw new ApiError(
            `Invalid backend monitoring payload: services[${index}] missing id, key, name, or status.`,
            502
        );
    }

    return {
        id: id.trim(),
        key: key.trim(),
        name: name.trim(),
        status: status.trim(),
        category: parseOptionalNullableString(category, `services[${index}].category`),
        latencyMs: parseOptionalNonNegativeNumber(latencyMs, `services[${index}].latencyMs`),
        uptimePercentage: parseOptionalPercentage(
            uptimePercentage,
            `services[${index}].uptimePercentage`
        ),
        lastCheckedAt: parseOptionalNullableString(
            lastCheckedAt,
            `services[${index}].lastCheckedAt`
        ),
        message: parseOptionalNullableString(message, `services[${index}].message`),
    };
}

function parseServicesList(value: unknown): MonitoredServiceHealth[] | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!Array.isArray(value)) {
        throw new ApiError(
            'Invalid backend monitoring payload: services must be an array or null.',
            502
        );
    }
    return value.map(parseMonitoredService);
}

function parseCustomMetric(value: unknown, index: number): CustomOperationalMetric {
    if (!isPlainObject(value)) {
        throw new ApiError(
            `Invalid backend monitoring payload: metrics.customMetrics[${index}] is malformed.`,
            502
        );
    }
    assertNoProhibitedMonitoringData(value);

    const { id, key, label, value: metricValue, unit, status, description } = value;
    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof key !== 'string' || key.trim() === '' ||
        typeof label !== 'string' || label.trim() === ''
    ) {
        throw new ApiError(
            `Invalid backend monitoring payload: customMetrics[${index}] missing id, key, or label.`,
            502
        );
    }

    if (
        metricValue !== null &&
        typeof metricValue !== 'string' &&
        (typeof metricValue !== 'number' || !Number.isFinite(metricValue))
    ) {
        throw new ApiError(
            `Invalid backend monitoring payload: customMetrics[${index}].value must be a finite number, string, or null.`,
            502
        );
    }

    return {
        id: id.trim(),
        key: key.trim(),
        label: label.trim(),
        value: metricValue,
        unit: parseOptionalNullableString(unit, `customMetrics[${index}].unit`),
        status: parseOptionalNullableString(status, `customMetrics[${index}].status`),
        description: parseOptionalNullableString(
            description,
            `customMetrics[${index}].description`
        ),
    };
}

function parseOperationalMetrics(value: unknown): PlatformMonitoringMetrics | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value)) {
        throw new ApiError(
            'Invalid backend monitoring payload: malformed metrics section.',
            502
        );
    }
    assertNoProhibitedMonitoringData(value);

    let customMetrics: CustomOperationalMetric[] | null | undefined;
    if (value.customMetrics === undefined) {
        customMetrics = undefined;
    } else if (value.customMetrics === null) {
        customMetrics = null;
    } else if (!Array.isArray(value.customMetrics)) {
        throw new ApiError(
            'Invalid backend monitoring payload: metrics.customMetrics must be an array or null.',
            502
        );
    } else {
        customMetrics = value.customMetrics.map(parseCustomMetric);
    }

    return {
        apiResponseTimeMs: parseOptionalNonNegativeNumber(
            value.apiResponseTimeMs,
            'metrics.apiResponseTimeMs'
        ),
        requestErrorRatePercent: parseOptionalPercentage(
            value.requestErrorRatePercent,
            'metrics.requestErrorRatePercent'
        ),
        databaseConnectionStatus: parseOptionalNullableString(
            value.databaseConnectionStatus,
            'metrics.databaseConnectionStatus'
        ),
        databaseLatencyMs: parseOptionalNonNegativeNumber(
            value.databaseLatencyMs,
            'metrics.databaseLatencyMs'
        ),
        backgroundQueueStatus: parseOptionalNullableString(
            value.backgroundQueueStatus,
            'metrics.backgroundQueueStatus'
        ),
        backgroundQueuePendingJobs: parseOptionalCount(
            value.backgroundQueuePendingJobs,
            'metrics.backgroundQueuePendingJobs'
        ),
        cpuUtilizationPercent: parseOptionalPercentage(
            value.cpuUtilizationPercent,
            'metrics.cpuUtilizationPercent'
        ),
        memoryUtilizationPercent: parseOptionalPercentage(
            value.memoryUtilizationPercent,
            'metrics.memoryUtilizationPercent'
        ),
        serviceUptimePercent: parseOptionalPercentage(
            value.serviceUptimePercent,
            'metrics.serviceUptimePercent'
        ),
        customMetrics,
    };
}

function parseIncident(value: unknown, index: number): MonitoringIncident {
    if (!isPlainObject(value)) {
        throw new ApiError(
            `Invalid backend monitoring payload: incidents[${index}] is malformed.`,
            502
        );
    }
    assertNoProhibitedMonitoringData(value);

    const { id, title, summary, affectedService, severity, status, startedAt, resolvedAt } = value;
    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof title !== 'string' || title.trim() === '' ||
        typeof affectedService !== 'string' || affectedService.trim() === '' ||
        typeof severity !== 'string' || severity.trim() === '' ||
        typeof status !== 'string' || status.trim() === '' ||
        typeof startedAt !== 'string' || startedAt.trim() === ''
    ) {
        throw new ApiError(
            `Invalid backend monitoring payload: incidents[${index}] missing required incident fields.`,
            502
        );
    }

    return {
        id: id.trim(),
        title: title.trim(),
        summary: parseOptionalNullableString(summary, `incidents[${index}].summary`),
        affectedService: affectedService.trim(),
        severity: severity.trim(),
        status: status.trim(),
        startedAt: startedAt.trim(),
        resolvedAt: parseOptionalNullableString(resolvedAt, `incidents[${index}].resolvedAt`),
    };
}

function parseIncidentsList(value: unknown): MonitoringIncident[] | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!Array.isArray(value)) {
        throw new ApiError(
            'Invalid backend monitoring payload: incidents must be an array or null.',
            502
        );
    }
    return value.map(parseIncident);
}

function parseMonitoringSummaryResponse(data: unknown): PlatformMonitoringSummaryResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend system monitoring endpoint returned an unexpected or unavailable response.',
            502
        );
    }
    assertNoProhibitedMonitoringData(data);

    const candidate = 'summary' in data ? data.summary : data;
    if (!isPlainObject(candidate)) {
        throw new ApiError(
            'Backend system monitoring endpoint returned an unexpected response structure.',
            502
        );
    }
    assertNoProhibitedMonitoringData(candidate);

    const summary: PlatformMonitoringSummary = {
        overallHealth: parseOverallHealth(candidate.overallHealth),
        services: parseServicesList(candidate.services),
        metrics: parseOperationalMetrics(candidate.metrics),
        incidents: parseIncidentsList(candidate.incidents),
        generatedAt: parseOptionalNullableString(candidate.generatedAt, 'generatedAt'),
    };

    return { summary };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isPlatformMonitoringBackendUnavailableError(error: unknown): boolean {
    if (!(error instanceof ApiError) || error.isCancellation) {
        return false;
    }

    return (
        error.isNetworkError ||
        error.statusCode === 404 ||
        error.statusCode === 501 ||
        error.statusCode === 502 ||
        error.statusCode === 503
    );
}

/**
 * Fetches read-only platform system monitoring health, metrics, and incident summary.
 */
export async function getPlatformMonitoringSummary(
    signal?: AbortSignal
): Promise<PlatformMonitoringSummaryResponse> {
    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.PLATFORM_MONITORING.SUMMARY, {
            signal,
        });
        return parseMonitoringSummaryResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

