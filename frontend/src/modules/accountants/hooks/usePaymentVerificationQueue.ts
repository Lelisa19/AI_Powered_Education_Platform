import { useCallback, useEffect, useRef, useState } from 'react';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { PERMISSIONS } from '../../../constants/permissions';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { ApiError } from '../../../services/api/api-error';
import type { PaginationMeta } from '../../../types/api.types';
import {
    formatFinanceOperationError,
    isFinanceBackendUnavailableError,
    listPayments,
    submitPaymentVerification,
} from '../services/accountant-service';
import type {
    PaymentMethod,
    PaymentRecord,
    PaymentStatus,
    PaymentVerificationResponse,
} from '../types/accountant.types';

export interface PaymentQueueFilterState {
    page: number;
    limit: number;
    search: string;
    status: PaymentStatus | 'ALL';
    paymentMethod: PaymentMethod | 'ALL';
    startDate: string;
    endDate: string;
}

export interface UsePaymentVerificationQueueResult {
    // Queue Records & Meta
    payments: PaymentRecord[];
    pagination: PaginationMeta | null;
    isLoading: boolean;
    error: string | null;
    isBackendUnavailable: boolean;

    // Filter Controls
    filters: PaymentQueueFilterState;
    setPage: (page: number) => void;
    setSearch: (search: string) => void;
    setStatusFilter: (status: PaymentStatus | 'ALL') => void;
    setPaymentMethodFilter: (method: PaymentMethod | 'ALL') => void;
    setDateRange: (startDate: string, endDate: string) => void;
    resetFilters: () => void;

    // Refresh Action
    reload: () => void;

    // Decision Submissions
    isSubmittingDecision: boolean;
    decisionError: string | null;
    submitDecision: (
        payment: PaymentRecord,
        decision: 'APPROVE' | 'REJECT',
        note?: string | null
    ) => Promise<PaymentVerificationResponse>;

    // Permission Flags
    canReadPayments: boolean;
    canVerifyPayments: boolean;
    canRejectPayments: boolean;
}

export const DEFAULT_QUEUE_FILTERS: PaymentQueueFilterState = {
    page: 1,
    limit: 10,
    search: '',
    status: 'ALL',
    paymentMethod: 'ALL',
    startDate: '',
    endDate: '',
};

export function usePaymentVerificationQueue(
    initialStatus: PaymentStatus | 'ALL' = 'ALL'
): UsePaymentVerificationQueueResult {
    const { user } = useAuth();
    const { tenantId, classification } = useTenantContext();
    const { hasPermission } = usePermissions();

    const canReadPayments = hasPermission(PERMISSIONS.PAYMENTS.READ);
    const canVerifyPayments = hasPermission(PERMISSIONS.PAYMENTS.VERIFY);
    const canRejectPayments = hasPermission(PERMISSIONS.PAYMENTS.REJECT);

    const isSchoolSession =
        user?.accountType === 'SCHOOL' &&
        classification === 'SCHOOL' &&
        Boolean(tenantId) &&
        user.tenantId === tenantId;

    const [filters, setFilters] = useState<PaymentQueueFilterState>({
        ...DEFAULT_QUEUE_FILTERS,
        status: initialStatus,
    });

    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isBackendUnavailable, setIsBackendUnavailable] = useState(false);
    const [settledKey, setSettledKey] = useState<string | null>(null);

    const [reloadCounter, setReloadCounter] = useState(0);
    const requestVersionRef = useRef(0);

    const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
    const [decisionError, setDecisionError] = useState<string | null>(null);

    const currentKey =
        isSchoolSession && canReadPayments
            ? `queue:${reloadCounter}:${filters.page}:${filters.limit}:${filters.search}:${filters.status}:${filters.paymentMethod}:${filters.startDate}:${filters.endDate}`
            : 'queue:disabled';

    const isLoading = isSchoolSession && canReadPayments && settledKey !== currentKey;

    const reload = useCallback(() => {
        setReloadCounter((prev) => prev + 1);
    }, []);

    const setPage = useCallback((page: number) => {
        setFilters((prev) => ({
            ...prev,
            page: Math.max(1, page),
        }));
    }, []);

    const setSearch = useCallback((search: string) => {
        setFilters((prev) => ({
            ...prev,
            search,
            page: 1,
        }));
    }, []);

    const setStatusFilter = useCallback((status: PaymentStatus | 'ALL') => {
        setFilters((prev) => ({
            ...prev,
            status,
            page: 1,
        }));
    }, []);

    const setPaymentMethodFilter = useCallback((paymentMethod: PaymentMethod | 'ALL') => {
        setFilters((prev) => ({
            ...prev,
            paymentMethod,
            page: 1,
        }));
    }, []);

    const setDateRange = useCallback((startDate: string, endDate: string) => {
        setFilters((prev) => ({
            ...prev,
            startDate,
            endDate,
            page: 1,
        }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters(DEFAULT_QUEUE_FILTERS);
    }, []);

    // Fetch payments
    useEffect(() => {
        if (!isSchoolSession || !canReadPayments) {
            return;
        }

        const currentVersion = ++requestVersionRef.current;
        const abortController = new AbortController();
        const cycleKey = `queue:${reloadCounter}:${filters.page}:${filters.limit}:${filters.search}:${filters.status}:${filters.paymentMethod}:${filters.startDate}:${filters.endDate}`;

        const query = {
            page: filters.page,
            limit: filters.limit,
            search: filters.search.trim() || undefined,
            status: filters.status,
            paymentMethod: filters.paymentMethod,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
        };

        listPayments(query, tenantId, user, abortController.signal)
            .then((data) => {
                if (currentVersion !== requestVersionRef.current) return;
                setPayments(data.items);
                setPagination(data.pagination ?? null);
                setError(null);
                setIsBackendUnavailable(false);
                setSettledKey(cycleKey);
            })
            .catch((err: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                if (err instanceof ApiError && err.isCancellation) return;

                setPayments([]);
                setPagination(null);

                if (isFinanceBackendUnavailableError(err)) {
                    setIsBackendUnavailable(true);
                    setError(
                        'Payment verification endpoint (GET /finance/payments) is pending backend service activation.'
                    );
                } else {
                    setIsBackendUnavailable(false);
                    setError(
                        formatFinanceOperationError(
                            err,
                            'Failed to load payment verification queue.'
                        )
                    );
                }
                setSettledKey(cycleKey);
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
        filters.page,
        filters.limit,
        filters.search,
        filters.status,
        filters.paymentMethod,
        filters.startDate,
        filters.endDate,
    ]);

    // Submit Verification Decision
    const submitDecision = useCallback(
        async (
            payment: PaymentRecord,
            decision: 'APPROVE' | 'REJECT',
            note?: string | null
        ): Promise<PaymentVerificationResponse> => {
            if (!user || !tenantId || classification !== 'SCHOOL') {
                throw new Error('A verified school session is required.');
            }

            if (decision === 'APPROVE' && !canVerifyPayments) {
                throw new Error(
                    'Forbidden: You do not have permission (payments.verify) to approve payments.'
                );
            }

            if (decision === 'REJECT' && !canRejectPayments) {
                throw new Error(
                    'Forbidden: You do not have permission (payments.reject) to reject payments.'
                );
            }

            if (isSubmittingDecision) {
                throw new Error('A decision is already being submitted. Please wait.');
            }

            setIsSubmittingDecision(true);
            setDecisionError(null);

            try {
                const response = await submitPaymentVerification(
                    payment,
                    {
                        paymentId: payment.id,
                        decision,
                        note: note ?? null,
                    },
                    tenantId,
                    user
                );

                // Reconcile authoritative record in queue state
                setPayments((prev) =>
                    prev.map((item) => (item.id === response.payment.id ? response.payment : item))
                );

                return response;
            } catch (err: unknown) {
                const message = formatFinanceOperationError(
                    err,
                    'Failed to submit payment decision.'
                );
                setDecisionError(message);
                throw err;
            } finally {
                setIsSubmittingDecision(false);
            }
        },
        [user, tenantId, classification, canVerifyPayments, canRejectPayments, isSubmittingDecision]
    );

    return {
        payments,
        pagination,
        isLoading,
        error,
        isBackendUnavailable,
        filters,
        setPage,
        setSearch,
        setStatusFilter,
        setPaymentMethodFilter,
        setDateRange,
        resetFilters,
        reload,
        isSubmittingDecision,
        decisionError,
        submitDecision,
        canReadPayments,
        canVerifyPayments,
        canRejectPayments,
    };
}

