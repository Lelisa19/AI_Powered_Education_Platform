import type { PaginatedResponse } from '../../../types/api.types';

/**
 * Proposed tenant lifecycle status values.
 * Pending backend API contract confirmation; UI handles unknown status values safely.
 */
export type ProposedTenantStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export const PROPOSED_TENANT_STATUSES: readonly ProposedTenantStatus[] = [
    'PENDING',
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
];

/**
 * Proposed Tenant / School entity contract (pending backend confirmation).
 * Note: `id` and `slug` are resource identifiers only and must never be used
 * by the frontend as proof of authorization or tenant context trust.
 */
export interface ManagedTenant {
    id: string;
    name: string;
    slug: string;
    status: ProposedTenantStatus | (string & {});
    primaryDomain?: string | null;
    contactEmail?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

/**
 * Proposed query filters for listing school tenants (pending backend confirmation).
 */
export interface ListTenantsQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: ProposedTenantStatus;
}

/**
 * Proposed paginated tenant list contract (pending backend confirmation).
 */
export type TenantListResponse = PaginatedResponse<ManagedTenant>;

/**
 * Proposed tenant detail response contract (pending backend confirmation).
 */
export interface TenantDetailResponse {
    tenant: ManagedTenant;
}

/**
 * Proposed request payload for provisioning a new school tenant (pending backend confirmation).
 * Excludes domain verification and primary school admin invitations, which belong to later steps.
 */
export interface CreateTenantRequest {
    name: string;
    slug: string;
    contactEmail?: string;
}

/**
 * Proposed request payload for updating a tenant's operational status (pending backend confirmation).
 */
export interface UpdateTenantStatusRequest {
    tenantId: string;
    status: ProposedTenantStatus;
    reason?: string;
}

/**
 * Proposed response payload after updating a tenant's status (pending backend confirmation).
 */
export interface UpdateTenantStatusResponse {
    tenant: ManagedTenant;
}

