import {
    PLATFORM_PERMISSIONS,
    type PlatformPermissionKey,
} from '../../../constants/permissions';
import type {
    PlatformAttentionNotice,
    PlatformAttentionNoticeCategory,
    PlatformAttentionSeverity,
    PlatformDashboardSummary,
} from '../types/platform-dashboard.types';

export interface PlatformQuickActionItem {
    id: string;
    title: string;
    description: string;
    to: string;
    permission: PlatformPermissionKey;
    actionLabel: string;
}

export const PLATFORM_QUICK_ACTIONS: readonly PlatformQuickActionItem[] = [
    {
        id: 'manage-schools',
        title: 'Manage Schools',
        description:
            'Browse registered school tenants, review lifecycle status, and provision new schools.',
        to: '/dashboard/tenants',
        permission: PLATFORM_PERMISSIONS.TENANTS_MANAGE,
        actionLabel: 'Open Schools',
    },
    {
        id: 'manage-domains',
        title: 'Manage Domains',
        description:
            'Inspect domain verification status, DNS instructions, and primary domain assignments.',
        to: '/dashboard/domains',
        permission: PLATFORM_PERMISSIONS.DOMAINS_MANAGE,
        actionLabel: 'Open Domains',
    },
    {
        id: 'view-onboarding',
        title: 'View School Onboarding',
        description:
            'Track school setup stages, launch readiness, and Primary School Admin invitations.',
        to: '/dashboard/onboarding',
        permission: PLATFORM_PERMISSIONS.ONBOARDING_MANAGE,
        actionLabel: 'Open Onboarding',
    },
    {
        id: 'manage-administrators',
        title: 'Manage Platform Administrators',
        description:
            'Review administrator accounts, pending invitations, and permission restrictions.',
        to: '/dashboard/administrators',
        permission: PLATFORM_PERMISSIONS.ADMINS_MANAGE,
        actionLabel: 'Open Administrators',
    },
    {
        id: 'manage-settings',
        title: 'Manage Platform Settings',
        description:
            'Configure provider-wide general information, platform defaults, and maintenance mode.',
        to: '/dashboard/settings',
        permission: PLATFORM_PERMISSIONS.SETTINGS_MANAGE,
        actionLabel: 'Open Settings',
    },
    {
        id: 'view-audit-logs',
        title: 'View Audit Logs',
        description:
            'Inspect read-only platform administrative events, resource changes, and security outcomes.',
        to: '/dashboard/audit-logs',
        permission: PLATFORM_PERMISSIONS.AUDIT_LOGS_VIEW,
        actionLabel: 'Open Audit Logs',
    },
    {
        id: 'view-monitoring',
        title: 'System Monitoring',
        description:
            'Monitor overall platform health, service telemetry, performance metrics, and incidents.',
        to: '/dashboard/monitoring',
        permission: PLATFORM_PERMISSIONS.MONITORING_ACCESS,
        actionLabel: 'Open Monitoring',
    },
    {
        id: 'manage-support',
        title: 'Support Management',
        description:
            'Review school support tickets, coordinate assignments, and communicate responses.',
        to: '/dashboard/support',
        permission: PLATFORM_PERMISSIONS.SUPPORT_MANAGE,
        actionLabel: 'Open Support',
    },
];

interface AttentionNoticeCategoryMapping {
    permission: PlatformPermissionKey;
    to: string;
    actionLabel: string;
    defaultSeverity: PlatformAttentionSeverity;
}

const ATTENTION_CATEGORY_MAP: Record<PlatformAttentionNoticeCategory, AttentionNoticeCategoryMapping> = {
    DOMAIN_VERIFICATION_FAILED: {
        permission: PLATFORM_PERMISSIONS.DOMAINS_MANAGE,
        to: '/dashboard/domains',
        actionLabel: 'Review Domains',
        defaultSeverity: 'HIGH',
    },
    ONBOARDING_BLOCKED: {
        permission: PLATFORM_PERMISSIONS.ONBOARDING_MANAGE,
        to: '/dashboard/onboarding',
        actionLabel: 'Inspect Onboarding',
        defaultSeverity: 'HIGH',
    },
    PRIMARY_ADMIN_INVITATION_PENDING: {
        permission: PLATFORM_PERMISSIONS.ONBOARDING_MANAGE,
        to: '/dashboard/onboarding',
        actionLabel: 'Review Invitations',
        defaultSeverity: 'MEDIUM',
    },
    PLATFORM_ADMIN_INVITATION_PENDING: {
        permission: PLATFORM_PERMISSIONS.ADMINS_MANAGE,
        to: '/dashboard/administrators',
        actionLabel: 'Manage Invitations',
        defaultSeverity: 'MEDIUM',
    },
};

export interface ResolvedAttentionNotice {
    id: string;
    title: string;
    description?: string;
    count: number | null;
    severity: PlatformAttentionSeverity;
    to: string;
    actionLabel: string;
}

export interface AttentionNoticesResolution {
    items: ResolvedAttentionNotice[];
    isSupportedByBackend: boolean;
}

function normalizeSeverity(
    rawSeverity: string | null | undefined,
    fallback: PlatformAttentionSeverity
): PlatformAttentionSeverity {
    if (rawSeverity === 'HIGH' || rawSeverity === 'MEDIUM' || rawSeverity === 'INFO') {
        return rawSeverity;
    }
    return fallback;
}

function formatPlural(count: number, singular: string, plural: string): string {
    return count === 1 ? singular : plural;
}

export function formatDashboardMetricValue(value: number | null | undefined): string {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
        return value.toLocaleString();
    }
    return 'Not reported';
}

export function isReportedMetricNumber(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function formatDashboardTimestamp(value?: string | null): string | null {
    if (!value) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function mapExplicitAttentionNotice(
    notice: PlatformAttentionNotice,
    hasPermission: (permission: PlatformPermissionKey) => boolean
): ResolvedAttentionNotice | null {
    const categoryKey = notice.category as PlatformAttentionNoticeCategory;
    const mapping = ATTENTION_CATEGORY_MAP[categoryKey];
    if (!mapping || !hasPermission(mapping.permission)) {
        return null;
    }

    return {
        id: notice.id,
        title: notice.title,
        ...(notice.description ? { description: notice.description } : {}),
        count: notice.count ?? null,
        severity: normalizeSeverity(notice.severity, mapping.defaultSeverity),
        to: mapping.to,
        actionLabel: mapping.actionLabel,
    };
}

/**
 * Resolves operational attention notices strictly from backend-supplied summary data
 * and filters every item against the current administrator's effective permissions.
 */
export function resolveAuthorizedAttentionNotices(
    summary: PlatformDashboardSummary | null,
    hasPermission: (permission: PlatformPermissionKey) => boolean
): AttentionNoticesResolution {
    if (!summary) {
        return { items: [], isSupportedByBackend: false };
    }

    if (Array.isArray(summary.attentionNotices)) {
        const items = summary.attentionNotices
            .map((notice) => mapExplicitAttentionNotice(notice, hasPermission))
            .filter((item): item is ResolvedAttentionNotice => item !== null);

        return { items, isSupportedByBackend: true };
    }

    const items: ResolvedAttentionNotice[] = [];
    let hasSupportedSignal = false;

    const canManageDomains = hasPermission(PLATFORM_PERMISSIONS.DOMAINS_MANAGE);
    const canManageOnboarding = hasPermission(PLATFORM_PERMISSIONS.ONBOARDING_MANAGE);
    const canManageAdmins = hasPermission(PLATFORM_PERMISSIONS.ADMINS_MANAGE);

    if (canManageDomains && isReportedMetricNumber(summary.domains?.failedVerification)) {
        hasSupportedSignal = true;
        const count = summary.domains.failedVerification;
        if (count > 0) {
            items.push({
                id: 'derived-domains-failed',
                title: `${count.toLocaleString()} ${formatPlural(count, 'domain', 'domains')} with failed verification`,
                description:
                    'DNS or ownership verification failed and requires inspection in Domain Management.',
                count,
                severity: 'HIGH',
                to: '/dashboard/domains',
                actionLabel: 'Review Domains',
            });
        }
    }

    if (canManageOnboarding && isReportedMetricNumber(summary.onboarding?.blocked)) {
        hasSupportedSignal = true;
        const count = summary.onboarding.blocked;
        if (count > 0) {
            items.push({
                id: 'derived-onboarding-blocked',
                title: `${count.toLocaleString()} blocked onboarding ${formatPlural(count, 'process', 'processes')}`,
                description:
                    'One or more schools are blocked during onboarding and require review before launch.',
                count,
                severity: 'HIGH',
                to: '/dashboard/onboarding',
                actionLabel: 'Inspect Onboarding',
            });
        }
    }

    if (canManageAdmins && isReportedMetricNumber(summary.administrators?.pendingInvitations)) {
        hasSupportedSignal = true;
        const count = summary.administrators.pendingInvitations;
        if (count > 0) {
            items.push({
                id: 'derived-admin-invitations-pending',
                title: `${count.toLocaleString()} pending administrator ${formatPlural(count, 'invitation', 'invitations')}`,
                description:
                    'Invited platform administrators have not yet completed account activation.',
                count,
                severity: 'MEDIUM',
                to: '/dashboard/administrators',
                actionLabel: 'Manage Invitations',
            });
        }
    }

    return {
        items,
        isSupportedByBackend: hasSupportedSignal,
    };
}

