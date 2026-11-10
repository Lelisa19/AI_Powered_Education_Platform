import type { ValidationErrors } from '../../../services/api/api-error';
import type {
    PlatformSettings,
    PlatformSettingsFieldErrors,
    PlatformSettingsFieldName,
    PlatformSettingsFormValues,
    UpdatePlatformSettingsRequest,
} from '../types/platform-settings.types';

export interface SelectOption {
    value: string;
    label: string;
}

export const PLATFORM_TIMEZONE_OPTIONS: readonly SelectOption[] = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'Africa/Addis_Ababa', label: 'Africa/Addis Ababa (EAT)' },
    { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT)' },
    { value: 'Africa/Kigali', label: 'Africa/Kigali (CAT)' },
    { value: 'Africa/Kampala', label: 'Africa/Kampala (EAT)' },
    { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
    { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
    { value: 'America/New_York', label: 'America/New York (EST/EDT)' },
    { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
    { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST/PDT)' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
];

export const PLATFORM_LOCALE_OPTIONS: readonly SelectOption[] = [
    { value: 'en', label: 'English (en)' },
    { value: 'en-US', label: 'English — United States (en-US)' },
    { value: 'en-GB', label: 'English — United Kingdom (en-GB)' },
    { value: 'am', label: 'Amharic (am)' },
    { value: 'om', label: 'Afaan Oromoo (om)' },
    { value: 'fr', label: 'French (fr)' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCALE_PATTERN = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/;

export type PlatformSettingsValidationResult =
    | { valid: true; payload: UpdatePlatformSettingsRequest }
    | { valid: false; fieldErrors: PlatformSettingsFieldErrors };

function normalizeOptionalText(value: string): string | null {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function isValidIanaTimezone(timeZone: string): boolean {
    if (!timeZone || /\s/.test(timeZone)) {
        return false;
    }

    try {
        new Intl.DateTimeFormat(undefined, { timeZone });
        return true;
    } catch {
        return false;
    }
}

function validateOptionalHttpUrl(rawValue: string): string | null {
    const trimmed = rawValue.trim();
    if (!trimmed) return null;

    if (trimmed.length > 2048 || /\s/.test(trimmed)) {
        return 'Enter a valid public website URL starting with https:// or http:// (without spaces).';
    }

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return 'Public website URL must use https:// or http://.';
        }
        if (!parsed.hostname || parsed.username || parsed.password) {
            return 'Public website URL must contain a valid hostname without credentials.';
        }
        return null;
    } catch {
        return 'Enter a valid public website URL (e.g., https://eduplatform.com).';
    }
}

export function toPlatformSettingsFormValues(
    settings: PlatformSettings
): PlatformSettingsFormValues {
    return {
        platformDisplayName: settings.general.platformDisplayName,
        supportContactEmail: settings.general.supportContactEmail,
        supportContactInfo: settings.general.supportContactInfo ?? '',
        publicWebsiteUrl: settings.general.publicWebsiteUrl ?? '',
        publicWebsiteDescription: settings.general.publicWebsiteDescription ?? '',
        defaultTimezone: settings.defaults.defaultTimezone ?? '',
        defaultLocale: settings.defaults.defaultLocale ?? '',
        maintenanceModeEnabled: settings.operational.maintenanceModeEnabled,
        maintenanceNotice: settings.operational.maintenanceNotice ?? '',
    };
}

export function normalizeFormToRequest(
    values: PlatformSettingsFormValues
): UpdatePlatformSettingsRequest {
    return {
        general: {
            platformDisplayName: values.platformDisplayName.trim(),
            supportContactEmail: values.supportContactEmail.trim(),
            supportContactInfo: normalizeOptionalText(values.supportContactInfo),
            publicWebsiteUrl: normalizeOptionalText(values.publicWebsiteUrl),
            publicWebsiteDescription: normalizeOptionalText(values.publicWebsiteDescription),
        },
        defaults: {
            defaultTimezone: normalizeOptionalText(values.defaultTimezone),
            defaultLocale: normalizeOptionalText(values.defaultLocale),
        },
        operational: {
            maintenanceModeEnabled: values.maintenanceModeEnabled,
            maintenanceNotice: normalizeOptionalText(values.maintenanceNotice),
        },
    };
}

export function arePlatformSettingsFormValuesEqual(
    values: PlatformSettingsFormValues,
    savedSettings: PlatformSettings
): boolean {
    const current = normalizeFormToRequest(values);
    const saved = normalizeFormToRequest(toPlatformSettingsFormValues(savedSettings));

    return (
        current.general.platformDisplayName === saved.general.platformDisplayName &&
        current.general.supportContactEmail === saved.general.supportContactEmail &&
        current.general.supportContactInfo === saved.general.supportContactInfo &&
        current.general.publicWebsiteUrl === saved.general.publicWebsiteUrl &&
        current.general.publicWebsiteDescription === saved.general.publicWebsiteDescription &&
        current.defaults.defaultTimezone === saved.defaults.defaultTimezone &&
        current.defaults.defaultLocale === saved.defaults.defaultLocale &&
        current.operational.maintenanceModeEnabled === saved.operational.maintenanceModeEnabled &&
        current.operational.maintenanceNotice === saved.operational.maintenanceNotice
    );
}

export function validatePlatformSettingsForm(
    values: PlatformSettingsFormValues
): PlatformSettingsValidationResult {
    const fieldErrors: PlatformSettingsFieldErrors = {};

    const displayName = values.platformDisplayName.trim();
    if (displayName.length < 2 || displayName.length > 120) {
        fieldErrors.platformDisplayName =
            'Platform display name must be between 2 and 120 characters.';
    }

    const supportEmail = values.supportContactEmail.trim();
    if (!supportEmail || supportEmail.length > 254 || !EMAIL_PATTERN.test(supportEmail)) {
        fieldErrors.supportContactEmail = 'Enter a valid platform support contact email address.';
    }

    const supportInfo = values.supportContactInfo.trim();
    if (supportInfo.length > 500) {
        fieldErrors.supportContactInfo =
            'Platform support contact information must be 500 characters or fewer.';
    }

    const websiteUrlError = validateOptionalHttpUrl(values.publicWebsiteUrl);
    if (websiteUrlError) {
        fieldErrors.publicWebsiteUrl = websiteUrlError;
    }

    const websiteDescription = values.publicWebsiteDescription.trim();
    if (websiteDescription.length > 300) {
        fieldErrors.publicWebsiteDescription =
            'Public website description must be 300 characters or fewer.';
    }

    const timezone = values.defaultTimezone.trim();
    if (timezone && !isValidIanaTimezone(timezone)) {
        fieldErrors.defaultTimezone =
            'Select or provide a valid IANA timezone (e.g., UTC or Africa/Addis_Ababa).';
    }

    const locale = values.defaultLocale.trim();
    if (locale && !LOCALE_PATTERN.test(locale)) {
        fieldErrors.defaultLocale =
            'Select or provide a valid default language/locale tag (e.g., en or en-US).';
    }

    const maintenanceNotice = values.maintenanceNotice.trim();
    if (maintenanceNotice.length > 500) {
        fieldErrors.maintenanceNotice =
            'Platform maintenance notice must be 500 characters or fewer.';
    } else if (values.maintenanceModeEnabled && !maintenanceNotice) {
        fieldErrors.maintenanceNotice =
            'Provide a platform-wide maintenance notice before enabling maintenance mode.';
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        payload: normalizeFormToRequest(values),
    };
}

const FIELD_ALIAS_MAP: Record<string, PlatformSettingsFieldName> = {
    platformDisplayName: 'platformDisplayName',
    'general.platformDisplayName': 'platformDisplayName',
    supportContactEmail: 'supportContactEmail',
    'general.supportContactEmail': 'supportContactEmail',
    supportContactInfo: 'supportContactInfo',
    'general.supportContactInfo': 'supportContactInfo',
    publicWebsiteUrl: 'publicWebsiteUrl',
    'general.publicWebsiteUrl': 'publicWebsiteUrl',
    publicWebsiteDescription: 'publicWebsiteDescription',
    'general.publicWebsiteDescription': 'publicWebsiteDescription',
    defaultTimezone: 'defaultTimezone',
    'defaults.defaultTimezone': 'defaultTimezone',
    defaultLocale: 'defaultLocale',
    'defaults.defaultLocale': 'defaultLocale',
    maintenanceModeEnabled: 'maintenanceModeEnabled',
    'operational.maintenanceModeEnabled': 'maintenanceModeEnabled',
    maintenanceNotice: 'maintenanceNotice',
    'operational.maintenanceNotice': 'maintenanceNotice',
};

export function mapBackendSettingsValidationErrors(
    validationErrors?: ValidationErrors
): PlatformSettingsFieldErrors {
    if (!validationErrors) return {};

    const mapped: PlatformSettingsFieldErrors = {};
    for (const [key, messages] of Object.entries(validationErrors)) {
        const targetField = FIELD_ALIAS_MAP[key];
        if (targetField && Array.isArray(messages) && messages.length > 0) {
            mapped[targetField] = messages[0];
        }
    }

    return mapped;
}

export function formatPlatformSettingsTimestamp(value?: string | null): string | null {
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

