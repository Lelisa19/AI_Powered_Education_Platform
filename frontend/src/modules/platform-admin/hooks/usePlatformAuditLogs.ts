import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import type { PaginationMeta } from '../../../types/api.types';
import {
    isPlatformAuditLogBackendUnavailableError,
    listPlatformAuditLogs,
} from '../services/platform-audit-log-service';
import type {
    AuditSortOrder,
    PlatformAuditLogRecord,
    ProposedAuditActionCategory,
    ProposedAuditOutcome,
    ProposedAuditResourceType,
} from '../types/platform-audit-log.types';

export const AUDIT_LOGS_DEFAULT_PAGE_SIZE = 20;

export interface AuditLogQueryState {
    page: number;
    search: string;
    actor: string;
    actionCategory: ProposedAuditActionCategory | '';
    resourceType: ProposedAuditResourceType | '';
    outcome: ProposedAuditOutcome | '';
    fromDate: string;
    toDate: string;
    sortOrder: AuditSortOrder;
}

export interface AuditLogFetchError {
    message: string;
    isBackendUnavailable: boolean;
}

export function usePlatformAuditLogs(enabled: boolean, query: AuditLogQueryState) {
    const [records, setRecords] = useState<PlatformAuditLogRecord[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [fetchError, setFetchError] = useState<AuditLogFetchError | null>(null);
    const [reloadCounter, setReloadCounter] = useState(0);
    const [settledKey, setSettledKey] = useState<string | null>(null);

    const requestVersionRef = useRef(0);
    const currentFetchKey = enabled ? `${JSON.stringify(query)}:${reloadCounter}` : 'disabled';
    const isLoading = enabled && settledKey !== currentFetchKey;

    useEffect(() => {
        if (!enabled) return;

        const cycleKey = `${JSON.stringify(query)}:${reloadCounter}`;
        const currentVersion = ++requestVersionRef.current;
        const controller = new AbortController();

        listPlatformAuditLogs(
            {
                page: query.page,
                limit: AUDIT_LOGS_DEFAULT_PAGE_SIZE,
                search: query.search || undefined,
                actor: query.actor || undefined,
                actionCategory: query.actionCategory || undefined,
                resourceType: query.resourceType || undefined,
                outcome: query.outcome || undefined,
                fromDate: query.fromDate || undefined,
                toDate: query.toDate || undefined,
                sortOrder: query.sortOrder,
            },
            controller.signal
        )
            .then((response) => {
                if (currentVersion !== requestVersionRef.current) return;
                setRecords(response.items);
                setPagination(response.pagination);
                setFetchError(null);
                setSettledKey(cycleKey);
            })
            .catch((err: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                if (err instanceof ApiError && err.isCancellation) return;

                setRecords([]);
                setPagination(null);
                setFetchError({
                    isBackendUnavailable: isPlatformAuditLogBackendUnavailableError(err),
                    message:
                        err instanceof Error && err.message
                            ? err.message
                            : 'Failed to load platform audit logs.',
                });
                setSettledKey(cycleKey);
            });

        return () => {
            controller.abort();
        };
    }, [enabled, query, reloadCounter]);

    const reload = useCallback(() => {
        if (!enabled) return;
        setFetchError(null);
        setReloadCounter((count) => count + 1);
    }, [enabled]);

    return {
        records: enabled ? records : [],
        pagination: enabled ? pagination : null,
        isLoading,
        fetchError: enabled ? fetchError : null,
        reload,
    };
}

