/**
 * Authoritative school-level identity, classification, contact, and branding contracts
 * shared across School Profile management, Tenant/Theme context, Dashboard layout,
 * and public School Website rendering.
 */

export type SchoolType =
    | 'general_academic'
    | 'primary'
    | 'secondary'
    | 'high_school'
    | 'higher_ed'
    | 'vocational'
    | 'skill_training';

export const SCHOOL_TYPES: readonly SchoolType[] = [
    'general_academic',
    'primary',
    'secondary',
    'high_school',
    'higher_ed',
    'vocational',
    'skill_training',
];

export interface SchoolTypeOption {
    value: SchoolType;
    label: string;
    category: 'Academic' | 'Higher Education' | 'Skills & Vocational';
}

export const SCHOOL_TYPE_OPTIONS: readonly SchoolTypeOption[] = [
    {
        value: 'general_academic',
        label: 'General Academic School (Multi-Grade / K-12)',
        category: 'Academic',
    },
    { value: 'primary', label: 'Primary School', category: 'Academic' },
    { value: 'secondary', label: 'Secondary School', category: 'Academic' },
    { value: 'high_school', label: 'High School', category: 'Academic' },
    { value: 'higher_ed', label: 'University / College', category: 'Higher Education' },
    {
        value: 'vocational',
        label: 'Vocational / Technical Institute',
        category: 'Skills & Vocational',
    },
    {
        value: 'skill_training',
        label: 'Skill-Training / Professional Institute',
        category: 'Skills & Vocational',
    },
];

/**
 * Core school identity elements shown across the public website, dashboard chrome, and metadata.
 */
export interface SchoolIdentity {
    name: string;
    logoUrl?: string;
    faviconUrl?: string;
}

/**
 * Visual branding colors applied to school dashboard theming and public school website styling.
 */
export interface SchoolBranding {
    primaryColor: string;
    secondaryColor?: string;
}

export const DEFAULT_SCHOOL_BRANDING: Readonly<Required<SchoolBranding>> = Object.freeze({
    primaryColor: '#1E40AF',
    secondaryColor: '#3B82F6',
});

/**
 * Authoritative school contact and location fields.
 */
export interface SchoolContactDetails {
    email: string;
    phone?: string;
    website?: string;
    address?: string;
    city?: string;
    country?: string;
}

