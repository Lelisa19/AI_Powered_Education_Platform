import React, { useState } from 'react';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PERMISSIONS } from '../../../constants/permissions';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { SchoolBrandingFormCard } from '../components/SchoolBrandingFormCard';
import { SchoolProfileFormCard } from '../components/SchoolProfileFormCard';
import { useSchoolProfileAndBranding } from '../hooks/useSchoolProfileAndBranding';

export const SchoolProfilePage: React.FC = () => {
    const { user } = useAuth();
    const { classification, tenantId, schoolName, hostname } = useTenantContext();
    const { hasPermission } = usePermissions();

    const canReadProfile = hasPermission(PERMISSIONS.SCHOOL_PROFILE.READ);
    const canUpdateProfile = hasPermission(PERMISSIONS.SCHOOL_PROFILE.UPDATE);
    const canUpdateBranding = hasPermission(PERMISSIONS.SCHOOL_PROFILE.UPDATE_BRANDING);

    const isVerifiedSchoolSession =
        classification === 'SCHOOL' &&
        Boolean(tenantId) &&
        user?.accountType === 'SCHOOL' &&
        user.tenantId === tenantId;

    const [confirmReloadOpen, setConfirmReloadOpen] = useState(false);

    const {
        savedProfile,
        profileForm,
        profileFieldErrors,
        isLoadingProfile,
        profileLoadError,
        isSavingProfile,
        profileSaveError,
        profileSaveNotice,
        hasUnsavedProfileChanges,
        updateProfileField,
        cancelProfileChanges,
        saveProfile,
        savedBranding,
        brandingForm,
        brandingFieldErrors,
        isLoadingBranding,
        brandingLoadError,
        isSavingBranding,
        brandingSaveError,
        brandingSaveNotice,
        hasUnsavedBrandingChanges,
        pendingLogoFile,
        pendingLogoPreviewUrl,
        removeLogoRequested,
        pendingFaviconFile,
        pendingFaviconPreviewUrl,
        removeFaviconRequested,
        updateBrandingField,
        selectBrandAssetFile,
        clearPendingBrandAsset,
        requestRemoveSavedBrandAsset,
        cancelBrandingChanges,
        saveBranding,
        reloadAll,
    } = useSchoolProfileAndBranding(
        tenantId,
        isVerifiedSchoolSession && canReadProfile,
        canUpdateProfile,
        canUpdateBranding
    );

    const hasAnyUnsavedChanges = hasUnsavedProfileChanges || hasUnsavedBrandingChanges;
    const isBusy = isLoadingProfile || isLoadingBranding || isSavingProfile || isSavingBranding;
    const displaySchoolName =
        savedProfile?.identity.name || schoolName || hostname || 'Verified School';

    const handleRefreshClick = () => {
        if (isBusy) return;
        if (hasAnyUnsavedChanges) {
            setConfirmReloadOpen(true);
            return;
        }
        setConfirmReloadOpen(false);
        reloadAll();
    };

    const handleConfirmDiscardAndReload = () => {
        setConfirmReloadOpen(false);
        reloadAll();
    };

    if (!isVerifiedSchoolSession) {
        return (
            <div className="mx-auto max-w-5xl">
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access Denied: School Profile &amp; Branding can only be accessed inside a verified school tenant administrator session.
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <DashboardPageHeader
                    title="School Profile & Branding"
                    subtitle={`Manage foundational identity, contact information, and visual theme for ${displaySchoolName}.`}
                />

                {canReadProfile && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            disabled={isBusy}
                            onClick={handleRefreshClick}
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isLoadingProfile || isLoadingBranding ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                )}
            </div>

            {!canReadProfile ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access Denied: Viewing school profile and branding requires the{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.SCHOOL_PROFILE.READ}
                    </code>{' '}
                    permission.
                </div>
            ) : (
                <>
                    <div
                        role="note"
                        className="rounded-md border border-gray-200 bg-gray-100 p-4 text-xs text-gray-700"
                    >
                        Single source of truth: Official school name, contact details, logos, and brand colors configured here are isolated strictly to your school tenant and drive both your authenticated school workspace theme and public school website identity.
                    </div>

                    {confirmReloadOpen && hasAnyUnsavedChanges && (
                        <div
                            role="alertdialog"
                            aria-label="Confirm discarding unsaved profile or branding edits"
                            className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <p className="text-sm text-amber-900">
                                You have unsaved profile or branding changes. Reloading from the server will discard your local edits.
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

                    <SchoolProfileFormCard
                        savedProfile={savedProfile}
                        values={profileForm}
                        fieldErrors={profileFieldErrors}
                        isLoading={isLoadingProfile}
                        loadError={profileLoadError}
                        canEdit={canUpdateProfile}
                        isSaving={isSavingProfile}
                        saveError={profileSaveError}
                        saveNotice={profileSaveNotice}
                        hasUnsavedChanges={hasUnsavedProfileChanges}
                        onFieldChange={(field, value) => {
                            setConfirmReloadOpen(false);
                            updateProfileField(field, value);
                        }}
                        onCancelChanges={() => {
                            setConfirmReloadOpen(false);
                            cancelProfileChanges();
                        }}
                        onRetryLoad={reloadAll}
                        onSubmit={saveProfile}
                    />

                    <SchoolBrandingFormCard
                        schoolName={displaySchoolName}
                        savedBranding={savedBranding}
                        values={brandingForm}
                        fieldErrors={brandingFieldErrors}
                        isLoading={isLoadingBranding}
                        loadError={brandingLoadError}
                        canEdit={canUpdateBranding}
                        isSaving={isSavingBranding}
                        saveError={brandingSaveError}
                        saveNotice={brandingSaveNotice}
                        hasUnsavedChanges={hasUnsavedBrandingChanges}
                        pendingLogoFile={pendingLogoFile}
                        pendingLogoPreviewUrl={pendingLogoPreviewUrl}
                        removeLogoRequested={removeLogoRequested}
                        pendingFaviconFile={pendingFaviconFile}
                        pendingFaviconPreviewUrl={pendingFaviconPreviewUrl}
                        removeFaviconRequested={removeFaviconRequested}
                        onColorChange={(field, value) => {
                            setConfirmReloadOpen(false);
                            updateBrandingField(field, value);
                        }}
                        onSelectFile={(kind, file) => {
                            setConfirmReloadOpen(false);
                            selectBrandAssetFile(kind, file);
                        }}
                        onClearPendingFile={(kind) => {
                            setConfirmReloadOpen(false);
                            clearPendingBrandAsset(kind);
                        }}
                        onToggleRemoveSaved={(kind, shouldRemove) => {
                            setConfirmReloadOpen(false);
                            requestRemoveSavedBrandAsset(kind, shouldRemove);
                        }}
                        onCancelChanges={() => {
                            setConfirmReloadOpen(false);
                            cancelBrandingChanges();
                        }}
                        onRetryLoad={reloadAll}
                        onSubmit={saveBranding}
                    />
                </>
            )}
        </div>
    );
};
