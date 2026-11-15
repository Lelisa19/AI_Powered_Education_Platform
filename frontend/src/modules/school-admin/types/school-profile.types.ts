import type {
    SchoolBranding,
    SchoolContactDetails,
    SchoolIdentity,
    SchoolType,
} from '../../../types/school.types';

export interface SchoolProfileUpdatedBy {
    id: string;
    name?: string | null;
    email?: string | null;
}

/**
 * Authoritative school institutional identity and core contact profile.
 * `identity.name` serves as the single authoritative school name shared with
 * navigation chrome, theme metadata, and public website configuration.
 */
export interface SchoolProfile {
    tenantId: string;
    identity: Pick<SchoolIdentity, 'name'>;
    schoolType: SchoolType | (string & {});
    description: string;
    contact: SchoolContactDetails;
    updatedAt?: string | null;
    updatedBy?: SchoolProfileUpdatedBy | null;
}

export interface SchoolBrandingRecord {
    tenantId: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    branding: SchoolBranding;
    updatedAt?: string | null;
    updatedBy?: SchoolProfileUpdatedBy | null;
}

export interface SchoolProfileResponse {
    profile: SchoolProfile;
    message?: string;
}

export interface UpdateSchoolProfileRequest {
    identity: Pick<SchoolIdentity, 'name'>;
    schoolType: SchoolType;
    description: string;
    contact: SchoolContactDetails;
}

export interface SchoolBrandingResponse {
    branding: SchoolBrandingRecord;
    message?: string;
}

export interface UpdateSchoolBrandingRequest {
    logoUrl: string | null;
    faviconUrl: string | null;
    branding: SchoolBranding;
}

export interface UploadBrandAssetResponse {
    url: string;
}

export interface SchoolProfileFormValues {
    schoolName: string;
    schoolType: '' | SchoolType;
    description: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    city: string;
    country: string;
}

export type SchoolProfileFieldName = keyof SchoolProfileFormValues;
export type SchoolProfileFieldErrors = Partial<Record<SchoolProfileFieldName, string>>;

export interface SchoolBrandingFormValues {
    primaryColor: string;
    secondaryColor: string;
}

export type SchoolBrandingFieldName = 'primaryColor' | 'secondaryColor' | 'logo' | 'favicon';
export type SchoolBrandingFieldErrors = Partial<Record<SchoolBrandingFieldName, string>>;

