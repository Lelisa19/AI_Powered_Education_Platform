import type { PaginatedResponse } from '../../../types/api.types';
import type { ManagedTenant } from '../../tenants/types/tenant-management.types';

/**
 * Proposed domain verification lifecycle states.
 * Pending backend API contract confirmation; UI handles unknown status strings safely.
 * Unverified or failed domains must never be treated as verified school domains.
 */
export type ProposedDomainVerificationStatus =
    | 'UNVERIFIED'
    | 'PENDING_VERIFICATION'
    | 'VERIFIED'
    | 'FAILED';

export const PROPOSED_DOMAIN_VERIFICATION_STATUSES: readonly ProposedDomainVerificationStatus[] = [
    'UNVERIFIED',
    'PENDING_VERIFICATION',
    'VERIFIED',
    'FAILED',
];

/**
 * Proposed operational domain status values pending backend contract confirmation.
 */
export type ProposedDomainOperationalStatus = 'ACTIVE' | 'INACTIVE';

export const PROPOSED_DOMAIN_OPERATIONAL_STATUSES: readonly ProposedDomainOperationalStatus[] = [
    'ACTIVE',
    'INACTIVE',
];

/**
 * Backend-supplied DNS/verification instructions.
 * Never synthesized client-side.
 */
export interface DomainVerificationInstructions {
    method: string;
    recordType?: string;
    host?: string;
    value?: string;
    message?: string;
}

/**
 * Proposed managed school domain contract (pending backend API confirmation).
 * Associated tenant references identify the target school for administration only and
 * do not represent client-controlled authorization claims.
 */
export interface ManagedDomain {
    id: string;
    hostname: string;
    tenantId: ManagedTenant['id'];
    schoolName?: ManagedTenant['name'] | null;
    schoolSlug?: ManagedTenant['slug'] | null;
    verificationStatus: ProposedDomainVerificationStatus | (string & {});
    status?: ProposedDomainOperationalStatus | (string & {});
    isPrimary: boolean;
    verificationInstructions?: DomainVerificationInstructions | null;
    verificationFailureReason?: string | null;
    createdAt?: string | null;
    lastVerifiedAt?: string | null;
    updatedAt?: string | null;
}

/**
 * Proposed query filters for listing managed domains (pending backend confirmation).
 */
export interface ListDomainsQuery {
    page?: number;
    limit?: number;
    search?: string;
    verificationStatus?: ProposedDomainVerificationStatus;
    tenantId?: ManagedTenant['id'];
}

/**
 * Proposed paginated domain list contract (pending backend confirmation).
 */
export type DomainListResponse = PaginatedResponse<ManagedDomain>;

/**
 * Proposed domain detail response contract (pending backend confirmation).
 */
export interface DomainDetailResponse {
    domain: ManagedDomain;
}

/**
 * Proposed request payload for registering and associating a school domain (pending backend confirmation).
 */
export interface RegisterDomainRequest {
    hostname: string;
    tenantId: ManagedTenant['id'];
    isPrimary?: boolean;
}

/**
 * Proposed request payload for reassigning a domain to an existing tenant (pending backend confirmation).
 */
export interface AssignDomainToTenantRequest {
    domainId: string;
    tenantId: ManagedTenant['id'];
    isPrimary?: boolean;
}

/**
 * Proposed request payload to trigger backend domain verification (pending backend confirmation).
 */
export interface RequestDomainVerificationRequest {
    domainId: string;
}

/**
 * Proposed response payload after requesting backend domain verification (pending backend confirmation).
 */
export interface RequestDomainVerificationResponse {
    domain: ManagedDomain;
    message?: string;
}

/**
 * Proposed request payload for enabling/disabling a managed domain record (pending backend confirmation).
 */
export interface UpdateDomainStatusRequest {
    domainId: string;
    status: ProposedDomainOperationalStatus;
    reason?: string;
}

/**
 * Proposed response payload after updating a domain's operational status (pending backend confirmation).
 */
export interface UpdateDomainStatusResponse {
    domain: ManagedDomain;
}

