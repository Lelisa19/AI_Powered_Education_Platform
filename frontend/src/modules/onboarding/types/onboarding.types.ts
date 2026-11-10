import type { PaginatedResponse } from '../../../types/api.types';
import type { ManagedDomain } from '../../domains/types/domain-management.types';
import type { ManagedTenant } from '../../tenants/types/tenant-management.types';

/**
 * Proposed school onboarding workflow stages pending backend confirmation.
 */
export type ProposedOnboardingStage =
    | 'SCHOOL_PROVISIONED'
    | 'DOMAIN_CONFIGURATION'
    | 'PRIMARY_ADMIN_INVITATION'
    | 'PRIMARY_ADMIN_ACTIVATION'
    | 'GUIDED_SCHOOL_SETUP'
    | 'READY_FOR_LAUNCH';

export const PROPOSED_ONBOARDING_STAGES: readonly ProposedOnboardingStage[] = [
    'SCHOOL_PROVISIONED',
    'DOMAIN_CONFIGURATION',
    'PRIMARY_ADMIN_INVITATION',
    'PRIMARY_ADMIN_ACTIVATION',
    'GUIDED_SCHOOL_SETUP',
    'READY_FOR_LAUNCH',
];

/**
 * Proposed per-stage completion status values pending backend confirmation.
 */
export type ProposedOnboardingStageStatus =
    | 'COMPLETED'
    | 'IN_PROGRESS'
    | 'PENDING'
    | 'BLOCKED';

/**
 * Proposed overall school onboarding status values pending backend confirmation.
 */
export type ProposedOnboardingStatus =
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'AWAITING_ACTIVATION'
    | 'READY_FOR_LAUNCH'
    | 'LAUNCHED';

export const PROPOSED_ONBOARDING_STATUSES: readonly ProposedOnboardingStatus[] = [
    'NOT_STARTED',
    'IN_PROGRESS',
    'AWAITING_ACTIVATION',
    'READY_FOR_LAUNCH',
    'LAUNCHED',
];

/**
 * Proposed Primary School Admin invitation status values pending backend confirmation.
 */
export type ProposedPrimaryAdminInvitationStatus =
    | 'NOT_SENT'
    | 'PENDING'
    | 'ACCEPTED'
    | 'EXPIRED'
    | 'REVOKED';

export const PROPOSED_PRIMARY_ADMIN_INVITATION_STATUSES: readonly ProposedPrimaryAdminInvitationStatus[] =
    ['NOT_SENT', 'PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'];

export interface OnboardingStageProgress {
    stage: ProposedOnboardingStage | (string & {});
    label?: string | null;
    status: ProposedOnboardingStageStatus | (string & {});
    completedAt?: string | null;
    details?: string | null;
}

/**
 * Backend-reported progress for Stage 5 (Guided School Setup).
 * Displayed read-only in Platform Admin onboarding views; actual setup happens later in School Admin.
 */
export interface GuidedSetupSummary {
    schoolInfoCompleted?: boolean;
    brandingCompleted?: boolean;
    websiteContentCompleted?: boolean;
    initialSettingsCompleted?: boolean;
}

export interface OnboardingProgressSummary {
    completedSteps?: number | null;
    totalSteps?: number | null;
    percentage?: number | null;
    stages: OnboardingStageProgress[];
    guidedSetup?: GuidedSetupSummary | null;
}

/**
 * Primary School Admin invitation metadata (never holds raw tokens or passwords).
 */
export interface PrimarySchoolAdminInvitation {
    id: string;
    tenantId: ManagedTenant['id'];
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    status: ProposedPrimaryAdminInvitationStatus | (string & {});
    expiresAt?: string | null;
    sentAt?: string | null;
    acceptedAt?: string | null;
    revokedAt?: string | null;
}

/**
 * Proposed composite onboarding view integrating Tenant, Domain, Progress, and Invitation state.
 * Pending backend API contract confirmation.
 */
export interface SchoolOnboardingRecord {
    tenant: ManagedTenant;
    primaryDomain?: ManagedDomain | null;
    onboardingStatus: ProposedOnboardingStatus | (string & {});
    currentStage: ProposedOnboardingStage | (string & {});
    isReadyToLaunch: boolean;
    progress: OnboardingProgressSummary;
    primaryAdminInvitation?: PrimarySchoolAdminInvitation | null;
    updatedAt?: string | null;
}

export interface ListOnboardingRecordsQuery {
    page?: number;
    limit?: number;
    search?: string;
    onboardingStatus?: ProposedOnboardingStatus;
    currentStage?: ProposedOnboardingStage;
}

export type OnboardingListResponse = PaginatedResponse<SchoolOnboardingRecord>;

export interface OnboardingDetailResponse {
    record: SchoolOnboardingRecord;
}

export interface InvitePrimarySchoolAdminRequest {
    tenantId: ManagedTenant['id'];
    email: string;
    firstName?: string;
    lastName?: string;
}

export interface PrimaryAdminInvitationResponse {
    invitation: PrimarySchoolAdminInvitation;
    record?: SchoolOnboardingRecord | null;
    deliveryChannel?: 'EMAIL' | (string & {});
    message?: string;
}

export interface PrimaryAdminInvitationStatusResponse {
    invitation: PrimarySchoolAdminInvitation | null;
}

export interface ResendPrimaryAdminInvitationRequest {
    tenantId: ManagedTenant['id'];
    invitationId: string;
}

export interface RevokePrimaryAdminInvitationRequest {
    tenantId: ManagedTenant['id'];
    invitationId: string;
    reason?: string;
}

