import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { ApiError } from '../../../services/api/api-error';
import {
    areSchoolProfileFormValuesEqual,
    mapBackendProfileValidationErrors,
    toSchoolBrandingFormValues,
    toSchoolProfileFormValues,
    validateBrandAssetFile,
    validateSchoolBrandingColors,
    validateSchoolProfileForm,
} from '../schemas/school-profile-schema';
import {
    getSchoolBranding,
    getSchoolProfile,
    isSchoolProfileBackendUnavailableError,
    updateSchoolBranding,
    updateSchoolProfile,
    uploadSchoolFavicon,
    uploadSchoolLogo,
} from '../services/school-profile-service';
import type {
    SchoolBrandingFieldErrors,
    SchoolBrandingFormValues,
    SchoolBrandingRecord,
    SchoolProfile,
    SchoolProfileFieldErrors,
    SchoolProfileFormValues,
} from '../types/school-profile.types';

export interface SectionFetchError {
    message: string;
    isBackendUnavailable: boolean;
}

export interface SectionMutationError {
    message: string;
    isBackendUnavailable: boolean;
}

export function useSchoolProfileAndBranding(
    tenantId: string | null,
    enabled: boolean,
    canUpdateProfile: boolean,
    canUpdateBranding: boolean
) {
    const { applyVerifiedSchoolTheme } = useTheme();

    const [reloadCounter, setReloadCounter] = useState(0);

    // Profile state
    const [savedProfile, setSavedProfile] = useState<SchoolProfile | null>(null);
    const [profileForm, setProfileForm] = useState<SchoolProfileFormValues | null>(null);
    const [profileFieldErrors, setProfileFieldErrors] = useState<SchoolProfileFieldErrors>({});
    const [profileLoadError, setProfileLoadError] = useState<SectionFetchError | null>(null);
    const [settledProfileKey, setSettledProfileKey] = useState<string | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileSaveError, setProfileSaveError] = useState<SectionMutationError | null>(null);
    const [profileSaveNotice, setProfileSaveNotice] = useState<string | null>(null);

    // Branding state
    const [savedBranding, setSavedBranding] = useState<SchoolBrandingRecord | null>(null);
    const [brandingForm, setBrandingForm] = useState<SchoolBrandingFormValues | null>(null);
    const [brandingFieldErrors, setBrandingFieldErrors] = useState<SchoolBrandingFieldErrors>({});
    const [brandingLoadError, setBrandingLoadError] = useState<SectionFetchError | null>(null);
    const [settledBrandingKey, setSettledBrandingKey] = useState<string | null>(null);
    const [isSavingBranding, setIsSavingBranding] = useState(false);
    const [brandingSaveError, setBrandingSaveError] = useState<SectionMutationError | null>(null);
    const [brandingSaveNotice, setBrandingSaveNotice] = useState<string | null>(null);

    // Pending local asset files & previews (object URLs always revoked safely)
    const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
    const [pendingLogoPreviewUrl, setPendingLogoPreviewUrl] = useState<string | null>(null);
    const [removeLogoRequested, setRemoveLogoRequested] = useState(false);

    const [pendingFaviconFile, setPendingFaviconFile] = useState<File | null>(null);
    const [pendingFaviconPreviewUrl, setPendingFaviconPreviewUrl] = useState<string | null>(null);
    const [removeFaviconRequested, setRemoveFaviconRequested] = useState(false);

    const requestVersionRef = useRef(0);
    const isSavingProfileRef = useRef(false);
    const isSavingBrandingRef = useRef(false);
    const logoObjectUrlRef = useRef<string | null>(null);
    const faviconObjectUrlRef = useRef<string | null>(null);

    const revokeLogoPreviewUrl = useCallback(() => {
        if (logoObjectUrlRef.current) {
            URL.revokeObjectURL(logoObjectUrlRef.current);
            logoObjectUrlRef.current = null;
        }
    }, []);

    const revokeFaviconPreviewUrl = useCallback(() => {
        if (faviconObjectUrlRef.current) {
            URL.revokeObjectURL(faviconObjectUrlRef.current);
            faviconObjectUrlRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            revokeLogoPreviewUrl();
            revokeFaviconPreviewUrl();
        };
    }, [revokeLogoPreviewUrl, revokeFaviconPreviewUrl]);

    const activeLoadKey =
        enabled && tenantId ? `${tenantId}:${reloadCounter}` : null;

    useEffect(() => {
        if (!activeLoadKey || !tenantId) {
            return;
        }

        const controller = new AbortController();
        const currentVersion = ++requestVersionRef.current;

        getSchoolProfile(tenantId, controller.signal)
            .then((response) => {
                if (currentVersion !== requestVersionRef.current) return;
                setSavedProfile(response.profile);
                setProfileForm(toSchoolProfileFormValues(response.profile));
                setProfileFieldErrors({});
                setProfileLoadError(null);
                setProfileSaveError(null);
                applyVerifiedSchoolTheme(tenantId, {
                    identity: { name: response.profile.identity.name },
                });
                setSettledProfileKey(activeLoadKey);
            })
            .catch((error: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;

                setSavedProfile(null);
                setProfileForm(null);
                setProfileLoadError({
                    isBackendUnavailable: isSchoolProfileBackendUnavailableError(error),
                    message:
                        error instanceof Error && error.message
                            ? error.message
                            : 'Unable to load school profile.',
                });
                setSettledProfileKey(activeLoadKey);
            });

        getSchoolBranding(tenantId, controller.signal)
            .then((response) => {
                if (currentVersion !== requestVersionRef.current) return;
                setSavedBranding(response.branding);
                setBrandingForm(toSchoolBrandingFormValues(response.branding));
                setBrandingFieldErrors({});
                setBrandingLoadError(null);
                setBrandingSaveError(null);

                revokeLogoPreviewUrl();
                revokeFaviconPreviewUrl();
                setPendingLogoFile(null);
                setPendingLogoPreviewUrl(null);
                setRemoveLogoRequested(false);
                setPendingFaviconFile(null);
                setPendingFaviconPreviewUrl(null);
                setRemoveFaviconRequested(false);

                applyVerifiedSchoolTheme(tenantId, {
                    identity: {
                        logoUrl: response.branding.logoUrl ?? undefined,
                        faviconUrl: response.branding.faviconUrl ?? undefined,
                    },
                    branding: response.branding.branding,
                });
                setSettledBrandingKey(activeLoadKey);
            })
            .catch((error: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;

                setSavedBranding(null);
                setBrandingForm(null);
                setBrandingLoadError({
                    isBackendUnavailable: isSchoolProfileBackendUnavailableError(error),
                    message:
                        error instanceof Error && error.message
                            ? error.message
                            : 'Unable to load school branding.',
                });
                setSettledBrandingKey(activeLoadKey);
            });

        return () => {
            controller.abort();
        };
    }, [
        activeLoadKey,
        tenantId,
        applyVerifiedSchoolTheme,
        revokeLogoPreviewUrl,
        revokeFaviconPreviewUrl,
    ]);

    const isLoadingProfile =
        Boolean(activeLoadKey) && settledProfileKey !== activeLoadKey;
    const isLoadingBranding =
        Boolean(activeLoadKey) && settledBrandingKey !== activeLoadKey;

    const hasUnsavedProfileChanges = Boolean(
        savedProfile &&
            profileForm &&
            !areSchoolProfileFormValuesEqual(profileForm, savedProfile)
    );

    const hasUnsavedBrandingChanges = Boolean(
        pendingLogoFile ||
            pendingFaviconFile ||
            removeLogoRequested ||
            removeFaviconRequested ||
            (savedBranding &&
                brandingForm &&
                (toSchoolBrandingFormValues(savedBranding).primaryColor !==
                    brandingForm.primaryColor.trim().toUpperCase() ||
                    toSchoolBrandingFormValues(savedBranding).secondaryColor !==
                        brandingForm.secondaryColor.trim().toUpperCase()))
    );

    const updateProfileField = useCallback(
        <K extends keyof SchoolProfileFormValues>(
            field: K,
            value: SchoolProfileFormValues[K]
        ) => {
            if (!canUpdateProfile) return;
            setProfileSaveNotice(null);
            setProfileSaveError(null);
            setProfileForm((prev) => (prev ? { ...prev, [field]: value } : prev));
            setProfileFieldErrors((prev) =>
                prev[field] ? { ...prev, [field]: undefined } : prev
            );
        },
        [canUpdateProfile]
    );

    const cancelProfileChanges = useCallback(() => {
        if (!savedProfile) return;
        setProfileForm(toSchoolProfileFormValues(savedProfile));
        setProfileFieldErrors({});
        setProfileSaveError(null);
        setProfileSaveNotice(null);
    }, [savedProfile]);

    const saveProfile = useCallback(async () => {
        if (
            !enabled ||
            !tenantId ||
            !canUpdateProfile ||
            !profileForm ||
            isSavingProfileRef.current ||
            isSavingProfile
        ) {
            return;
        }

        setProfileSaveError(null);
        setProfileSaveNotice(null);

        const validation = validateSchoolProfileForm(profileForm);
        if (!validation.valid) {
            setProfileFieldErrors(validation.fieldErrors);
            return;
        }
        setProfileFieldErrors({});

        isSavingProfileRef.current = true;
        setIsSavingProfile(true);

        try {
            const response = await updateSchoolProfile(validation.payload, tenantId);
            setSavedProfile(response.profile);
            setProfileForm(toSchoolProfileFormValues(response.profile));
            setProfileSaveNotice(
                response.message || 'School profile information saved successfully.'
            );
            applyVerifiedSchoolTheme(tenantId, {
                identity: { name: response.profile.identity.name },
            });
        } catch (error: unknown) {
            if (error instanceof ApiError && error.validationErrors) {
                setProfileFieldErrors(mapBackendProfileValidationErrors(error.validationErrors));
            }
            const unavailable = isSchoolProfileBackendUnavailableError(error);
            setProfileSaveError({
                isBackendUnavailable: unavailable,
                message: unavailable
                    ? 'School profile save endpoint (PUT /api/school/profile) is pending backend implementation. No changes were saved.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to save school profile.',
            });
        } finally {
            isSavingProfileRef.current = false;
            setIsSavingProfile(false);
        }
    }, [enabled, tenantId, canUpdateProfile, profileForm, isSavingProfile, applyVerifiedSchoolTheme]);

    const updateBrandingField = useCallback(
        (field: 'primaryColor' | 'secondaryColor', value: string) => {
            if (!canUpdateBranding) return;
            setBrandingSaveNotice(null);
            setBrandingSaveError(null);
            setBrandingForm((prev) => (prev ? { ...prev, [field]: value } : prev));
            setBrandingFieldErrors((prev) =>
                prev[field] ? { ...prev, [field]: undefined } : prev
            );
        },
        [canUpdateBranding]
    );

    const selectBrandAssetFile = useCallback(
        (kind: 'logo' | 'favicon', file: File | null) => {
            if (!canUpdateBranding || !file) return;

            setBrandingSaveNotice(null);
            setBrandingSaveError(null);

            const fileError = validateBrandAssetFile(file, kind);
            if (fileError) {
                setBrandingFieldErrors((prev) => ({ ...prev, [kind]: fileError }));
                return;
            }

            setBrandingFieldErrors((prev) => ({ ...prev, [kind]: undefined }));
            const nextPreviewUrl = URL.createObjectURL(file);

            if (kind === 'logo') {
                revokeLogoPreviewUrl();
                logoObjectUrlRef.current = nextPreviewUrl;
                setPendingLogoFile(file);
                setPendingLogoPreviewUrl(nextPreviewUrl);
                setRemoveLogoRequested(false);
            } else {
                revokeFaviconPreviewUrl();
                faviconObjectUrlRef.current = nextPreviewUrl;
                setPendingFaviconFile(file);
                setPendingFaviconPreviewUrl(nextPreviewUrl);
                setRemoveFaviconRequested(false);
            }
        },
        [canUpdateBranding, revokeLogoPreviewUrl, revokeFaviconPreviewUrl]
    );

    const clearPendingBrandAsset = useCallback(
        (kind: 'logo' | 'favicon') => {
            if (!canUpdateBranding) return;
            setBrandingFieldErrors((prev) => ({ ...prev, [kind]: undefined }));
            if (kind === 'logo') {
                revokeLogoPreviewUrl();
                setPendingLogoFile(null);
                setPendingLogoPreviewUrl(null);
            } else {
                revokeFaviconPreviewUrl();
                setPendingFaviconFile(null);
                setPendingFaviconPreviewUrl(null);
            }
        },
        [canUpdateBranding, revokeLogoPreviewUrl, revokeFaviconPreviewUrl]
    );

    const requestRemoveSavedBrandAsset = useCallback(
        (kind: 'logo' | 'favicon', shouldRemove: boolean) => {
            if (!canUpdateBranding) return;
            setBrandingSaveNotice(null);
            setBrandingSaveError(null);
            if (kind === 'logo') {
                if (shouldRemove) {
                    revokeLogoPreviewUrl();
                    setPendingLogoFile(null);
                    setPendingLogoPreviewUrl(null);
                }
                setRemoveLogoRequested(shouldRemove);
            } else {
                if (shouldRemove) {
                    revokeFaviconPreviewUrl();
                    setPendingFaviconFile(null);
                    setPendingFaviconPreviewUrl(null);
                }
                setRemoveFaviconRequested(shouldRemove);
            }
        },
        [canUpdateBranding, revokeLogoPreviewUrl, revokeFaviconPreviewUrl]
    );

    const cancelBrandingChanges = useCallback(() => {
        if (!savedBranding) return;
        revokeLogoPreviewUrl();
        revokeFaviconPreviewUrl();
        setPendingLogoFile(null);
        setPendingLogoPreviewUrl(null);
        setRemoveLogoRequested(false);
        setPendingFaviconFile(null);
        setPendingFaviconPreviewUrl(null);
        setRemoveFaviconRequested(false);
        setBrandingForm(toSchoolBrandingFormValues(savedBranding));
        setBrandingFieldErrors({});
        setBrandingSaveError(null);
        setBrandingSaveNotice(null);
    }, [savedBranding, revokeLogoPreviewUrl, revokeFaviconPreviewUrl]);

    const saveBranding = useCallback(async () => {
        if (
            !enabled ||
            !tenantId ||
            !canUpdateBranding ||
            !brandingForm ||
            !savedBranding ||
            isSavingBrandingRef.current ||
            isSavingBranding
        ) {
            return;
        }

        setBrandingSaveError(null);
        setBrandingSaveNotice(null);

        const colorValidation = validateSchoolBrandingColors(brandingForm);
        if (!colorValidation.valid) {
            setBrandingFieldErrors((prev) => ({ ...prev, ...colorValidation.fieldErrors }));
            return;
        }
        setBrandingFieldErrors({});

        isSavingBrandingRef.current = true;
        setIsSavingBranding(true);

        let nextLogoUrl: string | null = removeLogoRequested ? null : savedBranding.logoUrl;
        let nextFaviconUrl: string | null = removeFaviconRequested
            ? null
            : savedBranding.faviconUrl;

        try {
            if (pendingLogoFile) {
                const uploadedLogo = await uploadSchoolLogo(pendingLogoFile, tenantId);
                nextLogoUrl = uploadedLogo.url;
                revokeLogoPreviewUrl();
                setPendingLogoFile(null);
                setPendingLogoPreviewUrl(null);
                setSavedBranding((prev) => (prev ? { ...prev, logoUrl: uploadedLogo.url } : prev));
            }

            if (pendingFaviconFile) {
                const uploadedFavicon = await uploadSchoolFavicon(pendingFaviconFile, tenantId);
                nextFaviconUrl = uploadedFavicon.url;
                revokeFaviconPreviewUrl();
                setPendingFaviconFile(null);
                setPendingFaviconPreviewUrl(null);
                setSavedBranding((prev) =>
                    prev ? { ...prev, faviconUrl: uploadedFavicon.url } : prev
                );
            }

            const response = await updateSchoolBranding(
                {
                    logoUrl: nextLogoUrl,
                    faviconUrl: nextFaviconUrl,
                    branding: colorValidation.colors,
                },
                tenantId
            );

            setSavedBranding(response.branding);
            setBrandingForm(toSchoolBrandingFormValues(response.branding));
            setRemoveLogoRequested(false);
            setRemoveFaviconRequested(false);
            setBrandingSaveNotice(
                response.message || 'School visual branding updated and applied cleanly.'
            );
            applyVerifiedSchoolTheme(tenantId, {
                identity: {
                    logoUrl: response.branding.logoUrl ?? undefined,
                    faviconUrl: response.branding.faviconUrl ?? undefined,
                },
                branding: response.branding.branding,
            });
        } catch (error: unknown) {
            const unavailable = isSchoolProfileBackendUnavailableError(error);
            setBrandingSaveError({
                isBackendUnavailable: unavailable,
                message: unavailable
                    ? 'Branding upload or save endpoints (/api/school/branding*) are pending backend implementation. Selected assets were not saved.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to save school visual branding.',
            });
        } finally {
            isSavingBrandingRef.current = false;
            setIsSavingBranding(false);
        }
    }, [
        enabled,
        tenantId,
        canUpdateBranding,
        brandingForm,
        savedBranding,
        isSavingBranding,
        removeLogoRequested,
        removeFaviconRequested,
        pendingLogoFile,
        pendingFaviconFile,
        revokeLogoPreviewUrl,
        revokeFaviconPreviewUrl,
        applyVerifiedSchoolTheme,
    ]);

    const reloadAll = useCallback(() => {
        setProfileSaveNotice(null);
        setBrandingSaveNotice(null);
        setReloadCounter((count) => count + 1);
    }, []);

    return {
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
    };
}

