import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import { parseAuthenticatedUser, type Permission } from '../../../types/auth';
import type { PaginationMeta } from '../../../types/api.types';
import {
    SCHOOL_STAFF_ACCOUNT_STATUSES,
    SCHOOL_STAFF_INVITATION_STATUSES,
    SCHOOL_STAFF_ROLES,
    type ActivateSchoolStaffInvitationRequest,
    type ActivateSchoolStaffInvitationResponse,
    type CreateSchoolStaffInvitationRequest,
    type CreateSchoolStaffInvitationResponse,
    type ListSchoolStaffAccountsQuery,
    type ListSchoolStaffInvitationsQuery,
    type ResendSchoolStaffInvitationRequest,
    type RevokeSchoolStaffInvitationRequest,
    type SchoolStaffAccount,
    type SchoolStaffAccountDetailResponse,
    type SchoolStaffAccountListResponse,
    type SchoolStaffAccountStatus,
    type SchoolStaffInvitation,
    type SchoolStaffInvitationListResponse,
    type SchoolStaffInvitationMutationResponse,
    type SchoolStaffInvitationStatus,
    type SchoolStaffRole,
    type SchoolStaffServiceContract,
    type UpdateSchoolStaffAccountStatusRequest,
    type UpdateSchoolStaffAccountStatusResponse,
    type ValidateSchoolStaffInvitationRequest,
    type ValidateSchoolStaffInvitationResponse,
} from '../types/school-staff.types';

const STAFF_ROLE_SET = new Set<string>(SCHOOL_STAFF_ROLES);
const STAFF_ACCOUNT_STATUS_SET = new Set<string>(SCHOOL_STAFF_ACCOUNT_STATUSES);
const STAFF_INVITATION_STATUS_SET = new Set<string>(SCHOOL_STAFF_INVITATION_STATUSES);

const FORBIDDEN_SECRET_KEYS = [
    'token',
    'invitationToken',
    'activationToken',
    'rawToken',
    'password',
    'passwordHash',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoExposedSecretFields(obj: Record<string, unknown>): void {
    for (const key of FORBIDDEN_SECRET_KEYS) {
        if (key in obj && obj[key] !== undefined && obj[key] !== null) {
            throw new ApiError(
                'Security violation: School staff response must not expose raw invitation tokens or credentials.',
                502
            );
        }
    }
}

function assertNonEmptyString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new ApiError(`${fieldName} is required.`, 400);
    }
    return value.trim();
}

function assertValidEmail(value: unknown): string {
    const trimmed = assertNonEmptyString(value, 'Email address');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        throw new ApiError('A valid staff email address is required.', 400);
    }
    return trimmed;
}

function assertValidTokenInput(value: unknown): string {
    if (typeof value !== 'string' || value.trim() === '' || /\s/.test(value.trim())) {
        throw new ApiError('A valid invitation link is required.', 400);
    }
    return value.trim();
}

function assertMatchingTenantId(
    actualTenantId: string,
    expectedTenantId?: string | null,
    contextLabel = 'school staff response'
): void {
    if (expectedTenantId === undefined || expectedTenantId === null) {
        return;
    }
    if (typeof expectedTenantId !== 'string' || expectedTenantId.trim() === '') {
        throw new ApiError('Verified school tenant context is required.', 400);
    }
    if (actualTenantId !== expectedTenantId) {
        throw new ApiError(
            `Security violation: ${contextLabel} belongs to a different school tenant.`,
            502
        );
    }
}

function parseOptionalNullableString(value: unknown, fieldName: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(`Invalid backend payload: '${fieldName}' must be a string or null.`, 502);
    }
    return value;
}

function parseOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'boolean') {
        throw new ApiError(`Invalid backend payload: '${fieldName}' must be a boolean.`, 502);
    }
    return value;
}

function parseStaffRoles(rawRoles: unknown, rawPrimaryRole?: unknown): {
    roles: SchoolStaffRole[];
    primaryRole: SchoolStaffRole;
} {
    if (!Array.isArray(rawRoles) || rawRoles.length === 0) {
        throw new ApiError('Invalid backend school staff payload: roles array is required.', 502);
    }

    const parsedRoles: SchoolStaffRole[] = [];
    const seen = new Set<string>();

    for (const item of rawRoles) {
        if (typeof item !== 'string' || !STAFF_ROLE_SET.has(item)) {
            throw new ApiError(
                'Security violation: School staff record contains an unsupported or non-staff role.',
                502
            );
        }
        if (seen.has(item)) {
            throw new ApiError('Invalid backend school staff payload: duplicate role.', 502);
        }
        seen.add(item);
        parsedRoles.push(item as SchoolStaffRole);
    }

    let primaryRole: SchoolStaffRole = parsedRoles[0];
    if (rawPrimaryRole !== undefined && rawPrimaryRole !== null) {
        if (
            typeof rawPrimaryRole !== 'string' ||
            !STAFF_ROLE_SET.has(rawPrimaryRole) ||
            !seen.has(rawPrimaryRole)
        ) {
            throw new ApiError(
                'Invalid backend school staff payload: invalid primaryRole.',
                502
            );
        }
        primaryRole = rawPrimaryRole as SchoolStaffRole;
    }

    return { roles: parsedRoles, primaryRole };
}

function parsePermissionsList(value: unknown): Permission[] {
    if (value === undefined) {
        return [];
    }
    if (
        !Array.isArray(value) ||
        !value.every((item) => typeof item === 'string' && item.trim() !== '' && !/\s/.test(item))
    ) {
        throw new ApiError('Invalid backend school staff payload: malformed permissions list.', 502);
    }
    return value;
}

function parseSchoolStaffAccount(
    data: unknown,
    expectedTenantId?: string | null
): SchoolStaffAccount {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend school staff account payload.', 502);
    }
    assertNoExposedSecretFields(data);

    const {
        id,
        tenantId,
        email,
        firstName,
        lastName,
        roles,
        primaryRole,
        status,
        isActive,
        permissions,
        phone,
        department,
        isPrimaryAdmin,
        canManageStatus,
        invitedById,
        invitedByName,
        createdAt,
        activatedAt,
        lastLoginAt,
        accountType,
    } = data;

    if (accountType !== undefined && accountType !== 'SCHOOL') {
        throw new ApiError(
            'Security violation: School staff directory cannot contain non-SCHOOL accounts.',
            502
        );
    }

    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof tenantId !== 'string' || tenantId.trim() === '' ||
        typeof email !== 'string' || email.trim() === '' ||
        typeof firstName !== 'string' || firstName.trim() === '' ||
        typeof lastName !== 'string' || lastName.trim() === '' ||
        typeof createdAt !== 'string'
    ) {
        throw new ApiError(
            'Invalid backend school staff payload: missing required identity fields.',
            502
        );
    }

    assertMatchingTenantId(tenantId, expectedTenantId, 'school staff record');

    let normalizedStatus: SchoolStaffAccountStatus;
    if (typeof status === 'string' && STAFF_ACCOUNT_STATUS_SET.has(status)) {
        normalizedStatus = status as SchoolStaffAccountStatus;
    } else if (typeof isActive === 'boolean') {
        normalizedStatus = isActive ? 'ACTIVE' : 'INACTIVE';
    } else {
        throw new ApiError('Invalid backend school staff payload: missing status/isActive.', 502);
    }

    const parsedIsActive = typeof isActive === 'boolean' ? isActive : normalizedStatus === 'ACTIVE';
    const parsedRoleInfo = parseStaffRoles(roles, primaryRole);

    return {
        id,
        tenantId,
        email,
        firstName,
        lastName,
        roles: parsedRoleInfo.roles,
        primaryRole: parsedRoleInfo.primaryRole,
        status: normalizedStatus,
        isActive: parsedIsActive,
        permissions: parsePermissionsList(permissions),
        phone: parseOptionalNullableString(phone, 'phone'),
        department: parseOptionalNullableString(department, 'department'),
        isPrimaryAdmin: parseOptionalBoolean(isPrimaryAdmin, 'isPrimaryAdmin'),
        canManageStatus: parseOptionalBoolean(canManageStatus, 'canManageStatus'),
        invitedById: parseOptionalNullableString(invitedById, 'invitedById'),
        invitedByName: parseOptionalNullableString(invitedByName, 'invitedByName'),
        createdAt,
        activatedAt: parseOptionalNullableString(activatedAt, 'activatedAt'),
        lastLoginAt: parseOptionalNullableString(lastLoginAt, 'lastLoginAt'),
    };
}

function parseSchoolStaffInvitation(
    data: unknown,
    expectedTenantId?: string | null
): SchoolStaffInvitation {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend school staff invitation payload.', 502);
    }
    assertNoExposedSecretFields(data);

    const {
        id,
        tenantId,
        email,
        firstName,
        lastName,
        phone,
        role,
        status,
        invitedById,
        invitedByName,
        createdAt,
        sentAt,
        expiresAt,
        acceptedAt,
        revokedAt,
        accountType,
    } = data;

    if (accountType !== undefined && accountType !== 'SCHOOL') {
        throw new ApiError(
            'Security violation: School staff invitation cannot apply to a non-SCHOOL account.',
            502
        );
    }

    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof tenantId !== 'string' || tenantId.trim() === '' ||
        typeof email !== 'string' || email.trim() === '' ||
        typeof role !== 'string' || !STAFF_ROLE_SET.has(role) ||
        typeof status !== 'string' || !STAFF_INVITATION_STATUS_SET.has(status) ||
        typeof createdAt !== 'string' ||
        typeof expiresAt !== 'string'
    ) {
        throw new ApiError(
            'Invalid backend school staff invitation payload: missing or invalid fields.',
            502
        );
    }

    assertMatchingTenantId(tenantId, expectedTenantId, 'school staff invitation');

    return {
        id,
        tenantId,
        email,
        firstName: parseOptionalNullableString(firstName, 'firstName'),
        lastName: parseOptionalNullableString(lastName, 'lastName'),
        phone: parseOptionalNullableString(phone, 'phone'),
        role: role as SchoolStaffRole,
        status: status as SchoolStaffInvitationStatus,
        invitedById: parseOptionalNullableString(invitedById, 'invitedById'),
        invitedByName: parseOptionalNullableString(invitedByName, 'invitedByName'),
        createdAt,
        sentAt: parseOptionalNullableString(sentAt, 'sentAt'),
        expiresAt,
        acceptedAt: parseOptionalNullableString(acceptedAt, 'acceptedAt'),
        revokedAt: parseOptionalNullableString(revokedAt, 'revokedAt'),
    };
}

function parsePaginationMeta(value: unknown, itemCount: number): PaginationMeta {
    if (!isPlainObject(value)) {
        throw new ApiError('Invalid backend school staff response: missing pagination metadata.', 502);
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
            'Invalid backend school staff response: malformed pagination metadata.',
            502
        );
    }

    return { page, limit, total, totalPages };
}

function parseValidateInvitationResponse(
    data: unknown,
    expectedTenantId?: string | null
): ValidateSchoolStaffInvitationResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend staff invitation validation endpoint returned an unexpected response.',
            502
        );
    }
    assertNoExposedSecretFields(data);

    const {
        valid,
        status,
        tenantId,
        schoolName,
        email,
        firstName,
        lastName,
        phone,
        role,
        expiresAt,
        reason,
        accountType,
    } = data;

    if (
        typeof valid !== 'boolean' ||
        typeof status !== 'string' ||
        !STAFF_INVITATION_STATUS_SET.has(status)
    ) {
        throw new ApiError(
            'Invalid backend invitation validation payload: missing valid flag or status.',
            502
        );
    }

    if (accountType !== undefined && accountType !== 'SCHOOL') {
        throw new ApiError(
            'Security violation: School staff invitation must target a SCHOOL account.',
            502
        );
    }

    if (role !== undefined && role !== null) {
        if (typeof role !== 'string' || !STAFF_ROLE_SET.has(role)) {
            throw new ApiError(
                'Security violation: Staff invitation contains an unsupported or cross-domain role.',
                502
            );
        }
    }

    if (tenantId !== undefined && tenantId !== null) {
        if (typeof tenantId !== 'string' || tenantId.trim() === '') {
            throw new ApiError('Invalid backend invitation validation payload: malformed tenantId.', 502);
        }
        assertMatchingTenantId(tenantId, expectedTenantId, 'staff invitation');
    }

    if (valid) {
        if (status !== 'PENDING') {
            throw new ApiError(
                'Invalid backend invitation validation payload: active invitations must have PENDING status.',
                502
            );
        }
        if (typeof tenantId !== 'string' || tenantId.trim() === '') {
            throw new ApiError(
                'Security violation: Verified staff invitation must identify the school tenant.',
                502
            );
        }
        if (typeof role !== 'string' || !STAFF_ROLE_SET.has(role)) {
            throw new ApiError(
                'Security violation: Verified staff invitation must specify a valid staff role.',
                502
            );
        }
    }

    return {
        valid,
        status: status as SchoolStaffInvitationStatus,
        ...(typeof tenantId === 'string' && tenantId.trim() !== '' ? { tenantId } : {}),
        schoolName: parseOptionalNullableString(schoolName, 'schoolName'),
        email: parseOptionalNullableString(email, 'email'),
        firstName: parseOptionalNullableString(firstName, 'firstName'),
        lastName: parseOptionalNullableString(lastName, 'lastName'),
        phone: parseOptionalNullableString(phone, 'phone'),
        ...(typeof role === 'string' && STAFF_ROLE_SET.has(role)
            ? { role: role as SchoolStaffRole }
            : {}),
        expiresAt: parseOptionalNullableString(expiresAt, 'expiresAt'),
        reason: parseOptionalNullableString(reason, 'reason'),
    };
}

function parseActivateInvitationResponse(
    data: unknown,
    expectedTenantId: string
): ActivateSchoolStaffInvitationResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend staff invitation activation endpoint returned an unexpected response.',
            502
        );
    }
    assertNoExposedSecretFields(data);

    if (typeof data.activated !== 'boolean' || !data.activated) {
        throw new ApiError('Staff account activation could not be verified.', 502);
    }

    const accountCandidate = 'account' in data ? data.account : data;
    let parsedAccount;
    try {
        parsedAccount = parseAuthenticatedUser(accountCandidate);
    } catch (error: unknown) {
        throw new ApiError(
            error instanceof Error
                ? error.message
                : 'Invalid staff account payload returned during activation.',
            502
        );
    }

    if (parsedAccount.accountType !== 'SCHOOL') {
        throw new ApiError(
            'Security violation: Activated staff account must have accountType SCHOOL.',
            502
        );
    }

    assertMatchingTenantId(parsedAccount.tenantId, expectedTenantId, 'activated staff account');

    const hasInvalidStaffRole = parsedAccount.roles.some((role) => !STAFF_ROLE_SET.has(role));
    if (hasInvalidStaffRole) {
        throw new ApiError(
            'Security violation: Staff invitation activation returned a non-staff role.',
            502
        );
    }

    return {
        activated: true,
        account: parsedAccount,
        message: parseOptionalNullableString(data.message, 'message'),
    };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isSchoolStaffBackendUnavailableError(error: unknown): boolean {
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

function validatePaginationQuery(page?: number, limit?: number): { page?: number; limit?: number } {
    const params: { page?: number; limit?: number } = {};

    if (page !== undefined) {
        if (!Number.isInteger(page) || page < 1) {
            throw new ApiError('Page number must be a positive integer.', 400);
        }
        params.page = page;
    }

    if (limit !== undefined) {
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
            throw new ApiError('Page size must be between 1 and 100.', 400);
        }
        params.limit = limit;
    }

    return params;
}

export async function listSchoolStaffAccounts(
    query: ListSchoolStaffAccountsQuery = {},
    expectedTenantId?: string | null,
    signal?: AbortSignal
): Promise<SchoolStaffAccountListResponse> {
    const params: Record<string, string | number> = {
        ...validatePaginationQuery(query.page, query.limit),
    };

    if (query.search !== undefined && query.search.trim() !== '') {
        params.search = query.search.trim();
    }

    if (query.role !== undefined) {
        if (!STAFF_ROLE_SET.has(query.role)) {
            throw new ApiError(`Unsupported school staff role filter: ${String(query.role)}.`, 400);
        }
        params.role = query.role;
    }

    if (query.status !== undefined) {
        if (!STAFF_ACCOUNT_STATUS_SET.has(query.status)) {
            throw new ApiError(
                `Unsupported staff account status filter: ${String(query.status)}.`,
                400
            );
        }
        params.status = query.status;
    }

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.SCHOOL_STAFF.BASE, {
            params,
            signal,
        });
        const payload = response.data;
        if (!isPlainObject(payload) || !Array.isArray(payload.items)) {
            throw new ApiError(
                'Backend school staff directory endpoint returned an unexpected response.',
                502
            );
        }

        const items = payload.items.map((item) => parseSchoolStaffAccount(item, expectedTenantId));
        const pagination = parsePaginationMeta(payload.pagination, items.length);
        return { items, pagination };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function getSchoolStaffAccountById(
    staffId: string,
    expectedTenantId?: string | null,
    signal?: AbortSignal
): Promise<SchoolStaffAccountDetailResponse> {
    const normalizedId = assertNonEmptyString(staffId, 'Staff account ID');

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.SCHOOL_STAFF.BY_ID(normalizedId),
            { signal }
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError(
                'Backend school staff detail endpoint returned an unexpected response.',
                502
            );
        }

        const candidate = 'staff' in payload ? payload.staff : payload;
        return { staff: parseSchoolStaffAccount(candidate, expectedTenantId) };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function listSchoolStaffInvitations(
    query: ListSchoolStaffInvitationsQuery = {},
    expectedTenantId?: string | null,
    signal?: AbortSignal
): Promise<SchoolStaffInvitationListResponse> {
    const params: Record<string, string | number> = {
        ...validatePaginationQuery(query.page, query.limit),
    };

    if (query.search !== undefined && query.search.trim() !== '') {
        params.search = query.search.trim();
    }

    if (query.role !== undefined) {
        if (!STAFF_ROLE_SET.has(query.role)) {
            throw new ApiError(`Unsupported staff role filter: ${String(query.role)}.`, 400);
        }
        params.role = query.role;
    }

    if (query.status !== undefined) {
        if (!STAFF_INVITATION_STATUS_SET.has(query.status)) {
            throw new ApiError(
                `Unsupported staff invitation status filter: ${String(query.status)}.`,
                400
            );
        }
        params.status = query.status;
    }

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.SCHOOL_STAFF.INVITATIONS, {
            params,
            signal,
        });
        const payload = response.data;
        if (!isPlainObject(payload) || !Array.isArray(payload.items)) {
            throw new ApiError(
                'Backend school staff invitations endpoint returned an unexpected response.',
                502
            );
        }

        const items = payload.items.map((item) => parseSchoolStaffInvitation(item, expectedTenantId));
        const pagination = parsePaginationMeta(payload.pagination, items.length);
        return { items, pagination };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function createSchoolStaffInvitation(
    request: CreateSchoolStaffInvitationRequest,
    expectedTenantId?: string | null
): Promise<CreateSchoolStaffInvitationResponse> {
    const email = assertValidEmail(request.email);
    const firstName = assertNonEmptyString(request.firstName, 'First name');
    const lastName = assertNonEmptyString(request.lastName, 'Last name');

    if (!STAFF_ROLE_SET.has(request.role)) {
        throw new ApiError('Select a valid school staff role (SCHOOL_ADMIN, TEACHER, or SCHOOL_ACCOUNTANT).', 400);
    }

    const phone = request.phone?.trim() || undefined;

    try {
        const response = await apiClient.post<unknown>(API_ENDPOINTS.SCHOOL_STAFF.INVITATIONS, {
            email,
            firstName,
            lastName,
            role: request.role,
            ...(phone ? { phone } : {}),
        });

        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend school staff invitation creation response.', 502);
        }
        assertNoExposedSecretFields(payload);

        const candidate = 'invitation' in payload ? payload.invitation : payload;
        const invitation = parseSchoolStaffInvitation(candidate, expectedTenantId);

        return {
            invitation,
            deliveryChannel: payload.deliveryChannel === 'EMAIL' ? 'EMAIL' : 'EMAIL',
            ...(typeof payload.message === 'string' && payload.message.trim() !== ''
                ? { message: payload.message }
                : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function validateSchoolStaffInvitation(
    request: ValidateSchoolStaffInvitationRequest,
    expectedTenantId?: string | null,
    signal?: AbortSignal
): Promise<ValidateSchoolStaffInvitationResponse> {
    const token = assertValidTokenInput(request.token);

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.SCHOOL_STAFF.VALIDATE_INVITATION,
            { token },
            { signal }
        );
        return parseValidateInvitationResponse(response.data, expectedTenantId);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function activateSchoolStaffInvitation(
    request: ActivateSchoolStaffInvitationRequest,
    expectedTenantId: string
): Promise<ActivateSchoolStaffInvitationResponse> {
    const verifiedTenantId = assertNonEmptyString(expectedTenantId, 'Verified school tenant');
    const token = assertValidTokenInput(request.token);
    const firstName = assertNonEmptyString(request.firstName, 'First name');
    const lastName = assertNonEmptyString(request.lastName, 'Last name');

    if (typeof request.password !== 'string' || request.password.length < 8) {
        throw new ApiError('Password must be at least 8 characters long.', 400);
    }

    const phone = request.phone?.trim() || undefined;

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.SCHOOL_STAFF.ACTIVATE_INVITATION,
            {
                token,
                firstName,
                lastName,
                password: request.password,
                ...(phone ? { phone } : {}),
            }
        );
        return parseActivateInvitationResponse(response.data, verifiedTenantId);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function resendSchoolStaffInvitation(
    request: ResendSchoolStaffInvitationRequest,
    expectedTenantId?: string | null
): Promise<SchoolStaffInvitationMutationResponse> {
    const invitationId = assertNonEmptyString(request.invitationId, 'Invitation ID');

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.SCHOOL_STAFF.RESEND_INVITATION(invitationId)
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend invitation resend response.', 502);
        }
        assertNoExposedSecretFields(payload);

        const candidate = 'invitation' in payload ? payload.invitation : payload;
        return {
            invitation: parseSchoolStaffInvitation(candidate, expectedTenantId),
            ...(typeof payload.message === 'string' && payload.message.trim() !== ''
                ? { message: payload.message }
                : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function revokeSchoolStaffInvitation(
    request: RevokeSchoolStaffInvitationRequest,
    expectedTenantId?: string | null
): Promise<SchoolStaffInvitationMutationResponse> {
    const invitationId = assertNonEmptyString(request.invitationId, 'Invitation ID');
    const reason = request.reason?.trim() || undefined;

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.SCHOOL_STAFF.REVOKE_INVITATION(invitationId),
            reason ? { reason } : undefined
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend invitation revoke response.', 502);
        }
        assertNoExposedSecretFields(payload);

        const candidate = 'invitation' in payload ? payload.invitation : payload;
        return {
            invitation: parseSchoolStaffInvitation(candidate, expectedTenantId),
            ...(typeof payload.message === 'string' && payload.message.trim() !== ''
                ? { message: payload.message }
                : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateSchoolStaffAccountStatus(
    request: UpdateSchoolStaffAccountStatusRequest,
    expectedTenantId?: string | null
): Promise<UpdateSchoolStaffAccountStatusResponse> {
    const staffId = assertNonEmptyString(request.staffId, 'Staff account ID');
    if (!STAFF_ACCOUNT_STATUS_SET.has(request.status)) {
        throw new ApiError('Invalid staff account status.', 400);
    }
    const reason = request.reason?.trim() || undefined;

    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.SCHOOL_STAFF.STATUS(staffId),
            {
                status: request.status,
                ...(reason ? { reason } : {}),
            }
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend staff account status update response.', 502);
        }
        assertNoExposedSecretFields(payload);

        const candidate = 'staff' in payload ? payload.staff : payload;
        return {
            staff: parseSchoolStaffAccount(candidate, expectedTenantId),
            ...(typeof payload.message === 'string' && payload.message.trim() !== ''
                ? { message: payload.message }
                : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export const schoolStaffService: SchoolStaffServiceContract = {
    listSchoolStaffAccounts,
    getSchoolStaffAccountById,
    listSchoolStaffInvitations,
    createSchoolStaffInvitation,
    validateSchoolStaffInvitation,
    activateSchoolStaffInvitation,
    resendSchoolStaffInvitation,
    revokeSchoolStaffInvitation,
    updateSchoolStaffAccountStatus,
};

