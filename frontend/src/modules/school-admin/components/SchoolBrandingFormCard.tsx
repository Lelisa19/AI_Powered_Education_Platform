import React, { useRef } from 'react';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { DEFAULT_SCHOOL_BRANDING } from '../../../types/school.types';
import {
    getHexContrastRatio,
    getReadableContrastColor,
    sanitizeBrandHexColor,
} from '../../../utils/branding';
import type { SectionFetchError, SectionMutationError } from '../hooks/useSchoolProfileAndBranding';
import { formatSchoolProfileTimestamp } from '../schemas/school-profile-schema';
import type {
    SchoolBrandingFieldErrors,
    SchoolBrandingFormValues,
    SchoolBrandingRecord,
} from '../types/school-profile.types';

interface SchoolBrandingFormCardProps {
    schoolName: string;
    savedBranding: SchoolBrandingRecord | null;
    values: SchoolBrandingFormValues | null;
    fieldErrors: SchoolBrandingFieldErrors;
    isLoading: boolean;
    loadError: SectionFetchError | null;
    canEdit: boolean;
    isSaving: boolean;
    saveError: SectionMutationError | null;
    saveNotice: string | null;
    hasUnsavedChanges: boolean;
    pendingLogoFile: File | null;
    pendingLogoPreviewUrl: string | null;
    removeLogoRequested: boolean;
    pendingFaviconFile: File | null;
    pendingFaviconPreviewUrl: string | null;
    removeFaviconRequested: boolean;
    onColorChange: (field: 'primaryColor' | 'secondaryColor', value: string) => void;
    onSelectFile: (kind: 'logo' | 'favicon', file: File | null) => void;
    onClearPendingFile: (kind: 'logo' | 'favicon') => void;
    onToggleRemoveSaved: (kind: 'logo' | 'favicon', shouldRemove: boolean) => void;
    onCancelChanges: () => void;
    onRetryLoad: () => void;
    onSubmit: () => void;
}

export const SchoolBrandingFormCard: React.FC<SchoolBrandingFormCardProps> = ({
    schoolName,
    savedBranding,
    values,
    fieldErrors,
    isLoading,
    loadError,
    canEdit,
    isSaving,
    saveError,
    saveNotice,
    hasUnsavedChanges,
    pendingLogoFile,
    pendingLogoPreviewUrl,
    removeLogoRequested,
    pendingFaviconFile,
    pendingFaviconPreviewUrl,
    removeFaviconRequested,
    onColorChange,
    onSelectFile,
    onClearPendingFile,
    onToggleRemoveSaved,
    onCancelChanges,
    onRetryLoad,
    onSubmit,
}) => {
    const logoInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);

    const lastSavedLabel = formatSchoolProfileTimestamp(savedBranding?.updatedAt);
    const inputsDisabled = !canEdit || isSaving;

    const previewPrimary =
        sanitizeBrandHexColor(values?.primaryColor) ?? DEFAULT_SCHOOL_BRANDING.primaryColor;
    const previewSecondary =
        sanitizeBrandHexColor(values?.secondaryColor) ?? DEFAULT_SCHOOL_BRANDING.secondaryColor;
    const previewPrimaryForeground = getReadableContrastColor(previewPrimary);
    const primaryContrastRatio = getHexContrastRatio(previewPrimary, previewPrimaryForeground);

    const activeLogoPreview = removeLogoRequested
        ? null
        : pendingLogoPreviewUrl ?? savedBranding?.logoUrl ?? null;
    const activeFaviconPreview = removeFaviconRequested
        ? null
        : pendingFaviconPreviewUrl ?? savedBranding?.faviconUrl ?? null;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canEdit || isSaving) return;
        onSubmit();
    };

    const handleFileInputChange = (
        kind: 'logo' | 'favicon',
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const selectedFile = event.target.files?.[0] ?? null;
        if (selectedFile) {
            onSelectFile(kind, selectedFile);
        }
        event.target.value = '';
    };

    return (
        <DashboardOverviewCard title="Visual Branding & Theme" headingLevel="h2">
            <div className="space-y-6">
                {!canEdit && (
                    <div
                        role="status"
                        className="rounded-md border border-gray-200 bg-gray-100 p-3.5 text-xs text-gray-700"
                    >
                        Read-only mode: Uploading logos/favicons and modifying brand colors requires the{' '}
                        <code className="rounded bg-white px-1 py-0.5 font-mono">
                            school_profile.update_branding
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
                        className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-10 text-center"
                    >
                        <div
                            className="mb-3 h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
                            aria-hidden="true"
                        />
                        <p className="text-sm font-medium text-gray-700">
                            Loading school branding...
                        </p>
                    </div>
                ) : loadError ? (
                    loadError.isBackendUnavailable ? (
                        <div
                            role="status"
                            className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                        >
                            <h3 className="text-base font-semibold text-amber-900">
                                School Branding API Pending Backend Implementation
                            </h3>
                            <p className="mx-auto mt-2 max-w-xl text-sm text-amber-800">
                                The frontend failed closed without inventing asset URLs because{' '}
                                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                                    GET /api/school/branding
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
                                Unable to Load School Branding
                            </h3>
                            <p className="mx-auto mt-2 max-w-xl text-sm text-red-700">
                                {loadError.message}
                            </p>
                        </div>
                    )
                ) : values ? (
                    <form onSubmit={handleSubmit} noValidate aria-busy={isSaving} className="space-y-8">
                        {/* Asset Uploads: Logo & Favicon */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* School Logo */}
                            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">
                                        School Logo
                                    </h3>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        Displayed in your school dashboard header, sidebar, and public website. PNG, JPEG, or WebP up to 2 MB.
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white p-1">
                                        {activeLogoPreview ? (
                                            <img
                                                src={activeLogoPreview}
                                                alt="School logo preview"
                                                className="h-full w-full object-contain"
                                            />
                                        ) : (
                                            <span
                                                className="flex h-12 w-12 items-center justify-center rounded-md text-lg font-bold"
                                                style={{
                                                    backgroundColor: previewPrimary,
                                                    color: previewPrimaryForeground,
                                                }}
                                            >
                                                {schoolName.trim().charAt(0).toUpperCase() || 'S'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-2">
                                        {pendingLogoFile && (
                                            <p className="truncate text-xs font-medium text-blue-700">
                                                Selected: {pendingLogoFile.name} (preview before save)
                                            </p>
                                        )}
                                        {removeLogoRequested && (
                                            <p className="text-xs font-medium text-amber-800">
                                                Saved logo will be removed when you click Save Branding.
                                            </p>
                                        )}

                                        {canEdit && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    ref={logoInputRef}
                                                    type="file"
                                                    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                                                    disabled={inputsDisabled}
                                                    onChange={(event) =>
                                                        handleFileInputChange('logo', event)
                                                    }
                                                    className="sr-only"
                                                    aria-label="Upload school logo file"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={inputsDisabled}
                                                    onClick={() => logoInputRef.current?.click()}
                                                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    {activeLogoPreview ? 'Replace Logo' : 'Choose Logo'}
                                                </button>
                                                {pendingLogoFile && (
                                                    <button
                                                        type="button"
                                                        disabled={inputsDisabled}
                                                        onClick={() => onClearPendingFile('logo')}
                                                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                                    >
                                                        Undo Selection
                                                    </button>
                                                )}
                                                {!pendingLogoFile &&
                                                    savedBranding?.logoUrl &&
                                                    !removeLogoRequested && (
                                                        <button
                                                            type="button"
                                                            disabled={inputsDisabled}
                                                            onClick={() =>
                                                                onToggleRemoveSaved('logo', true)
                                                            }
                                                            className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                {removeLogoRequested && (
                                                    <button
                                                        type="button"
                                                        disabled={inputsDisabled}
                                                        onClick={() =>
                                                            onToggleRemoveSaved('logo', false)
                                                        }
                                                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                    >
                                                        Keep Current
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {fieldErrors.logo && (
                                    <p role="alert" className="text-xs text-red-600">
                                        {fieldErrors.logo}
                                    </p>
                                )}
                            </div>

                            {/* School Favicon */}
                            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">
                                        School Favicon
                                    </h3>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        Displayed in browser tabs for your school portal and public website. PNG, ICO, or WebP up to 512 KB.
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white p-2">
                                        {activeFaviconPreview ? (
                                            <img
                                                src={activeFaviconPreview}
                                                alt="School favicon preview"
                                                className="h-8 w-8 object-contain"
                                            />
                                        ) : (
                                            <span className="text-xs font-medium text-gray-400">
                                                Default
                                            </span>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-2">
                                        {pendingFaviconFile && (
                                            <p className="truncate text-xs font-medium text-blue-700">
                                                Selected: {pendingFaviconFile.name} (preview before save)
                                            </p>
                                        )}
                                        {removeFaviconRequested && (
                                            <p className="text-xs font-medium text-amber-800">
                                                Saved favicon will be removed when you click Save Branding.
                                            </p>
                                        )}

                                        {canEdit && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    ref={faviconInputRef}
                                                    type="file"
                                                    accept=".png,.ico,.webp,image/png,image/x-icon,image/vnd.microsoft.icon,image/webp"
                                                    disabled={inputsDisabled}
                                                    onChange={(event) =>
                                                        handleFileInputChange('favicon', event)
                                                    }
                                                    className="sr-only"
                                                    aria-label="Upload school favicon file"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={inputsDisabled}
                                                    onClick={() => faviconInputRef.current?.click()}
                                                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    {activeFaviconPreview
                                                        ? 'Replace Favicon'
                                                        : 'Choose Favicon'}
                                                </button>
                                                {pendingFaviconFile && (
                                                    <button
                                                        type="button"
                                                        disabled={inputsDisabled}
                                                        onClick={() => onClearPendingFile('favicon')}
                                                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                                    >
                                                        Undo Selection
                                                    </button>
                                                )}
                                                {!pendingFaviconFile &&
                                                    savedBranding?.faviconUrl &&
                                                    !removeFaviconRequested && (
                                                        <button
                                                            type="button"
                                                            disabled={inputsDisabled}
                                                            onClick={() =>
                                                                onToggleRemoveSaved('favicon', true)
                                                            }
                                                            className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                {removeFaviconRequested && (
                                                    <button
                                                        type="button"
                                                        disabled={inputsDisabled}
                                                        onClick={() =>
                                                            onToggleRemoveSaved('favicon', false)
                                                        }
                                                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                    >
                                                        Keep Current
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {fieldErrors.favicon && (
                                    <p role="alert" className="text-xs text-red-600">
                                        {fieldErrors.favicon}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Brand Colors */}
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="brand-primary-hex"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Primary Brand Color <span className="text-red-600">*</span>
                                </label>
                                <div className="mt-1 flex items-center gap-2.5">
                                    <input
                                        type="color"
                                        aria-label="Pick primary brand color"
                                        disabled={inputsDisabled}
                                        value={previewPrimary}
                                        onChange={(event) =>
                                            onColorChange('primaryColor', event.target.value)
                                        }
                                        className="h-10 w-12 shrink-0 cursor-pointer rounded border border-gray-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                    <input
                                        id="brand-primary-hex"
                                        type="text"
                                        maxLength={7}
                                        disabled={inputsDisabled}
                                        value={values.primaryColor}
                                        onChange={(event) =>
                                            onColorChange('primaryColor', event.target.value)
                                        }
                                        placeholder="#1E40AF"
                                        aria-invalid={Boolean(fieldErrors.primaryColor)}
                                        aria-describedby={
                                            fieldErrors.primaryColor
                                                ? 'brand-primary-error'
                                                : undefined
                                        }
                                        className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                    />
                                </div>
                                {fieldErrors.primaryColor && (
                                    <p
                                        id="brand-primary-error"
                                        className="mt-1 text-xs text-red-600"
                                    >
                                        {fieldErrors.primaryColor}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="brand-secondary-hex"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Secondary Brand Color
                                </label>
                                <div className="mt-1 flex items-center gap-2.5">
                                    <input
                                        type="color"
                                        aria-label="Pick secondary brand color"
                                        disabled={inputsDisabled}
                                        value={previewSecondary}
                                        onChange={(event) =>
                                            onColorChange('secondaryColor', event.target.value)
                                        }
                                        className="h-10 w-12 shrink-0 cursor-pointer rounded border border-gray-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                    <input
                                        id="brand-secondary-hex"
                                        type="text"
                                        maxLength={7}
                                        disabled={inputsDisabled}
                                        value={values.secondaryColor}
                                        onChange={(event) =>
                                            onColorChange('secondaryColor', event.target.value)
                                        }
                                        placeholder="#3B82F6"
                                        aria-invalid={Boolean(fieldErrors.secondaryColor)}
                                        aria-describedby={
                                            fieldErrors.secondaryColor
                                                ? 'brand-secondary-error'
                                                : undefined
                                        }
                                        className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                    />
                                </div>
                                {fieldErrors.secondaryColor && (
                                    <p
                                        id="brand-secondary-error"
                                        className="mt-1 text-xs text-red-600"
                                    >
                                        {fieldErrors.secondaryColor}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Live Theme Contrast Preview */}
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    Theme &amp; Accessibility Preview
                                </h3>
                                <span className="text-xs text-gray-600">
                                    Auto text contrast ratio: {primaryContrastRatio.toFixed(1)}:1 (
                                    {primaryContrastRatio >= 4.5 ? 'AA Pass' : 'Low Contrast'})
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                <span
                                    className="inline-flex items-center rounded-md px-3.5 py-2 text-xs font-semibold shadow-sm"
                                    style={{
                                        backgroundColor: previewPrimary,
                                        color: previewPrimaryForeground,
                                        borderLeft: `3px solid ${previewSecondary}`,
                                    }}
                                >
                                    Active Navigation &amp; Primary Button
                                </span>
                                <span
                                    className="inline-flex items-center rounded-md border-2 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-800"
                                    style={{ borderColor: previewSecondary }}
                                >
                                    Secondary Accent Border
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-gray-500">
                                {lastSavedLabel ? (
                                    <span>Branding last saved: {lastSavedLabel}</span>
                                ) : (
                                    <span>
                                        Missing custom branding uses accessible default platform colors.
                                    </span>
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
                                        Reset Branding
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving || !hasUnsavedChanges}
                                        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isSaving ? 'Saving Branding...' : 'Save Branding'}
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

