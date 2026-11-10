import type {
    PlatformAuditLogRecord,
    SafeAuditMetadataValue,
} from '../types/platform-audit-log.types';

const ACTION_CATEGORY_LABELS: Record<string, string> = {
    TENANTS: 'Schools / Tenants',
    DOMAINS: 'Domains',
    ONBOARDING: 'School Onboarding',
    PLATFORM_ADMINS: 'Platform Administrators',
    SETTINGS: 'Platform Settings',
    AUTH: 'Authentication',
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
    TENANT: 'School / Tenant',
    DOMAIN: 'School Domain',
    ONBOARDING: 'School Onboarding',
    PLATFORM_ADMIN: 'Platform Administrator',
    PLATFORM_SETTINGS: 'Platform Settings',
    AUTH_SESSION: 'Auth Session',
};

const OUTCOME_LABELS: Record<string, string> = {
    SUCCESS: 'Success',
    FAILURE: 'Failure',
    DENIED: 'Denied',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    PLATFORM: 'Platform Admin',
    SCHOOL: 'School User',
    SYSTEM: 'System',
};

function titleCaseEnum(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return 'Not recorded';

    return trimmed
        .toLowerCase()
        .split(/[_-]+/)
        .map((segment) => (segment ? segment[0].toUpperCase() + segment.slice(1) : ''))
        .join(' ');
}

export function formatAuditTimestamp(value?: string | null): string {
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

export function formatAuditActionCategory(category?: string | null): string {
    if (!category || category.trim() === '') return 'Not recorded';
    const normalized = category.trim().toUpperCase();
    return ACTION_CATEGORY_LABELS[normalized] ?? titleCaseEnum(category);
}

export function formatAuditResourceType(resourceType?: string | null): string {
    if (!resourceType || resourceType.trim() === '') return 'Not recorded';
    const normalized = resourceType.trim().toUpperCase();
    return RESOURCE_TYPE_LABELS[normalized] ?? titleCaseEnum(resourceType);
}

export function formatAuditOutcomeLabel(outcome?: string | null): string {
    if (!outcome || outcome.trim() === '') return 'Not recorded';
    const normalized = outcome.trim().toUpperCase();
    return OUTCOME_LABELS[normalized] ?? titleCaseEnum(outcome);
}

export function formatActorAccountType(accountType?: string | null): string {
    if (!accountType || accountType.trim() === '') return 'Not recorded';
    const normalized = accountType.trim().toUpperCase();
    return ACCOUNT_TYPE_LABELS[normalized] ?? titleCaseEnum(accountType);
}

export function formatAuditActionLabel(action: string): string {
    return titleCaseEnum(action);
}

export function formatActorPrimaryDisplay(record: PlatformAuditLogRecord): {
    primary: string;
    secondary: string | null;
} {
    const name = record.actorName?.trim() || null;
    const email = record.actorEmail?.trim() || null;
    const id = record.actorId?.trim() || null;

    if (name && email && name !== email) {
        return { primary: name, secondary: email };
    }
    if (name) {
        return { primary: name, secondary: id ? `ID: ${id}` : null };
    }
    if (email) {
        return { primary: email, secondary: id ? `ID: ${id}` : null };
    }
    if (id) {
        return { primary: id, secondary: null };
    }

    return { primary: 'Not recorded', secondary: null };
}

export function formatResourceIdentifierDisplay(record: PlatformAuditLogRecord): {
    primary: string;
    secondary: string | null;
} {
    const name = record.resourceName?.trim() || null;
    const id = record.resourceId?.trim() || null;

    if (name && id && name !== id) {
        return { primary: name, secondary: `ID: ${id}` };
    }
    if (name) {
        return { primary: name, secondary: null };
    }
    if (id) {
        return { primary: id, secondary: null };
    }

    return { primary: 'Not recorded', secondary: null };
}

export function formatOptionalAuditText(value?: string | null): string {
    if (!value || value.trim() === '') {
        return 'Not recorded';
    }
    return value.trim();
}

export function formatAuditMetadataValue(value: SafeAuditMetadataValue): string {
    if (value === null) return 'Not recorded';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
}

