import React, { useState } from 'react';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PLATFORM_PERMISSIONS } from '../../../constants/permissions';
import { usePermissions } from '../../../hooks/usePermissions';
import { PlatformSettingsForm } from '../components/PlatformSettingsForm';
import { usePlatformSettings } from '../hooks/usePlatformSettings';
import { formatPlatformSettingsTimestamp } from '../schemas/platform-settings-schema';

export const PlatformSettingsPage: React.FC = () => {
    const { hasPermission } = usePermissions();
    const canManageSettings = hasPermission(PLATFORM_PERMISSIONS.SETTINGS_MANAGE);

    const [confirmReloadOpen, setConfirmReloadOpen] = useState(false);

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
        updateField,
        cancelChanges,
        reloadSettings,
        saveSettings,
    } = usePlatformSettings(canManageSettings);

    const handleRefreshClick = () => {
        if (isLoading || isSaving) return;

        if (hasUnsavedChanges) {
            setConfirmReloadOpen(true);
            return;
        }

        setConfirmReloadOpen(false);
        reloadSettings();
    };

    const handleConfirmDiscardAndReload = () => {
        setConfirmReloadOpen(false);
        reloadSettings();
    };

    const handleCancelChanges = () => {
        setConfirmReloadOpen(false);
        cancelChanges();
    };

    const lastUpdatedLabel = formatPlatformSettingsTimestamp(savedSettings?.updatedAt);
    const updatedByLabel = savedSettings?.updatedBy
        ? savedSettings.updatedBy.name || savedSettings.updatedBy.email || null
        : null;

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <DashboardPageHeader
                        title="Platform Settings"
                        subtitle="Manage shared provider identity, platform-wide defaults, and platform operational availability."
                    />
                    {(lastUpdatedLabel || updatedByLabel) && (
                        <div className="-mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                            {lastUpdatedLabel && <span>Last saved: {lastUpdatedLabel}</span>}
                            {updatedByLabel && <span>Updated by: {updatedByLabel}</span>}
                        </div>
                    )}
                </div>

                {canManageSettings && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            disabled={isLoading || isSaving}
                            onClick={handleRefreshClick}
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isLoading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                )}
            </div>

            {!canManageSettings ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access denied: Viewing or modifying platform settings requires the{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PLATFORM_PERMISSIONS.SETTINGS_MANAGE}
                    </code>{' '}
                    permission.
                </div>
            ) : (
                <>
                    <div
                        role="note"
                        className="rounded-md border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700"
                    >
                        Platform Settings apply strictly to the shared provider platform. Individual school names, logos, domains, academic calendars, payment policies, and school settings remain isolated inside each school&apos;s own administration workspace.
                    </div>

                    {confirmReloadOpen && hasUnsavedChanges && (
                        <div
                            role="alertdialog"
                            aria-label="Confirm discarding unsaved platform settings changes"
                            className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <p className="text-sm text-amber-900">
                                You have unsaved changes. Reloading from the server will discard your local edits.
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmReloadOpen(false)}
                                    className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
                                >
                                    Keep Editing
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDiscardAndReload}
                                    className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
                                >
                                    Discard &amp; Reload
                                </button>
                            </div>
                        </div>
                    )}

                    {saveNotice && (
                        <div
                            role="status"
                            className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900"
                        >
                            {saveNotice}
                        </div>
                    )}

                    {saveError && (
                        <div
                            role={saveError.isBackendUnavailable ? 'status' : 'alert'}
                            className={`rounded-md border p-4 text-sm ${
                                saveError.isBackendUnavailable
                                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                                    : 'border-red-200 bg-red-50 text-red-800'
                            }`}
                        >
                            {saveError.message}
                        </div>
                    )}

                    {isLoading ? (
                        <DashboardOverviewCard title="Platform Configuration" headingLevel="h2">
                            <div
                                role="status"
                                className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-12 text-center"
                            >
                                <div
                                    className="mb-3 h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
                                    aria-hidden="true"
                                />
                                <p className="text-sm font-medium text-gray-700">
                                    Loading platform settings...
                                </p>
                            </div>
                        </DashboardOverviewCard>
                    ) : loadError ? (
                        loadError.isBackendUnavailable ? (
                            <div
                                role="status"
                                className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                            >
                                <h2 className="text-base font-semibold text-amber-900">
                                    Platform Settings API Pending Backend Implementation
                                </h2>
                                <p className="mx-auto mt-2 max-w-xl text-sm text-amber-800">
                                    The frontend failed closed without displaying fabricated settings because{' '}
                                    <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                                        GET /api/platform/settings
                                    </code>{' '}
                                    and{' '}
                                    <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                                        PUT /api/platform/settings
                                    </code>{' '}
                                    are unavailable ({loadError.message}).
                                </p>
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={reloadSettings}
                                        className="rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
                                    >
                                        Retry Connection
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                role="alert"
                                className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
                            >
                                <h2 className="text-base font-semibold text-red-900">
                                    Unable to Load Platform Settings
                                </h2>
                                <p className="mx-auto mt-2 max-w-xl text-sm text-red-700">
                                    {loadError.message}
                                </p>
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={reloadSettings}
                                        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 shadow-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        )
                    ) : formValues ? (
                        <PlatformSettingsForm
                            values={formValues}
                            fieldErrors={fieldErrors}
                            hasUnsavedChanges={hasUnsavedChanges}
                            isSaving={isSaving}
                            onFieldChange={(field, value) => {
                                setConfirmReloadOpen(false);
                                updateField(field, value);
                            }}
                            onCancelChanges={handleCancelChanges}
                            onSubmit={saveSettings}
                        />
                    ) : null}
                </>
            )}
        </div>
    );
};

