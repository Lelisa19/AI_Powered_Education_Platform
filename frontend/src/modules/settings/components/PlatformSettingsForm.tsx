import React from 'react';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import {
    PLATFORM_LOCALE_OPTIONS,
    PLATFORM_TIMEZONE_OPTIONS,
} from '../schemas/platform-settings-schema';
import type {
    PlatformSettingsFieldErrors,
    PlatformSettingsFieldName,
    PlatformSettingsFormValues,
} from '../types/platform-settings.types';

interface PlatformSettingsFormProps {
    values: PlatformSettingsFormValues;
    fieldErrors: PlatformSettingsFieldErrors;
    hasUnsavedChanges: boolean;
    isSaving: boolean;
    onFieldChange: <K extends PlatformSettingsFieldName>(
        field: K,
        value: PlatformSettingsFormValues[K]
    ) => void;
    onCancelChanges: () => void;
    onSubmit: () => void;
}

function getInputClassName(hasError: boolean): string {
    return `mt-1 block w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${
        hasError
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-blue-600 focus:ring-blue-600'
    }`;
}

export const PlatformSettingsForm: React.FC<PlatformSettingsFormProps> = ({
    values,
    fieldErrors,
    hasUnsavedChanges,
    isSaving,
    onFieldChange,
    onCancelChanges,
    onSubmit,
}) => {
    const hasCustomTimezone =
        Boolean(values.defaultTimezone) &&
        !PLATFORM_TIMEZONE_OPTIONS.some((option) => option.value === values.defaultTimezone);

    const hasCustomLocale =
        Boolean(values.defaultLocale) &&
        !PLATFORM_LOCALE_OPTIONS.some((option) => option.value === values.defaultLocale);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit();
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* A. General Platform Information */}
            <DashboardOverviewCard title="General Platform Information" headingLevel="h2">
                <div className="space-y-5">
                    <p className="text-sm text-gray-600">
                        Provider-level identity, support channels, and public website metadata shared across the platform.
                    </p>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label
                                htmlFor="platform-display-name"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Platform Display Name <span className="text-red-600">*</span>
                            </label>
                            <input
                                id="platform-display-name"
                                type="text"
                                required
                                maxLength={120}
                                disabled={isSaving}
                                value={values.platformDisplayName}
                                onChange={(event) =>
                                    onFieldChange('platformDisplayName', event.target.value)
                                }
                                aria-invalid={Boolean(fieldErrors.platformDisplayName)}
                                aria-describedby={
                                    fieldErrors.platformDisplayName
                                        ? 'platform-display-name-error'
                                        : undefined
                                }
                                className={getInputClassName(Boolean(fieldErrors.platformDisplayName))}
                            />
                            {fieldErrors.platformDisplayName && (
                                <p
                                    id="platform-display-name-error"
                                    role="alert"
                                    className="mt-1 text-xs text-red-700"
                                >
                                    {fieldErrors.platformDisplayName}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="support-contact-email"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Platform Support Contact Email <span className="text-red-600">*</span>
                            </label>
                            <input
                                id="support-contact-email"
                                type="email"
                                required
                                maxLength={254}
                                disabled={isSaving}
                                value={values.supportContactEmail}
                                onChange={(event) =>
                                    onFieldChange('supportContactEmail', event.target.value)
                                }
                                aria-invalid={Boolean(fieldErrors.supportContactEmail)}
                                aria-describedby={
                                    fieldErrors.supportContactEmail
                                        ? 'support-contact-email-error'
                                        : undefined
                                }
                                className={getInputClassName(Boolean(fieldErrors.supportContactEmail))}
                            />
                            {fieldErrors.supportContactEmail && (
                                <p
                                    id="support-contact-email-error"
                                    role="alert"
                                    className="mt-1 text-xs text-red-700"
                                >
                                    {fieldErrors.supportContactEmail}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label
                                htmlFor="public-website-url"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Platform Public Website URL
                            </label>
                            <input
                                id="public-website-url"
                                type="url"
                                maxLength={2048}
                                disabled={isSaving}
                                placeholder="https://platform.example.com"
                                value={values.publicWebsiteUrl}
                                onChange={(event) =>
                                    onFieldChange('publicWebsiteUrl', event.target.value)
                                }
                                aria-invalid={Boolean(fieldErrors.publicWebsiteUrl)}
                                aria-describedby={
                                    fieldErrors.publicWebsiteUrl
                                        ? 'public-website-url-error'
                                        : 'public-website-url-hint'
                                }
                                className={getInputClassName(Boolean(fieldErrors.publicWebsiteUrl))}
                            />
                            {fieldErrors.publicWebsiteUrl ? (
                                <p
                                    id="public-website-url-error"
                                    role="alert"
                                    className="mt-1 text-xs text-red-700"
                                >
                                    {fieldErrors.publicWebsiteUrl}
                                </p>
                            ) : (
                                <p id="public-website-url-hint" className="mt-1 text-xs text-gray-500">
                                    Public URL for the shared platform website (separate from individual school domains).
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label
                                htmlFor="public-website-description"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Platform Public Website Description
                            </label>
                            <textarea
                                id="public-website-description"
                                rows={2}
                                maxLength={300}
                                disabled={isSaving}
                                value={values.publicWebsiteDescription}
                                onChange={(event) =>
                                    onFieldChange('publicWebsiteDescription', event.target.value)
                                }
                                aria-invalid={Boolean(fieldErrors.publicWebsiteDescription)}
                                aria-describedby={
                                    fieldErrors.publicWebsiteDescription
                                        ? 'public-website-description-error'
                                        : undefined
                                }
                                className={getInputClassName(
                                    Boolean(fieldErrors.publicWebsiteDescription)
                                )}
                            />
                            {fieldErrors.publicWebsiteDescription && (
                                <p
                                    id="public-website-description-error"
                                    role="alert"
                                    className="mt-1 text-xs text-red-700"
                                >
                                    {fieldErrors.publicWebsiteDescription}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label
                                htmlFor="support-contact-info"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Platform Support Contact Information
                            </label>
                            <textarea
                                id="support-contact-info"
                                rows={3}
                                maxLength={500}
                                disabled={isSaving}
                                value={values.supportContactInfo}
                                onChange={(event) =>
                                    onFieldChange('supportContactInfo', event.target.value)
                                }
                                aria-invalid={Boolean(fieldErrors.supportContactInfo)}
                                aria-describedby={
                                    fieldErrors.supportContactInfo
                                        ? 'support-contact-info-error'
                                        : 'support-contact-info-hint'
                                }
                                className={getInputClassName(Boolean(fieldErrors.supportContactInfo))}
                            />
                            {fieldErrors.supportContactInfo ? (
                                <p
                                    id="support-contact-info-error"
                                    role="alert"
                                    className="mt-1 text-xs text-red-700"
                                >
                                    {fieldErrors.supportContactInfo}
                                </p>
                            ) : (
                                <p id="support-contact-info-hint" className="mt-1 text-xs text-gray-500">
                                    Provider support hours, escalation phone line, or general support guidance.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </DashboardOverviewCard>

            {/* B. Platform Defaults */}
            <DashboardOverviewCard title="Platform Defaults" headingLevel="h2">
                <div className="space-y-5">
                    <p className="text-sm text-gray-600">
                        Provider-wide defaults applied across shared platform workflows. Individual schools manage their own institutional preferences in School Settings.
                    </p>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label
                                htmlFor="default-timezone"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Default Platform Timezone
                            </label>
                            <select
                                id="default-timezone"
                                disabled={isSaving}
                                value={values.defaultTimezone}
                                onChange={(event) =>
                                    onFieldChange('defaultTimezone', event.target.value)
                                }
                                aria-invalid={Boolean(fieldErrors.defaultTimezone)}
                                aria-describedby={
                                    fieldErrors.defaultTimezone
                                        ? 'default-timezone-error'
                                        : undefined
                                }
                                className={`bg-white ${getInputClassName(Boolean(fieldErrors.defaultTimezone))}`}
                            >
                                <option value="">Not configured</option>
                                {hasCustomTimezone && (
                                    <option value={values.defaultTimezone}>
                                        {values.defaultTimezone}
                                    </option>
                                )}
                                {PLATFORM_TIMEZONE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors.defaultTimezone && (
                                <p
                                    id="default-timezone-error"
                                    role="alert"
                                    className="mt-1 text-xs text-red-700"
                                >
                                    {fieldErrors.defaultTimezone}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="default-locale"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Default Language / Locale
                            </label>
                            <select
                                id="default-locale"
                                disabled={isSaving}
                                value={values.defaultLocale}
                                onChange={(event) =>
                                    onFieldChange('defaultLocale', event.target.value)
                                }
                                aria-invalid={Boolean(fieldErrors.defaultLocale)}
                                aria-describedby={
                                    fieldErrors.defaultLocale ? 'default-locale-error' : undefined
                                }
                                className={`bg-white ${getInputClassName(Boolean(fieldErrors.defaultLocale))}`}
                            >
                                <option value="">Not configured</option>
                                {hasCustomLocale && (
                                    <option value={values.defaultLocale}>
                                        {values.defaultLocale}
                                    </option>
                                )}
                                {PLATFORM_LOCALE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors.defaultLocale && (
                                <p
                                    id="default-locale-error"
                                    role="alert"
                                    className="mt-1 text-xs text-red-700"
                                >
                                    {fieldErrors.defaultLocale}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </DashboardOverviewCard>

            {/* C. Platform Operational Configuration */}
            <DashboardOverviewCard title="Platform Operational Configuration" headingLevel="h2">
                <div className="space-y-5">
                    <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                            <input
                                id="maintenance-mode-enabled"
                                type="checkbox"
                                disabled={isSaving}
                                checked={values.maintenanceModeEnabled}
                                onChange={(event) =>
                                    onFieldChange('maintenanceModeEnabled', event.target.checked)
                                }
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50"
                            />
                            <div>
                                <label
                                    htmlFor="maintenance-mode-enabled"
                                    className="block text-sm font-medium text-gray-900"
                                >
                                    Platform-Wide Maintenance Mode
                                </label>
                                <p className="mt-0.5 text-xs text-gray-600">
                                    Signals platform-wide planned maintenance status across provider-managed surfaces when supported by the backend.
                                </p>
                            </div>
                        </div>

                        <span
                            className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                values.maintenanceModeEnabled
                                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                                    : 'border-green-200 bg-green-50 text-green-700'
                            }`}
                        >
                            {values.maintenanceModeEnabled
                                ? 'Maintenance Mode Enabled'
                                : 'Normal Operation'}
                        </span>
                    </div>

                    <div>
                        <label
                            htmlFor="maintenance-notice"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Platform-Wide Maintenance Notice
                            {values.maintenanceModeEnabled && (
                                <span className="ml-1 text-red-600">*</span>
                            )}
                        </label>
                        <textarea
                            id="maintenance-notice"
                            rows={3}
                            maxLength={500}
                            disabled={isSaving}
                            placeholder="Describe scheduled maintenance timing and expected impact."
                            value={values.maintenanceNotice}
                            onChange={(event) =>
                                onFieldChange('maintenanceNotice', event.target.value)
                            }
                            aria-invalid={Boolean(fieldErrors.maintenanceNotice)}
                            aria-describedby={
                                fieldErrors.maintenanceNotice
                                    ? 'maintenance-notice-error'
                                    : 'maintenance-notice-hint'
                            }
                            className={getInputClassName(Boolean(fieldErrors.maintenanceNotice))}
                        />
                        {fieldErrors.maintenanceNotice ? (
                            <p
                                id="maintenance-notice-error"
                                role="alert"
                                className="mt-1 text-xs text-red-700"
                            >
                                {fieldErrors.maintenanceNotice}
                            </p>
                        ) : (
                            <p id="maintenance-notice-hint" className="mt-1 text-xs text-gray-500">
                                Required when maintenance mode is enabled (up to 500 characters).
                            </p>
                        )}
                    </div>
                </div>
            </DashboardOverviewCard>

            {/* Form Action Bar */}
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="text-sm">
                    {hasUnsavedChanges ? (
                        <span className="inline-flex items-center gap-2 font-medium text-amber-800">
                            <span
                                className="h-2 w-2 rounded-full bg-amber-500"
                                aria-hidden="true"
                            />
                            You have unsaved platform settings changes.
                        </span>
                    ) : (
                        <span className="text-gray-500">All displayed settings match saved server state.</span>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                    <button
                        type="button"
                        disabled={!hasUnsavedChanges || isSaving}
                        onClick={onCancelChanges}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel Changes
                    </button>
                    <button
                        type="submit"
                        disabled={!hasUnsavedChanges || isSaving}
                        className="inline-flex items-center rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving ? 'Saving Settings...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </form>
    );
};

