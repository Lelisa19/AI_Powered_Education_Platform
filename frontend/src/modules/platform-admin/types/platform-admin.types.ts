import type { PlatformPermissionKey } from '../../../constants/permissions';
import type { PlatformRole } from '../../../types/auth';

export type PlatformAdminInvitationStatus =
    | 'PENDING'
    | 'ACCEPTED'
    | 'EXPIRED'
    | 'REVOKED';

export interface PlatformAdminAccount {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: PlatformRole;
    isSuperAdmin: boolean;
    /** Omitted or empty means no restrictions; platform admins receive all platform permissions by default. */
    restrictedPermissions?: PlatformPermissionKey[];
    isActive: boolean;
    invitedById: string | null;
    createdAt: string;
    activatedAt: string | null;
}

export interface PlatformAdminInvitation {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: PlatformRole;
    /** Omitted or empty means no restrictions when the invited administrator activates their account. */
    restrictedPermissions?: PlatformPermissionKey[];
    status: PlatformAdminInvitationStatus;
    invitedById: string;
    expiresAt: string;
    createdAt: string;
    acceptedAt: string | null;
    revokedAt: string | null;
}

export interface CreatePlatformAdminInvitationRequest {
    email: string;
    firstName?: string;
    lastName?: string;
    restrictedPermissions?: PlatformPermissionKey[];
    expiresInHours?: number;
}

export interface CreatePlatformAdminInvitationResponse {
    invitation: PlatformAdminInvitation;
    deliveryChannel: 'EMAIL';
}

export interface ValidatePlatformAdminInvitationRequest {
    token: string;
}

export interface ValidatePlatformAdminInvitationResponse {
    valid: boolean;
    status: PlatformAdminInvitationStatus;
    email?: string;
    firstName?: string;
    lastName?: string;
    expiresAt?: string;
    role?: PlatformRole;
    reason?: string;
}

export interface ActivatePlatformAdminInvitationRequest {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
}

export interface ActivatePlatformAdminInvitationResponse {
    account: PlatformAdminAccount;
    activated: boolean;
}

export interface UpdatePlatformAdminRestrictionsRequest {
    adminId: string;
    restrictedPermissions: PlatformPermissionKey[];
}

export interface UpdatePlatformAdminRestrictionsResponse {
    admin: PlatformAdminAccount;
}

export interface RevokePlatformAdminInvitationRequest {
    invitationId: string;
}

export interface PlatformAdminServiceContract {
    listPlatformAdmins: () => Promise<PlatformAdminAccount[]>;
    listPlatformAdminInvitations: () => Promise<PlatformAdminInvitation[]>;
    createPlatformAdminInvitation: (
        request: CreatePlatformAdminInvitationRequest
    ) => Promise<CreatePlatformAdminInvitationResponse>;
    validatePlatformAdminInvitation: (
        request: ValidatePlatformAdminInvitationRequest,
        signal?: AbortSignal
    ) => Promise<ValidatePlatformAdminInvitationResponse>;
    activatePlatformAdminInvitation: (
        request: ActivatePlatformAdminInvitationRequest
    ) => Promise<ActivatePlatformAdminInvitationResponse>;
    updatePlatformAdminRestrictions: (
        request: UpdatePlatformAdminRestrictionsRequest
    ) => Promise<UpdatePlatformAdminRestrictionsResponse>;
    revokePlatformAdminInvitation: (
        request: RevokePlatformAdminInvitationRequest
    ) => Promise<void>;
}
