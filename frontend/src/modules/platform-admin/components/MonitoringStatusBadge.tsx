import React from 'react';
import {
    formatHealthStatusLabel,
    formatIncidentSeverityLabel,
    formatIncidentStatusLabel,
} from '../utils/platform-monitoring-formatters';

interface StatusBadgeProps {
    status?: string | null;
}

const HEALTH_STYLE_MAP: Record<string, string> = {
    HEALTHY: 'border-green-200 bg-green-50 text-green-800',
    DEGRADED: 'border-amber-200 bg-amber-50 text-amber-800',
    UNAVAILABLE: 'border-red-200 bg-red-50 text-red-800',
    UNKNOWN: 'border-gray-300 bg-gray-100 text-gray-700',
};

const INCIDENT_SEVERITY_STYLE_MAP: Record<string, string> = {
    CRITICAL: 'border-red-300 bg-red-100 text-red-900',
    HIGH: 'border-red-200 bg-red-50 text-red-700',
    MEDIUM: 'border-amber-200 bg-amber-50 text-amber-800',
    LOW: 'border-blue-200 bg-blue-50 text-blue-700',
};

const INCIDENT_STATUS_STYLE_MAP: Record<string, string> = {
    OPEN: 'border-red-200 bg-red-50 text-red-700',
    INVESTIGATING: 'border-amber-200 bg-amber-50 text-amber-800',
    MITIGATED: 'border-blue-200 bg-blue-50 text-blue-700',
    RESOLVED: 'border-green-200 bg-green-50 text-green-700',
};

function renderHealthIcon(normalizedStatus: string) {
    if (normalizedStatus === 'HEALTHY') {
        return (
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
    }

    if (normalizedStatus === 'DEGRADED') {
        return (
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        );
    }

    if (normalizedStatus === 'UNAVAILABLE') {
        return (
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
    }

    return (
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

export const MonitoringHealthBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const normalized = status?.trim().toUpperCase() || 'UNKNOWN';
    const classes =
        HEALTH_STYLE_MAP[normalized] ?? 'border-slate-200 bg-slate-50 text-slate-700';

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}
        >
            {renderHealthIcon(normalized)}
            <span>{formatHealthStatusLabel(status)}</span>
        </span>
    );
};

export const IncidentSeverityBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const normalized = status?.trim().toUpperCase() || 'UNKNOWN';
    const classes =
        INCIDENT_SEVERITY_STYLE_MAP[normalized] ?? 'border-gray-200 bg-gray-100 text-gray-700';

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}
        >
            <span>Severity: {formatIncidentSeverityLabel(status)}</span>
        </span>
    );
};

export const IncidentStatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const normalized = status?.trim().toUpperCase() || 'UNKNOWN';
    const classes =
        INCIDENT_STATUS_STYLE_MAP[normalized] ?? 'border-gray-200 bg-gray-100 text-gray-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}
        >
            Status: {formatIncidentStatusLabel(status)}
        </span>
    );
};

