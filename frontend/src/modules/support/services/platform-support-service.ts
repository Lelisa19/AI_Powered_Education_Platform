import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import type { PaginationMeta } from '../../../types/api.types';
import {
    isProposedSupportTicketPriority,
    isProposedSupportTicketStatus,
    validateSupportAssigneeId,
    validateSupportReason,
    validateSupportReplyBody,
} from '../schemas/platform-support-validation';
import {
    PROPOSED_SUPPORT_TICKET_CATEGORIES,
    SUPPORT_SORT_FIELDS,
    type CreateSupportReplyRequest,
    type CreateSupportReplyResponse,
    type ListPlatformSupportTicketsQuery,
    type PlatformSupportTicket,
    type PlatformSupportTicketDetailResponse,
    type PlatformSupportTicketListResponse,
    type PlatformSupportTicketMutationResponse,
    type ProposedSupportTicketCategory,
    type SupportAssigneeSummary,
    type SupportSortField,
    type SupportSortOrder,
    type SupportTicketMessage,
    type UpdateSupportTicketAssignmentRequest,
    type UpdateSupportTicketPriorityRequest,
    type UpdateSupportTicketStatusRequest,
} from '../types/platform-support.types';

/**
 * Security & tenant-isolation invariants for Platform Support Management:
 * 1. Backend must authenticate `PLATFORM_ADMIN` callers and enforce `platform.support.manage`.
 * 2. School-facing support endpoints (implemented later) must enforce tenant isolation on the server;
 *    no browser-supplied tenantId may be trusted as authorization.
 * 3. Support payloads must never expose secrets, tokens, auth headers, or unrelated student,
 *    teacher, financial, or academic records.
 * 4. Important support mutations (replies, assignment, priority, status changes) should be audited
 *    server-side.
 */

const CATEGORY_SET = new Set<string>(PROPOSED_SUPPORT_TICKET_CATEGORIES);
const SORT_FIELD_SET = new Set<string>(SUPPORT_SORT_FIELDS);

const CREDENTIAL_PREFIX_PATTERN = /^(?:Bearer|Basic)\s+\S+/i;

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
    'apikey',
    'secret',
    'secretkey',
    'privatekey',
    'signingkey',
    'webhooksecret',
    'clientsecret',
    'encryptionkey',
    'authorization',
    'cookie',
    'setcookie',
    'headers',
    'requestheaders',
    'rawheaders',
    'credentials',
    'studentrecords',
    'students',
    'grades',
    'reportcards',
    'academicrecords',
    'invoices',
    'paymenthistory',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeKey(key: string): string {
    return key.replace(/[-_]/g, '').toLowerCase();
}

function assertNoProhibitedSupportData(value: unknown, depth = 0): void {
    if (depth > 6) return;

    if (typeof value === 'string') {
        if (CREDENTIAL_PREFIX_PATTERN.test(value.trim())) {
            throw new ApiError(
                'Security violation: Support response must not expose authorization credentials.',
                502
            );
        }
        return;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            assertNoProhibitedSupportData(item, depth + 1);
        }
        return;
    }

    if (!isPlainObject(value)) return;

    for (const [key, entryValue] of Object.entries(value)) {
        if (
            FORBIDDEN_NORMALIZED_KEYS.has(normalizeKey(key)) &&
            entryValue !== undefined &&
            entryValue !== null
        ) {
            throw new ApiError(
                'Security violation: Support response must not expose credentials, auth headers, secrets, or unrelated school records.',
                502
            );
        }
        assertNoProhibitedSupportData(entryValue, depth + 1);
    }
}

function assertNonEmptyId(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new ApiError(`${fieldName} is required.`, 400);
    }
    return value.trim();
}

function parseOptionalNullableString(value: unknown, fieldName: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(
            `Invalid backend support payload: '${fieldName}' must be a string or null.`,
            502
        );
    }
    return value;
}

function parseAssigneeSummary(value: unknown): SupportAssigneeSummary | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value) || typeof value.id !== 'string' || value.id.trim() === '') {
        throw new ApiError('Invalid backend support payload: malformed assignedAdmin.', 502);
    }
    assertNoProhibitedSupportData(value);

    return {
        id: value.id.trim(),
        name: parseOptionalNullableString(value.name, 'assignedAdmin.name'),
        email: parseOptionalNullableString(value.email, 'assignedAdmin.email'),
    };
}

function parseSupportMessage(data: unknown, index: number): SupportTicketMessage {
    if (!isPlainObject(data)) {
        throw new ApiError(
            `Invalid backend support payload: messages[${index}] is malformed.`,
            502
        );
    }
    assertNoProhibitedSupportData(data);

    const { id, ticketId, authorType, authorId, authorName, authorRoleLabel, body, createdAt } = data;
    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof ticketId !== 'string' || ticketId.trim() === '' ||
        typeof authorType !== 'string' || authorType.trim() === '' ||
        typeof body !== 'string' ||
        typeof createdAt !== 'string' || createdAt.trim() === ''
    ) {
        throw new ApiError(
            `Invalid backend support payload: messages[${index}] missing required fields.`,
            502
        );
    }

    return {
        id: id.trim(),
        ticketId: ticketId.trim(),
        authorType: authorType.trim(),
        authorId: parseOptionalNullableString(authorId, `messages[${index}].authorId`),
        authorName: parseOptionalNullableString(authorName, `messages[${index}].authorName`),
        authorRoleLabel: parseOptionalNullableString(
            authorRoleLabel,
            `messages[${index}].authorRoleLabel`
        ),
        body,
        createdAt: createdAt.trim(),
    };
}

function parseSupportTicket(data: unknown): PlatformSupportTicket {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend support ticket payload.', 502);
    }
    assertNoProhibitedSupportData(data);

    const {
        id,
        referenceNumber,
        tenantId,
        schoolName,
        schoolSlug,
        subject,
        description,
        category,
        priority,
        status,
        assignedAdmin,
        submittedByName,
        submittedByEmail,
        createdAt,
        updatedAt,
        closedAt,
        messages,
    } = data;

    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof referenceNumber !== 'string' || referenceNumber.trim() === '' ||
        typeof tenantId !== 'string' || tenantId.trim() === '' ||
        typeof subject !== 'string' || subject.trim() === '' ||
        typeof category !== 'string' || category.trim() === '' ||
        typeof priority !== 'string' || priority.trim() === '' ||
        typeof status !== 'string' || status.trim() === '' ||
        typeof createdAt !== 'string' || createdAt.trim() === '' ||
        typeof updatedAt !== 'string' || updatedAt.trim() === ''
    ) {
        throw new ApiError(
            'Invalid backend support ticket payload: missing required ticket fields.',
            502
        );
    }

    let parsedMessages: SupportTicketMessage[] | null | undefined;
    if (messages === undefined) {
        parsedMessages = undefined;
    } else if (messages === null) {
        parsedMessages = null;
    } else if (!Array.isArray(messages)) {
        throw new ApiError('Invalid backend support payload: ticket.messages must be an array.', 502);
    } else {
        parsedMessages = messages.map(parseSupportMessage);
    }

    return {
        id: id.trim(),
        referenceNumber: referenceNumber.trim(),
        tenantId: tenantId.trim(),
        schoolName: parseOptionalNullableString(schoolName, 'schoolName'),
        schoolSlug: parseOptionalNullableString(schoolSlug, 'schoolSlug'),
        subject: subject.trim(),
        description: parseOptionalNullableString(description, 'description'),
        category: category.trim(),
        priority: priority.trim(),
        status: status.trim(),
        assignedAdmin: parseAssigneeSummary(assignedAdmin),
        submittedByName: parseOptionalNullableString(submittedByName, 'submittedByName'),
        submittedByEmail: parseOptionalNullableString(submittedByEmail, 'submittedByEmail'),
        createdAt: createdAt.trim(),
        updatedAt: updatedAt.trim(),
        closedAt: parseOptionalNullableString(closedAt, 'closedAt'),
        messages: parsedMessages,
    };
}

function parsePaginationMeta(value: unknown, itemCount: number): PaginationMeta {
    if (!isPlainObject(value)) {
        throw new ApiError(
            'Invalid backend support ticket list response: missing pagination metadata.',
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
            'Invalid backend support ticket list response: malformed pagination metadata.',
            502
        );
    }

    return { page, limit, total, totalPages };
}

function parseSupportTicketListResponse(data: unknown): PlatformSupportTicketListResponse {
    if (!isPlainObject(data) || !Array.isArray(data.items)) {
        throw new ApiError(
            'Backend support ticket directory endpoint returned an unexpected or unavailable response.',
            502
        );
    }
    assertNoProhibitedSupportData(data);

    const items = data.items.map(parseSupportTicket);
    const pagination = parsePaginationMeta(data.pagination, items.length);

    return { items, pagination };
}

function parseSupportTicketDetailResponse(data: unknown): PlatformSupportTicketDetailResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend support ticket detail endpoint returned an unexpected or unavailable response.',
            502
        );
    }
    assertNoProhibitedSupportData(data);

    const ticketCandidate = 'ticket' in data ? data.ticket : data;
    const ticket = parseSupportTicket(ticketCandidate);

    let topLevelMessages: SupportTicketMessage[] | undefined;
    if ('messages' in data && data.messages !== undefined && data.messages !== null) {
        if (!Array.isArray(data.messages)) {
            throw new ApiError(
                'Invalid backend support detail payload: messages must be an array.',
                502
            );
        }
        topLevelMessages = data.messages.map(parseSupportMessage);
    }

    return {
        ticket,
        ...(topLevelMessages !== undefined ? { messages: topLevelMessages } : {}),
    };
}

function parseCreateReplyResponse(data: unknown): CreateSupportReplyResponse {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend support reply response.', 502);
    }
    assertNoProhibitedSupportData(data);

    const messageCandidate = 'message' in data ? data.message : data;
    const message = parseSupportMessage(messageCandidate, 0);
    const ticket =
        'ticket' in data && data.ticket !== undefined && data.ticket !== null
            ? parseSupportTicket(data.ticket)
            : undefined;

    return {
        message,
        ...(ticket ? { ticket } : {}),
    };
}

function parseMutationResponse(data: unknown): PlatformSupportTicketMutationResponse {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend support ticket update response.', 502);
    }
    assertNoProhibitedSupportData(data);

    const ticketCandidate = 'ticket' in data ? data.ticket : data;
    const ticket = parseSupportTicket(ticketCandidate);
    const message =
        typeof data.message === 'string' && data.message.trim() !== '' ? data.message : undefined;

    return {
        ticket,
        ...(message ? { message } : {}),
    };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isProposedSupportTicketCategory(
    value: unknown
): value is ProposedSupportTicketCategory {
    return typeof value === 'string' && CATEGORY_SET.has(value);
}

export function isSupportSortField(value: unknown): value is SupportSortField {
    return typeof value === 'string' && SORT_FIELD_SET.has(value);
}

export function isPlatformSupportBackendUnavailableError(error: unknown): boolean {
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

export async function listSupportTickets(
    query: ListPlatformSupportTicketsQuery = {},
    signal?: AbortSignal
): Promise<PlatformSupportTicketListResponse> {
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
        if (!isProposedSupportTicketStatus(query.status)) {
            throw new ApiError(`Unsupported support status filter: ${String(query.status)}.`, 400);
        }
        params.status = query.status;
    }

    if (query.priority !== undefined) {
        if (!isProposedSupportTicketPriority(query.priority)) {
            throw new ApiError(
                `Unsupported support priority filter: ${String(query.priority)}.`,
                400
            );
        }
        params.priority = query.priority;
    }

    if (query.category !== undefined) {
        if (!isProposedSupportTicketCategory(query.category)) {
            throw new ApiError(
                `Unsupported support category filter: ${String(query.category)}.`,
                400
            );
        }
        params.category = query.category;
    }

    if (query.tenantId !== undefined && query.tenantId.trim() !== '') {
        params.tenantId = query.tenantId.trim();
    }

    if (query.sortBy !== undefined) {
        if (!isSupportSortField(query.sortBy)) {
            throw new ApiError(`Unsupported sort field: ${String(query.sortBy)}.`, 400);
        }
        params.sortBy = query.sortBy;
    }

    const sortOrder: SupportSortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    params.sortOrder = sortOrder;

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.PLATFORM_SUPPORT.TICKETS, {
            params,
            signal,
        });
        return parseSupportTicketListResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function getSupportTicketById(
    ticketId: string,
    signal?: AbortSignal
): Promise<PlatformSupportTicketDetailResponse> {
    const normalizedId = assertNonEmptyId(ticketId, 'Support ticket ID');

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.PLATFORM_SUPPORT.TICKET_BY_ID(normalizedId),
            { signal }
        );
        return parseSupportTicketDetailResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function replyToSupportTicket(
    request: CreateSupportReplyRequest
): Promise<CreateSupportReplyResponse> {
    const ticketId = assertNonEmptyId(request.ticketId, 'Support ticket ID');
    const bodyCheck = validateSupportReplyBody(request.body);
    if (!bodyCheck.valid) {
        throw new ApiError(bodyCheck.error, 400);
    }

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.PLATFORM_SUPPORT.TICKET_MESSAGES(ticketId),
            { body: bodyCheck.body }
        );
        return parseCreateReplyResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateSupportTicketStatus(
    request: UpdateSupportTicketStatusRequest
): Promise<PlatformSupportTicketMutationResponse> {
    const ticketId = assertNonEmptyId(request.ticketId, 'Support ticket ID');
    if (!isProposedSupportTicketStatus(request.status)) {
        throw new ApiError(`Unsupported support ticket status: ${String(request.status)}.`, 400);
    }

    const reasonCheck = validateSupportReason(request.reason);
    if (!reasonCheck.valid) {
        throw new ApiError(reasonCheck.error, 400);
    }

    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.PLATFORM_SUPPORT.TICKET_STATUS(ticketId),
            {
                status: request.status,
                ...(reasonCheck.reason ? { reason: reasonCheck.reason } : {}),
            }
        );
        return parseMutationResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateSupportTicketPriority(
    request: UpdateSupportTicketPriorityRequest
): Promise<PlatformSupportTicketMutationResponse> {
    const ticketId = assertNonEmptyId(request.ticketId, 'Support ticket ID');
    if (!isProposedSupportTicketPriority(request.priority)) {
        throw new ApiError(
            `Unsupported support ticket priority: ${String(request.priority)}.`,
            400
        );
    }

    const reasonCheck = validateSupportReason(request.reason);
    if (!reasonCheck.valid) {
        throw new ApiError(reasonCheck.error, 400);
    }

    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.PLATFORM_SUPPORT.TICKET_PRIORITY(ticketId),
            {
                priority: request.priority,
                ...(reasonCheck.reason ? { reason: reasonCheck.reason } : {}),
            }
        );
        return parseMutationResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateSupportTicketAssignment(
    request: UpdateSupportTicketAssignmentRequest
): Promise<PlatformSupportTicketMutationResponse> {
    const ticketId = assertNonEmptyId(request.ticketId, 'Support ticket ID');
    const assigneeCheck = validateSupportAssigneeId(request.assigneeId);
    if (!assigneeCheck.valid) {
        throw new ApiError(assigneeCheck.error, 400);
    }

    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.PLATFORM_SUPPORT.TICKET_ASSIGNMENT(ticketId),
            { assigneeId: assigneeCheck.assigneeId }
        );
        return parseMutationResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

