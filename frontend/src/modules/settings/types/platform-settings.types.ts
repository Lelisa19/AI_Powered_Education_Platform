/**
 * Provider-wide Platform Settings contracts (pending backend implementation).
 * Strictly limited to shared platform identity, defaults, and operational status.
 * School-specific settings, domains, branding, academics, and billing belong in School Settings.
 */

export interface GeneralPlatformInformationSettings {
    platformDisplayName: string;
    supportContactEmail: string;
    supportContactInfo: string | null;
    publicWebsiteUrl: string | null;
    publicWebsiteDescription: string | null;
}

export interface PlatformDefaultSettings {
    defaultTimezone: string | null;
    defaultLocale: string | null;
}

export interface PlatformOperationalSettings {
    maintenanceModeEnabled: boolean;
    maintenanceNotice: string | null;
}

export interface PlatformSettingsUpdatedBy {
    id: string;
    email?: string | null;
    name?: string | null;
}

export interface PlatformSettings {
    general: GeneralPlatformInformationSettings;
    defaults: PlatformDefaultSettings;
    operational: PlatformOperationalSettings;
    updatedAt?: string | null;
    updatedBy?: PlatformSettingsUpdatedBy | null;
}

export interface PlatformSettingsResponse {
    settings: PlatformSettings;
    message?: string;
}

export interface UpdatePlatformSettingsRequest {
    general: GeneralPlatformInformationSettings;
    defaults: PlatformDefaultSettings;
    operational: PlatformOperationalSettings;
}

export interface PlatformSettingsFormValues {
    platformDisplayName: string;
    supportContactEmail: string;
    supportContactInfo: string;
    publicWebsiteUrl: string;
    publicWebsiteDescription: string;
    defaultTimezone: string;
    defaultLocale: string;
    maintenanceModeEnabled: boolean;
    maintenanceNotice: string;
}

export type PlatformSettingsFieldName = keyof PlatformSettingsFormValues;

export type PlatformSettingsFieldErrors = Partial<Record<PlatformSettingsFieldName, string>>;

