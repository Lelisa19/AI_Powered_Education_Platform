import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import type { PaginationMeta } from '../../../types/api.types';
import type { ManagedDomain } from '../../domains/types/domain-management.types';
import type { ManagedTenant } from '../../tenants/types/tenant-management.types';
import {
    PROPOSED_ONBOARDING_STAGES,
    PROPOSED_ONBOARDING_STATUSES,
    type GuidedSetupSummary,
    type InvitePrimarySchoolAdminRequest,
    type ListOnboardingRecordsQuery,
    type OnboardingDetailResponse,
    type OnboardingListResponse,
    type OnboardingProgressSummary,
    type OnboardingStageProgress,
    type PrimaryAdminInvitationResponse,
    type PrimaryAdminInvitationStatusResponse,
    type PrimarySchoolAdminInvitation,
    type ProposedOnboardingStage,
    type ProposedOnboardingStatus,
    type ResendPrimaryAdminInvitationRequest,
    type RevokePrimaryAdminInvitationRequest,
    type SchoolOnboardingRecord,
} from '../types/onboarding.types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ONBOARDING_STATUS_SET = new Set<string>(PROPOSED_ONBOARDING_STATUSES);
const ONBOARDING_STAGE_SET = new Set<string>(PROPOSED_ONBOARDING_STAGES);

const FORBIDDEN_SECRET_KEYS = [
    'token',
    'invitationToken',
    'activationToken',
    'rawToken',
    'password',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoExposedSecretFields(obj: Record<string, unknown>): void {
    for (const key of FORBIDDEN_SECRET_KEYS) {
        if (key in obj && obj[key] !== undefined && obj[key] !== null) {
            throw new ApiError(
                'Security violation: Onboarding API response must not expose raw invitation tokens or credentials.',
                502
            );
        }
    }
}

function assertNonEmptyTrimmed(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new ApiError(`${fieldName} is required.`, 400);
    }
    return value.trim();
}

export function isProposedOnboardingStatus(value: unknown): value is ProposedOnboardingStatus {
    return typeof value === 'string' && ONBOARDING_STATUS_SET.has(value);
}

export function isProposedOnboardingStage(value: unknown): value is ProposedOnboardingStage {
    return typeof value === 'string' && ONBOARDING_STAGE_SET.has(value);
}

export function validatePrimaryAdminInvitationInput(
    request: InvitePrimarySchoolAdminRequest
): InvitePrimarySchoolAdminRequest {
    const tenantId = assertNonEmptyTrimmed(request.tenantId, 'School tenant');
    const email = assertNonEmptyTrimmed(request.email, 'Primary School Admin email');

    if (!EMAIL_PATTERN.test(email)) {
        throw new ApiError('Please enter a valid Primary School Admin email address.', 400);
    }

    const firstName = request.firstName?.trim() || undefined;
    const lastName = request.lastName?.trim() || undefined;

    return {
        tenantId,
        email,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
    };
}

function parseOptionalString(value: unknown, fieldName: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(`Invalid backend onboarding payload: '${fieldName}' must be a string.`, 502);
    }
    return value;
}

function parseOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'boolean') {
        throw new ApiError(
            `Invalid backend onboarding payload: '${fieldName}' must be a boolean.`,
            502
        );
    }
    return value;
}

function parseOptionalNumber(value: unknown, fieldName: string): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ApiError(`Invalid backend onboarding payload: '${fieldName}' must be a number.`, 502);
    }
    return value;
}

function parseTenantSummary(data: unknown): ManagedTenant {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend onboarding payload: missing tenant object.', 502);
    }

    const { id, name, slug, status, primaryDomain, contactEmail, createdAt, updatedAt } = data;
    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof name !== 'string' || name.trim() === '' ||
        typeof slug !== 'string' || slug.trim() === '' ||
        typeof status !== 'string' || status.trim() === ''
    ) {
        throw new ApiError('Invalid backend onboarding payload: malformed tenant fields.', 502);
    }

    return {
        id,
        name,
        slug,
        status,
        primaryDomain: parseOptionalString(primaryDomain, 'tenant.primaryDomain'),
        contactEmail: parseOptionalString(contactEmail, 'tenant.contactEmail'),
        createdAt: parseOptionalString(createdAt, 'tenant.createdAt'),
        updatedAt: parseOptionalString(updatedAt, 'tenant.updatedAt'),
    };
}

function parsePrimaryDomainSummary(data: unknown): ManagedDomain | null | undefined {
    if (data === undefined) return undefined;
    if (data === null) return null;
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend onboarding payload: malformed primaryDomain object.', 502);
    }

    const { id, hostname, tenantId, verificationStatus, status, isPrimary, createdAt, lastVerifiedAt } =
        data;
    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof hostname !== 'string' || hostname.trim() === '' ||
        typeof tenantId !== 'string' || tenantId.trim() === '' ||
        typeof verificationStatus !== 'string' || verificationStatus.trim() === ''
    ) {
        throw new ApiError('Invalid backend onboarding payload: malformed primaryDomain fields.', 502);
    }

    return {
        id,
        hostname,
        tenantId,
        verificationStatus,
        status: parseOptionalString(status, 'primaryDomain.status') ?? undefined,
        isPrimary: typeof isPrimary === 'boolean' ? isPrimary : true,
        createdAt: parseOptionalString(createdAt, 'primaryDomain.createdAt'),
        lastVerifiedAt: parseOptionalString(lastVerifiedAt, 'primaryDomain.lastVerifiedAt'),
    };
}

function parseStageProgress(item: unknown): OnboardingStageProgress {
    if (!isPlainObject(item)) {
        throw new ApiError('Invalid backend onboarding payload: malformed stage progress entry.', 502);
    }

    const { stage, label, status, completedAt, details } = item;
    if (
        typeof stage !== 'string' || stage.trim() === '' ||
        typeof status !== 'string' || status.trim() === ''
    ) {
        throw new ApiError('Invalid backend onboarding payload: missing stage or status.', 502);
    }

    return {
        stage,
        label: parseOptionalString(label, 'stage.label'),
        status,
        completedAt: parseOptionalString(completedAt, 'stage.completedAt'),
        details: parseOptionalString(details, 'stage.details'),
    };
}

function parseGuidedSetup(value: unknown): GuidedSetupSummary | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value)) {
        throw new ApiError('Invalid backend onboarding payload: malformed guidedSetup object.', 502);
    }

    return {
        schoolInfoCompleted: parseOptionalBoolean(
            value.schoolInfoCompleted,
            'guidedSetup.schoolInfoCompleted'
        ),
        brandingCompleted: parseOptionalBoolean(
            value.brandingCompleted,
            'guidedSetup.brandingCompleted'
        ),
        websiteContentCompleted: parseOptionalBoolean(
            value.websiteContentCompleted,
            'guidedSetup.websiteContentCompleted'
        ),
        initialSettingsCompleted: parseOptionalBoolean(
            value.initialSettingsCompleted,
            'guidedSetup.initialSettingsCompleted'
        ),
    };
}

function parseProgressSummary(data: unknown): OnboardingProgressSummary {
    if (!isPlainObject(data) || !Array.isArray(data.stages)) {
        throw new ApiError('Invalid backend onboarding payload: malformed progress summary.', 502);
    }

    return {
        completedSteps: parseOptionalNumber(data.completedSteps, 'progress.completedSteps'),
        totalSteps: parseOptionalNumber(data.totalSteps, 'progress.totalSteps'),
        percentage: parseOptionalNumber(data.percentage, 'progress.percentage'),
        stages: data.stages.map(parseStageProgress),
        guidedSetup: parseGuidedSetup(data.guidedSetup),
    };
}

function parsePrimaryAdminInvitation(data: unknown): PrimarySchoolAdminInvitation {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend invitation payload.', 502);
    }
    assertNoExposedSecretFields(data);

    const { id, tenantId, email, firstName, lastName, status, expiresAt, sentAt, acceptedAt, revokedAt } =
        data;

    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof tenantId !== 'string' || tenantId.trim() === '' ||
        typeof email !== 'string' || email.trim() === '' ||
        typeof status !== 'string' || status.trim() === ''
    ) {
        throw new ApiError('Invalid backend invitation payload: missing required fields.', 502);
    }

    return {
        id,
        tenantId,
        email,
        firstName: parseOptionalString(firstName, 'invitation.firstName'),
        lastName: parseOptionalString(lastName, 'invitation.lastName'),
        status,
        expiresAt: parseOptionalString(expiresAt, 'invitation.expiresAt'),
        sentAt: parseOptionalString(sentAt, 'invitation.sentAt'),
        acceptedAt: parseOptionalString(acceptedAt, 'invitation.acceptedAt'),
        revokedAt: parseOptionalString(revokedAt, 'invitation.revokedAt'),
    };
}

function parseSchoolOnboardingRecord(data: unknown): SchoolOnboardingRecord {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend onboarding record payload.', 502);
    }
    assertNoExposedSecretFields(data);

    const {
        tenant,
        primaryDomain,
        onboardingStatus,
        currentStage,
        isReadyToLaunch,
        progress,
        primaryAdminInvitation,
        updatedAt,
    } = data;

    if (
        typeof onboardingStatus !== 'string' || onboardingStatus.trim() === '' ||
        typeof currentStage !== 'string' || currentStage.trim() === '' ||
        typeof isReadyToLaunch !== 'boolean'
    ) {
        throw new ApiError(
            'Invalid backend onboarding record: missing onboardingStatus, currentStage, or isReadyToLaunch.',
            502
        );
    }

    let parsedInvitation: PrimarySchoolAdminInvitation | null | undefined;
    if (primaryAdminInvitation === undefined) {
        parsedInvitation = undefined;
    } else if (primaryAdminInvitation === null) {
        parsedInvitation = null;
    } else {
        parsedInvitation = parsePrimaryAdminInvitation(primaryAdminInvitation);
    }

    return {
        tenant: parseTenantSummary(tenant),
        primaryDomain: parsePrimaryDomainSummary(primaryDomain),
        onboardingStatus,
        currentStage,
        isReadyToLaunch,
        progress: parseProgressSummary(progress),
        primaryAdminInvitation: parsedInvitation,
        updatedAt: parseOptionalString(updatedAt, 'updatedAt'),
    };
}

function parsePaginationMeta(value: unknown, itemCount: number): PaginationMeta {
    if (!isPlainObject(value)) {
        throw new ApiError(
            'Invalid backend onboarding list response: missing pagination metadata.',
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
            'Invalid backend onboarding list response: malformed pagination metadata.',
            502
        );
    }

    return { page, limit, total, totalPages };
}

function parseOnboardingListResponse(data: unknown): OnboardingListResponse {
    if (!isPlainObject(data) || !Array.isArray(data.items)) {
        throw new ApiError(
            'Backend onboarding directory endpoint returned an unexpected or unavailable response.',
            502
        );
    }

    const items = data.items.map(parseSchoolOnboardingRecord);
    const pagination = parsePaginationMeta(data.pagination, items.length);

    return { items, pagination };
}

function parseOnboardingDetailResponse(data: unknown): OnboardingDetailResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend onboarding detail endpoint returned an unexpected or unavailable response.',
            502
        );
    }

    const recordCandidate = 'record' in data ? data.record : data;
    return { record: parseSchoolOnboardingRecord(recordCandidate) };
}

function parseInvitationResponse(data: unknown): PrimaryAdminInvitationResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend invitation endpoint returned an unexpected or unavailable response.',
            502
        );
    }
    assertNoExposedSecretFields(data);

    const invitationCandidate = 'invitation' in data ? data.invitation : data;
    const invitation = parsePrimaryAdminInvitation(invitationCandidate);

    const record =
        data.record === undefined || data.record === null
            ? (data.record as null | undefined)
            : parseSchoolOnboardingRecord(data.record);

    const deliveryChannel =
        typeof data.deliveryChannel === 'string' && data.deliveryChannel.trim() !== ''
            ? data.deliveryChannel
            : undefined;
    const message =
        typeof data.message === 'string' && data.message.trim() !== '' ? data.message : undefined;

    return {
        invitation,
        ...(record !== undefined ? { record } : {}),
        ...(deliveryChannel ? { deliveryChannel } : {}),
        ...(message ? { message } : {}),
    };
}

function parseInvitationStatusResponse(data: unknown): PrimaryAdminInvitationStatusResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend invitation status endpoint returned an unexpected or unavailable response.',
            502
        );
    }
    assertNoExposedSecretFields(data);

    if (data.invitation === null) {
        return { invitation: null };
    }

    const invitationCandidate = 'invitation' in data ? data.invitation : data;
    return { invitation: parsePrimaryAdminInvitation(invitationCandidate) };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isOnboardingBackendUnavailableError(error: unknown): boolean {
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

export async function listOnboardingRecords(
    query: ListOnboardingRecordsQuery = {}
): Promise<OnboardingListResponse> {
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

    if (query.onboardingStatus !== undefined) {
        if (!isProposedOnboardingStatus(query.onboardingStatus)) {
            throw new ApiError(
                `Unsupported onboarding status filter: ${String(query.onboardingStatus)}.`,
                400
            );
        }
        params.onboardingStatus = query.onboardingStatus;
    }

    if (query.currentStage !== undefined) {
        if (!isProposedOnboardingStage(query.currentStage)) {
            throw new ApiError(
                `Unsupported onboarding stage filter: ${String(query.currentStage)}.`,
                400
            );
        }
        params.currentStage = query.currentStage;
    }

    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.ONBOARDING.BASE, { params });
        return parseOnboardingListResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function getOnboardingByTenantId(tenantId: string): Promise<OnboardingDetailResponse> {
    const normalizedId = assertNonEmptyTrimmed(tenantId, 'Tenant ID');

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.ONBOARDING.BY_TENANT_ID(normalizedId)
        );
        return parseOnboardingDetailResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function invitePrimarySchoolAdmin(
    request: InvitePrimarySchoolAdminRequest
): Promise<PrimaryAdminInvitationResponse> {
    const validated = validatePrimaryAdminInvitationInput(request);

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.ONBOARDING.INVITATIONS(validated.tenantId),
            {
                email: validated.email,
                ...(validated.firstName ? { firstName: validated.firstName } : {}),
                ...(validated.lastName ? { lastName: validated.lastName } : {}),
            }
        );
        return parseInvitationResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function getPrimaryAdminInvitationStatus(
    tenantId: string
): Promise<PrimaryAdminInvitationStatusResponse> {
    const normalizedId = assertNonEmptyTrimmed(tenantId, 'Tenant ID');

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.ONBOARDING.INVITATIONS(normalizedId)
        );
        return parseInvitationStatusResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function resendPrimaryAdminInvitation(
    request: ResendPrimaryAdminInvitationRequest
): Promise<PrimaryAdminInvitationResponse> {
    const tenantId = assertNonEmptyTrimmed(request.tenantId, 'Tenant ID');
    const invitationId = assertNonEmptyTrimmed(request.invitationId, 'Invitation ID');

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.ONBOARDING.RESEND_INVITATION(tenantId, invitationId)
        );
        return parseInvitationResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function revokePrimaryAdminInvitation(
    request: RevokePrimaryAdminInvitationRequest
): Promise<PrimaryAdminInvitationResponse> {
    const tenantId = assertNonEmptyTrimmed(request.tenantId, 'Tenant ID');
    const invitationId = assertNonEmptyTrimmed(request.invitationId, 'Invitation ID');
    const reason = request.reason?.trim() || undefined;

    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.ONBOARDING.REVOKE_INVITATION(tenantId, invitationId),
            reason ? { reason } : undefined
        );
        return parseInvitationResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

