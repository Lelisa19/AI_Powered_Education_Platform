import type { PaginatedResponse } from '../../../types/api.types';

/**
 * Platform Audit Log contracts (read-only, pending backend API confirmation).
 * Strictly captures platform-level administrative events and excludes private school
 * educational records, raw credentials, tokens, API keys, and sensitive request headers.
 */

export type ProposedAuditActionCategory =
    | 'TENANTS'
    | 'DOMAINS'
    | 'ONBOARDING'
    | 'PLATFORM_ADMINS'
    | 'SETTINGS'
    | 'AUTH';

export const PROPOSED_AUDIT_ACTION_CATEGORIES: readonly ProposedAuditActionCategory[] = [
    'TENANTS',
    'DOMAINS',
    'ONBOARDING',
    'PLATFORM_ADMINS',
    'SETTINGS',
    'AUTH',
];

export type ProposedAuditResourceType =
    | 'TENANT'
    | 'DOMAIN'
    | 'ONBOARDING'
    | 'PLATFORM_ADMIN'
    | 'PLATFORM_SETTINGS'
    | 'AUTH_SESSION';

export const PROPOSED_AUDIT_RESOURCE_TYPES: readonly ProposedAuditResourceType[] = [
    'TENANT',
    'DOMAIN',
    'ONBOARDING',
    'PLATFORM_ADMIN',
    'PLATFORM_SETTINGS',
    'AUTH_SESSION',
];

export type ProposedAuditOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED';

export const PROPOSED_AUDIT_OUTCOMES: readonly ProposedAuditOutcome[] = [
    'SUCCESS',
    'FAILURE',
    'DENIED',
];

export type AuditSortOrder = 'desc' | 'asc';

export type SafeAuditMetadataValue = string | number | boolean | null;

export interface PlatformAuditLogRecord {
    id: string;
    occurredAt: string;
    actorId?: string | null;
    actorName?: string | null;
    actorEmail?: string | null;
    actorAccountType?: string | null;
    action: string;
    actionCategory?: ProposedAuditActionCategory | (string & {}) | null;
    resourceType: ProposedAuditResourceType | (string & {});
    resourceId?: string | null;
    resourceName?: string | null;
    outcome?: ProposedAuditOutcome | (string & {}) | null;
    sourceIp?: string | null;
    requestId?: string | null;
    summary?: string | null;
    metadata?: Record<string, SafeAuditMetadataValue> | null;
}

export interface ListPlatformAuditLogsQuery {
    page?: number;
    limit?: number;
    search?: string;
    actor?: string;
    actionCategory?: ProposedAuditActionCategory;
    resourceType?: ProposedAuditResourceType;
    outcome?: ProposedAuditOutcome;
    fromDate?: string;
    toDate?: string;
    sortOrder?: AuditSortOrder;
}

export type PlatformAuditLogListResponse = PaginatedResponse<PlatformAuditLogRecord>;

export interface PlatformAuditLogDetailResponse {
    auditLog: PlatformAuditLogRecord;
}

