import type { ValidationErrors } from '../../../services/api/api-error';
import {
    DEFAULT_SCHOOL_BRANDING,
    SCHOOL_TYPES,
    type SchoolType,
} from '../../../types/school.types';
import { sanitizeBrandHexColor } from '../../../utils/branding';
import type {
    SchoolBrandingFieldErrors,
    SchoolBrandingFormValues,
    SchoolBrandingRecord,
    SchoolProfile,
    SchoolProfileFieldErrors,
    SchoolProfileFieldName,
    SchoolProfileFormValues,
    UpdateSchoolProfileRequest,
} from '../types/school-profile.types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d()\s-]{7,30}$/;
const SCHOOL_TYPE_SET = new Set<string>(SCHOOL_TYPES);

export const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const FAVICON_MAX_BYTES = 512 * 1024; // 512 KB

export const ALLOWED_LOGO_MIME_TYPES: readonly string[] = [
    'image/png',
    'image/jpeg',
    'image/webp',
];
export const ALLOWED_LOGO_EXTENSIONS: readonly string[] = ['.png', '.jpg', '.jpeg', '.webp'];

export const ALLOWED_FAVICON_MIME_TYPES: readonly string[] = [
    'image/png',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/webp',
];
export const ALLOWED_FAVICON_EXTENSIONS: readonly string[] = ['.png', '.ico', '.webp'];

export function isSchoolType(value: unknown): value is SchoolType {
    return typeof value === 'string' && SCHOOL_TYPE_SET.has(value);
}

function normalizeOptionalString(raw: string): string | undefined {
    const trimmed = raw.trim();
    return trimmed === '' ? undefined : trimmed;
}

function validateOptionalHttpUrl(rawValue: string): string | null {
    const trimmed = rawValue.trim();
    if (!trimmed) return null;

    if (trimmed.length > 2048 || /\s/.test(trimmed)) {
        return 'Enter a valid website URL starting with https:// or http:// (without spaces).';
    }

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return 'Website URL must use https:// or http://.';
        }
        if (!parsed.hostname || parsed.username || parsed.password) {
            return 'Website URL must contain a valid hostname without credentials.';
        }
        return null;
    } catch {
        return 'Enter a valid website URL (e.g., https://oakridge.edu).';
    }
}

export function toSchoolProfileFormValues(profile: SchoolProfile): SchoolProfileFormValues {
    return {
        schoolName: profile.identity.name,
        schoolType: isSchoolType(profile.schoolType) ? profile.schoolType : '',
        description: profile.description,
        email: profile.contact.email,
        phone: profile.contact.phone ?? '',
        website: profile.contact.website ?? '',
        address: profile.contact.address ?? '',
        city: profile.contact.city ?? '',
        country: profile.contact.country ?? '',
    };
}

export function normalizeSchoolProfileFormToRequest(
    values: SchoolProfileFormValues
): UpdateSchoolProfileRequest {
    return {
        identity: {
            name: values.schoolName.trim(),
        },
        schoolType: values.schoolType as SchoolType,
        description: values.description.trim(),
        contact: {
            email: values.email.trim(),
            phone: normalizeOptionalString(values.phone),
            website: normalizeOptionalString(values.website),
            address: normalizeOptionalString(values.address),
            city: normalizeOptionalString(values.city),
            country: normalizeOptionalString(values.country),
        },
    };
}

export function areSchoolProfileFormValuesEqual(
    values: SchoolProfileFormValues,
    savedProfile: SchoolProfile
): boolean {
    const current = normalizeSchoolProfileFormToRequest(values);
    const saved = normalizeSchoolProfileFormToRequest(toSchoolProfileFormValues(savedProfile));

    return (
        current.identity.name === saved.identity.name &&
        current.schoolType === saved.schoolType &&
        current.description === saved.description &&
        current.contact.email === saved.contact.email &&
        current.contact.phone === saved.contact.phone &&
        current.contact.website === saved.contact.website &&
        current.contact.address === saved.contact.address &&
        current.contact.city === saved.contact.city &&
        current.contact.country === saved.contact.country
    );
}

export type SchoolProfileValidationResult =
    | { valid: true; payload: UpdateSchoolProfileRequest }
    | { valid: false; fieldErrors: SchoolProfileFieldErrors };

export function validateSchoolProfileForm(
    values: SchoolProfileFormValues
): SchoolProfileValidationResult {
    const fieldErrors: SchoolProfileFieldErrors = {};

    const name = values.schoolName.trim();
    if (name.length < 2 || name.length > 150) {
        fieldErrors.schoolName = 'Official school name must be between 2 and 150 characters.';
    }

    if (!values.schoolType || !isSchoolType(values.schoolType)) {
        fieldErrors.schoolType = 'Select a valid school type.';
    }

    const description = values.description.trim();
    if (description.length < 2 || description.length > 2000) {
        fieldErrors.description = 'School description must be between 2 and 2,000 characters.';
    }

    const email = values.email.trim();
    if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
        fieldErrors.email = 'Enter a valid official school email address.';
    }

    const phone = values.phone.trim();
    if (phone && (phone.length > 30 || !PHONE_PATTERN.test(phone))) {
        fieldErrors.phone = 'Enter a valid phone number (digits, spaces, +, -, or parentheses).';
    }

    const websiteError = validateOptionalHttpUrl(values.website);
    if (websiteError) {
        fieldErrors.website = websiteError;
    }

    const address = values.address.trim();
    if (address.length > 300) {
        fieldErrors.address = 'Physical address must be 300 characters or fewer.';
    }

    const city = values.city.trim();
    if (city.length > 100) {
        fieldErrors.city = 'City must be 100 characters or fewer.';
    }

    const country = values.country.trim();
    if (country.length > 100) {
        fieldErrors.country = 'Country must be 100 characters or fewer.';
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        payload: normalizeSchoolProfileFormToRequest(values),
    };
}

const PROFILE_FIELD_ALIAS_MAP: Record<string, SchoolProfileFieldName> = {
    schoolName: 'schoolName',
    'identity.name': 'schoolName',
    name: 'schoolName',
    schoolType: 'schoolType',
    description: 'description',
    email: 'email',
    'contact.email': 'email',
    phone: 'phone',
    'contact.phone': 'phone',
    website: 'website',
    'contact.website': 'website',
    address: 'address',
    'contact.address': 'address',
    city: 'city',
    'contact.city': 'city',
    country: 'country',
    'contact.country': 'country',
};

export function mapBackendProfileValidationErrors(
    validationErrors?: ValidationErrors
): SchoolProfileFieldErrors {
    if (!validationErrors) return {};

    const mapped: SchoolProfileFieldErrors = {};
    for (const [key, messages] of Object.entries(validationErrors)) {
        const target = PROFILE_FIELD_ALIAS_MAP[key];
        if (target && Array.isArray(messages) && messages.length > 0) {
            mapped[target] = messages[0];
        }
    }
    return mapped;
}

export function toSchoolBrandingFormValues(
    record: SchoolBrandingRecord
): SchoolBrandingFormValues {
    return {
        primaryColor:
            sanitizeBrandHexColor(record.branding.primaryColor) ??
            DEFAULT_SCHOOL_BRANDING.primaryColor,
        secondaryColor:
            sanitizeBrandHexColor(record.branding.secondaryColor) ??
            DEFAULT_SCHOOL_BRANDING.secondaryColor,
    };
}

export type SchoolBrandingValidationResult =
    | { valid: true; colors: { primaryColor: string; secondaryColor?: string } }
    | { valid: false; fieldErrors: SchoolBrandingFieldErrors };

export function validateSchoolBrandingColors(
    values: SchoolBrandingFormValues
): SchoolBrandingValidationResult {
    const fieldErrors: SchoolBrandingFieldErrors = {};

    const primaryColor = sanitizeBrandHexColor(values.primaryColor);
    if (!primaryColor) {
        fieldErrors.primaryColor =
            'Primary brand color must be a valid 6-digit hex value (e.g., #1E40AF).';
    }

    const trimmedSecondary = values.secondaryColor.trim();
    const secondaryColor = trimmedSecondary ? sanitizeBrandHexColor(trimmedSecondary) : null;
    if (trimmedSecondary && !secondaryColor) {
        fieldErrors.secondaryColor =
            'Secondary brand color must be a valid 6-digit hex value (e.g., #3B82F6).';
    }

    if (Object.keys(fieldErrors).length > 0 || !primaryColor) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        colors: {
            primaryColor,
            ...(secondaryColor ? { secondaryColor } : {}),
        },
    };
}

export function validateBrandAssetFile(
    file: File,
    kind: 'logo' | 'favicon'
): string | null {
    if (!(file instanceof File)) {
        return 'Select a valid image file.';
    }

    const label = kind === 'logo' ? 'School logo' : 'School favicon';
    if (file.size <= 0) {
        return `${label} file cannot be empty.`;
    }

    const maxBytes = kind === 'logo' ? LOGO_MAX_BYTES : FAVICON_MAX_BYTES;
    const allowedMimeTypes = kind === 'logo' ? ALLOWED_LOGO_MIME_TYPES : ALLOWED_FAVICON_MIME_TYPES;
    const allowedExtensions =
        kind === 'logo' ? ALLOWED_LOGO_EXTENSIONS : ALLOWED_FAVICON_EXTENSIONS;

    if (file.size > maxBytes) {
        return kind === 'logo'
            ? 'School logo must be 2 MB or smaller.'
            : 'School favicon must be 512 KB or smaller.';
    }

    const normalizedName = file.name.trim().toLowerCase();
    const hasValidExtension = allowedExtensions.some((ext) => normalizedName.endsWith(ext));
    const hasValidMime =
        file.type === '' ? hasValidExtension : allowedMimeTypes.includes(file.type.toLowerCase());

    if (!hasValidExtension || !hasValidMime) {
        return kind === 'logo'
            ? 'Logo must be a PNG, JPEG, or WebP raster image (SVG is disallowed for security).'
            : 'Favicon must be a PNG, ICO, or WebP image (SVG is disallowed for security).';
    }

    return null;
}

export function formatSchoolProfileTimestamp(value?: string | null): string | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

