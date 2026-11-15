import { useCallback, useEffect, useRef, useState } from 'react';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { PERMISSIONS } from '../../../constants/permissions';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { ApiError } from '../../../services/api/api-error';
import {
    formatFinanceOperationError,
    getFinancialReportSummary,
    isFinanceBackendUnavailableError,
    listPayments,
} from '../../accountants/services/accountant-service';
import type {
    FinancialReportSummary,
    PaymentMethod,
    PaymentRecord,
    PaymentStatus,
} from '../../accountants/types/accountant.types';
import type { PaginationMeta } from '../../../types/api.types';

export interface FinancialOversightQuery {
    page: number;
    limit: number;
    search: string;
    status: PaymentStatus | 'ALL';
    paymentMethod: PaymentMethod | 'ALL';
}

export interface SchoolAdminFinancialOversightState {
    // Summary Metrics
    summary: FinancialReportSummary | null;
    isSummaryLoading: boolean;
    summaryError: string | null;
    isSummaryBackendUnavailable: boolean;

    // Payment History Table
    payments: PaymentRecord[];
    pagination: PaginationMeta | null;
    isPaymentsLoading: boolean;
    paymentsError: string | null;
    isPaymentsBackendUnavailable: boolean;

    // Query Controls
    query: FinancialOversightQuery;
    setQuery: React.Dispatch<React.SetStateAction<FinancialOversightQuery>>;
    setPage: (page: number) => void;
    setSearch: (search: string) => void;
    setStatusFilter: (status: PaymentStatus | 'ALL') => void;
    setPaymentMethodFilter: (method: PaymentMethod | 'ALL') => void;
    resetFilters: () => void;

    // Permissions & Context
    canReadReports: boolean;
    canReadPayments: boolean;
    isSchoolSession: boolean;

    // Refresh Action
    reload: () => void;
}

const DEFAULT_QUERY: FinancialOversightQuery = {
    page: 1,
    limit: 10,
    search: '',
    status: 'ALL',
    paymentMethod: 'ALL',
};

export function useSchoolAdminFinancialOversight(): SchoolAdminFinancialOversightState {
    const { user } = useAuth();
    const { tenantId, classification } = useTenantContext();
    const { hasPermission } = usePermissions();

    const canReadReports = hasPermission(PERMISSIONS.REPORTS.READ);
    const canReadPayments = hasPermission(PERMISSIONS.PAYMENTS.READ);

    const isSchoolSession =
        user?.accountType === 'SCHOOL' &&
        classification === 'SCHOOL' &&
        Boolean(tenantId) &&
        user.tenantId === tenantId;

    // Financial Report Summary State
    const [summary, setSummary] = useState<FinancialReportSummary | null>(null);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [isSummaryBackendUnavailable, setIsSummaryBackendUnavailable] = useState(false);
    const [settledSummaryKey, setSettledSummaryKey] = useState<string | null>(null);

    // Payment List State
    const [query, setQuery] = useState<FinancialOversightQuery>(DEFAULT_QUERY);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [paymentsError, setPaymentsError] = useState<string | null>(null);
    const [isPaymentsBackendUnavailable, setIsPaymentsBackendUnavailable] = useState(false);
    const [settledPaymentsKey, setSettledPaymentsKey] = useState<string | null>(null);

    // Refresh Counter and Version Reference
    const [reloadCounter, setReloadCounter] = useState(0);
    const requestVersionRef = useRef(0);

    const currentSummaryKey =
        isSchoolSession && canReadReports ? `summary:${reloadCounter}` : 'summary:disabled';
    const isSummaryLoading =
        isSchoolSession && canReadReports && settledSummaryKey !== currentSummaryKey;

    const currentPaymentsKey =
        isSchoolSession && canReadPayments
            ? `payments:${reloadCounter}:${query.page}:${query.limit}:${query.search}:${query.status}:${query.paymentMethod}`
            : 'payments:disabled';
    const isPaymentsLoading =
        isSchoolSession && canReadPayments && settledPaymentsKey !== currentPaymentsKey;

    const reload = useCallback(() => {
        setReloadCounter((prev) => prev + 1);
    }, []);

    const setPage = useCallback((nextPage: number) => {
        setQuery((prev) => ({
            ...prev,
            page: Math.max(1, nextPage),
        }));
    }, []);

    const setSearch = useCallback((search: string) => {
        setQuery((prev) => ({
            ...prev,
            search,
            page: 1,
        }));
    }, []);

    const setStatusFilter = useCallback((status: PaymentStatus | 'ALL') => {
        setQuery((prev) => ({
            ...prev,
            status,
            page: 1,
        }));
    }, []);

    const setPaymentMethodFilter = useCallback((paymentMethod: PaymentMethod | 'ALL') => {
        setQuery((prev) => ({
            ...prev,
            paymentMethod,
            page: 1,
        }));
    }, []);

    const resetFilters = useCallback(() => {
        setQuery(DEFAULT_QUERY);
    }, []);

    // Fetch Financial Summary
    useEffect(() => {
        if (!isSchoolSession || !canReadReports) {
            return;
        }

        const currentVersion = ++requestVersionRef.current;
        const abortController = new AbortController();
        const cycleKey = `summary:${reloadCounter}`;

        getFinancialReportSummary(tenantId, user, abortController.signal)
            .then((data) => {
                if (currentVersion !== requestVersionRef.current) return;
                setSummary(data);
                setSummaryError(null);
                setIsSummaryBackendUnavailable(false);
                setSettledSummaryKey(cycleKey);
            })
            .catch((error: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;

                setSummary(null);
                if (isFinanceBackendUnavailableError(error)) {
                    setIsSummaryBackendUnavailable(true);
                    setSummaryError(
                        'Financial summary endpoint (/finance/reports/summary) is pending backend implementation.'
                    );
                } else {
                    setIsSummaryBackendUnavailable(false);
                    setSummaryError(
                        formatFinanceOperationError(
                            error,
                            'Unable to load school financial overview metrics.'
                        )
                    );
                }
                setSettledSummaryKey(cycleKey);
            });

        return () => {
            abortController.abort();
        };
    }, [isSchoolSession, canReadReports, tenantId, user, reloadCounter]);

    // Fetch Payment History List
    useEffect(() => {
        if (!isSchoolSession || !canReadPayments) {
            return;
        }

        const currentVersion = ++requestVersionRef.current;
        const abortController = new AbortController();
        const cycleKey = `payments:${reloadCounter}:${query.page}:${query.limit}:${query.search}:${query.status}:${query.paymentMethod}`;

        listPayments(
            {
                page: query.page,
                limit: query.limit,
                search: query.search.trim() || undefined,
                status: query.status,
                paymentMethod: query.paymentMethod,
            },
            tenantId,
            user,
            abortController.signal
        )
            .then((response) => {
                if (currentVersion !== requestVersionRef.current) return;
                setPayments(response.items);
                setPagination(response.pagination ?? null);
                setPaymentsError(null);
                setIsPaymentsBackendUnavailable(false);
                setSettledPaymentsKey(cycleKey);
            })
            .catch((error: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;

                setPayments([]);
                setPagination(null);
                if (isFinanceBackendUnavailableError(error)) {
                    setIsPaymentsBackendUnavailable(true);
                    setPaymentsError(
                        'Payment history endpoint (/finance/payments) is pending backend implementation.'
                    );
                } else {
                    setIsPaymentsBackendUnavailable(false);
                    setPaymentsError(
                        formatFinanceOperationError(
                            error,
                            'Unable to load payment transaction history.'
                        )
                    );
                }
                setSettledPaymentsKey(cycleKey);
            });

        return () => {
            abortController.abort();
        };
    }, [
        isSchoolSession,
        canReadPayments,
        tenantId,
        user,
        reloadCounter,
        query.page,
        query.limit,
        query.search,
        query.status,
        query.paymentMethod,
    ]);

    return {
        summary: canReadReports ? summary : null,
        isSummaryLoading,
        summaryError: canReadReports ? summaryError : null,
        isSummaryBackendUnavailable: canReadReports ? isSummaryBackendUnavailable : false,
        payments: canReadPayments ? payments : [],
        pagination: canReadPayments ? pagination : null,
        isPaymentsLoading,
        paymentsError: canReadPayments ? paymentsError : null,
        isPaymentsBackendUnavailable: canReadPayments ? isPaymentsBackendUnavailable : false,
        query,
        setQuery,
        setPage,
        setSearch,
        setStatusFilter,
        setPaymentMethodFilter,
        resetFilters,
        canReadReports,
        canReadPayments,
        isSchoolSession,
        reload,
    };
}

