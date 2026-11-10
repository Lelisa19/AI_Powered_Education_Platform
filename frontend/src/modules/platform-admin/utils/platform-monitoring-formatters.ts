const HEALTH_STATUS_LABELS: Record<string, string> = {
    HEALTHY: 'Healthy',
    DEGRADED: 'Degraded',
    UNAVAILABLE: 'Unavailable',
    UNKNOWN: 'Unknown',
};

const INCIDENT_SEVERITY_LABELS: Record<string, string> = {
    CRITICAL: 'Critical',
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
};

const INCIDENT_STATUS_LABELS: Record<string, string> = {
    OPEN: 'Open',
    INVESTIGATING: 'Investigating',
    MITIGATED: 'Mitigated',
    RESOLVED: 'Resolved',
};

const SERVICE_CATEGORY_LABELS: Record<string, string> = {
    CORE: 'Core Infrastructure',
    INFRASTRUCTURE: 'Platform Infrastructure',
    DATA: 'Data & Storage',
    INTEGRATION: 'Communication & Media',
    AI: 'AI Services',
};

function titleCaseEnum(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return 'Unknown';

    return trimmed
        .toLowerCase()
        .split(/[_-]+/)
        .map((segment) => (segment ? segment[0].toUpperCase() + segment.slice(1) : ''))
        .join(' ');
}

export function formatHealthStatusLabel(status?: string | null): string {
    if (!status || status.trim() === '') return 'Unknown';
    const normalized = status.trim().toUpperCase();
    return HEALTH_STATUS_LABELS[normalized] ?? titleCaseEnum(status);
}

export function formatIncidentSeverityLabel(severity?: string | null): string {
    if (!severity || severity.trim() === '') return 'Unknown';
    const normalized = severity.trim().toUpperCase();
    return INCIDENT_SEVERITY_LABELS[normalized] ?? titleCaseEnum(severity);
}

export function formatIncidentStatusLabel(status?: string | null): string {
    if (!status || status.trim() === '') return 'Unknown';
    const normalized = status.trim().toUpperCase();
    return INCIDENT_STATUS_LABELS[normalized] ?? titleCaseEnum(status);
}

export function formatServiceCategoryLabel(category?: string | null): string {
    if (!category || category.trim() === '') return 'Not specified';
    const normalized = category.trim().toUpperCase();
    return SERVICE_CATEGORY_LABELS[normalized] ?? titleCaseEnum(category);
}

export function formatMonitoringTimestamp(value?: string | null): string {
    if (!value || value.trim() === '') return 'Not recorded';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

export function formatNullableCount(value: number | null | undefined): string {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        return 'Not reported';
    }
    return value.toLocaleString();
}

export function formatMetricWithUnit(
    value: number | null | undefined,
    unit: string,
    maxFractionDigits = 2
): string {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return 'Not reported';
    }

    const formattedNumber = Number.isInteger(value)
        ? value.toLocaleString()
        : value.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: maxFractionDigits,
          });

    return unit ? `${formattedNumber} ${unit}` : formattedNumber;
}

export function formatOptionalMonitoringText(value?: string | null): string {
    if (!value || value.trim() === '') {
        return 'Not recorded';
    }
    return value.trim();
}

