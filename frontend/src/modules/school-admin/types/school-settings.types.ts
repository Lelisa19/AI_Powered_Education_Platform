export type SchoolDateFormat =
    | 'YYYY-MM-DD'
    | 'DD/MM/YYYY'
    | 'MM/DD/YYYY'
    | 'MMM D, YYYY';

export type SchoolTimeFormat = '12H' | '24H';

export type WeekStartDay = 'MONDAY' | 'SUNDAY' | 'SATURDAY';

export interface SchoolGeneralPreferences {
    defaultLanguage: string | null;
    timezone: string | null;
    dateFormat: SchoolDateFormat | (string & {}) | null;
    timeFormat: SchoolTimeFormat | (string & {}) | null;
    weekStartDay: WeekStartDay | (string & {}) | null;
}

export interface SchoolRegistrationAndEnrollmentPolicy {
    allowPublicStudentRegistration: boolean;
    requireAdminApprovalForRegistration: boolean;
    allowStudentSelfEnrollment: boolean;
    allowPreEnrollmentProgramBrowse: boolean;
    allowPendingStudentPortalAccess: boolean;
}

export interface SchoolNotificationPreferences {
    schoolAnnouncementsEnabled: boolean;
    emailNotificationsEnabled: boolean;
    inAppNotificationsEnabled: boolean;
    notifyStudentsOfAcademicAnnouncements: boolean;
}

export interface SchoolSecurityPreferences {
    sessionTimeoutMinutes: number | null;
    requireStrongerStaffAuth: boolean;
}

export interface SchoolAcademicOperationalDefaults {
    defaultAcademicYearId: string | null;
    defaultAcademicYearName?: string | null;
    defaultTermId: string | null;
    defaultTermName?: string | null;
    showAcademicCalendarToStudents: boolean;
}

export interface SchoolSettingsUpdatedBy {
    id: string;
    name?: string | null;
    email?: string | null;
}

/**
 * Authoritative school-level operational settings.
 * Canonical identity, contact details, logos, colors, website CMS content,
 * financial settings, and academic entity CRUD remain owned by their respective modules.
 */
export interface SchoolSettings {
    tenantId: string;
    general: SchoolGeneralPreferences;
    registrationPolicy: SchoolRegistrationAndEnrollmentPolicy;
    notifications: SchoolNotificationPreferences;
    security: SchoolSecurityPreferences;
    academicDefaults: SchoolAcademicOperationalDefaults;
    updatedAt?: string | null;
    updatedBy?: SchoolSettingsUpdatedBy | null;
}

export interface UpdateSchoolSettingsRequest {
    general: SchoolGeneralPreferences;
    registrationPolicy: SchoolRegistrationAndEnrollmentPolicy;
    notifications: SchoolNotificationPreferences;
    security: SchoolSecurityPreferences;
    academicDefaults: Pick<
        SchoolAcademicOperationalDefaults,
        'defaultAcademicYearId' | 'defaultTermId' | 'showAcademicCalendarToStudents'
    >;
}

export interface SchoolSettingsResponse {
    settings: SchoolSettings;
    message?: string;
}

export type SchoolSettingsCategoryId =
    | 'general'
    | 'registration'
    | 'notifications'
    | 'security'
    | 'academic';

export interface SchoolSettingsFormValues {
    defaultLanguage: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    weekStartDay: string;
    allowPublicStudentRegistration: boolean;
    requireAdminApprovalForRegistration: boolean;
    allowStudentSelfEnrollment: boolean;
    allowPreEnrollmentProgramBrowse: boolean;
    allowPendingStudentPortalAccess: boolean;
    schoolAnnouncementsEnabled: boolean;
    emailNotificationsEnabled: boolean;
    inAppNotificationsEnabled: boolean;
    notifyStudentsOfAcademicAnnouncements: boolean;
    sessionTimeoutMinutes: string;
    requireStrongerStaffAuth: boolean;
    defaultAcademicYearId: string;
    defaultTermId: string;
    showAcademicCalendarToStudents: boolean;
}

export type SchoolSettingsFieldName = keyof SchoolSettingsFormValues;
export type SchoolSettingsFieldErrors = Partial<Record<SchoolSettingsFieldName, string>>;

