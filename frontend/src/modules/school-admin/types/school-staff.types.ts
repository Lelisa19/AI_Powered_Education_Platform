import type { PaginatedResponse } from '../../../types/api.types';
import type { Permission, SchoolAuthenticatedUser } from '../../../types/auth';

export type SchoolStaffRole = 'SCHOOL_ADMIN' | 'TEACHER' | 'SCHOOL_ACCOUNTANT';

export const SCHOOL_STAFF_ROLES: readonly SchoolStaffRole[] = [
    'SCHOOL_ADMIN',
    'TEACHER',
    'SCHOOL_ACCOUNTANT',
];

export type SchoolStaffAccountStatus = 'ACTIVE' | 'INACTIVE';

export const SCHOOL_STAFF_ACCOUNT_STATUSES: readonly SchoolStaffAccountStatus[] = [
    'ACTIVE',
    'INACTIVE',
];

export type SchoolStaffInvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export const SCHOOL_STAFF_INVITATION_STATUSES: readonly SchoolStaffInvitationStatus[] = [
    'PENDING',
    'ACCEPTED',
    'EXPIRED',
    'REVOKED',
];

export type StaffDirectoryStatusFilter =
    | 'ALL'
    | SchoolStaffAccountStatus
    | 'PENDING'
    | 'REVOKED'
    | 'EXPIRED'
    | 'ACCEPTED';

export interface SchoolStaffAccount {
    id: string;
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: SchoolStaffRole[];
    primaryRole: SchoolStaffRole;
    status: SchoolStaffAccountStatus;
    isActive: boolean;
    permissions: Permission[];
    phone?: string | null;
    department?: string | null;
    /** Optional informational flag reported by backend; frontend does not assume authority without backend rules. */
    isPrimaryAdmin?: boolean;
    /** Optional backend-reported lifecycle mutability hint; absence never grants override permissions. */
    canManageStatus?: boolean;
    invitedById?: string | null;
    invitedByName?: string | null;
    createdAt: string;
    activatedAt?: string | null;
    lastLoginAt?: string | null;
}

export interface SchoolStaffInvitation {
    id: string;
    tenantId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    role: SchoolStaffRole;
    status: SchoolStaffInvitationStatus;
    invitedById?: string | null;
    invitedByName?: string | null;
    createdAt: string;
    sentAt?: string | null;
    expiresAt: string;
    acceptedAt?: string | null;
    revokedAt?: string | null;
}

export interface ListSchoolStaffAccountsQuery {
    page?: number;
    limit?: number;
    search?: string;
    role?: SchoolStaffRole;
    status?: SchoolStaffAccountStatus;
}

export interface ListSchoolStaffInvitationsQuery {
    page?: number;
    limit?: number;
    search?: string;
    role?: SchoolStaffRole;
    status?: SchoolStaffInvitationStatus;
}

export type SchoolStaffAccountListResponse = PaginatedResponse<SchoolStaffAccount>;
export type SchoolStaffInvitationListResponse = PaginatedResponse<SchoolStaffInvitation>;

export interface SchoolStaffAccountDetailResponse {
    staff: SchoolStaffAccount;
}

export interface CreateSchoolStaffInvitationRequest {
    email: string;
    firstName: string;
    lastName: string;
    role: SchoolStaffRole;
    phone?: string;
}

export interface CreateSchoolStaffInvitationResponse {
    invitation: SchoolStaffInvitation;
    deliveryChannel?: 'EMAIL' | (string & {});
    message?: string;
}

export interface ValidateSchoolStaffInvitationRequest {
    token: string;
}

export interface ValidateSchoolStaffInvitationResponse {
    valid: boolean;
    status: SchoolStaffInvitationStatus;
    tenantId?: string;
    schoolName?: string | null;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    role?: SchoolStaffRole;
    expiresAt?: string | null;
    reason?: string | null;
}

export interface ActivateSchoolStaffInvitationRequest {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
    phone?: string;
}

export interface ActivateSchoolStaffInvitationResponse {
    activated: boolean;
    account: SchoolAuthenticatedUser;
    message?: string | null;
}

export interface ResendSchoolStaffInvitationRequest {
    invitationId: string;
}

export interface RevokeSchoolStaffInvitationRequest {
    invitationId: string;
    reason?: string;
}

export interface SchoolStaffInvitationMutationResponse {
    invitation: SchoolStaffInvitation;
    message?: string;
}

export interface UpdateSchoolStaffAccountStatusRequest {
    staffId: string;
    status: SchoolStaffAccountStatus;
    reason?: string;
}

export interface UpdateSchoolStaffAccountStatusResponse {
    staff: SchoolStaffAccount;
    message?: string;
}

export interface SchoolStaffServiceContract {
    listSchoolStaffAccounts: (
        query?: ListSchoolStaffAccountsQuery,
        expectedTenantId?: string | null,
        signal?: AbortSignal
    ) => Promise<SchoolStaffAccountListResponse>;
    getSchoolStaffAccountById: (
        staffId: string,
        expectedTenantId?: string | null,
        signal?: AbortSignal
    ) => Promise<SchoolStaffAccountDetailResponse>;
    listSchoolStaffInvitations: (
        query?: ListSchoolStaffInvitationsQuery,
        expectedTenantId?: string | null,
        signal?: AbortSignal
    ) => Promise<SchoolStaffInvitationListResponse>;
    createSchoolStaffInvitation: (
        request: CreateSchoolStaffInvitationRequest,
        expectedTenantId?: string | null
    ) => Promise<CreateSchoolStaffInvitationResponse>;
    validateSchoolStaffInvitation: (
        request: ValidateSchoolStaffInvitationRequest,
        expectedTenantId?: string | null,
        signal?: AbortSignal
    ) => Promise<ValidateSchoolStaffInvitationResponse>;
    activateSchoolStaffInvitation: (
        request: ActivateSchoolStaffInvitationRequest,
        expectedTenantId: string
    ) => Promise<ActivateSchoolStaffInvitationResponse>;
    resendSchoolStaffInvitation: (
        request: ResendSchoolStaffInvitationRequest,
        expectedTenantId?: string | null
    ) => Promise<SchoolStaffInvitationMutationResponse>;
    revokeSchoolStaffInvitation: (
        request: RevokeSchoolStaffInvitationRequest,
        expectedTenantId?: string | null
    ) => Promise<SchoolStaffInvitationMutationResponse>;
    updateSchoolStaffAccountStatus: (
        request: UpdateSchoolStaffAccountStatusRequest,
        expectedTenantId?: string | null
    ) => Promise<UpdateSchoolStaffAccountStatusResponse>;
}

