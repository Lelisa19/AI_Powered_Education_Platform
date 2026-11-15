import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { ApiError } from '../../../services/api/api-error';
import { getSchoolProfile } from '../../school-admin/services/school-profile-service';
import type { SchoolProfile } from '../../school-admin/types/school-profile.types';
import {
    WEBSITE_CMS_LIMITS,
    areWebsiteCmsFormValuesEqual,
    buildDraftPreviewConfig,
    getFirstSectionWithErrors,
    getSectionErrorCounts,
    getSectionUnsavedChangesMap,
    mapBackendWebsiteValidationErrors,
    SUPPORTED_SOCIAL_PLATFORMS,
    toWebsiteCmsFormValues,
    validateWebsiteCmsForm,
} from '../schemas/website-cms-schema';
import {
    getSchoolWebsiteCmsState,
    isWebsiteCmsBackendUnavailableError,
    publishSchoolWebsite,
    saveSchoolWebsiteDraft,
} from '../services/website-service';
import type {
    FeaturedProgramFieldErrors,
    FeaturedProgramFormItem,
    SchoolWebsiteCmsState,
    SchoolWebsiteConfig,
    SocialPlatformKey,
    WebsiteCmsFormValues,
    WebsiteCmsSectionId,
    WebsiteCmsValidationErrors,
} from '../types/website.types';

export interface WebsiteCmsErrorState {
    message: string;
    isBackendUnavailable: boolean;
}

export interface WebsiteCmsSubmitResult {
    ok: boolean;
    firstErrorSection?: WebsiteCmsSectionId | null;
}

type ScalarWebsiteFormField =
    | 'heroHeadline'
    | 'heroSubtitle'
    | 'heroCtaText'
    | 'heroCtaUrl'
    | 'heroImageUrl'
    | 'aboutHeading'
    | 'aboutDescription'
    | 'aboutMission'
    | 'featuredProgramsHeading';

export function useSchoolWebsiteCms(options: {
    tenantId: string | null;
    enabled: boolean;
    canUpdate: boolean;
    canPublish: boolean;
    canReadSchoolProfile: boolean;
}) {
    const { tenantId, enabled, canUpdate, canPublish, canReadSchoolProfile } = options;
    const { schoolName: tenantSchoolName, schoolLogoUrl, schoolFaviconUrl, hostname } =
        useTenantContext();
    const { schoolTheme } = useTheme();

    const [reloadCounter, setReloadCounter] = useState(0);
    const [savedState, setSavedState] = useState<SchoolWebsiteCmsState | null>(null);
    const [draftForm, setDraftForm] = useState<WebsiteCmsFormValues | null>(null);
    const [validationErrors, setValidationErrors] = useState<WebsiteCmsValidationErrors>({});
    const [canonicalProfile, setCanonicalProfile] = useState<SchoolProfile | null>(null);

    const [loadError, setLoadError] = useState<WebsiteCmsErrorState | null>(null);
    const [settledLoadKey, setSettledLoadKey] = useState<string | null>(null);

    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [actionError, setActionError] = useState<WebsiteCmsErrorState | null>(null);
    const [actionNotice, setActionNotice] = useState<string | null>(null);

    const requestVersionRef = useRef(0);
    const isSavingDraftRef = useRef(false);
    const isPublishingRef = useRef(false);
    const programIdCounterRef = useRef(0);

    const activeLoadKey = enabled && tenantId ? `${tenantId}:${reloadCounter}` : null;

    useEffect(() => {
        if (!activeLoadKey || !tenantId) {
            return;
        }

        const controller = new AbortController();
        const currentVersion = ++requestVersionRef.current;

        getSchoolWebsiteCmsState(tenantId, controller.signal)
            .then((state) => {
                if (currentVersion !== requestVersionRef.current) return;
                setSavedState(state);
                setDraftForm(toWebsiteCmsFormValues(state.draft));
                setValidationErrors({});
                setLoadError(null);
                setActionError(null);
                setSettledLoadKey(activeLoadKey);
            })
            .catch((error: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;

                setSavedState(null);
                setDraftForm(null);
                setValidationErrors({});
                setLoadError({
                    isBackendUnavailable: isWebsiteCmsBackendUnavailableError(error),
                    message:
                        error instanceof Error && error.message
                            ? error.message
                            : 'Unable to load school website configuration.',
                });
                setSettledLoadKey(activeLoadKey);
            });

        if (canReadSchoolProfile) {
            getSchoolProfile(tenantId, controller.signal)
                .then((response) => {
                    if (currentVersion !== requestVersionRef.current) return;
                    setCanonicalProfile(response.profile);
                })
                .catch(() => {
                    if (currentVersion !== requestVersionRef.current) return;
                    setCanonicalProfile(null);
                });
        }

        return () => {
            controller.abort();
        };
    }, [activeLoadKey, tenantId, canReadSchoolProfile]);

    const effectiveSavedState = enabled ? savedState : null;
    const effectiveDraftForm = enabled ? draftForm : null;

    const isLoading = Boolean(activeLoadKey) && settledLoadKey !== activeLoadKey;

    const hasUnsavedChanges = useMemo(() => {
        if (!effectiveSavedState || !effectiveDraftForm) return false;
        return !areWebsiteCmsFormValuesEqual(effectiveDraftForm, effectiveSavedState.draft);
    }, [effectiveDraftForm, effectiveSavedState]);

    const sectionUnsavedMap = useMemo(
        () =>
            getSectionUnsavedChangesMap(
                effectiveDraftForm,
                effectiveSavedState?.draft ?? null
            ),
        [effectiveDraftForm, effectiveSavedState]
    );

    const sectionErrorCounts = useMemo(
        () => getSectionErrorCounts(validationErrors),
        [validationErrors]
    );

    useEffect(() => {
        if (!hasUnsavedChanges || isSavingDraft || isPublishing) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges, isSavingDraft, isPublishing]);

    const previewConfig: SchoolWebsiteConfig | null = useMemo(() => {
        if (!effectiveDraftForm) return null;

        const snapshot = effectiveSavedState?.canonicalPreview;
        const resolvedSchoolName =
            canonicalProfile?.identity.name ||
            schoolTheme.schoolName ||
            snapshot?.identity?.name ||
            tenantSchoolName ||
            hostname ||
            'Verified School';

        return buildDraftPreviewConfig({
            form: effectiveDraftForm,
            schoolName: resolvedSchoolName,
            logoUrl: schoolTheme.logoUrl ?? snapshot?.identity?.logoUrl ?? schoolLogoUrl,
            faviconUrl:
                schoolTheme.faviconUrl ?? snapshot?.identity?.faviconUrl ?? schoolFaviconUrl,
            primaryColor:
                schoolTheme.primaryColor || snapshot?.branding?.primaryColor || '#1E40AF',
            secondaryColor:
                schoolTheme.secondaryColor || snapshot?.branding?.secondaryColor || '#3B82F6',
            contact: {
                email: canonicalProfile?.contact.email ?? snapshot?.contact?.email,
                phone: canonicalProfile?.contact.phone ?? snapshot?.contact?.phone,
                address: canonicalProfile?.contact.address ?? snapshot?.contact?.address,
                city: canonicalProfile?.contact.city ?? snapshot?.contact?.city,
                country: canonicalProfile?.contact.country ?? snapshot?.contact?.country,
            },
        });
    }, [
        effectiveDraftForm,
        effectiveSavedState,
        canonicalProfile,
        schoolTheme,
        tenantSchoolName,
        schoolLogoUrl,
        schoolFaviconUrl,
        hostname,
    ]);

    const clearTransientFeedback = useCallback(() => {
        setActionError(null);
        setActionNotice(null);
    }, []);

    const updateScalarField = useCallback(
        (field: ScalarWebsiteFormField, value: string) => {
            if (!enabled || !canUpdate) return;
            clearTransientFeedback();
            setDraftForm((prev) => (prev ? { ...prev, [field]: value } : prev));
            setValidationErrors((prev) =>
                prev[field] ? { ...prev, [field]: undefined } : prev
            );
        },
        [enabled, canUpdate, clearTransientFeedback]
    );

    const addFeaturedProgram = useCallback(() => {
        if (!enabled || !canUpdate) return;
        clearTransientFeedback();

        const nextId = `draft-prog-${Date.now()}-${++programIdCounterRef.current}`;

        setDraftForm((prev) => {
            if (!prev || prev.featuredPrograms.length >= WEBSITE_CMS_LIMITS.MAX_FEATURED_PROGRAMS) {
                return prev;
            }
            return {
                ...prev,
                featuredPrograms: [
                    ...prev.featuredPrograms,
                    {
                        id: nextId,
                        title: '',
                        description: '',
                        category: '',
                        imageUrl: '',
                    },
                ],
            };
        });

        setValidationErrors((prev) =>
            prev.featuredProgramsLimit ? { ...prev, featuredProgramsLimit: undefined } : prev
        );
    }, [enabled, canUpdate, clearTransientFeedback]);

    const updateFeaturedProgramField = useCallback(
        (
            programId: string,
            field: keyof Omit<FeaturedProgramFormItem, 'id'>,
            value: string
        ) => {
            if (!enabled || !canUpdate) return;
            clearTransientFeedback();

            setDraftForm((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    featuredPrograms: prev.featuredPrograms.map((item) =>
                        item.id === programId ? { ...item, [field]: value } : item
                    ),
                };
            });

            setValidationErrors((prev) => {
                const currentItemErrors = prev.programItems?.[programId];
                if (!currentItemErrors || !currentItemErrors[field as keyof FeaturedProgramFieldErrors]) {
                    return prev;
                }

                const nextItemErrors: FeaturedProgramFieldErrors = {
                    ...currentItemErrors,
                    [field]: undefined,
                };
                const nextProgramItems = {
                    ...prev.programItems,
                    [programId]: nextItemErrors,
                };

                return {
                    ...prev,
                    programItems: nextProgramItems,
                };
            });
        },
        [enabled, canUpdate, clearTransientFeedback]
    );

    const moveFeaturedProgram = useCallback(
        (index: number, direction: 'up' | 'down') => {
            if (!enabled || !canUpdate) return;
            clearTransientFeedback();

            setDraftForm((prev) => {
                if (!prev) return prev;
                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                if (
                    index < 0 ||
                    index >= prev.featuredPrograms.length ||
                    targetIndex < 0 ||
                    targetIndex >= prev.featuredPrograms.length
                ) {
                    return prev;
                }

                const next = [...prev.featuredPrograms];
                const [moved] = next.splice(index, 1);
                next.splice(targetIndex, 0, moved);

                return {
                    ...prev,
                    featuredPrograms: next,
                };
            });
        },
        [enabled, canUpdate, clearTransientFeedback]
    );

    const removeFeaturedProgram = useCallback(
        (programId: string) => {
            if (!enabled || !canUpdate) return;
            clearTransientFeedback();

            setDraftForm((prev) =>
                prev
                    ? {
                          ...prev,
                          featuredPrograms: prev.featuredPrograms.filter(
                              (item) => item.id !== programId
                          ),
                      }
                    : prev
            );

            setValidationErrors((prev) => {
                if (!prev.programItems?.[programId] && !prev.featuredProgramsLimit) {
                    return prev;
                }
                const nextProgramItems = prev.programItems ? { ...prev.programItems } : undefined;
                if (nextProgramItems) {
                    delete nextProgramItems[programId];
                }
                return {
                    ...prev,
                    featuredProgramsLimit: undefined,
                    programItems: nextProgramItems,
                };
            });
        },
        [enabled, canUpdate, clearTransientFeedback]
    );

    const addSocialLink = useCallback(() => {
        if (!enabled || !canUpdate) return;
        clearTransientFeedback();

        setDraftForm((prev) => {
            if (!prev) return prev;
            const used = new Set(prev.socialLinks.map((item) => item.platform));
            const available = SUPPORTED_SOCIAL_PLATFORMS.find((item) => !used.has(item.key));
            if (!available) return prev;

            return {
                ...prev,
                socialLinks: [...prev.socialLinks, { platform: available.key, url: '' }],
            };
        });
    }, [enabled, canUpdate, clearTransientFeedback]);

    const changeSocialLinkPlatform = useCallback(
        (currentPlatform: SocialPlatformKey, nextPlatform: SocialPlatformKey) => {
            if (!enabled || !canUpdate || currentPlatform === nextPlatform) return;
            clearTransientFeedback();

            setDraftForm((prev) => {
                if (!prev) return prev;
                if (prev.socialLinks.some((item) => item.platform === nextPlatform)) {
                    return prev;
                }
                return {
                    ...prev,
                    socialLinks: prev.socialLinks.map((item) =>
                        item.platform === currentPlatform
                            ? { ...item, platform: nextPlatform }
                            : item
                    ),
                };
            });

            setValidationErrors((prev) => {
                if (!prev.socialLinks?.[currentPlatform]) return prev;
                const nextSocial = { ...prev.socialLinks };
                nextSocial[nextPlatform] = nextSocial[currentPlatform];
                delete nextSocial[currentPlatform];
                return { ...prev, socialLinks: nextSocial };
            });
        },
        [enabled, canUpdate, clearTransientFeedback]
    );

    const updateSocialLinkUrl = useCallback(
        (platform: SocialPlatformKey, url: string) => {
            if (!enabled || !canUpdate) return;
            clearTransientFeedback();

            setDraftForm((prev) =>
                prev
                    ? {
                          ...prev,
                          socialLinks: prev.socialLinks.map((item) =>
                              item.platform === platform ? { ...item, url } : item
                          ),
                      }
                    : prev
            );

            setValidationErrors((prev) => {
                if (!prev.socialLinks?.[platform]) return prev;
                const nextSocial = { ...prev.socialLinks };
                delete nextSocial[platform];
                return { ...prev, socialLinks: nextSocial };
            });
        },
        [enabled, canUpdate, clearTransientFeedback]
    );

    const removeSocialLink = useCallback(
        (platform: SocialPlatformKey) => {
            if (!enabled || !canUpdate) return;
            clearTransientFeedback();

            setDraftForm((prev) =>
                prev
                    ? {
                          ...prev,
                          socialLinks: prev.socialLinks.filter(
                              (item) => item.platform !== platform
                          ),
                      }
                    : prev
            );

            setValidationErrors((prev) => {
                if (!prev.socialLinks?.[platform]) return prev;
                const nextSocial = { ...prev.socialLinks };
                delete nextSocial[platform];
                return { ...prev, socialLinks: nextSocial };
            });
        },
        [enabled, canUpdate, clearTransientFeedback]
    );

    const discardLocalChanges = useCallback(() => {
        if (!enabled || !savedState) return;
        setDraftForm(toWebsiteCmsFormValues(savedState.draft));
        setValidationErrors({});
        clearTransientFeedback();
    }, [enabled, savedState, clearTransientFeedback]);

    const saveDraft = useCallback(async (): Promise<WebsiteCmsSubmitResult> => {
        if (
            !enabled ||
            !tenantId ||
            !canUpdate ||
            !draftForm ||
            isSavingDraftRef.current ||
            isPublishingRef.current
        ) {
            return { ok: false };
        }

        clearTransientFeedback();

        const validation = validateWebsiteCmsForm(draftForm);
        if (!validation.valid) {
            setValidationErrors(validation.errors);
            return {
                ok: false,
                firstErrorSection: getFirstSectionWithErrors(validation.errors),
            };
        }
        setValidationErrors({});

        isSavingDraftRef.current = true;
        setIsSavingDraft(true);

        try {
            const response = await saveSchoolWebsiteDraft(validation.payload, tenantId);
            setSavedState(response.website);
            setDraftForm(toWebsiteCmsFormValues(response.website.draft));
            setActionNotice(
                response.message ||
                    'Website draft saved successfully. Public site visitors will continue seeing previously published content until you publish.'
            );
            return { ok: true };
        } catch (error: unknown) {
            let mappedErrors: WebsiteCmsValidationErrors = {};
            if (error instanceof ApiError && error.validationErrors) {
                mappedErrors = mapBackendWebsiteValidationErrors(
                    error.validationErrors,
                    draftForm.featuredPrograms.map((item) => item.id)
                );
                setValidationErrors(mappedErrors);
            }

            const unavailable = isWebsiteCmsBackendUnavailableError(error);
            setActionError({
                isBackendUnavailable: unavailable,
                message: unavailable
                    ? 'Website draft endpoint (PUT /api/school/website/draft) is pending backend implementation. Your local edits remain preserved in this session.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to save website draft.',
            });
            return {
                ok: false,
                firstErrorSection: getFirstSectionWithErrors(mappedErrors),
            };
        } finally {
            isSavingDraftRef.current = false;
            setIsSavingDraft(false);
        }
    }, [enabled, tenantId, canUpdate, draftForm, clearTransientFeedback]);

    const publishWebsite = useCallback(async (): Promise<WebsiteCmsSubmitResult> => {
        if (
            !enabled ||
            !tenantId ||
            !canPublish ||
            !draftForm ||
            isSavingDraftRef.current ||
            isPublishingRef.current
        ) {
            return { ok: false };
        }

        clearTransientFeedback();

        const validation = validateWebsiteCmsForm(draftForm);
        if (!validation.valid) {
            setValidationErrors(validation.errors);
            return {
                ok: false,
                firstErrorSection: getFirstSectionWithErrors(validation.errors),
            };
        }
        setValidationErrors({});

        isPublishingRef.current = true;
        setIsPublishing(true);

        try {
            const response = await publishSchoolWebsite(
                tenantId,
                canUpdate ? validation.payload : undefined
            );
            setSavedState(response.website);
            setDraftForm(toWebsiteCmsFormValues(response.website.draft));
            setActionNotice(
                response.message || 'School website published successfully and is now live.'
            );
            return { ok: true };
        } catch (error: unknown) {
            let mappedErrors: WebsiteCmsValidationErrors = {};
            if (error instanceof ApiError && error.validationErrors) {
                mappedErrors = mapBackendWebsiteValidationErrors(
                    error.validationErrors,
                    draftForm.featuredPrograms.map((item) => item.id)
                );
                setValidationErrors(mappedErrors);
            }

            const unavailable = isWebsiteCmsBackendUnavailableError(error);
            setActionError({
                isBackendUnavailable: unavailable,
                message: unavailable
                    ? 'Website publish endpoint (POST /api/school/website/publish) is pending backend implementation. Publication status has not changed, and your local edits remain preserved.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to publish school website.',
            });
            return {
                ok: false,
                firstErrorSection: getFirstSectionWithErrors(mappedErrors),
            };
        } finally {
            isPublishingRef.current = false;
            setIsPublishing(false);
        }
    }, [enabled, tenantId, canPublish, canUpdate, draftForm, clearTransientFeedback]);

    const reloadAll = useCallback(() => {
        if (!enabled || !tenantId) return;
        clearTransientFeedback();
        setReloadCounter((prev) => prev + 1);
    }, [enabled, tenantId, clearTransientFeedback]);

    return {
        savedState: effectiveSavedState,
        draftForm: effectiveDraftForm,
        previewConfig,
        validationErrors,
        sectionErrorCounts,
        sectionUnsavedMap,
        hasUnsavedChanges,
        isLoading,
        loadError,
        isSavingDraft,
        isPublishing,
        actionError,
        actionNotice,
        updateScalarField,
        addFeaturedProgram,
        updateFeaturedProgramField,
        moveFeaturedProgram,
        removeFeaturedProgram,
        addSocialLink,
        changeSocialLinkPlatform,
        updateSocialLinkUrl,
        removeSocialLink,
        discardLocalChanges,
        saveDraft,
        publishWebsite,
        reloadAll,
    };
}

