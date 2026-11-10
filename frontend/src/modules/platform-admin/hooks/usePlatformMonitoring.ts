import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import {
    getPlatformMonitoringSummary,
    isPlatformMonitoringBackendUnavailableError,
} from '../services/platform-monitoring-service';
import type { PlatformMonitoringSummary } from '../types/platform-monitoring.types';

export interface PlatformMonitoringFetchError {
    message: string;
    isBackendUnavailable: boolean;
}

export function usePlatformMonitoring(enabled: boolean) {
    const [summary, setSummary] = useState<PlatformMonitoringSummary | null>(null);
    const [error, setError] = useState<PlatformMonitoringFetchError | null>(null);
    const [reloadCounter, setReloadCounter] = useState(0);
    const [settledKey, setSettledKey] = useState<string | null>(null);

    const requestVersionRef = useRef(0);
    const currentFetchKey = enabled ? `enabled:${reloadCounter}` : 'disabled';
    const isLoading = enabled && settledKey !== currentFetchKey;

    useEffect(() => {
        if (!enabled) return;

        const cycleKey = `enabled:${reloadCounter}`;
        const currentVersion = ++requestVersionRef.current;
        const controller = new AbortController();

        getPlatformMonitoringSummary(controller.signal)
            .then((response) => {
                if (currentVersion !== requestVersionRef.current) return;
                setSummary(response.summary);
                setError(null);
                setSettledKey(cycleKey);
            })
            .catch((err: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                if (err instanceof ApiError && err.isCancellation) return;

                setSummary(null);
                setError({
                    isBackendUnavailable: isPlatformMonitoringBackendUnavailableError(err),
                    message:
                        err instanceof Error && err.message
                            ? err.message
                            : 'Unable to load system monitoring summary.',
                });
                setSettledKey(cycleKey);
            });

        return () => {
            controller.abort();
        };
    }, [enabled, reloadCounter]);

    const reloadMonitoring = useCallback(() => {
        if (!enabled) return;
        setError(null);
        setReloadCounter((prev) => prev + 1);
    }, [enabled]);

    return {
        summary: enabled ? summary : null,
        isLoading,
        error: enabled ? error : null,
        reloadMonitoring,
    };
}

