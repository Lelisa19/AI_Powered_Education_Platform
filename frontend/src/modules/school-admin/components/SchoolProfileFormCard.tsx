import React from 'react';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { SCHOOL_TYPE_OPTIONS, type SchoolType } from '../../../types/school.types';
import { formatSchoolProfileTimestamp } from '../schemas/school-profile-schema';
import type { SectionFetchError, SectionMutationError } from '../hooks/useSchoolProfileAndBranding';
import type {
    SchoolProfile,
    SchoolProfileFieldErrors,
    SchoolProfileFormValues,
} from '../types/school-profile.types';

interface SchoolProfileFormCardProps {
    savedProfile: SchoolProfile | null;
    values: SchoolProfileFormValues | null;
    fieldErrors: SchoolProfileFieldErrors;
    isLoading: boolean;
    loadError: SectionFetchError | null;
    canEdit: boolean;
    isSaving: boolean;
    saveError: SectionMutationError | null;
    saveNotice: string | null;
    hasUnsavedChanges: boolean;
    onFieldChange: <K extends keyof SchoolProfileFormValues>(
        field: K,
        value: SchoolProfileFormValues[K]
    ) => void;
    onCancelChanges: () => void;
    onRetryLoad: () => void;
    onSubmit: () => void;
}

export const SchoolProfileFormCard: React.FC<SchoolProfileFormCardProps> = ({
    savedProfile,
    values,
    fieldErrors,
    isLoading,
    loadError,
    canEdit,
    isSaving,
    saveError,
    saveNotice,
    hasUnsavedChanges,
    onFieldChange,
    onCancelChanges,
    onRetryLoad,
    onSubmit,
}) => {
    const lastSavedLabel = formatSchoolProfileTimestamp(savedProfile?.updatedAt);
    const updatedByLabel = savedProfile?.updatedBy
        ? savedProfile.updatedBy.name || savedProfile.updatedBy.email || null
        : null;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canEdit || isSaving) return;
        onSubmit();
    };

    const inputsDisabled = !canEdit || isSaving;

    return (
        <DashboardOverviewCard title="Institutional Identity & Contact Information" headingLevel="h2">
            <div className="space-y-6">
                {!canEdit && (
                    <div
                        role="status"
                        className="rounded-md border border-gray-200 bg-gray-100 p-3.5 text-xs text-gray-700"
                    >
                        Read-only mode: Editing school profile identity requires the{' '}
                        <code className="rounded bg-white px-1 py-0.5 font-mono">
                            school_profile.update
                        </code>{' '}
                        permission.
                    </div>
                )}

                {saveNotice && (
                    <div
                        role="status"
                        className="rounded-md border border-green-200 bg-green-50 p-3.5 text-sm text-green-900"
                    >
                        {saveNotice}
                    </div>
                )}

                {saveError && (
                    <div
                        role={saveError.isBackendUnavailable ? 'status' : 'alert'}
                        aria-live="assertive"
                        className={`rounded-md border p-3.5 text-sm ${
                            saveError.isBackendUnavailable
                                ? 'border-amber-200 bg-amber-50 text-amber-900'
                                : 'border-red-200 bg-red-50 text-red-800'
                        }`}
                    >
                        {saveError.message}
                    </div>
                )}

                {isLoading ? (
                    <div
                        role="status"
                        className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-12 text-center"
                    >
                        <div
                            className="mb-3 h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
                            aria-hidden="true"
                        />
                        <p className="text-sm font-medium text-gray-700">
                            Loading school profile...
                        </p>
                    </div>
                ) : loadError ? (
                    loadError.isBackendUnavailable ? (
                        <div
                            role="status"
                            className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                        >
                            <h3 className="text-base font-semibold text-amber-900">
                                School Profile API Pending Backend Implementation
                            </h3>
                            <p className="mx-auto mt-2 max-w-xl text-sm text-amber-800">
                                The frontend failed closed without displaying fabricated profile records because{' '}
                                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                                    GET /api/school/profile
                                </code>{' '}
                                is unavailable ({loadError.message}).
                            </p>
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={onRetryLoad}
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
                            <h3 className="text-base font-semibold text-red-900">
                                Unable to Load School Profile
                            </h3>
                            <p className="mx-auto mt-2 max-w-xl text-sm text-red-700">
                                {loadError.message}
                            </p>
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={onRetryLoad}
                                    className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 shadow-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )
                ) : values ? (
                    <form onSubmit={handleSubmit} noValidate aria-busy={isSaving} className="space-y-8 divide-y divide-gray-200">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">
                                    Basic Information
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Single authoritative source of your institution&apos;s official identity across the dashboard and public website.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-6">
                                <div className="sm:col-span-4">
                                    <label
                                        htmlFor="school-profile-name"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Official School Name <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        id="school-profile-name"
                                        type="text"
                                        required
                                        maxLength={150}
                                        disabled={inputsDisabled}
                                        value={values.schoolName}
                                        onChange={(event) =>
                                            onFieldChange('schoolName', event.target.value)
                                        }
                                        aria-invalid={Boolean(fieldErrors.schoolName)}
                                        aria-describedby={
                                            fieldErrors.schoolName
                                                ? 'school-profile-name-error'
                                                : undefined
                                        }
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-600"
                                    />
                                    {fieldErrors.schoolName && (
                                        <p
                                            id="school-profile-name-error"
                                            className="mt-1 text-xs text-red-600"
                                        >
                                            {fieldErrors.schoolName}
                                        </p>
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <label
                                        htmlFor="school-profile-type"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        School Type <span className="text-red-600">*</span>
                                    </label>
                                    <select
                                        id="school-profile-type"
                                        required
                                        disabled={inputsDisabled}
                                        value={values.schoolType}
                                        onChange={(event) =>
                                            onFieldChange(
                                                'schoolType',
                                                event.target.value as '' | SchoolType
                                            )
                                        }
                                        aria-invalid={Boolean(fieldErrors.schoolType)}
                                        aria-describedby={
                                            fieldErrors.schoolType
                                                ? 'school-profile-type-error'
                                                : undefined
                                        }
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-600"
                                    >
                                        <option value="">Select school type...</option>
                                        {SCHOOL_TYPE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {fieldErrors.schoolType && (
                                        <p
                                            id="school-profile-type-error"
                                            className="mt-1 text-xs text-red-600"
                                        >
                                            {fieldErrors.schoolType}
                                        </p>
                                    )}
                                </div>

                                <div className="sm:col-span-6">
                                    <label
                                        htmlFor="school-profile-description"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        School Description <span className="text-red-600">*</span>
                                    </label>
                                    <textarea
                                        id="school-profile-description"
                                        rows={3}
                                        required
                                        maxLength={2000}
                                        disabled={inputsDisabled}
                                        value={values.description}
                                        onChange={(event) =>
                                            onFieldChange('description', event.target.value)
                                        }
                                        aria-invalid={Boolean(fieldErrors.description)}
                                        aria-describedby={
                                            fieldErrors.description
                                                ? 'school-profile-description-error'
                                                : undefined
                                        }
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-600"
                                    />
                                    {fieldErrors.description && (
                                        <p
                                            id="school-profile-description-error"
                                            className="mt-1 text-xs text-red-600"
                                        >
                                            {fieldErrors.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 pt-6">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">
                                    Contact Details
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Authoritative administrative contact channels published consistently across school directories and public contact sections.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-6">
                                <div className="sm:col-span-3">
                                    <label
                                        htmlFor="school-profile-email"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Official Email <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        id="school-profile-email"
                                        type="email"
                                        required
                                        maxLength={254}
                                        disabled={inputsDisabled}
                                        value={values.email}
                                        onChange={(event) =>
                                            onFieldChange('email', event.target.value)
                                        }
                                        aria-invalid={Boolean(fieldErrors.email)}
                                        aria-describedby={
                                            fieldErrors.email
                                                ? 'school-profile-email-error'
                                                : undefined
                                        }
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-600"
                                    />
                                    {fieldErrors.email && (
                                        <p
                                            id="school-profile-email-error"
                                            className="mt-1 text-xs text-red-600"
                                        >
                                            {fieldErrors.email}
                                        </p>
                                    )}
                                </div>

                                <div className="sm:col-span-3">
                                    <label
                                        htmlFor="school-profile-phone"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Phone Number
                                    </label>
                                    <input
                                        id="school-profile-phone"
                                        type="tel"
                                        maxLength={30}
                                        disabled={inputsDisabled}
                                        value={values.phone}
                                        onChange={(event) =>
                                            onFieldChange('phone', event.target.value)
                                        }
                                        aria-invalid={Boolean(fieldErrors.phone)}
                                        aria-describedby={
                                            fieldErrors.phone
                                                ? 'school-profile-phone-error'
                                                : undefined
                                        }
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-600"
                                    />
                                    {fieldErrors.phone && (
                                        <p
                                            id="school-profile-phone-error"
                                            className="mt-1 text-xs text-red-600"
                                        >
                                            {fieldErrors.phone}
                                        </p>
                                    )}
                                </div>

                                <div className="sm:col-span-6">
                                    <label
                                        htmlFor="school-profile-website"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        External Website URL{' '}
                                        <span className="font-normal text-gray-400">(Optional)</span>
                                    </label>
                                    <input
                                        id="school-profile-website"
                                        type="url"
                                        placeholder="https://example.edu"
                                        disabled={inputsDisabled}
                                        value={values.website}
                                        onChange={(event) =>
                                            onFieldChange('website', event.target.value)
                                        }
                                        aria-invalid={Boolean(fieldErrors.website)}
                                        aria-describedby={
                                            fieldErrors.website
                                                ? 'school-profile-website-error'
                                                : undefined
                                        }
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-600"
                                    />
                                    {fieldErrors.website && (
                                        <p
                                            id="school-profile-website-error"
                                            className="mt-1 text-xs text-red-600"
                                        >
                                            {fieldErrors.website}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 pt-6">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">
                                    Campus Location
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Physical campus street address, city, and country.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-6">
                                <div className="sm:col-span-6">
                                    <label
                                        htmlFor="school-profile-address"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Physical Address
                                    </label>
                                    <textarea
                                        id="school-profile-address"
                                        rows={2}
                                        maxLength={300}
                                        disabled={inputsDisabled}
                                        value={values.address}
                                        onChange={(event) =>
                                            onFieldChange('address', event.target.value)
                                        }
                                        aria-invalid={Boolean(fieldErrors.address)}
                                        aria-describedby={
                                            fieldErrors.address
                                                ? 'school-profile-address-error'
                                                : undefined
                                        }
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-600"
                                    />
                                    {fieldErrors.address && (
                                        <p
                                            id="school-profile-address-error"
                                            className="mt-1 text-xs text-red-600"
                                        >
                                            {fieldErrors.address}
                                        </p>
                                    )}
                                </div>

                                <div className="sm:col-span-3">
                                    <label
                                        htmlFor="school-profile-city"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        City
                                    </label>
                                    <input
                                        id="school-profile-city"
                                        type="text"
                                        maxLength={100}
                                        disabled={inputsDisabled}
                                        value={values.city}
                                        onChange={(event) =>
                                            onFieldChange('city', event.target.value)
                                        }
                                        aria-invalid={Boolean(fieldErrors.city)}
                                        aria-describedby={
                                            fieldErrors.city
                                                ? 'school-profile-city-error'
                                                : undefined
                                        }
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-600"
                                    />
                                    {fieldErrors.city && (
                                        <p
                                            id="school-profile-city-error"
                                            className="mt-1 text-xs text-red-600"
                                        >
                                            {fieldErrors.city}
                                        </p>
                                    )}
                                </div>

                                <div className="sm:col-span-3">
                                    <label
                                        htmlFor="school-profile-country"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Country
                                    </label>
                                    <input
                                        id="school-profile-country"
                                        type="text"
                                        maxLength={100}
                                        disabled={inputsDisabled}
                                        value={values.country}
                                        onChange={(event) =>
                                            onFieldChange('country', event.target.value)
                                        }
                                        aria-invalid={Boolean(fieldErrors.country)}
                                        aria-describedby={
                                            fieldErrors.country
                                                ? 'school-profile-country-error'
                                                : undefined
                                        }
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-600"
                                    />
                                    {fieldErrors.country && (
                                        <p
                                            id="school-profile-country-error"
                                            className="mt-1 text-xs text-red-600"
                                        >
                                            {fieldErrors.country}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-gray-500">
                                {lastSavedLabel ? (
                                    <span>
                                        Last saved: {lastSavedLabel}
                                        {updatedByLabel ? ` by ${updatedByLabel}` : ''}
                                    </span>
                                ) : (
                                    <span>Profile edits apply to this school tenant only.</span>
                                )}
                            </div>

                            {canEdit && (
                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        disabled={!hasUnsavedChanges || isSaving}
                                        onClick={onCancelChanges}
                                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Discard Changes
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving || !hasUnsavedChanges}
                                        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isSaving ? 'Saving Profile...' : 'Save Profile'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </form>
                ) : null}
            </div>
        </DashboardOverviewCard>
    );
};

