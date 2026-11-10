import {
    validatePlatformPermissionArray,
    type PlatformPermissionKey,
} from '../../../constants/permissions';
import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import type {
    ActivatePlatformAdminInvitationRequest,
    ActivatePlatformAdminInvitationResponse,
    CreatePlatformAdminInvitationRequest,
    CreatePlatformAdminInvitationResponse,
    PlatformAdminAccount,
    PlatformAdminInvitation,
    PlatformAdminInvitationStatus,
    PlatformAdminServiceContract,
    RevokePlatformAdminInvitationRequest,
    UpdatePlatformAdminRestrictionsRequest,
    UpdatePlatformAdminRestrictionsResponse,
    ValidatePlatformAdminInvitationRequest,
    ValidatePlatformAdminInvitationResponse,
} from '../types/platform-admin.types';

/**
 * Platform Admin identity, invitation, and permission-restriction service contracts.
 *
 * Security invariants expected of the backend implementation:
 * 1. Only a verified `PLATFORM_ADMIN` with `isSuperAdmin === true` may create/revoke invitations
 *    or modify individual administrator restrictions.
 * 2. The initial Super Admin (`isSuperAdmin: true`) cannot be restricted, deactivated, or demoted.
 * 3. Invited administrators never modify their own restrictions.
 * 4. Invitation tokens must be cryptographically random, single-use, time-limited, stored hashed
 *    on the server, delivered privately out-of-band, and never exposed in list/detail responses.
 */

const INVITATION_STATUS_SET = new Set<string>(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']);
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
                'Security violation: Platform admin response must not expose raw tokens or credentials.',
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
    const trimmed = assertNonEmptyString(value, 'Email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        throw new ApiError('A valid administrator email address is required.', 400);
    }
    return trimmed;
}

function assertValidRestrictedPermissions(
    permissions: PlatformPermissionKey[] | undefined,
    required = false
): PlatformPermissionKey[] | undefined {
    if (permissions === undefined) {
        if (required) {
            throw new ApiError('Restricted permissions list is required.', 400);
        }
        return undefined;
    }

    const result = validatePlatformPermissionArray(permissions);
    if (!result.valid) {
        if (result.reason === 'NOT_ARRAY') {
            throw new ApiError('Restricted permissions must be an array.', 400);
        }
        if (result.reason === 'DUPLICATE') {
            throw new ApiError('Restricted permissions must not contain duplicate keys.', 400);
        }
        throw new ApiError('Restricted permissions contain invalid platform permission keys.', 400);
    }

    return result.keys;
}

function parseOptionalRestrictedPermissions(
    value: unknown,
    isSuperAdmin: boolean
): PlatformPermissionKey[] | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    const result = validatePlatformPermissionArray(value);
    if (!result.valid) {
        throw new ApiError(
            'Invalid backend platform admin payload: malformed restrictedPermissions.',
            502
        );
    }

    if (isSuperAdmin && result.keys.length > 0) {
        throw new ApiError(
            'Security violation: Initial Super Admin payload must not have restricted permissions.',
            502
        );
    }

    return result.keys;
}

function parseOptionalNullableString(value: unknown, fieldName: string): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(`Invalid backend payload: '${fieldName}' must be a string or null.`, 502);
    }
    return value;
}

function parseOptionalString(value: unknown, fieldName: string): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') {
        throw new ApiError(`Invalid backend payload: '${fieldName}' must be a string.`, 502);
    }
    return value;
}

function parsePlatformAdminAccount(data: unknown): PlatformAdminAccount {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend platform admin payload.', 502);
    }
    assertNoExposedSecretFields(data);

    const {
        id,
        email,
        firstName,
        lastName,
        role,
        isSuperAdmin,
        restrictedPermissions,
        isActive,
        invitedById,
        createdAt,
        activatedAt,
    } = data;

    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof email !== 'string' || email.trim() === '' ||
        typeof firstName !== 'string' || firstName.trim() === '' ||
        typeof lastName !== 'string' || lastName.trim() === '' ||
        role !== 'PLATFORM_ADMIN' ||
        typeof isSuperAdmin !== 'boolean' ||
        typeof isActive !== 'boolean' ||
        typeof createdAt !== 'string'
    ) {
        throw new ApiError(
            'Invalid backend platform admin payload: missing or invalid identity fields.',
            502
        );
    }

    return {
        id,
        email,
        firstName,
        lastName,
        role: 'PLATFORM_ADMIN',
        isSuperAdmin,
        restrictedPermissions: parseOptionalRestrictedPermissions(restrictedPermissions, isSuperAdmin),
        isActive,
        invitedById: parseOptionalNullableString(invitedById, 'invitedById'),
        createdAt,
        activatedAt: parseOptionalNullableString(activatedAt, 'activatedAt'),
    };
}

function parsePlatformAdminInvitation(data: unknown): PlatformAdminInvitation {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend platform admin invitation payload.', 502);
    }
    assertNoExposedSecretFields(data);

    const {
        id,
        email,
        firstName,
        lastName,
        role,
        restrictedPermissions,
        status,
        invitedById,
        expiresAt,
        createdAt,
        acceptedAt,
        revokedAt,
    } = data;

    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof email !== 'string' || email.trim() === '' ||
        role !== 'PLATFORM_ADMIN' ||
        typeof status !== 'string' || !INVITATION_STATUS_SET.has(status) ||
        typeof invitedById !== 'string' || invitedById.trim() === '' ||
        typeof expiresAt !== 'string' ||
        typeof createdAt !== 'string'
    ) {
        throw new ApiError(
            'Invalid backend platform admin invitation payload: missing or invalid fields.',
            502
        );
    }

    return {
        id,
        email,
        firstName: parseOptionalString(firstName, 'firstName'),
        lastName: parseOptionalString(lastName, 'lastName'),
        role: 'PLATFORM_ADMIN',
        restrictedPermissions: parseOptionalRestrictedPermissions(restrictedPermissions, false),
        status: status as PlatformAdminInvitationStatus,
        invitedById,
        expiresAt,
        createdAt,
        acceptedAt: parseOptionalNullableString(acceptedAt, 'acceptedAt'),
        revokedAt: parseOptionalNullableString(revokedAt, 'revokedAt'),
    };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isPlatformAdminBackendUnavailableError(error: unknown): boolean {
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

export async function listPlatformAdmins(): Promise<PlatformAdminAccount[]> {
    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.PLATFORM_ADMINS.BASE);
        const payload = response.data;
        const items = Array.isArray(payload)
            ? payload
            : isPlainObject(payload) && Array.isArray(payload.items)
              ? payload.items
              : null;

        if (!items) {
            throw new ApiError(
                'Backend platform admin directory endpoint returned an unexpected response.',
                502
            );
        }

        return items.map(parsePlatformAdminAccount);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function listPlatformAdminInvitations(): Promise<PlatformAdminInvitation[]> {
    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.PLATFORM_ADMINS.INVITATIONS);
        const payload = response.data;
        const items = Array.isArray(payload)
            ? payload
            : isPlainObject(payload) && Array.isArray(payload.items)
              ? payload.items
              : null;

        if (!items) {
            throw new ApiError(
                'Backend platform admin invitations endpoint returned an unexpected response.',
                502
            );
        }

        return items.map(parsePlatformAdminInvitation);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function createPlatformAdminInvitation(
    request: CreatePlatformAdminInvitationRequest
): Promise<CreatePlatformAdminInvitationResponse> {
    const email = assertValidEmail(request.email);
    const restrictedPermissions = assertValidRestrictedPermissions(request.restrictedPermissions);

    if (
        request.expiresInHours !== undefined &&
        (typeof request.expiresInHours !== 'number' ||
            !Number.isFinite(request.expiresInHours) ||
            request.expiresInHours <= 0)
    ) {
        throw new ApiError('Invitation expiration hours must be a positive number.', 400);
    }

    const firstName = request.firstName?.trim() || undefined;
    const lastName = request.lastName?.trim() || undefined;

    try {
        const response = await apiClient.post<unknown>(API_ENDPOINTS.PLATFORM_ADMINS.INVITATIONS, {
            email,
            ...(firstName ? { firstName } : {}),
            ...(lastName ? { lastName } : {}),
            ...(restrictedPermissions !== undefined ? { restrictedPermissions } : {}),
            ...(request.expiresInHours !== undefined ? { expiresInHours: request.expiresInHours } : {}),
        });

        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend invitation creation response.', 502);
        }
        assertNoExposedSecretFields(payload);

        const invitationCandidate = 'invitation' in payload ? payload.invitation : payload;
        const invitation = parsePlatformAdminInvitation(invitationCandidate);

        return {
            invitation,
            deliveryChannel: payload.deliveryChannel === 'EMAIL' ? 'EMAIL' : 'EMAIL',
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

function assertValidInvitationTokenInput(value: unknown): string {
    if (typeof value !== 'string' || value.trim() === '' || /\s/.test(value.trim())) {
        throw new ApiError('A valid invitation link is required.', 400);
    }
    return value.trim();
}

function parseValidateInvitationResponse(data: unknown): ValidatePlatformAdminInvitationResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend invitation validation endpoint returned an unexpected response.',
            502
        );
    }
    assertNoExposedSecretFields(data);

    const { valid, status, email, firstName, lastName, expiresAt, role, reason } = data;
    if (
        typeof valid !== 'boolean' ||
        typeof status !== 'string' ||
        !INVITATION_STATUS_SET.has(status)
    ) {
        throw new ApiError(
            'Invalid backend invitation validation payload: missing valid flag or status.',
            502
        );
    }

    if (role !== undefined && role !== null && role !== 'PLATFORM_ADMIN') {
        throw new ApiError(
            'Security violation: Platform admin invitation must target the PLATFORM_ADMIN role.',
            502
        );
    }

    if ('isSuperAdmin' in data && data.isSuperAdmin === true) {
        throw new ApiError(
            'Security violation: Super Admin accounts cannot be created through invitation activation.',
            502
        );
    }

    if ('accountType' in data && data.accountType !== undefined && data.accountType !== 'PLATFORM') {
        throw new ApiError(
            'Security violation: Platform admin invitation must apply to a PLATFORM account.',
            502
        );
    }

    if ('tenantId' in data && data.tenantId !== undefined && data.tenantId !== null) {
        throw new ApiError(
            'Security violation: Platform admin invitation must not be bound to a school tenant.',
            502
        );
    }

    if (valid && status !== 'PENDING') {
        throw new ApiError(
            'Invalid backend invitation validation payload: active invitations must have PENDING status.',
            502
        );
    }

    return {
        valid,
        status: status as PlatformAdminInvitationStatus,
        email: parseOptionalString(email, 'email'),
        firstName: parseOptionalString(firstName, 'firstName'),
        lastName: parseOptionalString(lastName, 'lastName'),
        expiresAt: parseOptionalString(expiresAt, 'expiresAt'),
        role: role === 'PLATFORM_ADMIN' ? 'PLATFORM_ADMIN' : undefined,
        reason: parseOptionalString(reason, 'reason'),
    };
}

function parseActivateInvitationResponse(data: unknown): ActivatePlatformAdminInvitationResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend invitation activation endpoint returned an unexpected response.',
            502
        );
    }
    assertNoExposedSecretFields(data);

    if (typeof data.activated !== 'boolean' || !data.activated) {
        throw new ApiError(
            'Platform administrator account activation could not be verified.',
            502
        );
    }

    const accountCandidate = 'account' in data ? data.account : data;
    if (!isPlainObject(accountCandidate)) {
        throw new ApiError('Invalid backend invitation activation account payload.', 502);
    }

    if (
        'accountType' in accountCandidate &&
        accountCandidate.accountType !== undefined &&
        accountCandidate.accountType !== 'PLATFORM'
    ) {
        throw new ApiError(
            'Security violation: Activated platform administrator must have accountType PLATFORM.',
            502
        );
    }

    if (
        'tenantId' in accountCandidate &&
        accountCandidate.tenantId !== undefined &&
        accountCandidate.tenantId !== null
    ) {
        throw new ApiError(
            'Security violation: Activated platform administrator must have tenantId null.',
            502
        );
    }

    const account = parsePlatformAdminAccount(accountCandidate);
    if (account.isSuperAdmin) {
        throw new ApiError(
            'Security violation: Invited administrator activation must never create a Super Admin account.',
            502
        );
    }

    return {
        account,
        activated: true,
    };
}

export async function validatePlatformAdminInvitation(
    request: ValidatePlatformAdminInvitationRequest,
    signal?: AbortSignal
): Promise<ValidatePlatformAdminInvitationResponse> {
    const token = assertValidInvitationTokenInput(request.token);

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.PLATFORM_ADMINS.VALIDATE_INVITATION,
            { token },
            { signal }
        );
        return parseValidateInvitationResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function activatePlatformAdminInvitation(
    request: ActivatePlatformAdminInvitationRequest
): Promise<ActivatePlatformAdminInvitationResponse> {
    const token = assertValidInvitationTokenInput(request.token);
    const firstName = assertNonEmptyString(request.firstName, 'First name');
    const lastName = assertNonEmptyString(request.lastName, 'Last name');

    if (firstName.length > 100 || lastName.length > 100) {
        throw new ApiError('First name and last name must each be 100 characters or fewer.', 400);
    }

    if (typeof request.password !== 'string' || request.password.length < 8) {
        throw new ApiError('Password must be at least 8 characters long.', 400);
    }

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.PLATFORM_ADMINS.ACTIVATE_INVITATION,
            {
                token,
                firstName,
                lastName,
                password: request.password,
            }
        );
        return parseActivateInvitationResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updatePlatformAdminRestrictions(
    request: UpdatePlatformAdminRestrictionsRequest
): Promise<UpdatePlatformAdminRestrictionsResponse> {
    const adminId = assertNonEmptyString(request.adminId, 'Administrator ID');
    const restrictedPermissions = assertValidRestrictedPermissions(
        request.restrictedPermissions,
        true
    );

    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.PLATFORM_ADMINS.RESTRICTIONS(adminId),
            { restrictedPermissions }
        );

        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend restriction update response.', 502);
        }

        const adminCandidate = 'admin' in payload ? payload.admin : payload;
        return { admin: parsePlatformAdminAccount(adminCandidate) };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function revokePlatformAdminInvitation(
    request: RevokePlatformAdminInvitationRequest
): Promise<void> {
    const invitationId = assertNonEmptyString(request.invitationId, 'Invitation ID');

    try {
        await apiClient.post<unknown>(
            API_ENDPOINTS.PLATFORM_ADMINS.REVOKE_INVITATION(invitationId)
        );
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export const platformAdminService: PlatformAdminServiceContract = {
    listPlatformAdmins,
    listPlatformAdminInvitations,
    createPlatformAdminInvitation,
    validatePlatformAdminInvitation,
    activatePlatformAdminInvitation,
    updatePlatformAdminRestrictions,
    revokePlatformAdminInvitation,
};
