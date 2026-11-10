import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import type {
    DomainOperationalMetrics,
    OnboardingOperationalMetrics,
    PlatformAdministratorOperationalMetrics,
    PlatformAttentionNotice,
    PlatformDashboardSummary,
    PlatformDashboardSummaryResponse,
    TenantOperationalMetrics,
} from '../types/platform-dashboard.types';

/**
 * Security & contract invariants for the Platform Dashboard Summary API:
 * 1. Backend must enforce `PLATFORM_ADMIN` authentication and return only metrics
 *    for areas the caller has effective permission to view (omitting/nulling restricted sections).
 * 2. Summary payloads are strictly aggregate counts and operational notices; they must never
 *    expose school-private educational data, credentials, or raw invitation tokens.
 */

const FORBIDDEN_SECRET_KEYS = [
    'token',
    'invitationToken',
    'activationToken',
    'rawToken',
    'password',
    'passwordHash',
] as const;

const RECOGNIZED_SUMMARY_KEYS = [
    'tenants',
    'domains',
    'onboarding',
    'administrators',
    'attentionNotices',
    'generatedAt',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoExposedSecretFields(obj: Record<string, unknown>): void {
    for (const key of FORBIDDEN_SECRET_KEYS) {
        if (key in obj && obj[key] !== undefined && obj[key] !== null) {
            throw new ApiError(
                'Security violation: Platform dashboard summary must not expose tokens or credentials.',
                502
            );
        }
    }
}

function parseNullableMetricCount(value: unknown, fieldName: string): number | null {
    if (value === undefined || value === null) {
        return null;
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        throw new ApiError(
            `Invalid backend dashboard summary payload: '${fieldName}' must be a non-negative integer or null.`,
            502
        );
    }
    return value;
}

function parseOptionalNullableString(value: unknown, fieldName: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(
            `Invalid backend dashboard summary payload: '${fieldName}' must be a string or null.`,
            502
        );
    }
    return value;
}

function parseTenantMetrics(value: unknown): TenantOperationalMetrics | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value)) {
        throw new ApiError(
            'Invalid backend dashboard summary payload: malformed tenants metrics section.',
            502
        );
    }
    assertNoExposedSecretFields(value);

    return {
        total: parseNullableMetricCount(value.total, 'tenants.total'),
        active: parseNullableMetricCount(value.active, 'tenants.active'),
        pendingOrInactive: parseNullableMetricCount(
            value.pendingOrInactive,
            'tenants.pendingOrInactive'
        ),
        ...(value.suspended !== undefined
            ? { suspended: parseNullableMetricCount(value.suspended, 'tenants.suspended') }
            : {}),
    };
}

function parseDomainMetrics(value: unknown): DomainOperationalMetrics | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value)) {
        throw new ApiError(
            'Invalid backend dashboard summary payload: malformed domains metrics section.',
            502
        );
    }
    assertNoExposedSecretFields(value);

    return {
        total: parseNullableMetricCount(value.total, 'domains.total'),
        verified: parseNullableMetricCount(value.verified, 'domains.verified'),
        pendingVerification: parseNullableMetricCount(
            value.pendingVerification,
            'domains.pendingVerification'
        ),
        failedVerification: parseNullableMetricCount(
            value.failedVerification,
            'domains.failedVerification'
        ),
    };
}

function parseOnboardingMetrics(value: unknown): OnboardingOperationalMetrics | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value)) {
        throw new ApiError(
            'Invalid backend dashboard summary payload: malformed onboarding metrics section.',
            502
        );
    }
    assertNoExposedSecretFields(value);

    return {
        total: parseNullableMetricCount(value.total, 'onboarding.total'),
        inProgress: parseNullableMetricCount(value.inProgress, 'onboarding.inProgress'),
        completed: parseNullableMetricCount(value.completed, 'onboarding.completed'),
        ...(value.blocked !== undefined
            ? { blocked: parseNullableMetricCount(value.blocked, 'onboarding.blocked') }
            : {}),
    };
}

function parseAdministratorMetrics(
    value: unknown
): PlatformAdministratorOperationalMetrics | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value)) {
        throw new ApiError(
            'Invalid backend dashboard summary payload: malformed administrators metrics section.',
            502
        );
    }
    assertNoExposedSecretFields(value);

    return {
        total: parseNullableMetricCount(value.total, 'administrators.total'),
        active: parseNullableMetricCount(value.active, 'administrators.active'),
        pendingInvitations: parseNullableMetricCount(
            value.pendingInvitations,
            'administrators.pendingInvitations'
        ),
    };
}

function parseAttentionNotice(value: unknown, index: number): PlatformAttentionNotice {
    if (!isPlainObject(value)) {
        throw new ApiError(
            `Invalid backend dashboard summary payload: attentionNotices[${index}] is malformed.`,
            502
        );
    }
    assertNoExposedSecretFields(value);

    const { id, category, title, description, count, severity } = value;
    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof category !== 'string' || category.trim() === '' ||
        typeof title !== 'string' || title.trim() === ''
    ) {
        throw new ApiError(
            `Invalid backend dashboard summary payload: attentionNotices[${index}] missing id, category, or title.`,
            502
        );
    }

    return {
        id: id.trim(),
        category: category.trim(),
        title: title.trim(),
        description: parseOptionalNullableString(
            description,
            `attentionNotices[${index}].description`
        ),
        ...(count !== undefined
            ? { count: parseNullableMetricCount(count, `attentionNotices[${index}].count`) }
            : {}),
        severity:
            parseOptionalNullableString(severity, `attentionNotices[${index}].severity`) ??
            undefined,
    };
}

function parseAttentionNotices(value: unknown): PlatformAttentionNotice[] | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!Array.isArray(value)) {
        throw new ApiError(
            'Invalid backend dashboard summary payload: attentionNotices must be an array or null.',
            502
        );
    }

    return value.map(parseAttentionNotice);
}

function parseDashboardSummaryResponse(data: unknown): PlatformDashboardSummaryResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend platform dashboard summary endpoint returned an unexpected or unavailable response.',
            502
        );
    }
    assertNoExposedSecretFields(data);

    const summaryCandidate = 'summary' in data ? data.summary : data;
    if (!isPlainObject(summaryCandidate)) {
        throw new ApiError(
            'Backend platform dashboard summary endpoint returned an unexpected response.',
            502
        );
    }
    assertNoExposedSecretFields(summaryCandidate);

    const hasRecognizedKey = RECOGNIZED_SUMMARY_KEYS.some((key) => key in summaryCandidate);
    if (!hasRecognizedKey) {
        throw new ApiError(
            'Backend platform dashboard summary endpoint returned an unrecognized payload structure.',
            502
        );
    }

    const summary: PlatformDashboardSummary = {
        tenants: parseTenantMetrics(summaryCandidate.tenants),
        domains: parseDomainMetrics(summaryCandidate.domains),
        onboarding: parseOnboardingMetrics(summaryCandidate.onboarding),
        administrators: parseAdministratorMetrics(summaryCandidate.administrators),
        attentionNotices: parseAttentionNotices(summaryCandidate.attentionNotices),
        generatedAt: parseOptionalNullableString(summaryCandidate.generatedAt, 'generatedAt'),
    };

    return { summary };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isPlatformDashboardBackendUnavailableError(error: unknown): boolean {
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
 * Fetches aggregate platform-level operational metrics and permission-scoped attention notices.
 * Fails closed when the summary endpoint is unavailable or returns unexpected payloads.
 */
export async function getPlatformDashboardSummary(
    signal?: AbortSignal
): Promise<PlatformDashboardSummaryResponse> {
    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.PLATFORM_DASHBOARD.SUMMARY, {
            signal,
        });
        return parseDashboardSummaryResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}
