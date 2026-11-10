import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import type { PaginationMeta } from '../../../types/api.types';
import {
    isPlatformSupportBackendUnavailableError,
    listSupportTickets,
} from '../services/platform-support-service';
import type {
    PlatformSupportTicket,
    ProposedSupportTicketCategory,
    ProposedSupportTicketPriority,
    ProposedSupportTicketStatus,
    SupportSortField,
    SupportSortOrder,
} from '../types/platform-support.types';

export const SUPPORT_TICKETS_DEFAULT_PAGE_SIZE = 15;

export interface SupportTicketQueryState {
    page: number;
    search: string;
    status: ProposedSupportTicketStatus | '';
    priority: ProposedSupportTicketPriority | '';
    category: ProposedSupportTicketCategory | '';
    tenantId: string;
    sortBy: SupportSortField;
    sortOrder: SupportSortOrder;
}

export interface SupportTicketFetchError {
    message: string;
    isBackendUnavailable: boolean;
}

export function usePlatformSupportTickets(
    enabled: boolean,
    query: SupportTicketQueryState
) {
    const [tickets, setTickets] = useState<PlatformSupportTicket[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [fetchError, setFetchError] = useState<SupportTicketFetchError | null>(null);
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

        listSupportTickets(
            {
                page: query.page,
                limit: SUPPORT_TICKETS_DEFAULT_PAGE_SIZE,
                search: query.search || undefined,
                status: query.status || undefined,
                priority: query.priority || undefined,
                category: query.category || undefined,
                tenantId: query.tenantId || undefined,
                sortBy: query.sortBy,
                sortOrder: query.sortOrder,
            },
            controller.signal
        )
            .then((response) => {
                if (currentVersion !== requestVersionRef.current) return;
                setTickets(response.items);
                setPagination(response.pagination);
                setFetchError(null);
                setSettledKey(cycleKey);
            })
            .catch((err: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                if (err instanceof ApiError && err.isCancellation) return;

                setTickets([]);
                setPagination(null);
                setFetchError({
                    isBackendUnavailable: isPlatformSupportBackendUnavailableError(err),
                    message:
                        err instanceof Error && err.message
                            ? err.message
                            : 'Failed to load support tickets.',
                });
                setSettledKey(cycleKey);
            });

        return () => {
            controller.abort();
        };
    }, [enabled, query, reloadCounter]);

    const reloadTickets = useCallback(() => {
        if (!enabled) return;
        setFetchError(null);
        setReloadCounter((count) => count + 1);
    }, [enabled]);

    const replaceTicketInList = useCallback((updatedTicket: PlatformSupportTicket) => {
        setTickets((prev) =>
            prev.map((item) => (item.id === updatedTicket.id ? { ...item, ...updatedTicket } : item))
        );
    }, []);

    return {
        tickets: enabled ? tickets : [],
        pagination: enabled ? pagination : null,
        isLoading,
        fetchError: enabled ? fetchError : null,
        reloadTickets,
        replaceTicketInList,
    };
}

