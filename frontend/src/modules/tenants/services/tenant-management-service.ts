import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import type { PaginationMeta } from '../../../types/api.types';
import {
    PROPOSED_TENANT_STATUSES,
    type CreateTenantRequest,
    type ListTenantsQuery,
    type ManagedTenant,
    type ProposedTenantStatus,
    type TenantDetailResponse,
    type TenantListResponse,
    type UpdateTenantStatusRequest,
    type UpdateTenantStatusResponse,
} from '../types/tenant-management.types';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROPOSED_STATUS_SET = new Set<string>(PROPOSED_TENANT_STATUSES);

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNonEmptyTrimmed(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new ApiError(`${fieldName} is required.`, 400);
    }
    return value.trim();
}

export function isProposedTenantStatus(value: unknown): value is ProposedTenantStatus {
    return typeof value === 'string' && PROPOSED_STATUS_SET.has(value);
}

export function normalizeTenantSlug(rawSlug: string): string {
    return rawSlug.trim().toLowerCase();
}

export function validateCreateTenantInput(request: CreateTenantRequest): CreateTenantRequest {
    const name = assertNonEmptyTrimmed(request.name, 'School name');
    if (name.length < 2 || name.length > 120) {
        throw new ApiError('School name must be between 2 and 120 characters.', 400);
    }

    const rawSlug = assertNonEmptyTrimmed(request.slug, 'School identifier');
    const slug = normalizeTenantSlug(rawSlug);
    if (slug.length < 2 || slug.length > 63 || !SLUG_PATTERN.test(slug)) {
        throw new ApiError(
            'School identifier must be 2-63 lowercase letters, numbers, or hyphens.',
            400
        );
    }

    let contactEmail: string | undefined;
    if (request.contactEmail !== undefined && request.contactEmail.trim() !== '') {
        const trimmedEmail = request.contactEmail.trim();
        if (!EMAIL_PATTERN.test(trimmedEmail)) {
            throw new ApiError('Please enter a valid contact email address.', 400);
        }
        contactEmail = trimmedEmail;
    }

    return {
        name,
        slug,
        ...(contactEmail ? { contactEmail } : {}),
    };
}

function parseOptionalString(value: unknown, fieldName: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(`Invalid backend tenant payload: '${fieldName}' must be a string.`, 502);
    }
    return value;
}

function parseManagedTenant(data: unknown): ManagedTenant {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend tenant response payload.', 502);
    }

    const { id, name, slug, status, primaryDomain, contactEmail, createdAt, updatedAt } = data;

    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof name !== 'string' || name.trim() === '' ||
        typeof slug !== 'string' || slug.trim() === '' ||
        typeof status !== 'string' || status.trim() === ''
    ) {
        throw new ApiError('Invalid backend tenant response: missing required tenant fields.', 502);
    }

    return {
        id,
        name,
        slug,
        status,
        primaryDomain: parseOptionalString(primaryDomain, 'primaryDomain'),
        contactEmail: parseOptionalString(contactEmail, 'contactEmail'),
        createdAt: parseOptionalString(createdAt, 'createdAt'),
        updatedAt: parseOptionalString(updatedAt, 'updatedAt'),
    };
}

function parsePaginationMeta(value: unknown, itemCount: number): PaginationMeta {
    if (!isPlainObject(value)) {
        throw new ApiError('Invalid backend tenant list response: missing pagination metadata.', 502);
    }

    const { page, limit, total, totalPages } = value;
    if (
        typeof page !== 'number' || !Number.isInteger(page) || page < 1 ||
        typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 ||
        typeof total !== 'number' || !Number.isInteger(total) || total < 0 ||
        typeof totalPages !== 'number' || !Number.isInteger(totalPages) || totalPages < 0 ||
        total < itemCount
    ) {
        throw new ApiError('Invalid backend tenant list response: malformed pagination metadata.', 502);
    }

    return { page, limit, total, totalPages };
}

function parseTenantListResponse(data: unknown): TenantListResponse {
    if (!isPlainObject(data) || !Array.isArray(data.items)) {
        throw new ApiError(
            'Backend tenant directory endpoint returned an unexpected or unavailable response.',
            502
        );
    }

    const items = data.items.map(parseManagedTenant);
    const pagination = parsePaginationMeta(data.pagination, items.length);

    return { items, pagination };
}

function parseTenantDetailResponse(data: unknown): TenantDetailResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend tenant detail endpoint returned an unexpected or unavailable response.',
            502
        );
    }

    const tenantCandidate = 'tenant' in data ? data.tenant : data;
    return { tenant: parseManagedTenant(tenantCandidate) };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isTenantBackendUnavailableError(error: unknown): boolean {
    if (!(error instanceof ApiError)) {
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
 * Fetches paginated school tenants for Platform Admin management.
 * Fails closed when the backend endpoint is unavailable or returns malformed payloads.
 */
export async function listTenants(query: ListTenantsQuery = {}): Promise<TenantListResponse> {
    const params: Record<string, string | number> = {};

    if (query.page !== undefined) {
        if (!Number.isInteger(query.page) || query.page < 1) {
            throw new ApiError('Page number must be a positive integer.', 400);
        }
        params.page = query.page;
    }

    if (query.limit !== undefined) {
        if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 100) {
            throw new ApiError('Page size must be between 1 and 100.', 400);
        }
        params.limit = query.limit;
    }

    if (query.search !== undefined && query.search.trim() !== '') {
        params.search = query.search.trim();
    }

    if (query.status !== undefined) {
        if (!isProposedTenantStatus(query.status)) {
            throw new ApiError(`Unsupported tenant status filter: ${String(query.status)}.`, 400);
        }
        params.status = query.status;
    }

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.TENANTS.BASE, { params });
        return parseTenantListResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Provisions a new school tenant via the backend API.
 * Validates inputs before dispatching and never fabricates success responses.
 */
export async function createTenant(request: CreateTenantRequest): Promise<TenantDetailResponse> {
    const validatedPayload = validateCreateTenantInput(request);

    try {
        const response = await apiClient.post<unknown>(API_ENDPOINTS.TENANTS.BASE, validatedPayload);
        return parseTenantDetailResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Retrieves detailed information for a specific school tenant by server ID.
 */
export async function getTenantById(tenantId: string): Promise<TenantDetailResponse> {
    const normalizedId = assertNonEmptyTrimmed(tenantId, 'Tenant ID');

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.TENANTS.BY_ID(normalizedId));
        return parseTenantDetailResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Updates a tenant's operational status via the proposed status endpoint.
 * Note: Backend authorization must enforce `platform.tenants.manage` server-side.
 */
export async function updateTenantStatus(
    request: UpdateTenantStatusRequest
): Promise<UpdateTenantStatusResponse> {
    const normalizedId = assertNonEmptyTrimmed(request.tenantId, 'Tenant ID');
    if (!isProposedTenantStatus(request.status)) {
        throw new ApiError(`Unsupported tenant status: ${String(request.status)}.`, 400);
    }

    const payload: { status: ProposedTenantStatus; reason?: string } = {
        status: request.status,
    };

    if (request.reason !== undefined && request.reason.trim() !== '') {
        payload.reason = request.reason.trim();
    }

    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.TENANTS.STATUS(normalizedId),
            payload
        );
        return parseTenantDetailResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

