import { appConfig, normalizeDomainHostname } from '../../../config/app-config';
import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import type { PaginationMeta } from '../../../types/api.types';
import {
    PROPOSED_DOMAIN_OPERATIONAL_STATUSES,
    PROPOSED_DOMAIN_VERIFICATION_STATUSES,
    type AssignDomainToTenantRequest,
    type DomainDetailResponse,
    type DomainListResponse,
    type DomainVerificationInstructions,
    type ListDomainsQuery,
    type ManagedDomain,
    type ProposedDomainOperationalStatus,
    type ProposedDomainVerificationStatus,
    type RegisterDomainRequest,
    type RequestDomainVerificationRequest,
    type RequestDomainVerificationResponse,
    type UpdateDomainStatusRequest,
    type UpdateDomainStatusResponse,
} from '../types/domain-management.types';

const HOSTNAME_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4_LITERAL_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

const VERIFICATION_STATUS_SET = new Set<string>(PROPOSED_DOMAIN_VERIFICATION_STATUSES);
const OPERATIONAL_STATUS_SET = new Set<string>(PROPOSED_DOMAIN_OPERATIONAL_STATUSES);

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNonEmptyTrimmed(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new ApiError(`${fieldName} is required.`, 400);
    }
    return value.trim();
}

export function isProposedDomainVerificationStatus(
    value: unknown
): value is ProposedDomainVerificationStatus {
    return typeof value === 'string' && VERIFICATION_STATUS_SET.has(value);
}

export function isProposedDomainOperationalStatus(
    value: unknown
): value is ProposedDomainOperationalStatus {
    return typeof value === 'string' && OPERATIONAL_STATUS_SET.has(value);
}

export function validateDomainHostnameInput(rawHostname: string): string {
    if (typeof rawHostname !== 'string' || rawHostname.trim() === '') {
        throw new ApiError('Domain hostname is required.', 400);
    }

    const trimmed = rawHostname.trim();
    if (
        /\s/.test(trimmed) ||
        trimmed.includes('://') ||
        trimmed.includes('/') ||
        trimmed.includes('?') ||
        trimmed.includes('#') ||
        trimmed.includes(':') ||
        trimmed.includes('*')
    ) {
        throw new ApiError(
            'Enter a bare hostname without protocol, port, path, whitespace, or wildcards (e.g., portal.school.edu).',
            400
        );
    }

    const normalized = normalizeDomainHostname(trimmed);
    if (normalized.length < 3 || normalized.length > 253) {
        throw new ApiError('Domain hostname must be between 3 and 253 characters.', 400);
    }

    if (IPV4_LITERAL_PATTERN.test(normalized)) {
        throw new ApiError('IP addresses cannot be registered as school domains.', 400);
    }

    const labels = normalized.split('.');
    if (labels.length < 2 || labels.some((label) => !HOSTNAME_LABEL_PATTERN.test(label))) {
        throw new ApiError(
            'Enter a valid domain hostname with valid DNS labels (e.g., school-a.localhost or portal.school.edu).',
            400
        );
    }

    if (
        appConfig.domains.platform.includes(normalized) ||
        (appConfig.domains.platformAdmin && normalized === appConfig.domains.platformAdmin)
    ) {
        throw new ApiError(
            'Configured platform and admin hostnames cannot be registered as school domains.',
            400
        );
    }

    return normalized;
}

function parseOptionalString(value: unknown, fieldName: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(`Invalid backend domain payload: '${fieldName}' must be a string.`, 502);
    }
    return value;
}

function parseOptionalInstructions(
    value: unknown
): DomainVerificationInstructions | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value) || typeof value.method !== 'string' || value.method.trim() === '') {
        throw new ApiError(
            'Invalid backend domain payload: verificationInstructions is malformed.',
            502
        );
    }

    const recordType = parseOptionalString(value.recordType, 'verificationInstructions.recordType');
    const host = parseOptionalString(value.host, 'verificationInstructions.host');
    const recordValue = parseOptionalString(value.value, 'verificationInstructions.value');
    const message = parseOptionalString(value.message, 'verificationInstructions.message');

    return {
        method: value.method,
        ...(recordType ? { recordType } : {}),
        ...(host ? { host } : {}),
        ...(recordValue ? { value: recordValue } : {}),
        ...(message ? { message } : {}),
    };
}

function parseManagedDomain(data: unknown): ManagedDomain {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend domain response payload.', 502);
    }

    const {
        id,
        hostname,
        tenantId,
        schoolName,
        schoolSlug,
        verificationStatus,
        status,
        isPrimary,
        verificationInstructions,
        verificationFailureReason,
        createdAt,
        lastVerifiedAt,
        updatedAt,
    } = data;

    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof hostname !== 'string' || hostname.trim() === '' ||
        typeof tenantId !== 'string' || tenantId.trim() === '' ||
        typeof verificationStatus !== 'string' || verificationStatus.trim() === ''
    ) {
        throw new ApiError('Invalid backend domain response: missing required domain fields.', 502);
    }

    if (isPrimary !== undefined && typeof isPrimary !== 'boolean') {
        throw new ApiError('Invalid backend domain response: isPrimary must be a boolean.', 502);
    }

    const parsedStatus = parseOptionalString(status, 'status');

    return {
        id,
        hostname,
        tenantId,
        schoolName: parseOptionalString(schoolName, 'schoolName'),
        schoolSlug: parseOptionalString(schoolSlug, 'schoolSlug'),
        verificationStatus,
        status: parsedStatus ?? undefined,
        isPrimary: isPrimary ?? false,
        verificationInstructions: parseOptionalInstructions(verificationInstructions),
        verificationFailureReason: parseOptionalString(
            verificationFailureReason,
            'verificationFailureReason'
        ),
        createdAt: parseOptionalString(createdAt, 'createdAt'),
        lastVerifiedAt: parseOptionalString(lastVerifiedAt, 'lastVerifiedAt'),
        updatedAt: parseOptionalString(updatedAt, 'updatedAt'),
    };
}

function parsePaginationMeta(value: unknown, itemCount: number): PaginationMeta {
    if (!isPlainObject(value)) {
        throw new ApiError('Invalid backend domain list response: missing pagination metadata.', 502);
    }

    const { page, limit, total, totalPages } = value;
    if (
        typeof page !== 'number' || !Number.isInteger(page) || page < 1 ||
        typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 ||
        typeof total !== 'number' || !Number.isInteger(total) || total < 0 ||
        typeof totalPages !== 'number' || !Number.isInteger(totalPages) || totalPages < 0 ||
        total < itemCount
    ) {
        throw new ApiError('Invalid backend domain list response: malformed pagination metadata.', 502);
    }

    return { page, limit, total, totalPages };
}

function parseDomainListResponse(data: unknown): DomainListResponse {
    if (!isPlainObject(data) || !Array.isArray(data.items)) {
        throw new ApiError(
            'Backend domain directory endpoint returned an unexpected or unavailable response.',
            502
        );
    }

    const items = data.items.map(parseManagedDomain);
    const pagination = parsePaginationMeta(data.pagination, items.length);

    return { items, pagination };
}

function parseDomainDetailResponse(data: unknown): DomainDetailResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend domain detail endpoint returned an unexpected or unavailable response.',
            502
        );
    }

    const domainCandidate = 'domain' in data ? data.domain : data;
    return { domain: parseManagedDomain(domainCandidate) };
}

function parseVerificationResponse(data: unknown): RequestDomainVerificationResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend domain verification endpoint returned an unexpected or unavailable response.',
            502
        );
    }

    const domain = parseDomainDetailResponse(data).domain;
    const message =
        typeof data.message === 'string' && data.message.trim() !== '' ? data.message : undefined;

    return { domain, ...(message ? { message } : {}) };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isDomainBackendUnavailableError(error: unknown): boolean {
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
 * Lists managed school domains with optional search, verification filter, and pagination.
 * Fails closed if the backend endpoint is unavailable or returns malformed payloads.
 */
export async function listDomains(query: ListDomainsQuery = {}): Promise<DomainListResponse> {
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
        params.search = normalizeDomainHostname(query.search);
    }

    if (query.verificationStatus !== undefined) {
        if (!isProposedDomainVerificationStatus(query.verificationStatus)) {
            throw new ApiError(
                `Unsupported domain verification filter: ${String(query.verificationStatus)}.`,
                400
            );
        }
        params.verificationStatus = query.verificationStatus;
    }

    if (query.tenantId !== undefined && query.tenantId.trim() !== '') {
        params.tenantId = query.tenantId.trim();
    }

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.DOMAINS.BASE, { params });
        return parseDomainListResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Fetches full details for a managed domain record by ID.
 */
export async function getDomainById(domainId: string): Promise<DomainDetailResponse> {
    const normalizedId = assertNonEmptyTrimmed(domainId, 'Domain ID');

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.DOMAINS.BY_ID(normalizedId));
        return parseDomainDetailResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Registers a school domain hostname associated with an existing tenant.
 * Backend must verify tenant existence, uniqueness, and `platform.domains.manage`.
 */
export async function registerDomain(request: RegisterDomainRequest): Promise<DomainDetailResponse> {
    const hostname = validateDomainHostnameInput(request.hostname);
    const tenantId = assertNonEmptyTrimmed(request.tenantId, 'School tenant');

    const payload: RegisterDomainRequest = {
        hostname,
        tenantId,
        ...(request.isPrimary !== undefined ? { isPrimary: Boolean(request.isPrimary) } : {}),
    };

    try {
        const response = await apiClient.post<unknown>(API_ENDPOINTS.DOMAINS.BASE, payload);
        return parseDomainDetailResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Assigns or reassigns an existing domain record to a verified school tenant.
 * Backend must enforce ownership, primary-domain exclusivity, and uniqueness rules.
 */
export async function assignDomainToTenant(
    request: AssignDomainToTenantRequest
): Promise<DomainDetailResponse> {
    const domainId = assertNonEmptyTrimmed(request.domainId, 'Domain ID');
    const tenantId = assertNonEmptyTrimmed(request.tenantId, 'School tenant');

    const payload: { tenantId: string; isPrimary?: boolean } = {
        tenantId,
        ...(request.isPrimary !== undefined ? { isPrimary: Boolean(request.isPrimary) } : {}),
    };

    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.DOMAINS.ASSIGN(domainId),
            payload
        );
        return parseDomainDetailResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Requests server-side DNS/ownership verification for a registered domain.
 * Frontend must never mark a domain verified without backend confirmation.
 */
export async function requestDomainVerification(
    request: RequestDomainVerificationRequest
): Promise<RequestDomainVerificationResponse> {
    const domainId = assertNonEmptyTrimmed(request.domainId, 'Domain ID');

    try {
        const response = await apiClient.post<unknown>(API_ENDPOINTS.DOMAINS.VERIFY(domainId));
        return parseVerificationResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Updates the operational status (`ACTIVE` / `INACTIVE`) of a managed domain record.
 */
export async function updateDomainStatus(
    request: UpdateDomainStatusRequest
): Promise<UpdateDomainStatusResponse> {
    const domainId = assertNonEmptyTrimmed(request.domainId, 'Domain ID');
    if (!isProposedDomainOperationalStatus(request.status)) {
        throw new ApiError(`Unsupported domain status: ${String(request.status)}.`, 400);
    }

    const payload: { status: ProposedDomainOperationalStatus; reason?: string } = {
        status: request.status,
    };

    if (request.reason !== undefined && request.reason.trim() !== '') {
        payload.reason = request.reason.trim();
    }

    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.DOMAINS.STATUS(domainId),
            payload
        );
        return parseDomainDetailResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

