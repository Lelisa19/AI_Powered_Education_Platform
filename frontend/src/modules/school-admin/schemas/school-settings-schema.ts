import type { ValidationErrors } from '../../../services/api/api-error';
import type { AcademicTerm, AcademicYear } from '../../academic/types/academic-structure.types';
import type {
    SchoolDateFormat,
    SchoolSettings,
    SchoolSettingsCategoryId,
    SchoolSettingsFieldErrors,
    SchoolSettingsFieldName,
    SchoolSettingsFormValues,
    SchoolTimeFormat,
    UpdateSchoolSettingsRequest,
    WeekStartDay,
} from '../types/school-settings.types';

export interface SettingsSelectOption {
    value: string;
    label: string;
}

export const SCHOOL_LANGUAGE_OPTIONS: readonly SettingsSelectOption[] = [
    { value: 'en', label: 'English (en)' },
    { value: 'en-US', label: 'English — United States (en-US)' },
    { value: 'en-GB', label: 'English — United Kingdom (en-GB)' },
    { value: 'am', label: 'Amharic (am)' },
    { value: 'om', label: 'Afaan Oromoo (om)' },
    { value: 'fr', label: 'French (fr)' },
];

export const SCHOOL_TIMEZONE_OPTIONS: readonly SettingsSelectOption[] = [
    { value: 'Africa/Addis_Ababa', label: 'Africa/Addis Ababa (EAT)' },
    { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT)' },
    { value: 'Africa/Kigali', label: 'Africa/Kigali (CAT)' },
    { value: 'Africa/Kampala', label: 'Africa/Kampala (EAT)' },
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
    { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
    { value: 'America/New_York', label: 'America/New York (EST/EDT)' },
    { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
    { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST/PDT)' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
];

export const SCHOOL_DATE_FORMAT_OPTIONS: readonly {
    value: SchoolDateFormat;
    label: string;
}[] = [
    { value: 'YYYY-MM-DD', label: 'ISO (YYYY-MM-DD — e.g., 2026-09-01)' },
    { value: 'DD/MM/YYYY', label: 'Day/Month/Year (DD/MM/YYYY — e.g., 01/09/2026)' },
    { value: 'MM/DD/YYYY', label: 'Month/Day/Year (MM/DD/YYYY — e.g., 09/01/2026)' },
    { value: 'MMM D, YYYY', label: 'Named Month (MMM D, YYYY — e.g., Sep 1, 2026)' },
];

export const SCHOOL_TIME_FORMAT_OPTIONS: readonly {
    value: SchoolTimeFormat;
    label: string;
}[] = [
    { value: '12H', label: '12-hour clock (e.g., 2:30 PM)' },
    { value: '24H', label: '24-hour clock (e.g., 14:30)' },
];

export const SCHOOL_WEEK_START_OPTIONS: readonly {
    value: WeekStartDay;
    label: string;
}[] = [
    { value: 'MONDAY', label: 'Monday' },
    { value: 'SUNDAY', label: 'Sunday' },
    { value: 'SATURDAY', label: 'Saturday' },
];

export const SESSION_TIMEOUT_MIN_MINUTES = 15;
export const SESSION_TIMEOUT_MAX_MINUTES = 480;

const DATE_FORMAT_SET = new Set<string>(SCHOOL_DATE_FORMAT_OPTIONS.map((o) => o.value));
const TIME_FORMAT_SET = new Set<string>(SCHOOL_TIME_FORMAT_OPTIONS.map((o) => o.value));
const WEEK_START_SET = new Set<string>(SCHOOL_WEEK_START_OPTIONS.map((o) => o.value));
const LANGUAGE_VALUE_SET = new Set<string>(SCHOOL_LANGUAGE_OPTIONS.map((o) => o.value));
const LOCALE_BCP47_PATTERN = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/;

export function isValidIanaTimezone(timeZone: string): boolean {
    if (!timeZone || /\s/.test(timeZone)) return false;
    try {
        new Intl.DateTimeFormat(undefined, { timeZone });
        return true;
    } catch {
        return false;
    }
}

export function isSupportedLanguage(lang: string): boolean {
    if (!lang) return false;
    return LANGUAGE_VALUE_SET.has(lang) || LOCALE_BCP47_PATTERN.test(lang);
}

export function isSupportedDateFormat(value: string): value is SchoolDateFormat {
    return DATE_FORMAT_SET.has(value);
}

export function isSupportedTimeFormat(value: string): value is SchoolTimeFormat {
    return TIME_FORMAT_SET.has(value);
}

export function isSupportedWeekStartDay(value: string): value is WeekStartDay {
    return WEEK_START_SET.has(value);
}

function normalizeNullableString(raw: string): string | null {
    const trimmed = raw.trim();
    return trimmed === '' ? null : trimmed;
}

export function toSchoolSettingsFormValues(settings: SchoolSettings): SchoolSettingsFormValues {
    return {
        defaultLanguage: settings.general.defaultLanguage ?? '',
        timezone: settings.general.timezone ?? '',
        dateFormat: settings.general.dateFormat ?? '',
        timeFormat: settings.general.timeFormat ?? '',
        weekStartDay: settings.general.weekStartDay ?? '',
        allowPublicStudentRegistration: settings.registrationPolicy.allowPublicStudentRegistration,
        requireAdminApprovalForRegistration:
            settings.registrationPolicy.requireAdminApprovalForRegistration,
        allowStudentSelfEnrollment: settings.registrationPolicy.allowStudentSelfEnrollment,
        allowPreEnrollmentProgramBrowse: settings.registrationPolicy.allowPreEnrollmentProgramBrowse,
        allowPendingStudentPortalAccess: settings.registrationPolicy.allowPendingStudentPortalAccess,
        schoolAnnouncementsEnabled: settings.notifications.schoolAnnouncementsEnabled,
        emailNotificationsEnabled: settings.notifications.emailNotificationsEnabled,
        inAppNotificationsEnabled: settings.notifications.inAppNotificationsEnabled,
        notifyStudentsOfAcademicAnnouncements:
            settings.notifications.notifyStudentsOfAcademicAnnouncements,
        sessionTimeoutMinutes:
            typeof settings.security.sessionTimeoutMinutes === 'number' &&
            Number.isFinite(settings.security.sessionTimeoutMinutes)
                ? String(settings.security.sessionTimeoutMinutes)
                : '',
        requireStrongerStaffAuth: settings.security.requireStrongerStaffAuth,
        defaultAcademicYearId: settings.academicDefaults.defaultAcademicYearId ?? '',
        defaultTermId: settings.academicDefaults.defaultTermId ?? '',
        showAcademicCalendarToStudents:
            settings.academicDefaults.showAcademicCalendarToStudents,
    };
}

export function normalizeSchoolSettingsFormToRequest(
    values: SchoolSettingsFormValues
): UpdateSchoolSettingsRequest {
    const timeoutTrimmed = values.sessionTimeoutMinutes.trim();
    const timeoutNumber = timeoutTrimmed === '' ? null : Number(timeoutTrimmed);

    return {
        general: {
            defaultLanguage: normalizeNullableString(values.defaultLanguage),
            timezone: normalizeNullableString(values.timezone),
            dateFormat: normalizeNullableString(values.dateFormat),
            timeFormat: normalizeNullableString(values.timeFormat),
            weekStartDay: normalizeNullableString(values.weekStartDay),
        },
        registrationPolicy: {
            allowPublicStudentRegistration: values.allowPublicStudentRegistration,
            requireAdminApprovalForRegistration: values.requireAdminApprovalForRegistration,
            allowStudentSelfEnrollment: values.allowStudentSelfEnrollment,
            allowPreEnrollmentProgramBrowse: values.allowPreEnrollmentProgramBrowse,
            allowPendingStudentPortalAccess: values.allowPendingStudentPortalAccess,
        },
        notifications: {
            schoolAnnouncementsEnabled: values.schoolAnnouncementsEnabled,
            emailNotificationsEnabled: values.emailNotificationsEnabled,
            inAppNotificationsEnabled: values.inAppNotificationsEnabled,
            notifyStudentsOfAcademicAnnouncements:
                values.schoolAnnouncementsEnabled
                    ? values.notifyStudentsOfAcademicAnnouncements
                    : false,
        },
        security: {
            sessionTimeoutMinutes:
                timeoutNumber !== null && Number.isInteger(timeoutNumber) ? timeoutNumber : null,
            requireStrongerStaffAuth: values.requireStrongerStaffAuth,
        },
        academicDefaults: {
            defaultAcademicYearId: normalizeNullableString(values.defaultAcademicYearId),
            defaultTermId: normalizeNullableString(values.defaultTermId),
            showAcademicCalendarToStudents: values.showAcademicCalendarToStudents,
        },
    };
}

export function getSettingsCompatibilityWarnings(options: {
    savedSettings: SchoolSettings;
    academicYears: readonly AcademicYear[];
    terms: readonly AcademicTerm[];
    yearsLoaded: boolean;
    termsLoaded: boolean;
}): string[] {
    const { savedSettings, academicYears, terms, yearsLoaded, termsLoaded } = options;
    const warnings: string[] = [];
    const { general, security, academicDefaults } = savedSettings;

    if (general.defaultLanguage && !isSupportedLanguage(general.defaultLanguage)) {
        warnings.push(
            `Saved language preference "${general.defaultLanguage}" is not recognized as a valid language tag.`
        );
    }
    if (general.timezone && !isValidIanaTimezone(general.timezone)) {
        warnings.push(
            `Saved time zone "${general.timezone}" is not a valid IANA time zone in this browser.`
        );
    }
    if (general.dateFormat && !isSupportedDateFormat(general.dateFormat)) {
        warnings.push(`Saved date format "${general.dateFormat}" is not in the supported options.`);
    }
    if (general.timeFormat && !isSupportedTimeFormat(general.timeFormat)) {
        warnings.push(`Saved time format "${general.timeFormat}" is not in the supported options.`);
    }
    if (general.weekStartDay && !isSupportedWeekStartDay(general.weekStartDay)) {
        warnings.push(
            `Saved week-start day "${general.weekStartDay}" is not in the supported options.`
        );
    }
    if (
        typeof security.sessionTimeoutMinutes === 'number' &&
        (security.sessionTimeoutMinutes < SESSION_TIMEOUT_MIN_MINUTES ||
            security.sessionTimeoutMinutes > SESSION_TIMEOUT_MAX_MINUTES)
    ) {
        warnings.push(
            `Saved session timeout (${security.sessionTimeoutMinutes} min) is outside supported bounds (${SESSION_TIMEOUT_MIN_MINUTES}–${SESSION_TIMEOUT_MAX_MINUTES} min).`
        );
    }

    if (academicDefaults.defaultAcademicYearId && yearsLoaded) {
        const matchedYear = academicYears.find(
            (year) => year.id === academicDefaults.defaultAcademicYearId
        );
        if (!matchedYear) {
            warnings.push(
                'The currently saved default academic year no longer matches a loaded academic year record.'
            );
        } else if (matchedYear.status === 'ARCHIVED') {
            warnings.push(
                `The saved default academic year "${matchedYear.name}" is Archived. Consider selecting an Active or Planned year.`
            );
        }
    }

    if (academicDefaults.defaultTermId && termsLoaded) {
        const matchedTerm = terms.find((term) => term.id === academicDefaults.defaultTermId);
        if (!matchedTerm) {
            warnings.push(
                'The currently saved default term does not match a loaded term under the selected default academic year.'
            );
        } else if (matchedTerm.status === 'ARCHIVED') {
            warnings.push(
                `The saved default term "${matchedTerm.name}" is Archived. Consider selecting an Active or Planned term.`
            );
        }
    }

    return warnings;
}

export type SchoolSettingsValidationResult =
    | { valid: true; payload: UpdateSchoolSettingsRequest }
    | { valid: false; fieldErrors: SchoolSettingsFieldErrors };

export function validateSchoolSettingsForm(options: {
    values: SchoolSettingsFormValues;
    academicYears: readonly AcademicYear[];
    terms: readonly AcademicTerm[];
    yearsLoaded: boolean;
    termsLoaded: boolean;
    selectedYearChangedOrSet: boolean;
}): SchoolSettingsValidationResult {
    const { values, academicYears, terms, yearsLoaded, termsLoaded, selectedYearChangedOrSet } =
        options;
    const fieldErrors: SchoolSettingsFieldErrors = {};

    const defaultLanguage = values.defaultLanguage.trim();
    if (defaultLanguage && !isSupportedLanguage(defaultLanguage)) {
        fieldErrors.defaultLanguage = 'Select a supported language preference.';
    }

    const timezone = values.timezone.trim();
    if (timezone && !isValidIanaTimezone(timezone)) {
        fieldErrors.timezone = 'Select a valid IANA time zone.';
    }

    const dateFormat = values.dateFormat.trim();
    if (dateFormat && !isSupportedDateFormat(dateFormat)) {
        fieldErrors.dateFormat = 'Select a supported date display format.';
    }

    const timeFormat = values.timeFormat.trim();
    if (timeFormat && !isSupportedTimeFormat(timeFormat)) {
        fieldErrors.timeFormat = 'Select either 12-hour or 24-hour clock formatting.';
    }

    const weekStartDay = values.weekStartDay.trim();
    if (weekStartDay && !isSupportedWeekStartDay(weekStartDay)) {
        fieldErrors.weekStartDay = 'Select a supported week-start day.';
    }

    const timeoutRaw = values.sessionTimeoutMinutes.trim();
    if (timeoutRaw !== '') {
        const timeoutNum = Number(timeoutRaw);
        if (
            !Number.isInteger(timeoutNum) ||
            timeoutNum < SESSION_TIMEOUT_MIN_MINUTES ||
            timeoutNum > SESSION_TIMEOUT_MAX_MINUTES
        ) {
            fieldErrors.sessionTimeoutMinutes = `Session idle timeout must be a whole number between ${SESSION_TIMEOUT_MIN_MINUTES} and ${SESSION_TIMEOUT_MAX_MINUTES} minutes (or leave blank for platform default).`;
        }
    }

    const yearId = values.defaultAcademicYearId.trim();
    const termId = values.defaultTermId.trim();

    if (termId && !yearId) {
        fieldErrors.defaultTermId =
            'Select a default academic year before selecting a default term.';
    }

    if (yearId && yearsLoaded) {
        const matchedYear = academicYears.find((item) => item.id === yearId);
        if (!matchedYear) {
            fieldErrors.defaultAcademicYearId =
                'Selected default academic year is no longer available.';
        } else if (matchedYear.status === 'ARCHIVED') {
            fieldErrors.defaultAcademicYearId =
                'Archived academic years cannot be chosen as the default academic year.';
        }
    }

    if (termId && yearId && termsLoaded) {
        const matchedTerm = terms.find((item) => item.id === termId);
        if (!matchedTerm) {
            fieldErrors.defaultTermId = selectedYearChangedOrSet
                ? 'Selected term does not belong to the chosen default academic year.'
                : 'Selected default term is no longer available.';
        } else if (matchedTerm.academicYearId !== yearId) {
            fieldErrors.defaultTermId =
                'Default term must belong to the selected default academic year.';
        } else if (matchedTerm.status === 'ARCHIVED') {
            fieldErrors.defaultTermId =
                'Archived terms cannot be chosen as the default term.';
        }
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        payload: normalizeSchoolSettingsFormToRequest(values),
    };
}

export function getConsequentialSettingsChanges(
    currentValues: SchoolSettingsFormValues,
    savedSettings: SchoolSettings
): string[] {
    const warnings: string[] = [];

    if (
        !savedSettings.registrationPolicy.allowPublicStudentRegistration &&
        currentValues.allowPublicStudentRegistration
    ) {
        warnings.push(
            'Enabling Public Student Registration will permit visitors on your school domain to submit registration requests once backend domain verification syncs.'
        );
    } else if (
        savedSettings.registrationPolicy.allowPublicStudentRegistration &&
        !currentValues.allowPublicStudentRegistration
    ) {
        warnings.push(
            'Disabling Public Student Registration will block new self-service registrations on your school portal.'
        );
    }

    if (
        savedSettings.registrationPolicy.requireAdminApprovalForRegistration &&
        !currentValues.requireAdminApprovalForRegistration
    ) {
        warnings.push(
            'Disabling Admin Approval will allow newly registered student accounts to bypass manual review.'
        );
    }

    if (
        !savedSettings.registrationPolicy.allowPendingStudentPortalAccess &&
        currentValues.allowPendingStudentPortalAccess
    ) {
        warnings.push(
            'Enabling Pending Student Portal Access grants limited portal access before formal enrollment approval.'
        );
    }

    if (
        savedSettings.security.requireStrongerStaffAuth &&
        !currentValues.requireStrongerStaffAuth
    ) {
        warnings.push(
            'Turning off Stronger Staff Authentication lowers the school-level authentication security policy.'
        );
    }

    const savedTimeout = savedSettings.security.sessionTimeoutMinutes;
    const nextTimeoutTrimmed = currentValues.sessionTimeoutMinutes.trim();
    const nextTimeout = nextTimeoutTrimmed === '' ? null : Number(nextTimeoutTrimmed);
    if (
        typeof savedTimeout === 'number' &&
        (nextTimeout === null || (!Number.isNaN(nextTimeout) && nextTimeout > savedTimeout))
    ) {
        warnings.push(
            'Extending or clearing the school session idle timeout allows signed-in sessions to remain active longer.'
        );
    }

    return warnings;
}

export function getCategoryDirtyStates(
    values: SchoolSettingsFormValues | null,
    saved: SchoolSettings | null
): Record<SchoolSettingsCategoryId, boolean> {
    if (!values || !saved) {
        return {
            general: false,
            registration: false,
            notifications: false,
            security: false,
            academic: false,
        };
    }

    const base = toSchoolSettingsFormValues(saved);
    return {
        general:
            values.defaultLanguage.trim() !== base.defaultLanguage.trim() ||
            values.timezone.trim() !== base.timezone.trim() ||
            values.dateFormat.trim() !== base.dateFormat.trim() ||
            values.timeFormat.trim() !== base.timeFormat.trim() ||
            values.weekStartDay.trim() !== base.weekStartDay.trim(),
        registration:
            values.allowPublicStudentRegistration !== base.allowPublicStudentRegistration ||
            values.requireAdminApprovalForRegistration !==
                base.requireAdminApprovalForRegistration ||
            values.allowStudentSelfEnrollment !== base.allowStudentSelfEnrollment ||
            values.allowPreEnrollmentProgramBrowse !== base.allowPreEnrollmentProgramBrowse ||
            values.allowPendingStudentPortalAccess !== base.allowPendingStudentPortalAccess,
        notifications:
            values.schoolAnnouncementsEnabled !== base.schoolAnnouncementsEnabled ||
            values.emailNotificationsEnabled !== base.emailNotificationsEnabled ||
            values.inAppNotificationsEnabled !== base.inAppNotificationsEnabled ||
            values.notifyStudentsOfAcademicAnnouncements !==
                base.notifyStudentsOfAcademicAnnouncements,
        security:
            values.sessionTimeoutMinutes.trim() !== base.sessionTimeoutMinutes.trim() ||
            values.requireStrongerStaffAuth !== base.requireStrongerStaffAuth,
        academic:
            values.defaultAcademicYearId.trim() !== base.defaultAcademicYearId.trim() ||
            values.defaultTermId.trim() !== base.defaultTermId.trim() ||
            values.showAcademicCalendarToStudents !== base.showAcademicCalendarToStudents,
    };
}

export function hasAnyDirtySettingsCategory(
    dirtyMap: Record<SchoolSettingsCategoryId, boolean>
): boolean {
    return (
        dirtyMap.general ||
        dirtyMap.registration ||
        dirtyMap.notifications ||
        dirtyMap.security ||
        dirtyMap.academic
    );
}

const FIELD_ALIAS_MAP: Record<string, SchoolSettingsFieldName> = {
    'general.defaultLanguage': 'defaultLanguage',
    defaultLanguage: 'defaultLanguage',
    'general.timezone': 'timezone',
    timezone: 'timezone',
    'general.dateFormat': 'dateFormat',
    dateFormat: 'dateFormat',
    'general.timeFormat': 'timeFormat',
    timeFormat: 'timeFormat',
    'general.weekStartDay': 'weekStartDay',
    weekStartDay: 'weekStartDay',
    'registrationPolicy.allowPublicStudentRegistration': 'allowPublicStudentRegistration',
    allowPublicStudentRegistration: 'allowPublicStudentRegistration',
    'registrationPolicy.requireAdminApprovalForRegistration':
        'requireAdminApprovalForRegistration',
    requireAdminApprovalForRegistration: 'requireAdminApprovalForRegistration',
    'registrationPolicy.allowStudentSelfEnrollment': 'allowStudentSelfEnrollment',
    allowStudentSelfEnrollment: 'allowStudentSelfEnrollment',
    'registrationPolicy.allowPreEnrollmentProgramBrowse': 'allowPreEnrollmentProgramBrowse',
    allowPreEnrollmentProgramBrowse: 'allowPreEnrollmentProgramBrowse',
    'registrationPolicy.allowPendingStudentPortalAccess': 'allowPendingStudentPortalAccess',
    allowPendingStudentPortalAccess: 'allowPendingStudentPortalAccess',
    'notifications.schoolAnnouncementsEnabled': 'schoolAnnouncementsEnabled',
    schoolAnnouncementsEnabled: 'schoolAnnouncementsEnabled',
    'notifications.emailNotificationsEnabled': 'emailNotificationsEnabled',
    emailNotificationsEnabled: 'emailNotificationsEnabled',
    'notifications.inAppNotificationsEnabled': 'inAppNotificationsEnabled',
    inAppNotificationsEnabled: 'inAppNotificationsEnabled',
    'notifications.notifyStudentsOfAcademicAnnouncements':
        'notifyStudentsOfAcademicAnnouncements',
    notifyStudentsOfAcademicAnnouncements: 'notifyStudentsOfAcademicAnnouncements',
    'security.sessionTimeoutMinutes': 'sessionTimeoutMinutes',
    sessionTimeoutMinutes: 'sessionTimeoutMinutes',
    'security.requireStrongerStaffAuth': 'requireStrongerStaffAuth',
    requireStrongerStaffAuth: 'requireStrongerStaffAuth',
    'academicDefaults.defaultAcademicYearId': 'defaultAcademicYearId',
    defaultAcademicYearId: 'defaultAcademicYearId',
    'academicDefaults.defaultTermId': 'defaultTermId',
    defaultTermId: 'defaultTermId',
    'academicDefaults.showAcademicCalendarToStudents': 'showAcademicCalendarToStudents',
    showAcademicCalendarToStudents: 'showAcademicCalendarToStudents',
};

export function mapBackendSchoolSettingsValidationErrors(
    validationErrors?: ValidationErrors
): SchoolSettingsFieldErrors {
    if (!validationErrors) return {};
    const mapped: SchoolSettingsFieldErrors = {};
    for (const [key, messages] of Object.entries(validationErrors)) {
        const target = FIELD_ALIAS_MAP[key];
        if (target && Array.isArray(messages) && messages.length > 0) {
            mapped[target] = messages[0];
        }
    }
    return mapped;
}

export function formatSchoolSettingsTimestamp(value?: string | null): string | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

