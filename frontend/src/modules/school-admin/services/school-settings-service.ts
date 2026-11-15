import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import type {
    SchoolAcademicOperationalDefaults,
    SchoolGeneralPreferences,
    SchoolNotificationPreferences,
    SchoolRegistrationAndEnrollmentPolicy,
    SchoolSecurityPreferences,
    SchoolSettings,
    SchoolSettingsResponse,
    SchoolSettingsUpdatedBy,
    UpdateSchoolSettingsRequest,
} from '../types/school-settings.types';

const FORBIDDEN_SETTINGS_KEYS = [
    'token',
    'secret',
    'password',
    'passwordHash',
    'storagePath',
    'diskPath',
    'accessKey',
    'privateKey',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoExposedSensitiveFields(obj: Record<string, unknown>): void {
    for (const key of FORBIDDEN_SETTINGS_KEYS) {
        if (key in obj && obj[key] !== undefined && obj[key] !== null) {
            throw new ApiError(
                'Security violation: School settings response exposed sensitive metadata.',
                502
            );
        }
    }
}

function assertMatchingTenantId(
    actualTenantId: string,
    expectedTenantId?: string | null
): void {
    if (expectedTenantId === undefined || expectedTenantId === null) return;
    if (typeof expectedTenantId !== 'string' || expectedTenantId.trim() === '') {
        throw new ApiError('Verified school tenant context is required.', 400);
    }
    if (actualTenantId !== expectedTenantId) {
        throw new ApiError(
            'Security violation: School settings response belongs to a different school tenant.',
            502
        );
    }
}

function parseOptionalNullableString(value: unknown, fieldName: string): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(`Invalid backend school settings payload: '${fieldName}' must be a string.`, 502);
    }
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function parseStrictBoolean(value: unknown, fieldName: string, defaultValue = false): boolean {
    if (value === undefined) return defaultValue;
    if (typeof value !== 'boolean') {
        throw new ApiError(`Invalid backend school settings payload: '${fieldName}' must be a boolean.`, 502);
    }
    return value;
}

function parseOptionalTimeout(value: unknown): number | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ApiError(
            "Invalid backend school settings payload: 'security.sessionTimeoutMinutes' must be a number or null.",
            502
        );
    }
    return value;
}

function parseUpdatedBy(value: unknown): SchoolSettingsUpdatedBy | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value) || typeof value.id !== 'string' || value.id.trim() === '') {
        throw new ApiError('Invalid backend school settings payload: malformed updatedBy metadata.', 502);
    }
    return {
        id: value.id,
        name: parseOptionalNullableString(value.name, 'updatedBy.name'),
        email: parseOptionalNullableString(value.email, 'updatedBy.email'),
    };
}

function parseGeneralPreferences(raw: unknown): SchoolGeneralPreferences {
    const obj = isPlainObject(raw) ? raw : {};
    return {
        defaultLanguage: parseOptionalNullableString(obj.defaultLanguage, 'general.defaultLanguage'),
        timezone: parseOptionalNullableString(obj.timezone, 'general.timezone'),
        dateFormat: parseOptionalNullableString(obj.dateFormat, 'general.dateFormat'),
        timeFormat: parseOptionalNullableString(obj.timeFormat, 'general.timeFormat'),
        weekStartDay: parseOptionalNullableString(obj.weekStartDay, 'general.weekStartDay'),
    };
}

function parseRegistrationPolicy(raw: unknown): SchoolRegistrationAndEnrollmentPolicy {
    if (!isPlainObject(raw)) {
        return {
            allowPublicStudentRegistration: false,
            requireAdminApprovalForRegistration: true,
            allowStudentSelfEnrollment: false,
            allowPreEnrollmentProgramBrowse: true,
            allowPendingStudentPortalAccess: false,
        };
    }

    return {
        allowPublicStudentRegistration: parseStrictBoolean(
            raw.allowPublicStudentRegistration,
            'registrationPolicy.allowPublicStudentRegistration',
            false
        ),
        requireAdminApprovalForRegistration: parseStrictBoolean(
            raw.requireAdminApprovalForRegistration,
            'registrationPolicy.requireAdminApprovalForRegistration',
            true
        ),
        allowStudentSelfEnrollment: parseStrictBoolean(
            raw.allowStudentSelfEnrollment,
            'registrationPolicy.allowStudentSelfEnrollment',
            false
        ),
        allowPreEnrollmentProgramBrowse: parseStrictBoolean(
            raw.allowPreEnrollmentProgramBrowse,
            'registrationPolicy.allowPreEnrollmentProgramBrowse',
            true
        ),
        allowPendingStudentPortalAccess: parseStrictBoolean(
            raw.allowPendingStudentPortalAccess,
            'registrationPolicy.allowPendingStudentPortalAccess',
            false
        ),
    };
}

function parseNotifications(raw: unknown): SchoolNotificationPreferences {
    const obj = isPlainObject(raw) ? raw : {};
    return {
        schoolAnnouncementsEnabled: parseStrictBoolean(
            obj.schoolAnnouncementsEnabled,
            'notifications.schoolAnnouncementsEnabled',
            true
        ),
        emailNotificationsEnabled: parseStrictBoolean(
            obj.emailNotificationsEnabled,
            'notifications.emailNotificationsEnabled',
            true
        ),
        inAppNotificationsEnabled: parseStrictBoolean(
            obj.inAppNotificationsEnabled,
            'notifications.inAppNotificationsEnabled',
            true
        ),
        notifyStudentsOfAcademicAnnouncements: parseStrictBoolean(
            obj.notifyStudentsOfAcademicAnnouncements,
            'notifications.notifyStudentsOfAcademicAnnouncements',
            true
        ),
    };
}

function parseSecurity(raw: unknown): SchoolSecurityPreferences {
    const obj = isPlainObject(raw) ? raw : {};
    return {
        sessionTimeoutMinutes: parseOptionalTimeout(obj.sessionTimeoutMinutes),
        requireStrongerStaffAuth: parseStrictBoolean(
            obj.requireStrongerStaffAuth,
            'security.requireStrongerStaffAuth',
            false
        ),
    };
}

function parseAcademicDefaults(raw: unknown): SchoolAcademicOperationalDefaults {
    const obj = isPlainObject(raw) ? raw : {};
    return {
        defaultAcademicYearId: parseOptionalNullableString(
            obj.defaultAcademicYearId,
            'academicDefaults.defaultAcademicYearId'
        ),
        defaultAcademicYearName: parseOptionalNullableString(
            obj.defaultAcademicYearName,
            'academicDefaults.defaultAcademicYearName'
        ),
        defaultTermId: parseOptionalNullableString(
            obj.defaultTermId,
            'academicDefaults.defaultTermId'
        ),
        defaultTermName: parseOptionalNullableString(
            obj.defaultTermName,
            'academicDefaults.defaultTermName'
        ),
        showAcademicCalendarToStudents: parseStrictBoolean(
            obj.showAcademicCalendarToStudents,
            'academicDefaults.showAcademicCalendarToStudents',
            true
        ),
    };
}

function parseSchoolSettings(
    data: unknown,
    expectedTenantId?: string | null
): SchoolSettings {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend school settings payload.', 502);
    }
    assertNoExposedSensitiveFields(data);

    const { tenantId } = data;
    if (typeof tenantId !== 'string' || tenantId.trim() === '') {
        throw new ApiError('Invalid backend school settings payload: missing tenantId.', 502);
    }
    assertMatchingTenantId(tenantId.trim(), expectedTenantId);

    return {
        tenantId: tenantId.trim(),
        general: parseGeneralPreferences(data.general),
        registrationPolicy: parseRegistrationPolicy(data.registrationPolicy),
        notifications: parseNotifications(data.notifications),
        security: parseSecurity(data.security),
        academicDefaults: parseAcademicDefaults(data.academicDefaults),
        updatedAt: parseOptionalNullableString(data.updatedAt, 'updatedAt'),
        updatedBy: parseUpdatedBy(data.updatedBy),
    };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isSchoolSettingsBackendUnavailableError(error: unknown): boolean {
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
 * Retrieves the authenticated school tenant's operational settings (`GET /school/settings`).
 */
export async function getSchoolSettings(
    expectedTenantId?: string | null,
    signal?: AbortSignal
): Promise<SchoolSettingsResponse> {
    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.SCHOOL_SETTINGS.BASE, {
            signal,
        });
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Backend school settings endpoint returned an unexpected response.', 502);
        }

        const candidate = 'settings' in payload ? payload.settings : payload;
        return {
            settings: parseSchoolSettings(candidate, expectedTenantId),
            ...(typeof payload.message === 'string' && payload.message.trim() !== ''
                ? { message: payload.message }
                : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Persists school operational settings (`PUT /school/settings`).
 * Note: Client does NOT pass tenantId in the body as authorization; backend derives tenant strictly
 * from the authenticated school session and verified domain host context.
 */
export async function updateSchoolSettings(
    request: UpdateSchoolSettingsRequest,
    expectedTenantId?: string | null
): Promise<SchoolSettingsResponse> {
    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.SCHOOL_SETTINGS.BASE,
            request
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend school settings update response.', 502);
        }

        const candidate = 'settings' in payload ? payload.settings : payload;
        return {
            settings: parseSchoolSettings(candidate, expectedTenantId),
            ...(typeof payload.message === 'string' && payload.message.trim() !== ''
                ? { message: payload.message }
                : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

