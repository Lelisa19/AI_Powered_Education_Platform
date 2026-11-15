import React, { useState } from 'react';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PERMISSIONS, SCHOOL_ADMIN_ROUTE_PERMISSIONS } from '../../../constants/permissions';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import {
    AcademicDefaultsCard,
    GeneralPreferencesCard,
    NotificationDefaultsCard,
    RegistrationPolicyCard,
    SecurityPreferencesCard,
} from '../components/SchoolSettingsCategoryCards';
import { useSchoolSettings } from '../hooks/useSchoolSettings';
import { formatSchoolSettingsTimestamp } from '../schemas/school-settings-schema';
import type { SchoolSettingsCategoryId } from '../types/school-settings.types';

type SettingsViewFilter = 'ALL' | SchoolSettingsCategoryId;

const CATEGORY_FILTER_TABS: readonly { id: SettingsViewFilter; label: string }[] = [
    { id: 'ALL', label: 'All Settings' },
    { id: 'general', label: 'General' },
    { id: 'registration', label: 'Registration & Enrollment' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
    { id: 'academic', label: 'Academic Defaults' },
];

function getCategoryErrorCount(
    errors: Partial<Record<string, string>>,
    category: SchoolSettingsCategoryId
): number {
    if (category === 'general') {
        return [
            errors.defaultLanguage,
            errors.timezone,
            errors.dateFormat,
            errors.timeFormat,
            errors.weekStartDay,
        ].filter(Boolean).length;
    }
    if (category === 'security') {
        return [errors.sessionTimeoutMinutes, errors.requireStrongerStaffAuth].filter(Boolean)
            .length;
    }
    if (category === 'academic') {
        return [
            errors.defaultAcademicYearId,
            errors.defaultTermId,
            errors.showAcademicCalendarToStudents,
        ].filter(Boolean).length;
    }
    return 0;
}

export const SchoolSettingsPage: React.FC = () => {
    const { user } = useAuth();
    const {
        classification,
        tenantId,
        schoolName,
        hostname,
        allowsPublicRegistration,
    } = useTenantContext();
    const { hasPermission, hasAnyPermission } = usePermissions();

    const canReadSettings = hasPermission(PERMISSIONS.SETTINGS.READ);
    const canUpdateSettings = hasPermission(PERMISSIONS.SETTINGS.UPDATE);
    const canReadAcademicYears = hasPermission(PERMISSIONS.ACADEMIC_YEARS.READ);
    const canReadTerms = hasPermission(PERMISSIONS.TERMS.READ);
    const canAccessProfile = hasAnyPermission([...SCHOOL_ADMIN_ROUTE_PERMISSIONS.PROFILE]);
    const canAccessAcademicStructure = hasAnyPermission([
        ...SCHOOL_ADMIN_ROUTE_PERMISSIONS.ACADEMIC_STRUCTURE,
    ]);

    const isVerifiedSchoolSession =
        classification === 'SCHOOL' &&
        Boolean(tenantId) &&
        user?.accountType === 'SCHOOL' &&
        user.tenantId === tenantId;

    const [activeCategory, setActiveCategory] = useState<SettingsViewFilter>('ALL');
    const [pendingDiscardAction, setPendingDiscardAction] = useState<'reload' | 'reset' | null>(
        null
    );
    const [pendingConsequentialWarnings, setPendingConsequentialWarnings] = useState<
        string[] | null
    >(null);

    const {
        savedSettings,
        formValues,
        fieldErrors,
        isLoading,
        loadError,
        isSaving,
        saveError,
        saveNotice,
        hasUnsavedChanges,
        categoryDirtyMap,
        compatibilityWarnings,
        academicYears,
        yearsLoaded,
        terms,
        termsLoaded,
        updateField,
        discardUnsavedChanges,
        saveSettings,
        reloadAll,
    } = useSchoolSettings({
        tenantId,
        enabled: isVerifiedSchoolSession && canReadSettings,
        canUpdate: canUpdateSettings,
        canReadAcademicYears,
        canReadTerms,
    });

    const displaySchoolName = schoolName || hostname || 'Verified School';
    const isBusy = isLoading || isSaving;

    const handleRefreshClick = () => {
        if (isBusy) return;
        if (hasUnsavedChanges) {
            setPendingDiscardAction('reload');
            return;
        }
        setPendingDiscardAction(null);
        reloadAll();
    };

    const handleDiscardClick = () => {
        if (isBusy || !hasUnsavedChanges) return;
        setPendingDiscardAction('reset');
    };

    const handleConfirmDiscard = () => {
        const action = pendingDiscardAction;
        setPendingDiscardAction(null);
        setPendingConsequentialWarnings(null);
        if (action === 'reload') {
            reloadAll();
        } else if (action === 'reset') {
            discardUnsavedChanges();
        }
    };

    const handleSubmitSave = async (event?: React.FormEvent) => {
        if (event) {
            event.preventDefault();
        }
        if (!canUpdateSettings || isBusy) return;
        setPendingDiscardAction(null);

        const outcome = await saveSettings();
        if (outcome.status === 'needs-confirmation') {
            setPendingConsequentialWarnings(outcome.warnings);
        } else {
            setPendingConsequentialWarnings(null);
        }
    };

    const handleConfirmConsequentialSave = async () => {
        if (!canUpdateSettings || isBusy) return;
        await saveSettings({ skipConfirmation: true });
        setPendingConsequentialWarnings(null);
    };

    if (!isVerifiedSchoolSession) {
        return (
            <div className="mx-auto max-w-5xl">
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access Denied: School Settings can only be accessed inside a verified school
                    tenant administrator session.
                </div>
            </div>
        );
    }

    const lastUpdatedLabel = formatSchoolSettingsTimestamp(savedSettings?.updatedAt);
    const updatedByLabel = savedSettings?.updatedBy
        ? savedSettings.updatedBy.name || savedSettings.updatedBy.email || null
        : null;
    const isReadOnlyMode = !canUpdateSettings;
    const totalValidationErrorCount = Object.values(fieldErrors).filter(Boolean).length;

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <DashboardPageHeader
                        title="School Settings"
                        subtitle={`Configure operational preferences, registration policies, notification defaults, security rules, and academic defaults for ${displaySchoolName}.`}
                    />
                    {(lastUpdatedLabel || updatedByLabel || hasUnsavedChanges) && (
                        <div className="-mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            {hasUnsavedChanges && (
                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-800">
                                    Unsaved Changes
                                </span>
                            )}
                            {lastUpdatedLabel && <span>Last saved: {lastUpdatedLabel}</span>}
                            {updatedByLabel && <span>Updated by: {updatedByLabel}</span>}
                        </div>
                    )}
                </div>

                {canReadSettings && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            disabled={isBusy}
                            onClick={handleRefreshClick}
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isLoading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                )}
            </div>

            {!canReadSettings ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access Denied: Viewing school operational settings requires the{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.SETTINGS.READ}
                    </code>{' '}
                    permission.
                </div>
            ) : (
                <>
                    {isReadOnlyMode && savedSettings && (
                        <div
                            role="note"
                            className="rounded-md border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900"
                        >
                            Read-only access: modifying school operational settings requires the{' '}
                            <code className="rounded bg-blue-100 px-1 py-0.5 font-mono">
                                {PERMISSIONS.SETTINGS.UPDATE}
                            </code>{' '}
                            permission.
                        </div>
                    )}

                    {compatibilityWarnings.length > 0 && (
                        <div
                            role="note"
                            className="rounded-md border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"
                        >
                            <p className="font-semibold">
                                Settings Compatibility Notices (Preserved from Server):
                            </p>
                            <ul className="mt-1.5 list-disc space-y-1 pl-4">
                                {compatibilityWarnings.map((warning) => (
                                    <li key={warning}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {pendingDiscardAction && hasUnsavedChanges && (
                        <div
                            role="alertdialog"
                            aria-label="Confirm discarding unsaved school settings"
                            className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <p className="text-sm text-amber-900">
                                {pendingDiscardAction === 'reload'
                                    ? 'You have unsaved settings changes. Reloading from the server will discard your local edits.'
                                    : 'Discard all unsaved changes and revert settings to the last saved configuration?'}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPendingDiscardAction(null)}
                                    className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
                                >
                                    Keep Editing
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDiscard}
                                    className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
                                >
                                    {pendingDiscardAction === 'reload'
                                        ? 'Discard & Reload'
                                        : 'Discard Changes'}
                                </button>
                            </div>
                        </div>
                    )}

                    {pendingConsequentialWarnings && (
                        <div
                            role="alertdialog"
                            aria-label="Confirm consequential school policy changes"
                            className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4"
                        >
                            <p className="text-sm font-semibold text-amber-950">
                                Review Consequential Policy Changes Before Saving
                            </p>
                            <ul className="list-disc space-y-1 pl-5 text-xs text-amber-900">
                                {pendingConsequentialWarnings.map((msg) => (
                                    <li key={msg}>{msg}</li>
                                ))}
                            </ul>
                            <div className="flex flex-wrap justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => setPendingConsequentialWarnings(null)}
                                    className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={handleConfirmConsequentialSave}
                                    className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Confirm & Save Settings'}
                                </button>
                            </div>
                        </div>
                    )}

                    {saveNotice && (
                        <div
                            role="status"
                            className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
                        >
                            {saveNotice}
                        </div>
                    )}

                    {saveError && (
                        <div
                            role="alert"
                            className={`rounded-md border p-4 text-sm ${
                                saveError.isBackendUnavailable
                                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                                    : 'border-red-200 bg-red-50 text-red-800'
                            }`}
                        >
                            {saveError.message}
                        </div>
                    )}

                    {totalValidationErrorCount > 0 && (
                        <div
                            role="alert"
                            className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                        >
                            Please review and fix the highlighted validation errors before saving
                            settings.
                        </div>
                    )}

                    {isLoading ? (
                        <div
                            role="status"
                            className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center shadow-sm"
                        >
                            <div
                                className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
                                aria-hidden="true"
                            />
                            <p className="text-sm font-medium text-gray-700">
                                Loading school operational settings...
                            </p>
                        </div>
                    ) : loadError ? (
                        <div
                            role="alert"
                            className={`rounded-lg border p-6 shadow-sm ${
                                loadError.isBackendUnavailable
                                    ? 'border-amber-200 bg-amber-50 text-amber-950'
                                    : 'border-red-200 bg-red-50 text-red-900'
                            }`}
                        >
                            <h2 className="text-base font-semibold">
                                {loadError.isBackendUnavailable
                                    ? 'School Settings Service Pending Backend Implementation'
                                    : 'Unable to Load School Settings'}
                            </h2>
                            <p className="mt-2 text-sm">
                                {loadError.isBackendUnavailable
                                    ? 'The backend endpoint (GET /api/school/settings) is not yet available in this environment. No simulated or cached settings were substituted.'
                                    : loadError.message}
                            </p>
                            <button
                                type="button"
                                onClick={reloadAll}
                                className="mt-4 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                            >
                                Retry Connection
                            </button>
                        </div>
                    ) : savedSettings && formValues ? (
                        <form onSubmit={handleSubmitSave} className="space-y-6">
                            {/* Category Navigation Filter Tabs */}
                            <div className="border-b border-gray-200">
                                <nav
                                    role="tablist"
                                    aria-label="Settings Categories"
                                    className="-mb-px flex flex-wrap gap-2 sm:gap-4"
                                >
                                    {CATEGORY_FILTER_TABS.map((tab) => {
                                        const isActive = activeCategory === tab.id;
                                        const isDirty =
                                            tab.id !== 'ALL' && categoryDirtyMap[tab.id];
                                        const errorCount =
                                            tab.id !== 'ALL'
                                                ? getCategoryErrorCount(fieldErrors, tab.id)
                                                : totalValidationErrorCount;

                                        return (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                role="tab"
                                                aria-selected={isActive}
                                                onClick={() => setActiveCategory(tab.id)}
                                                className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                                                    isActive
                                                        ? 'border-blue-600 text-blue-700'
                                                        : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'
                                                }`}
                                            >
                                                <span>{tab.label}</span>
                                                {isDirty && (
                                                    <span
                                                        className="h-2 w-2 rounded-full bg-amber-500"
                                                        title="Category has unsaved edits"
                                                        aria-label="Unsaved changes"
                                                    />
                                                )}
                                                {errorCount > 0 && tab.id !== 'ALL' && (
                                                    <span
                                                        className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-700"
                                                        aria-label={`${errorCount} validation error(s)`}
                                                    >
                                                        {errorCount}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>

                            {(activeCategory === 'ALL' || activeCategory === 'general') && (
                                <GeneralPreferencesCard
                                    values={formValues}
                                    errors={fieldErrors}
                                    disabled={isReadOnlyMode || isSaving}
                                    canAccessProfile={canAccessProfile}
                                    onFieldChange={(field, value) => {
                                        setPendingDiscardAction(null);
                                        setPendingConsequentialWarnings(null);
                                        updateField(field, value);
                                    }}
                                />
                            )}

                            {(activeCategory === 'ALL' || activeCategory === 'registration') && (
                                <RegistrationPolicyCard
                                    values={formValues}
                                    verifiedDomainAllowsRegistration={allowsPublicRegistration}
                                    disabled={isReadOnlyMode || isSaving}
                                    onFieldChange={(field, value) => {
                                        setPendingDiscardAction(null);
                                        setPendingConsequentialWarnings(null);
                                        updateField(field, value);
                                    }}
                                />
                            )}

                            {(activeCategory === 'ALL' || activeCategory === 'notifications') && (
                                <NotificationDefaultsCard
                                    values={formValues}
                                    disabled={isReadOnlyMode || isSaving}
                                    onFieldChange={(field, value) => {
                                        setPendingDiscardAction(null);
                                        setPendingConsequentialWarnings(null);
                                        updateField(field, value);
                                    }}
                                />
                            )}

                            {(activeCategory === 'ALL' || activeCategory === 'security') && (
                                <SecurityPreferencesCard
                                    values={formValues}
                                    errors={fieldErrors}
                                    disabled={isReadOnlyMode || isSaving}
                                    onFieldChange={(field, value) => {
                                        setPendingDiscardAction(null);
                                        setPendingConsequentialWarnings(null);
                                        updateField(field, value);
                                    }}
                                />
                            )}

                            {(activeCategory === 'ALL' || activeCategory === 'academic') && (
                                <AcademicDefaultsCard
                                    savedSettings={savedSettings}
                                    values={formValues}
                                    errors={fieldErrors}
                                    disabled={isReadOnlyMode || isSaving}
                                    canReadAcademicYears={canReadAcademicYears}
                                    canReadTerms={canReadTerms}
                                    canAccessAcademicStructure={canAccessAcademicStructure}
                                    academicYears={academicYears}
                                    yearsLoaded={yearsLoaded}
                                    terms={terms}
                                    termsLoaded={termsLoaded}
                                    onFieldChange={(field, value) => {
                                        setPendingDiscardAction(null);
                                        setPendingConsequentialWarnings(null);
                                        updateField(field, value);
                                    }}
                                />
                            )}

                            {!isReadOnlyMode && (
                                <div className="flex flex-col-reverse gap-3 rounded-lg border border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <span className="text-xs text-gray-600">
                                        {hasUnsavedChanges
                                            ? 'You have unsaved changes across school settings.'
                                            : 'All settings are synchronized with the last server response.'}
                                    </span>

                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            disabled={!hasUnsavedChanges || isSaving}
                                            onClick={handleDiscardClick}
                                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Discard Changes
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!hasUnsavedChanges || isSaving}
                                            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isSaving ? 'Saving Settings...' : 'Save Settings'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    ) : null}
                </>
            )}
        </div>
    );
};
