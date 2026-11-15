import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import {
    listAcademicYears,
    listTermsByAcademicYear,
} from '../../academic/services/academic-structure-service';
import type { AcademicTerm, AcademicYear } from '../../academic/types/academic-structure.types';
import {
    getCategoryDirtyStates,
    getConsequentialSettingsChanges,
    getSettingsCompatibilityWarnings,
    hasAnyDirtySettingsCategory,
    mapBackendSchoolSettingsValidationErrors,
    toSchoolSettingsFormValues,
    validateSchoolSettingsForm,
} from '../schemas/school-settings-schema';
import {
    getSchoolSettings,
    isSchoolSettingsBackendUnavailableError,
    updateSchoolSettings,
} from '../services/school-settings-service';
import type {
    SchoolSettings,
    SchoolSettingsFieldErrors,
    SchoolSettingsFieldName,
    SchoolSettingsFormValues,
} from '../types/school-settings.types';

export interface SchoolSettingsErrorState {
    message: string;
    isBackendUnavailable: boolean;
}

export type SaveSchoolSettingsOutcome =
    | { status: 'saved' }
    | { status: 'validation-error' }
    | { status: 'needs-confirmation'; warnings: string[] }
    | { status: 'failed' }
    | { status: 'blocked' };

export function useSchoolSettings(options: {
    tenantId: string | null;
    enabled: boolean;
    canUpdate: boolean;
    canReadAcademicYears: boolean;
    canReadTerms: boolean;
}) {
    const { tenantId, enabled, canUpdate, canReadAcademicYears, canReadTerms } = options;

    const [reloadCounter, setReloadCounter] = useState(0);
    const [savedSettings, setSavedSettings] = useState<SchoolSettings | null>(null);
    const [formValues, setFormValues] = useState<SchoolSettingsFormValues | null>(null);
    const [fieldErrors, setFieldErrors] = useState<SchoolSettingsFieldErrors>({});

    const [loadError, setLoadError] = useState<SchoolSettingsErrorState | null>(null);
    const [settledSettingsKey, setSettledSettingsKey] = useState<string | null>(null);

    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [yearsLoadStatus, setYearsLoadStatus] = useState<'idle' | 'loaded' | 'error'>('idle');
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [termsLoadedForYearId, setTermsLoadedForYearId] = useState<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<SchoolSettingsErrorState | null>(null);
    const [saveNotice, setSaveNotice] = useState<string | null>(null);

    const settingsVersionRef = useRef(0);
    const yearsVersionRef = useRef(0);
    const termsVersionRef = useRef(0);
    const isSavingRef = useRef(false);

    const activeLoadKey = enabled && tenantId ? `${tenantId}:${reloadCounter}` : null;

    useEffect(() => {
        if (!activeLoadKey || !tenantId) return;

        const controller = new AbortController();
        const version = ++settingsVersionRef.current;

        getSchoolSettings(tenantId, controller.signal)
            .then((res) => {
                if (version !== settingsVersionRef.current) return;
                setSavedSettings(res.settings);
                setFormValues(toSchoolSettingsFormValues(res.settings));
                setFieldErrors({});
                setLoadError(null);
                setSaveError(null);
                setSettledSettingsKey(activeLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== settingsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;

                setSavedSettings(null);
                setFormValues(null);
                setFieldErrors({});
                setLoadError({
                    isBackendUnavailable: isSchoolSettingsBackendUnavailableError(error),
                    message:
                        error instanceof Error && error.message
                            ? error.message
                            : 'Unable to load school settings.',
                });
                setSettledSettingsKey(activeLoadKey);
            });

        return () => controller.abort();
    }, [activeLoadKey, tenantId]);

    // Optional reference fetch: Academic Years (strictly only when permitted)
    useEffect(() => {
        if (!activeLoadKey || !tenantId || !canReadAcademicYears) return;

        const controller = new AbortController();
        const version = ++yearsVersionRef.current;

        listAcademicYears(tenantId, controller.signal)
            .then((res) => {
                if (version !== yearsVersionRef.current) return;
                setAcademicYears(res.academicYears);
                setYearsLoadStatus('loaded');
            })
            .catch((error: unknown) => {
                if (version !== yearsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setAcademicYears([]);
                setYearsLoadStatus('error');
            });

        return () => controller.abort();
    }, [activeLoadKey, tenantId, canReadAcademicYears]);

    const effectiveSavedSettings = enabled ? savedSettings : null;
    const effectiveFormValues = enabled ? formValues : null;
    const effectiveYearsLoaded = Boolean(
        enabled && canReadAcademicYears && yearsLoadStatus === 'loaded'
    );
    const effectiveYears = useMemo(
        () => (effectiveYearsLoaded ? academicYears : []),
        [effectiveYearsLoaded, academicYears]
    );

    const targetDefaultYearId = effectiveFormValues?.defaultAcademicYearId.trim() ?? '';

    // Optional reference fetch: Terms for selected Default Academic Year
    useEffect(() => {
        if (
            !activeLoadKey ||
            !tenantId ||
            !canReadAcademicYears ||
            !canReadTerms ||
            !targetDefaultYearId
        ) {
            return;
        }

        const controller = new AbortController();
        const version = ++termsVersionRef.current;

        listTermsByAcademicYear(targetDefaultYearId, tenantId, controller.signal)
            .then((res) => {
                if (version !== termsVersionRef.current) return;
                setTerms(res.terms);
                setTermsLoadedForYearId(targetDefaultYearId);
            })
            .catch((error: unknown) => {
                if (version !== termsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setTerms([]);
                setTermsLoadedForYearId(null);
            });

        return () => controller.abort();
    }, [activeLoadKey, tenantId, canReadAcademicYears, canReadTerms, targetDefaultYearId]);

    const effectiveTermsLoaded = Boolean(
        enabled &&
            canReadAcademicYears &&
            canReadTerms &&
            targetDefaultYearId &&
            termsLoadedForYearId === targetDefaultYearId
    );
    const effectiveTerms = useMemo(
        () => (effectiveTermsLoaded ? terms : []),
        [effectiveTermsLoaded, terms]
    );

    const isLoading = Boolean(activeLoadKey) && settledSettingsKey !== activeLoadKey;

    const categoryDirtyMap = useMemo(
        () => getCategoryDirtyStates(effectiveFormValues, effectiveSavedSettings),
        [effectiveFormValues, effectiveSavedSettings]
    );

    const hasUnsavedChanges = useMemo(
        () => hasAnyDirtySettingsCategory(categoryDirtyMap),
        [categoryDirtyMap]
    );

    const compatibilityWarnings = useMemo(() => {
        if (!effectiveSavedSettings) return [];
        return getSettingsCompatibilityWarnings({
            savedSettings: effectiveSavedSettings,
            academicYears: effectiveYears,
            terms: effectiveTerms,
            yearsLoaded: effectiveYearsLoaded,
            termsLoaded: effectiveTermsLoaded,
        });
    }, [
        effectiveSavedSettings,
        effectiveYears,
        effectiveTerms,
        effectiveYearsLoaded,
        effectiveTermsLoaded,
    ]);

    useEffect(() => {
        if (!hasUnsavedChanges || isSaving) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges, isSaving]);

    const updateField = useCallback(
        <K extends SchoolSettingsFieldName>(
            field: K,
            value: SchoolSettingsFormValues[K]
        ) => {
            if (!enabled || !canUpdate) return;
            setSaveNotice(null);
            setSaveError(null);

            setFormValues((prev) => {
                if (!prev) return prev;
                if (field === 'defaultAcademicYearId') {
                    return {
                        ...prev,
                        defaultAcademicYearId: value as string,
                        defaultTermId: '',
                    };
                }
                if (field === 'schoolAnnouncementsEnabled' && value === false) {
                    return {
                        ...prev,
                        schoolAnnouncementsEnabled: false,
                        notifyStudentsOfAcademicAnnouncements: false,
                    };
                }
                return { ...prev, [field]: value };
            });

            setFieldErrors((prev) => {
                const next = { ...prev };
                if (next[field]) delete next[field];
                if (field === 'defaultAcademicYearId' && next.defaultTermId) {
                    delete next.defaultTermId;
                }
                return next;
            });
        },
        [enabled, canUpdate]
    );

    const discardUnsavedChanges = useCallback(() => {
        if (!enabled || !savedSettings) return;
        setFormValues(toSchoolSettingsFormValues(savedSettings));
        setFieldErrors({});
        setSaveError(null);
        setSaveNotice(null);
    }, [enabled, savedSettings]);

    const saveSettings = useCallback(
        async (saveOptions?: {
            skipConfirmation?: boolean;
        }): Promise<SaveSchoolSettingsOutcome> => {
            if (
                !enabled ||
                !tenantId ||
                !canUpdate ||
                !formValues ||
                !savedSettings ||
                isSavingRef.current ||
                isSaving
            ) {
                return { status: 'blocked' };
            }

            setSaveNotice(null);
            setSaveError(null);

            const selectedYearChangedOrSet =
                formValues.defaultAcademicYearId.trim() !==
                (savedSettings.academicDefaults.defaultAcademicYearId ?? '');

            const validation = validateSchoolSettingsForm({
                values: formValues,
                academicYears: effectiveYears,
                terms: effectiveTerms,
                yearsLoaded: effectiveYearsLoaded,
                termsLoaded: effectiveTermsLoaded,
                selectedYearChangedOrSet,
            });

            if (!validation.valid) {
                setFieldErrors(validation.fieldErrors);
                return { status: 'validation-error' };
            }
            setFieldErrors({});

            const consequentialWarnings = getConsequentialSettingsChanges(
                formValues,
                savedSettings
            );
            if (consequentialWarnings.length > 0 && !saveOptions?.skipConfirmation) {
                return {
                    status: 'needs-confirmation',
                    warnings: consequentialWarnings,
                };
            }

            isSavingRef.current = true;
            setIsSaving(true);

            try {
                const response = await updateSchoolSettings(validation.payload, tenantId);
                setSavedSettings(response.settings);
                setFormValues(toSchoolSettingsFormValues(response.settings));
                setSaveNotice(
                    response.message || 'School operational settings saved successfully.'
                );
                return { status: 'saved' };
            } catch (error: unknown) {
                if (error instanceof ApiError && error.validationErrors) {
                    setFieldErrors(mapBackendSchoolSettingsValidationErrors(error.validationErrors));
                }

                const unavailable = isSchoolSettingsBackendUnavailableError(error);
                setSaveError({
                    isBackendUnavailable: unavailable,
                    message: unavailable
                        ? 'School settings save endpoint (PUT /api/school/settings) is pending backend implementation. Your edits remain preserved.'
                        : error instanceof Error && error.message
                          ? error.message
                          : 'Unable to save school settings.',
                });
                return { status: 'failed' };
            } finally {
                isSavingRef.current = false;
                setIsSaving(false);
            }
        },
        [
            enabled,
            tenantId,
            canUpdate,
            formValues,
            savedSettings,
            isSaving,
            effectiveYears,
            effectiveTerms,
            effectiveYearsLoaded,
            effectiveTermsLoaded,
        ]
    );

    const reloadAll = useCallback(() => {
        if (!enabled || !tenantId) return;
        setSaveError(null);
        setSaveNotice(null);
        setReloadCounter((c) => c + 1);
    }, [enabled, tenantId]);

    return {
        savedSettings: effectiveSavedSettings,
        formValues: effectiveFormValues,
        fieldErrors,
        isLoading,
        loadError,
        isSaving,
        saveError,
        saveNotice,
        hasUnsavedChanges,
        categoryDirtyMap,
        compatibilityWarnings,
        academicYears: effectiveYears,
        yearsLoaded: effectiveYearsLoaded,
        terms: effectiveTerms,
        termsLoaded: effectiveTermsLoaded,
        updateField,
        discardUnsavedChanges,
        saveSettings,
        reloadAll,
    };
}

