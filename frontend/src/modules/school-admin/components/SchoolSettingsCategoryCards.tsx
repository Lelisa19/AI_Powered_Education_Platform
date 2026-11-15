import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { PERMISSIONS } from '../../../constants/permissions';
import type { AcademicTerm, AcademicYear } from '../../academic/types/academic-structure.types';
import {
    SCHOOL_DATE_FORMAT_OPTIONS,
    SCHOOL_LANGUAGE_OPTIONS,
    SCHOOL_TIME_FORMAT_OPTIONS,
    SCHOOL_TIMEZONE_OPTIONS,
    SCHOOL_WEEK_START_OPTIONS,
    SESSION_TIMEOUT_MAX_MINUTES,
    SESSION_TIMEOUT_MIN_MINUTES,
    type SettingsSelectOption,
} from '../schemas/school-settings-schema';
import type {
    SchoolSettings,
    SchoolSettingsFieldErrors,
    SchoolSettingsFieldName,
    SchoolSettingsFormValues,
} from '../types/school-settings.types';

interface ToggleRowProps {
    id: string;
    label: string;
    description: string;
    checked: boolean;
    disabled: boolean;
    onChange: (checked: boolean) => void;
    error?: string;
}

const ToggleSettingRow: React.FC<ToggleRowProps> = ({
    id,
    label,
    description,
    checked,
    disabled,
    onChange,
    error,
}) => (
    <div className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50/70 p-3.5">
        <input
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="min-w-0 flex-1">
            <label htmlFor={id} className="block cursor-pointer text-sm font-medium text-gray-900">
                {label}
            </label>
            <p className="mt-0.5 text-xs text-gray-600">{description}</p>
            {error && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                    {error}
                </p>
            )}
        </div>
    </div>
);

function buildOptionsWithPreservedValue(
    baseOptions: readonly SettingsSelectOption[],
    currentValue: string
): SettingsSelectOption[] {
    const trimmed = currentValue.trim();
    if (!trimmed || baseOptions.some((opt) => opt.value === trimmed)) {
        return [...baseOptions];
    }
    return [
        { value: trimmed, label: `${trimmed} (Saved on server)` },
        ...baseOptions,
    ];
}

// ==================== Category A: General Preferences ====================

export const GeneralPreferencesCard: React.FC<{
    values: SchoolSettingsFormValues;
    errors: SchoolSettingsFieldErrors;
    disabled: boolean;
    canAccessProfile: boolean;
    onFieldChange: <K extends SchoolSettingsFieldName>(
        field: K,
        value: SchoolSettingsFormValues[K]
    ) => void;
}> = ({ values, errors, disabled, canAccessProfile, onFieldChange }) => {
    const languageOptions = buildOptionsWithPreservedValue(
        SCHOOL_LANGUAGE_OPTIONS,
        values.defaultLanguage
    );
    const timezoneOptions = buildOptionsWithPreservedValue(
        SCHOOL_TIMEZONE_OPTIONS,
        values.timezone
    );
    const dateFormatOptions = buildOptionsWithPreservedValue(
        SCHOOL_DATE_FORMAT_OPTIONS,
        values.dateFormat
    );
    const timeFormatOptions = buildOptionsWithPreservedValue(
        SCHOOL_TIME_FORMAT_OPTIONS,
        values.timeFormat
    );
    const weekStartOptions = buildOptionsWithPreservedValue(
        SCHOOL_WEEK_START_OPTIONS,
        values.weekStartDay
    );

    return (
        <DashboardOverviewCard title="A. General & Regional Preferences">
            <div className="space-y-5">
                <div className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        School identity, country, address, contact details, logos, and brand colors
                        are managed separately in School Profile &amp; Branding.
                    </span>
                    {canAccessProfile && (
                        <Link
                            to="/admin/profile"
                            className="shrink-0 font-semibold text-blue-700 hover:underline"
                        >
                            Go to School Profile →
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="settings-language"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Default Language Preference
                        </label>
                        <select
                            id="settings-language"
                            disabled={disabled}
                            value={values.defaultLanguage}
                            onChange={(e) => onFieldChange('defaultLanguage', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        >
                            <option value="">Platform default / Unset</option>
                            {languageOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        {errors.defaultLanguage ? (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {errors.defaultLanguage}
                            </p>
                        ) : (
                            <p className="mt-1 text-xs text-gray-500">
                                Preference stored for future multi-language localization support.
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="settings-timezone"
                            className="block text-sm font-medium text-gray-800"
                        >
                            School Time Zone
                        </label>
                        <select
                            id="settings-timezone"
                            disabled={disabled}
                            value={values.timezone}
                            onChange={(e) => onFieldChange('timezone', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        >
                            <option value="">Platform default / Unset</option>
                            {timezoneOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        {errors.timezone ? (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {errors.timezone}
                            </p>
                        ) : (
                            <p className="mt-1 text-xs text-gray-500">
                                Governs school schedule, deadline, and operational timestamp display.
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="settings-date-format"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Date Display Format
                        </label>
                        <select
                            id="settings-date-format"
                            disabled={disabled}
                            value={values.dateFormat}
                            onChange={(e) => onFieldChange('dateFormat', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        >
                            <option value="">Platform default / Unset</option>
                            {dateFormatOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        {errors.dateFormat && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {errors.dateFormat}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="settings-time-format"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Time Display Format
                        </label>
                        <select
                            id="settings-time-format"
                            disabled={disabled}
                            value={values.timeFormat}
                            onChange={(e) => onFieldChange('timeFormat', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        >
                            <option value="">Platform default / Unset</option>
                            {timeFormatOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        {errors.timeFormat && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {errors.timeFormat}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="settings-week-start"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Academic Week-Start Day
                        </label>
                        <select
                            id="settings-week-start"
                            disabled={disabled}
                            value={values.weekStartDay}
                            onChange={(e) => onFieldChange('weekStartDay', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        >
                            <option value="">Platform default / Unset</option>
                            {weekStartOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        {errors.weekStartDay && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {errors.weekStartDay}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </DashboardOverviewCard>
    );
};

// ==================== Category B: Registration & Enrollment Policy ====================

export const RegistrationPolicyCard: React.FC<{
    values: SchoolSettingsFormValues;
    verifiedDomainAllowsRegistration: boolean;
    disabled: boolean;
    onFieldChange: <K extends SchoolSettingsFieldName>(
        field: K,
        value: SchoolSettingsFormValues[K]
    ) => void;
}> = ({ values, verifiedDomainAllowsRegistration, disabled, onFieldChange }) => (
    <DashboardOverviewCard title="B. Student Registration & Enrollment Policies">
        <div className="space-y-4">
            <div className="flex flex-col gap-2 rounded-md border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-950 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="font-semibold">
                        Verified Domain Sync Status ({' '}
                        <code>allowsPublicRegistration</code>):{' '}
                        <span
                            className={
                                verifiedDomainAllowsRegistration
                                    ? 'text-emerald-700'
                                    : 'text-gray-700'
                            }
                        >
                            {verifiedDomainAllowsRegistration ? 'Enabled' : 'Disabled'}
                        </span>
                    </p>
                    <p className="mt-0.5 text-blue-900">
                        Public access to <code>/register</code> on your school domain follows the
                        backend-verified tenant contract resolved by{' '}
                        <code>TenantProvider</code>. Updating the setting below persists policy on
                        the server, which domain verification then propagates safely.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <ToggleSettingRow
                    id="settings-public-reg"
                    label="Allow Public Student Registration"
                    description="Permits prospective students on this school's verified domain to submit self-registration requests via the public portal."
                    checked={values.allowPublicStudentRegistration}
                    disabled={disabled}
                    onChange={(checked) => onFieldChange('allowPublicStudentRegistration', checked)}
                />

                <ToggleSettingRow
                    id="settings-reg-approval"
                    label="Require School Admin Approval for New Student Registrations"
                    description="Holds newly registered student accounts pending manual approval (students.approve) before full activation."
                    checked={values.requireAdminApprovalForRegistration}
                    disabled={disabled}
                    onChange={(checked) =>
                        onFieldChange('requireAdminApprovalForRegistration', checked)
                    }
                />

                <ToggleSettingRow
                    id="settings-self-enroll"
                    label="Allow Student Self-Enrollment"
                    description="Permits approved student accounts to submit enrollment requests into eligible programs and courses."
                    checked={values.allowStudentSelfEnrollment}
                    disabled={disabled}
                    onChange={(checked) => onFieldChange('allowStudentSelfEnrollment', checked)}
                />

                <ToggleSettingRow
                    id="settings-pre-browse"
                    label="Allow Pre-Enrollment Course & Program Browsing"
                    description="Lets authenticated prospective or unassigned students view available academic offerings prior to enrollment."
                    checked={values.allowPreEnrollmentProgramBrowse}
                    disabled={disabled}
                    onChange={(checked) =>
                        onFieldChange('allowPreEnrollmentProgramBrowse', checked)
                    }
                />

                <ToggleSettingRow
                    id="settings-pending-portal"
                    label="Allow Portal Access Prior to Enrollment Approval"
                    description="Allows newly approved student accounts to sign in to basic student dashboard screens before their course enrollment is finalized."
                    checked={values.allowPendingStudentPortalAccess}
                    disabled={disabled}
                    onChange={(checked) =>
                        onFieldChange('allowPendingStudentPortalAccess', checked)
                    }
                />
            </div>
        </div>
    </DashboardOverviewCard>
);

// ==================== Category C: Notification Defaults ====================

export const NotificationDefaultsCard: React.FC<{
    values: SchoolSettingsFormValues;
    disabled: boolean;
    onFieldChange: <K extends SchoolSettingsFieldName>(
        field: K,
        value: SchoolSettingsFormValues[K]
    ) => void;
}> = ({ values, disabled, onFieldChange }) => (
    <DashboardOverviewCard title="C. Notification Defaults">
        <div className="space-y-3">
            <p className="text-xs text-gray-600">
                School-wide default delivery preferences for operational notifications and
                announcements. Provider and email delivery templates are configured separately on the
                backend.
            </p>

            <ToggleSettingRow
                id="settings-announcements"
                label="Enable School-Wide Announcements"
                description="Allows authorized staff to publish school-wide and cohort announcements."
                checked={values.schoolAnnouncementsEnabled}
                disabled={disabled}
                onChange={(checked) => onFieldChange('schoolAnnouncementsEnabled', checked)}
            />

            <ToggleSettingRow
                id="settings-student-announcements"
                label="Deliver General Academic Announcements to Students"
                description="Includes active student accounts in general academic announcements when school announcements are enabled."
                checked={
                    values.schoolAnnouncementsEnabled &&
                    values.notifyStudentsOfAcademicAnnouncements
                }
                disabled={disabled || !values.schoolAnnouncementsEnabled}
                onChange={(checked) =>
                    onFieldChange('notifyStudentsOfAcademicAnnouncements', checked)
                }
            />

            <ToggleSettingRow
                id="settings-email-notif"
                label="Enable Email Notification Channel by Default"
                description="Enables outbound institutional email alerts for supported operational and academic events."
                checked={values.emailNotificationsEnabled}
                disabled={disabled}
                onChange={(checked) => onFieldChange('emailNotificationsEnabled', checked)}
            />

            <ToggleSettingRow
                id="settings-inapp-notif"
                label="Enable In-App Notifications by Default"
                description="Displays dashboard notification updates inside signed-in school user portals."
                checked={values.inAppNotificationsEnabled}
                disabled={disabled}
                onChange={(checked) => onFieldChange('inAppNotificationsEnabled', checked)}
            />
        </div>
    </DashboardOverviewCard>
);

// ==================== Category D: Security Preferences ====================

export const SecurityPreferencesCard: React.FC<{
    values: SchoolSettingsFormValues;
    errors: SchoolSettingsFieldErrors;
    disabled: boolean;
    onFieldChange: <K extends SchoolSettingsFieldName>(
        field: K,
        value: SchoolSettingsFormValues[K]
    ) => void;
}> = ({ values, errors, disabled, onFieldChange }) => (
    <DashboardOverviewCard title="D. School Security & Session Preferences">
        <div className="space-y-4">
            <p className="text-xs text-gray-600">
                School-scoped session and authentication policy preferences. Global platform
                security controls remain managed strictly by Platform Administrators.
            </p>

            <div>
                <label
                    htmlFor="settings-session-timeout"
                    className="block text-sm font-medium text-gray-800"
                >
                    School Session Idle Timeout Preference (Minutes, Optional)
                </label>
                <input
                    id="settings-session-timeout"
                    type="number"
                    min={SESSION_TIMEOUT_MIN_MINUTES}
                    max={SESSION_TIMEOUT_MAX_MINUTES}
                    step={5}
                    disabled={disabled}
                    value={values.sessionTimeoutMinutes}
                    onChange={(e) => onFieldChange('sessionTimeoutMinutes', e.target.value)}
                    placeholder="Leave blank for platform default"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 sm:max-w-xs"
                />
                {errors.sessionTimeoutMinutes ? (
                    <p role="alert" className="mt-1 text-xs text-red-600">
                        {errors.sessionTimeoutMinutes}
                    </p>
                ) : (
                    <p className="mt-1 text-xs text-gray-500">
                        Allowed range when explicitly set: {SESSION_TIMEOUT_MIN_MINUTES}–
                        {SESSION_TIMEOUT_MAX_MINUTES} minutes. Blank uses platform policy.
                    </p>
                )}
            </div>

            <ToggleSettingRow
                id="settings-strong-staff-auth"
                label="Require Stronger Authentication Policy for School Staff"
                description="Policy preference signaling that School Admin, Teacher, and Accountant logins should enforce enhanced verification once MFA workflows are enabled by the backend."
                checked={values.requireStrongerStaffAuth}
                disabled={disabled}
                onChange={(checked) => onFieldChange('requireStrongerStaffAuth', checked)}
            />
        </div>
    </DashboardOverviewCard>
);

// ==================== Category E: Academic & Operational Defaults ====================

export const AcademicDefaultsCard: React.FC<{
    savedSettings: SchoolSettings;
    values: SchoolSettingsFormValues;
    errors: SchoolSettingsFieldErrors;
    disabled: boolean;
    canReadAcademicYears: boolean;
    canReadTerms: boolean;
    canAccessAcademicStructure: boolean;
    academicYears: readonly AcademicYear[];
    yearsLoaded: boolean;
    terms: readonly AcademicTerm[];
    termsLoaded: boolean;
    onFieldChange: <K extends SchoolSettingsFieldName>(
        field: K,
        value: SchoolSettingsFormValues[K]
    ) => void;
}> = ({
    savedSettings,
    values,
    errors,
    disabled,
    canReadAcademicYears,
    canReadTerms,
    canAccessAcademicStructure,
    academicYears,
    yearsLoaded,
    terms,
    termsLoaded,
    onFieldChange,
}) => {
    const selectableYears = academicYears.filter((year) => year.status !== 'ARCHIVED');
    const savedYearId = savedSettings.academicDefaults.defaultAcademicYearId;
    const savedYearLabel = savedSettings.academicDefaults.defaultAcademicYearName;
    const hasMissingOrArchivedYear =
        Boolean(values.defaultAcademicYearId) &&
        yearsLoaded &&
        !selectableYears.some((y) => y.id === values.defaultAcademicYearId);

    const selectableTerms = terms.filter((term) => term.status !== 'ARCHIVED');
    const savedTermId = savedSettings.academicDefaults.defaultTermId;
    const savedTermLabel = savedSettings.academicDefaults.defaultTermName;
    const hasMissingOrArchivedTerm =
        Boolean(values.defaultTermId) &&
        termsLoaded &&
        !selectableTerms.some((t) => t.id === values.defaultTermId);

    return (
        <DashboardOverviewCard title="E. Academic & Operational Defaults">
            <div className="space-y-4">
                <div className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        Selecting a default academic year or term here configures operational
                        display/filtering defaults only. It does not create, modify, or activate
                        academic calendar status.
                    </span>
                    {canAccessAcademicStructure && (
                        <Link
                            to="/admin/academic-structure"
                            className="shrink-0 font-semibold text-blue-700 hover:underline"
                        >
                            Manage Academic Structure →
                        </Link>
                    )}
                </div>

                {!canReadAcademicYears ? (
                    <div
                        role="note"
                        className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
                    >
                        Browsing or changing Default Academic Year / Term requires{' '}
                        <code>{PERMISSIONS.ACADEMIC_YEARS.READ}</code> and{' '}
                        <code>{PERMISSIONS.TERMS.READ}</code> permissions. Saved values remain
                        preserved unchanged (Year: {savedYearLabel || savedYearId || 'Unset'}, Term:{' '}
                        {savedTermLabel || savedTermId || 'Unset'}).
                    </div>
                ) : !yearsLoaded ? (
                    <div
                        role="note"
                        className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
                    >
                        Academic year options could not be loaded (Academic Years API may still be
                        pending). Existing saved defaults (Year:{' '}
                        {savedYearLabel || savedYearId || 'Unset'}, Term:{' '}
                        {savedTermLabel || savedTermId || 'Unset'}) are preserved without
                        modification.
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="settings-default-ay"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Default Academic Year Preference
                        </label>
                        <select
                            id="settings-default-ay"
                            disabled={disabled || !canReadAcademicYears || !yearsLoaded}
                            value={values.defaultAcademicYearId}
                            onChange={(e) => onFieldChange('defaultAcademicYearId', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        >
                            <option value="">None / Use current active year</option>
                            {hasMissingOrArchivedYear && (
                                <option value={values.defaultAcademicYearId}>
                                    {savedYearLabel || values.defaultAcademicYearId} (Incompatible /
                                    Archived)
                                </option>
                            )}
                            {!yearsLoaded && values.defaultAcademicYearId && (
                                <option value={values.defaultAcademicYearId}>
                                    {savedYearLabel || values.defaultAcademicYearId} (Preserved)
                                </option>
                            )}
                            {selectableYears.map((year) => (
                                <option key={year.id} value={year.id}>
                                    {year.name} ({year.status})
                                </option>
                            ))}
                        </select>
                        {errors.defaultAcademicYearId && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {errors.defaultAcademicYearId}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="settings-default-term"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Default Term Preference
                        </label>
                        <select
                            id="settings-default-term"
                            disabled={
                                disabled ||
                                !canReadAcademicYears ||
                                !canReadTerms ||
                                !values.defaultAcademicYearId ||
                                !termsLoaded
                            }
                            value={values.defaultTermId}
                            onChange={(e) => onFieldChange('defaultTermId', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        >
                            <option value="">None / Use active term in year</option>
                            {hasMissingOrArchivedTerm && (
                                <option value={values.defaultTermId}>
                                    {savedTermLabel || values.defaultTermId} (Incompatible / Archived)
                                </option>
                            )}
                            {!termsLoaded && values.defaultTermId && (
                                <option value={values.defaultTermId}>
                                    {savedTermLabel || values.defaultTermId} (Preserved)
                                </option>
                            )}
                            {selectableTerms.map((term) => (
                                <option key={term.id} value={term.id}>
                                    {term.name} ({term.status})
                                </option>
                            ))}
                        </select>
                        {errors.defaultTermId ? (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {errors.defaultTermId}
                            </p>
                        ) : !canReadTerms && canReadAcademicYears ? (
                            <p className="mt-1 text-xs text-gray-500">
                                Term selection requires <code>{PERMISSIONS.TERMS.READ}</code>.
                            </p>
                        ) : null}
                    </div>
                </div>

                <ToggleSettingRow
                    id="settings-show-calendar-students"
                    label="Show Academic Calendar Overview to Students"
                    description="Displays active academic year and term schedule summaries in student-facing dashboard views."
                    checked={values.showAcademicCalendarToStudents}
                    disabled={disabled}
                    onChange={(checked) => onFieldChange('showAcademicCalendarToStudents', checked)}
                />
            </div>
        </DashboardOverviewCard>
    );
};
