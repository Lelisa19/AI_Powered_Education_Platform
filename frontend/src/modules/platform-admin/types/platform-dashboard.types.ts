/**
 * Dedicated Platform Dashboard Summary API contracts (pending backend implementation).
 * Aggregates platform-level operational metrics across Schools/Tenants, Domains,
 * School Onboarding, and Platform Administrators without downloading full directories.
 */

export interface TenantOperationalMetrics {
    total: number | null;
    active: number | null;
    pendingOrInactive: number | null;
    suspended?: number | null;
}

export interface DomainOperationalMetrics {
    total: number | null;
    verified: number | null;
    pendingVerification: number | null;
    failedVerification: number | null;
}

export interface OnboardingOperationalMetrics {
    total: number | null;
    inProgress: number | null;
    completed: number | null;
    /** Optional metric reported when backend tracks blocked/attention onboarding stages. */
    blocked?: number | null;
}

export interface PlatformAdministratorOperationalMetrics {
    total: number | null;
    active: number | null;
    pendingInvitations: number | null;
}

export type PlatformAttentionNoticeCategory =
    | 'DOMAIN_VERIFICATION_FAILED'
    | 'ONBOARDING_BLOCKED'
    | 'PRIMARY_ADMIN_INVITATION_PENDING'
    | 'PLATFORM_ADMIN_INVITATION_PENDING';

export type PlatformAttentionSeverity = 'HIGH' | 'MEDIUM' | 'INFO';

export interface PlatformAttentionNotice {
    id: string;
    category: PlatformAttentionNoticeCategory | (string & {});
    title: string;
    description?: string | null;
    count?: number | null;
    severity?: PlatformAttentionSeverity | (string & {});
}

export interface PlatformDashboardSummary {
    tenants?: TenantOperationalMetrics | null;
    domains?: DomainOperationalMetrics | null;
    onboarding?: OnboardingOperationalMetrics | null;
    administrators?: PlatformAdministratorOperationalMetrics | null;
    attentionNotices?: PlatformAttentionNotice[] | null;
    generatedAt?: string | null;
}

export interface PlatformDashboardSummaryResponse {
    summary: PlatformDashboardSummary;
}

