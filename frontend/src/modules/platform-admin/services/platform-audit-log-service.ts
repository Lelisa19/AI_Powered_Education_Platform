import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import type { PaginationMeta } from '../../../types/api.types';
import {
    PROPOSED_AUDIT_ACTION_CATEGORIES,
    PROPOSED_AUDIT_OUTCOMES,
    PROPOSED_AUDIT_RESOURCE_TYPES,
    type AuditSortOrder,
    type ListPlatformAuditLogsQuery,
    type PlatformAuditLogDetailResponse,
    type PlatformAuditLogListResponse,
    type PlatformAuditLogRecord,
    type ProposedAuditActionCategory,
    type ProposedAuditOutcome,
    type ProposedAuditResourceType,
    type SafeAuditMetadataValue,
} from '../types/platform-audit-log.types';

/**
 * Security invariants for Platform Audit Logs:
 * 1. Read-only surface: frontend exposes GET queries only and never alters/deletes records.
 * 2. Backend must enforce `PLATFORM_ADMIN` auth + `platform.audit_logs.view` server-side.
 * 3. Audit responses must never expose passwords, hashes, invitation/session tokens,
 *    API keys, secrets, credential-bearing headers, or private school/student data.
 */

const ACTION_CATEGORY_SET = new Set<string>(PROPOSED_AUDIT_ACTION_CATEGORIES);
const RESOURCE_TYPE_SET = new Set<string>(PROPOSED_AUDIT_RESOURCE_TYPES);
const OUTCOME_SET = new Set<string>(PROPOSED_AUDIT_OUTCOMES);

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CREDENTIAL_STRING_PREFIX_PATTERN = /^(?:Bearer|Basic)\s+\S+/i;

const FORBIDDEN_NORMALIZED_KEYS = new Set<string>([
    'password',
    'passwordhash',
    'hashedpassword',
    'salt',
    'token',
    'invitationtoken',
    'activationtoken',
    'rawtoken',
    'accesstoken',
    'refreshtoken',
    'idtoken',
    'sessiontoken',
    'jwt',
    'bearer',
    'apikey',
    'secret',
    'secretkey',
    'privatekey',
    'signingkey',
    'webhooksecret',
    'clientsecret',
    'encryptionkey',
    'databaseurl',
    'dbpassword',
    'smtppassword',
    'authorization',
    'cookie',
    'setcookie',
    'xapikey',
    'proxyauthorization',
    'headers',
    'requestheaders',
    'rawheaders',
    'credentials',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSecretKeyName(key: string): string {
    return key.replace(/[-_]/g, '').toLowerCase();
}

function assertNoProhibitedAuditData(value: unknown, depth = 0): void {
    if (depth > 6) {
        return;
    }

    if (typeof value === 'string') {
        if (CREDENTIAL_STRING_PREFIX_PATTERN.test(value.trim())) {
            throw new ApiError(
                'Security violation: Audit log payload must not expose authorization credentials.',
                502
            );
        }
        return;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            assertNoProhibitedAuditData(item, depth + 1);
        }
        return;
    }

    if (!isPlainObject(value)) {
        return;
    }

    for (const [key, entryValue] of Object.entries(value)) {
        const normalizedKey = normalizeSecretKeyName(key);
        if (
            FORBIDDEN_NORMALIZED_KEYS.has(normalizedKey) &&
            entryValue !== undefined &&
            entryValue !== null
        ) {
            throw new ApiError(
                'Security violation: Audit log response must not expose credentials, tokens, secrets, or sensitive headers.',
                502
            );
        }

        assertNoProhibitedAuditData(entryValue, depth + 1);
    }
}

function parseOptionalNullableString(value: unknown, fieldName: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(
            `Invalid backend audit log payload: '${fieldName}' must be a string or null.`,
            502
        );
    }
    return value;
}

function parseSafeMetadata(
    value: unknown
): Record<string, SafeAuditMetadataValue> | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value)) {
        throw new ApiError(
            'Invalid backend audit log payload: metadata must be a flat object or null.',
            502
        );
    }

    assertNoProhibitedAuditData(value);

    const parsed: Record<string, SafeAuditMetadataValue> = {};
    for (const [key, entryValue] of Object.entries(value)) {
        if (entryValue === null) {
            parsed[key] = null;
        } else if (typeof entryValue === 'string' || typeof entryValue === 'boolean') {
            parsed[key] = entryValue;
        } else if (typeof entryValue === 'number') {
            if (!Number.isFinite(entryValue)) {
                throw new ApiError(
                    `Invalid backend audit log payload: metadata.${key} must be a finite number.`,
                    502
                );
            }
            parsed[key] = entryValue;
        } else {
            throw new ApiError(
                `Invalid backend audit log payload: metadata.${key} must be a scalar primitive value.`,
                502
            );
        }
    }

    return parsed;
}

function parseAuditLogRecord(data: unknown): PlatformAuditLogRecord {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend audit log record payload.', 502);
    }
    assertNoProhibitedAuditData(data);

    const {
        id,
        occurredAt,
        actorId,
        actorName,
        actorEmail,
        actorAccountType,
        action,
        actionCategory,
        resourceType,
        resourceId,
        resourceName,
        outcome,
        sourceIp,
        requestId,
        summary,
        metadata,
    } = data;

    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof occurredAt !== 'string' || occurredAt.trim() === '' ||
        typeof action !== 'string' || action.trim() === '' ||
        typeof resourceType !== 'string' || resourceType.trim() === ''
    ) {
        throw new ApiError(
            'Invalid backend audit log payload: missing id, occurredAt, action, or resourceType.',
            502
        );
    }

    return {
        id: id.trim(),
        occurredAt: occurredAt.trim(),
        actorId: parseOptionalNullableString(actorId, 'actorId'),
        actorName: parseOptionalNullableString(actorName, 'actorName'),
        actorEmail: parseOptionalNullableString(actorEmail, 'actorEmail'),
        actorAccountType: parseOptionalNullableString(actorAccountType, 'actorAccountType'),
        action: action.trim(),
        actionCategory: parseOptionalNullableString(actionCategory, 'actionCategory'),
        resourceType: resourceType.trim(),
        resourceId: parseOptionalNullableString(resourceId, 'resourceId'),
        resourceName: parseOptionalNullableString(resourceName, 'resourceName'),
        outcome: parseOptionalNullableString(outcome, 'outcome'),
        sourceIp: parseOptionalNullableString(sourceIp, 'sourceIp'),
        requestId: parseOptionalNullableString(requestId, 'requestId'),
        summary: parseOptionalNullableString(summary, 'summary'),
        metadata: parseSafeMetadata(metadata),
    };
}

function parsePaginationMeta(value: unknown, itemCount: number): PaginationMeta {
    if (!isPlainObject(value)) {
        throw new ApiError(
            'Invalid backend audit log response: missing pagination metadata.',
            502
        );
    }

    const { page, limit, total, totalPages } = value;
    if (
        typeof page !== 'number' || !Number.isInteger(page) || page < 1 ||
        typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 ||
        typeof total !== 'number' || !Number.isInteger(total) || total < 0 ||
        typeof totalPages !== 'number' || !Number.isInteger(totalPages) || totalPages < 0 ||
        total < itemCount
    ) {
        throw new ApiError(
            'Invalid backend audit log response: malformed pagination metadata.',
            502
        );
    }

    return { page, limit, total, totalPages };
}

function parseAuditLogListResponse(data: unknown): PlatformAuditLogListResponse {
    if (!isPlainObject(data) || !Array.isArray(data.items)) {
        throw new ApiError(
            'Backend platform audit logs endpoint returned an unexpected or unavailable response.',
            502
        );
    }
    assertNoProhibitedAuditData(data);

    const items = data.items.map(parseAuditLogRecord);
    const pagination = parsePaginationMeta(data.pagination, items.length);

    return { items, pagination };
}

function parseAuditLogDetailResponse(data: unknown): PlatformAuditLogDetailResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend platform audit log detail endpoint returned an unexpected response.',
            502
        );
    }
    assertNoProhibitedAuditData(data);

    const candidate = 'auditLog' in data ? data.auditLog : data;
    return { auditLog: parseAuditLogRecord(candidate) };
}

function assertValidDateParam(rawDate: string, label: string): string {
    const trimmed = rawDate.trim();
    if (!ISO_DATE_ONLY_PATTERN.test(trimmed)) {
        throw new ApiError(`${label} must use YYYY-MM-DD format.`, 400);
    }
    return trimmed;
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isProposedAuditActionCategory(
    value: unknown
): value is ProposedAuditActionCategory {
    return typeof value === 'string' && ACTION_CATEGORY_SET.has(value);
}

export function isProposedAuditResourceType(value: unknown): value is ProposedAuditResourceType {
    return typeof value === 'string' && RESOURCE_TYPE_SET.has(value);
}

export function isProposedAuditOutcome(value: unknown): value is ProposedAuditOutcome {
    return typeof value === 'string' && OUTCOME_SET.has(value);
}

export function isPlatformAuditLogBackendUnavailableError(error: unknown): boolean {
    if (!(error instanceof ApiError) || error.isCancellation) {
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
 * Queries paginated, read-only platform audit log records using backend filtering and sorting.
 */
export async function listPlatformAuditLogs(
    query: ListPlatformAuditLogsQuery = {},
    signal?: AbortSignal
): Promise<PlatformAuditLogListResponse> {
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

    if (query.actor !== undefined && query.actor.trim() !== '') {
        params.actor = query.actor.trim();
    }

    if (query.actionCategory !== undefined) {
        if (!isProposedAuditActionCategory(query.actionCategory)) {
            throw new ApiError(
                `Unsupported audit action category: ${String(query.actionCategory)}.`,
                400
            );
        }
        params.actionCategory = query.actionCategory;
    }

    if (query.resourceType !== undefined) {
        if (!isProposedAuditResourceType(query.resourceType)) {
            throw new ApiError(
                `Unsupported audit resource type: ${String(query.resourceType)}.`,
                400
            );
        }
        params.resourceType = query.resourceType;
    }

    if (query.outcome !== undefined) {
        if (!isProposedAuditOutcome(query.outcome)) {
            throw new ApiError(`Unsupported audit outcome: ${String(query.outcome)}.`, 400);
        }
        params.outcome = query.outcome;
    }

    let validatedFromDate: string | undefined;
    if (query.fromDate !== undefined && query.fromDate.trim() !== '') {
        validatedFromDate = assertValidDateParam(query.fromDate, 'From date');
        params.fromDate = validatedFromDate;
    }

    let validatedToDate: string | undefined;
    if (query.toDate !== undefined && query.toDate.trim() !== '') {
        validatedToDate = assertValidDateParam(query.toDate, 'To date');
        params.toDate = validatedToDate;
    }

    if (validatedFromDate && validatedToDate && validatedFromDate > validatedToDate) {
        throw new ApiError('Start date cannot be later than end date.', 400);
    }

    const sortOrder: AuditSortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    params.sortOrder = sortOrder;

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.PLATFORM_AUDIT_LOGS.BASE, {
            params,
            signal,
        });
        return parseAuditLogListResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Fetches read-only detail for a single platform audit log entry by ID.
 */
export async function getPlatformAuditLogById(
    auditLogId: string,
    signal?: AbortSignal
): Promise<PlatformAuditLogDetailResponse> {
    if (typeof auditLogId !== 'string' || auditLogId.trim() === '') {
        throw new ApiError('Audit log ID is required.', 400);
    }

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.PLATFORM_AUDIT_LOGS.BY_ID(auditLogId.trim()),
            { signal }
        );
        return parseAuditLogDetailResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

