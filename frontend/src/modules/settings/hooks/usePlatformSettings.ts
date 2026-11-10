import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import {
    arePlatformSettingsFormValuesEqual,
    mapBackendSettingsValidationErrors,
    toPlatformSettingsFormValues,
    validatePlatformSettingsForm,
} from '../schemas/platform-settings-schema';
import {
    getPlatformSettings,
    isPlatformSettingsBackendUnavailableError,
    updatePlatformSettings,
} from '../services/platform-settings-service';
import type {
    PlatformSettings,
    PlatformSettingsFieldErrors,
    PlatformSettingsFieldName,
    PlatformSettingsFormValues,
} from '../types/platform-settings.types';

export interface PlatformSettingsErrorState {
    message: string;
    isBackendUnavailable: boolean;
}

export function usePlatformSettings(enabled: boolean) {
    const [savedSettings, setSavedSettings] = useState<PlatformSettings | null>(null);
    const [formValues, setFormValues] = useState<PlatformSettingsFormValues | null>(null);
    const [fieldErrors, setFieldErrors] = useState<PlatformSettingsFieldErrors>({});

    const [loadError, setLoadError] = useState<PlatformSettingsErrorState | null>(null);
    const [reloadCounter, setReloadCounter] = useState(0);
    const [settledKey, setSettledKey] = useState<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<PlatformSettingsErrorState | null>(null);
    const [saveNotice, setSaveNotice] = useState<string | null>(null);

    const requestVersionRef = useRef(0);
    const isSavingRef = useRef(false);

    const currentFetchKey = enabled ? `enabled:${reloadCounter}` : 'disabled';
    const isLoading = enabled && settledKey !== currentFetchKey;

    useEffect(() => {
        if (!enabled) return;

        const cycleKey = `enabled:${reloadCounter}`;
        const currentVersion = ++requestVersionRef.current;
        const controller = new AbortController();

        getPlatformSettings(controller.signal)
            .then((response) => {
                if (currentVersion !== requestVersionRef.current) return;
                setSavedSettings(response.settings);
                setFormValues(toPlatformSettingsFormValues(response.settings));
                setFieldErrors({});
                setLoadError(null);
                setSaveError(null);
                setSettledKey(cycleKey);
            })
            .catch((err: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                if (err instanceof ApiError && err.isCancellation) return;

                setSavedSettings(null);
                setFormValues(null);
                setFieldErrors({});
                setLoadError({
                    isBackendUnavailable: isPlatformSettingsBackendUnavailableError(err),
                    message:
                        err instanceof Error && err.message
                            ? err.message
                            : 'Unable to load platform settings.',
                });
                setSettledKey(cycleKey);
            });

        return () => {
            controller.abort();
        };
    }, [enabled, reloadCounter]);

    const effectiveSavedSettings = enabled ? savedSettings : null;
    const effectiveFormValues = enabled ? formValues : null;

    const hasUnsavedChanges = useMemo(() => {
        if (!effectiveSavedSettings || !effectiveFormValues) return false;
        return !arePlatformSettingsFormValuesEqual(effectiveFormValues, effectiveSavedSettings);
    }, [effectiveFormValues, effectiveSavedSettings]);

    useEffect(() => {
        if (!hasUnsavedChanges || isSaving) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges, isSaving]);

    const updateField = useCallback(
        <K extends PlatformSettingsFieldName>(
            field: K,
            value: PlatformSettingsFormValues[K]
        ) => {
            setFormValues((prev) => (prev ? { ...prev, [field]: value } : prev));
            setFieldErrors((prev) => {
                if (!prev[field]) return prev;
                const next = { ...prev };
                delete next[field];
                return next;
            });
            setSaveError(null);
            setSaveNotice(null);
        },
        []
    );

    const cancelChanges = useCallback(() => {
        if (!effectiveSavedSettings || isSavingRef.current) return;
        setFormValues(toPlatformSettingsFormValues(effectiveSavedSettings));
        setFieldErrors({});
        setSaveError(null);
        setSaveNotice(null);
    }, [effectiveSavedSettings]);

    const reloadSettings = useCallback(() => {
        if (!enabled || isSavingRef.current) return;
        setLoadError(null);
        setSaveError(null);
        setSaveNotice(null);
        setReloadCounter((prev) => prev + 1);
    }, [enabled]);

    const saveSettings = useCallback(async () => {
        if (
            !enabled ||
            !effectiveFormValues ||
            !effectiveSavedSettings ||
            isLoading ||
            isSavingRef.current
        ) {
            return;
        }

        const validation = validatePlatformSettingsForm(effectiveFormValues);
        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            setSaveError({
                isBackendUnavailable: false,
                message: 'Please correct the highlighted validation errors before saving.',
            });
            setSaveNotice(null);
            return;
        }

        isSavingRef.current = true;
        setIsSaving(true);
        setFieldErrors({});
        setSaveError(null);
        setSaveNotice(null);

        try {
            const response = await updatePlatformSettings(validation.payload);
            setSavedSettings(response.settings);
            setFormValues(toPlatformSettingsFormValues(response.settings));
            setFieldErrors({});
            setSaveNotice(response.message || 'Platform settings saved successfully.');
        } catch (err: unknown) {
            if (err instanceof ApiError && err.validationErrors) {
                const mappedErrors = mapBackendSettingsValidationErrors(err.validationErrors);
                if (Object.keys(mappedErrors).length > 0) {
                    setFieldErrors(mappedErrors);
                }
            }

            setSaveError({
                isBackendUnavailable: isPlatformSettingsBackendUnavailableError(err),
                message: isPlatformSettingsBackendUnavailableError(err)
                    ? 'Platform settings could not be saved because PUT /api/platform/settings is unavailable or pending backend implementation. Your edits remain intact below.'
                    : err instanceof Error && err.message
                      ? err.message
                      : 'Unable to save platform settings.',
            });
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    }, [effectiveFormValues, effectiveSavedSettings, enabled, isLoading]);

    return {
        savedSettings: effectiveSavedSettings,
        formValues: effectiveFormValues,
        fieldErrors,
        isLoading,
        loadError: enabled ? loadError : null,
        isSaving,
        saveError: enabled ? saveError : null,
        saveNotice: enabled ? saveNotice : null,
        hasUnsavedChanges,
        updateField,
        cancelChanges,
        reloadSettings,
        saveSettings,
    };
}

