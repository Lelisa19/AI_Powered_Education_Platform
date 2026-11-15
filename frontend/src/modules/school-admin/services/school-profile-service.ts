import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import { uploadFile } from '../../../services/api/upload-client';
import { DEFAULT_SCHOOL_BRANDING } from '../../../types/school.types';
import { sanitizeBrandHexColor, sanitizeSchoolAssetUrl } from '../../../utils/branding';
import {
    validateBrandAssetFile,
    validateSchoolBrandingColors,
    validateSchoolProfileForm,
    toSchoolProfileFormValues,
} from '../schemas/school-profile-schema';
import type {
    SchoolBrandingRecord,
    SchoolBrandingResponse,
    SchoolProfile,
    SchoolProfileResponse,
    SchoolProfileUpdatedBy,
    UpdateSchoolBrandingRequest,
    UpdateSchoolProfileRequest,
    UploadBrandAssetResponse,
} from '../types/school-profile.types';

const FORBIDDEN_INTERNAL_UPLOAD_KEYS = [
    'storagePath',
    'diskPath',
    'localPath',
    'filePath',
    'bucket',
    'objectKey',
    's3Key',
    'token',
    'signedToken',
    'secret',
    'password',
    'accessKey',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoExposedSensitiveFields(obj: Record<string, unknown>): void {
    for (const key of FORBIDDEN_INTERNAL_UPLOAD_KEYS) {
        if (key in obj && obj[key] !== undefined && obj[key] !== null) {
            throw new ApiError(
                'Security violation: School profile/branding response exposed sensitive or internal storage metadata.',
                502
            );
        }
    }
}

function assertMatchingTenantId(
    actualTenantId: string,
    expectedTenantId?: string | null,
    contextLabel = 'school profile response'
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

function parseOptionalString(value: unknown, fieldName: string): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') {
        throw new ApiError(`Invalid backend payload: '${fieldName}' must be a string.`, 502);
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
}

function parseOptionalNullableString(value: unknown, fieldName: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(`Invalid backend payload: '${fieldName}' must be a string or null.`, 502);
    }
    return value;
}

function parseUpdatedBy(value: unknown): SchoolProfileUpdatedBy | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value) || typeof value.id !== 'string' || value.id.trim() === '') {
        throw new ApiError('Invalid backend payload: malformed updatedBy metadata.', 502);
    }
    return {
        id: value.id,
        name: parseOptionalNullableString(value.name, 'updatedBy.name'),
        email: parseOptionalNullableString(value.email, 'updatedBy.email'),
    };
}

function parseSchoolProfile(data: unknown, expectedTenantId?: string | null): SchoolProfile {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend school profile payload.', 502);
    }
    assertNoExposedSensitiveFields(data);

    const { tenantId, identity, schoolType, description, contact, updatedAt, updatedBy } = data;
    if (typeof tenantId !== 'string' || tenantId.trim() === '') {
        throw new ApiError('Invalid backend school profile payload: missing tenantId.', 502);
    }
    assertMatchingTenantId(tenantId, expectedTenantId, 'school profile');

    if (!isPlainObject(identity) || typeof identity.name !== 'string' || identity.name.trim() === '') {
        throw new ApiError('Invalid backend school profile payload: missing school name.', 502);
    }

    if (typeof schoolType !== 'string' || schoolType.trim() === '') {
        throw new ApiError('Invalid backend school profile payload: missing schoolType.', 502);
    }

    if (typeof description !== 'string') {
        throw new ApiError('Invalid backend school profile payload: missing description.', 502);
    }

    if (!isPlainObject(contact) || typeof contact.email !== 'string' || contact.email.trim() === '') {
        throw new ApiError('Invalid backend school profile payload: missing contact email.', 502);
    }

    return {
        tenantId,
        identity: {
            name: identity.name.trim(),
        },
        schoolType: schoolType.trim(),
        description,
        contact: {
            email: contact.email.trim(),
            phone: parseOptionalString(contact.phone, 'contact.phone'),
            website: parseOptionalString(contact.website, 'contact.website'),
            address: parseOptionalString(contact.address, 'contact.address'),
            city: parseOptionalString(contact.city, 'contact.city'),
            country: parseOptionalString(contact.country, 'contact.country'),
        },
        updatedAt: parseOptionalNullableString(updatedAt, 'updatedAt'),
        updatedBy: parseUpdatedBy(updatedBy),
    };
}

function parseSchoolBrandingRecord(
    data: unknown,
    expectedTenantId?: string | null
): SchoolBrandingRecord {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend school branding payload.', 502);
    }
    assertNoExposedSensitiveFields(data);

    const { tenantId, logoUrl, faviconUrl, branding, updatedAt, updatedBy } = data;
    if (typeof tenantId !== 'string' || tenantId.trim() === '') {
        throw new ApiError('Invalid backend school branding payload: missing tenantId.', 502);
    }
    assertMatchingTenantId(tenantId, expectedTenantId, 'school branding');

    const rawBranding = isPlainObject(branding) ? branding : {};
    const primaryColor =
        sanitizeBrandHexColor(rawBranding.primaryColor) ?? DEFAULT_SCHOOL_BRANDING.primaryColor;
    const secondaryColor =
        sanitizeBrandHexColor(rawBranding.secondaryColor) ??
        DEFAULT_SCHOOL_BRANDING.secondaryColor;

    return {
        tenantId,
        logoUrl: sanitizeSchoolAssetUrl(logoUrl),
        faviconUrl: sanitizeSchoolAssetUrl(faviconUrl),
        branding: {
            primaryColor,
            secondaryColor,
        },
        updatedAt: parseOptionalNullableString(updatedAt, 'updatedAt'),
        updatedBy: parseUpdatedBy(updatedBy),
    };
}

function parseUploadAssetResponse(
    data: unknown,
    expectedTenantId?: string | null
): UploadBrandAssetResponse {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend upload response payload.', 502);
    }
    assertNoExposedSensitiveFields(data);

    if (typeof data.tenantId === 'string' && data.tenantId.trim() !== '') {
        assertMatchingTenantId(data.tenantId, expectedTenantId, 'uploaded brand asset');
    }

    const rawUrl = data.url ?? data.assetUrl;
    const sanitizedUrl = sanitizeSchoolAssetUrl(rawUrl);
    if (!sanitizedUrl) {
        throw new ApiError(
            'Security violation: Backend upload response did not return a valid public asset URL.',
            502
        );
    }

    return { url: sanitizedUrl };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isSchoolProfileBackendUnavailableError(error: unknown): boolean {
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

export async function getSchoolProfile(
    expectedTenantId?: string | null,
    signal?: AbortSignal
): Promise<SchoolProfileResponse> {
    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.SCHOOL_PROFILE.BASE, {
            signal,
        });
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Backend school profile endpoint returned an unexpected response.', 502);
        }

        const candidate = 'profile' in payload ? payload.profile : payload;
        return {
            profile: parseSchoolProfile(candidate, expectedTenantId),
            ...(typeof payload.message === 'string' && payload.message.trim() !== ''
                ? { message: payload.message }
                : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateSchoolProfile(
    request: UpdateSchoolProfileRequest,
    expectedTenantId?: string | null
): Promise<SchoolProfileResponse> {
    const validation = validateSchoolProfileForm(
        toSchoolProfileFormValues({
            tenantId: expectedTenantId ?? '',
            identity: request.identity,
            schoolType: request.schoolType,
            description: request.description,
            contact: request.contact,
        })
    );

    if (!validation.valid) {
        throw new ApiError(
            'Please fix the highlighted school profile validation errors before saving.',
            400
        );
    }

    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.SCHOOL_PROFILE.BASE,
            validation.payload
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend school profile update response.', 502);
        }

        const candidate = 'profile' in payload ? payload.profile : payload;
        return {
            profile: parseSchoolProfile(candidate, expectedTenantId),
            ...(typeof payload.message === 'string' && payload.message.trim() !== ''
                ? { message: payload.message }
                : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function getSchoolBranding(
    expectedTenantId?: string | null,
    signal?: AbortSignal
): Promise<SchoolBrandingResponse> {
    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.SCHOOL_PROFILE.BRANDING, {
            signal,
        });
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError(
                'Backend school branding endpoint returned an unexpected response.',
                502
            );
        }

        const candidate = 'brandingRecord' in payload
            ? payload.brandingRecord
            : 'branding' in payload && isPlainObject(payload.branding) && 'tenantId' in payload.branding
              ? payload.branding
              : payload;

        return {
            branding: parseSchoolBrandingRecord(candidate, expectedTenantId),
            ...(typeof payload.message === 'string' && payload.message.trim() !== ''
                ? { message: payload.message }
                : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateSchoolBranding(
    request: UpdateSchoolBrandingRequest,
    expectedTenantId?: string | null
): Promise<SchoolBrandingResponse> {
    const colorValidation = validateSchoolBrandingColors({
        primaryColor: request.branding.primaryColor,
        secondaryColor: request.branding.secondaryColor ?? '',
    });

    if (!colorValidation.valid) {
        throw new ApiError('Please enter valid 6-digit hex branding colors.', 400);
    }

    const sanitizedLogoUrl =
        request.logoUrl === null ? null : sanitizeSchoolAssetUrl(request.logoUrl);
    if (request.logoUrl !== null && !sanitizedLogoUrl) {
        throw new ApiError('Invalid school logo URL.', 400);
    }

    const sanitizedFaviconUrl =
        request.faviconUrl === null ? null : sanitizeSchoolAssetUrl(request.faviconUrl);
    if (request.faviconUrl !== null && !sanitizedFaviconUrl) {
        throw new ApiError('Invalid school favicon URL.', 400);
    }

    try {
        const response = await apiClient.put<unknown>(API_ENDPOINTS.SCHOOL_PROFILE.BRANDING, {
            logoUrl: sanitizedLogoUrl,
            faviconUrl: sanitizedFaviconUrl,
            branding: colorValidation.colors,
        });

        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend school branding update response.', 502);
        }

        const candidate = 'brandingRecord' in payload
            ? payload.brandingRecord
            : 'branding' in payload && isPlainObject(payload.branding) && 'tenantId' in payload.branding
              ? payload.branding
              : payload;

        return {
            branding: parseSchoolBrandingRecord(candidate, expectedTenantId),
            ...(typeof payload.message === 'string' && payload.message.trim() !== ''
                ? { message: payload.message }
                : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function uploadSchoolLogo(
    file: File,
    expectedTenantId?: string | null
): Promise<UploadBrandAssetResponse> {
    const fileError = validateBrandAssetFile(file, 'logo');
    if (fileError) {
        throw new ApiError(fileError, 400);
    }

    try {
        const payload = await uploadFile<unknown>({
            endpoint: API_ENDPOINTS.SCHOOL_PROFILE.UPLOAD_LOGO,
            file,
            fieldName: 'file',
        });
        return parseUploadAssetResponse(payload, expectedTenantId);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function uploadSchoolFavicon(
    file: File,
    expectedTenantId?: string | null
): Promise<UploadBrandAssetResponse> {
    const fileError = validateBrandAssetFile(file, 'favicon');
    if (fileError) {
        throw new ApiError(fileError, 400);
    }

    try {
        const payload = await uploadFile<unknown>({
            endpoint: API_ENDPOINTS.SCHOOL_PROFILE.UPLOAD_FAVICON,
            file,
            fieldName: 'file',
        });
        return parseUploadAssetResponse(payload, expectedTenantId);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

