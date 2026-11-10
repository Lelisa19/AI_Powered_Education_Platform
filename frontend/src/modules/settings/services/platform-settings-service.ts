import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import { validatePlatformSettingsForm } from '../schemas/platform-settings-schema';
import type {
    GeneralPlatformInformationSettings,
    PlatformDefaultSettings,
    PlatformOperationalSettings,
    PlatformSettings,
    PlatformSettingsResponse,
    PlatformSettingsUpdatedBy,
    UpdatePlatformSettingsRequest,
} from '../types/platform-settings.types';

/**
 * Security & authorization invariants for Platform Settings:
 * 1. Backend must enforce `PLATFORM_ADMIN` authentication and `platform.settings.manage`.
 * 2. Platform settings endpoints must never store or expose infrastructure secrets,
 *    database credentials, API keys, passwords, or private signing tokens.
 * 3. Platform settings must never alter Super Admin identity (`isSuperAdmin`) or
 *    administrator permission restrictions.
 */

const FORBIDDEN_SECRET_KEYS = [
    'apiKey',
    'secret',
    'secretKey',
    'privateKey',
    'signingKey',
    'webhookSecret',
    'databaseUrl',
    'dbPassword',
    'smtpPassword',
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoExposedSecretFields(obj: Record<string, unknown>): void {
    for (const key of FORBIDDEN_SECRET_KEYS) {
        if (key in obj && obj[key] !== undefined && obj[key] !== null) {
            throw new ApiError(
                'Security violation: Platform settings response must not expose secrets, API keys, or credentials.',
                502
            );
        }
    }
}

function parseNullableString(value: unknown, fieldName: string): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(
            `Invalid backend platform settings payload: '${fieldName}' must be a string or null.`,
            502
        );
    }
    return value;
}

function parseRequiredString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
        throw new ApiError(
            `Invalid backend platform settings payload: '${fieldName}' must be a string.`,
            502
        );
    }
    return value;
}

function parseGeneralSection(value: unknown): GeneralPlatformInformationSettings {
    if (!isPlainObject(value)) {
        throw new ApiError(
            'Invalid backend platform settings payload: missing or malformed general section.',
            502
        );
    }
    assertNoExposedSecretFields(value);

    return {
        platformDisplayName: parseRequiredString(
            value.platformDisplayName,
            'general.platformDisplayName'
        ),
        supportContactEmail: parseRequiredString(
            value.supportContactEmail,
            'general.supportContactEmail'
        ),
        supportContactInfo: parseNullableString(
            value.supportContactInfo,
            'general.supportContactInfo'
        ),
        publicWebsiteUrl: parseNullableString(value.publicWebsiteUrl, 'general.publicWebsiteUrl'),
        publicWebsiteDescription: parseNullableString(
            value.publicWebsiteDescription,
            'general.publicWebsiteDescription'
        ),
    };
}

function parseDefaultsSection(value: unknown): PlatformDefaultSettings {
    if (value === undefined || value === null) {
        return {
            defaultTimezone: null,
            defaultLocale: null,
        };
    }

    if (!isPlainObject(value)) {
        throw new ApiError(
            'Invalid backend platform settings payload: malformed defaults section.',
            502
        );
    }
    assertNoExposedSecretFields(value);

    return {
        defaultTimezone: parseNullableString(value.defaultTimezone, 'defaults.defaultTimezone'),
        defaultLocale: parseNullableString(value.defaultLocale, 'defaults.defaultLocale'),
    };
}

function parseOperationalSection(value: unknown): PlatformOperationalSettings {
    if (!isPlainObject(value)) {
        throw new ApiError(
            'Invalid backend platform settings payload: missing or malformed operational section.',
            502
        );
    }
    assertNoExposedSecretFields(value);

    if (typeof value.maintenanceModeEnabled !== 'boolean') {
        throw new ApiError(
            "Invalid backend platform settings payload: 'operational.maintenanceModeEnabled' must be a boolean.",
            502
        );
    }

    return {
        maintenanceModeEnabled: value.maintenanceModeEnabled,
        maintenanceNotice: parseNullableString(
            value.maintenanceNotice,
            'operational.maintenanceNotice'
        ),
    };
}

function parseUpdatedBy(value: unknown): PlatformSettingsUpdatedBy | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value) || typeof value.id !== 'string' || value.id.trim() === '') {
        throw new ApiError(
            'Invalid backend platform settings payload: malformed updatedBy metadata.',
            502
        );
    }
    assertNoExposedSecretFields(value);

    return {
        id: value.id,
        email: parseNullableString(value.email, 'updatedBy.email'),
        name: parseNullableString(value.name, 'updatedBy.name'),
    };
}

function parsePlatformSettings(data: unknown): PlatformSettings {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend platform settings endpoint returned an unexpected or unavailable response.',
            502
        );
    }
    assertNoExposedSecretFields(data);

    return {
        general: parseGeneralSection(data.general),
        defaults: parseDefaultsSection(data.defaults),
        operational: parseOperationalSection(data.operational),
        updatedAt: parseNullableString(data.updatedAt, 'updatedAt'),
        updatedBy: parseUpdatedBy(data.updatedBy),
    };
}

function parsePlatformSettingsResponse(data: unknown): PlatformSettingsResponse {
    if (!isPlainObject(data)) {
        throw new ApiError(
            'Backend platform settings endpoint returned an unexpected or unavailable response.',
            502
        );
    }
    assertNoExposedSecretFields(data);

    const candidate = 'settings' in data ? data.settings : data;
    const settings = parsePlatformSettings(candidate);
    const message =
        typeof data.message === 'string' && data.message.trim() !== '' ? data.message : undefined;

    return {
        settings,
        ...(message ? { message } : {}),
    };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isPlatformSettingsBackendUnavailableError(error: unknown): boolean {
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

export async function getPlatformSettings(signal?: AbortSignal): Promise<PlatformSettingsResponse> {
    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.PLATFORM_SETTINGS.BASE, {
            signal,
        });
        return parsePlatformSettingsResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updatePlatformSettings(
    request: UpdatePlatformSettingsRequest
): Promise<PlatformSettingsResponse> {
    const validation = validatePlatformSettingsForm({
        platformDisplayName: request.general.platformDisplayName,
        supportContactEmail: request.general.supportContactEmail,
        supportContactInfo: request.general.supportContactInfo ?? '',
        publicWebsiteUrl: request.general.publicWebsiteUrl ?? '',
        publicWebsiteDescription: request.general.publicWebsiteDescription ?? '',
        defaultTimezone: request.defaults.defaultTimezone ?? '',
        defaultLocale: request.defaults.defaultLocale ?? '',
        maintenanceModeEnabled: request.operational.maintenanceModeEnabled,
        maintenanceNotice: request.operational.maintenanceNotice ?? '',
    });

    if (!validation.valid) {
        const firstMessage =
            Object.values(validation.fieldErrors)[0] ?? 'Please fix the highlighted settings errors.';
        throw new ApiError(firstMessage, 400);
    }

    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.PLATFORM_SETTINGS.BASE,
            validation.payload
        );
        return parsePlatformSettingsResponse(response.data);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

