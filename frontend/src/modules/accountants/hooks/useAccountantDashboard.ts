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
} from '../services/accountant-service';
import type { FinancialReportSummary, PaymentRecord } from '../types/accountant.types';

export interface AccountantDashboardState {
    // Report Summary Metrics
    summary: FinancialReportSummary | null;
    isSummaryLoading: boolean;
    summaryError: string | null;
    isSummaryBackendUnavailable: boolean;

    // Recent Payment Activity
    recentPayments: PaymentRecord[];
    isPaymentsLoading: boolean;
    paymentsError: string | null;
    isPaymentsBackendUnavailable: boolean;

    // Permissions
    canReadPayments: boolean;
    canVerifyPayments: boolean;
    canReadReports: boolean;

    // Action
    reload: () => void;
}

export function useAccountantDashboard(): AccountantDashboardState {
    const { user } = useAuth();
    const { tenantId, classification } = useTenantContext();
    const { hasPermission } = usePermissions();

    const canReadPayments = hasPermission(PERMISSIONS.PAYMENTS.READ);
    const canVerifyPayments = hasPermission(PERMISSIONS.PAYMENTS.VERIFY);
    const canReadReports = hasPermission(PERMISSIONS.REPORTS.READ);

    const [summary, setSummary] = useState<FinancialReportSummary | null>(null);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [isSummaryBackendUnavailable, setIsSummaryBackendUnavailable] = useState<boolean>(false);
    const [settledSummaryKey, setSettledSummaryKey] = useState<string | null>(null);

    const [recentPayments, setRecentPayments] = useState<PaymentRecord[]>([]);
    const [paymentsError, setPaymentsError] = useState<string | null>(null);
    const [isPaymentsBackendUnavailable, setIsPaymentsBackendUnavailable] = useState<boolean>(false);
    const [settledPaymentsKey, setSettledPaymentsKey] = useState<string | null>(null);

    const [reloadCounter, setReloadCounter] = useState<number>(0);
    const requestVersionRef = useRef<number>(0);

    const isSchoolPortal = user?.accountType === 'SCHOOL' && classification === 'SCHOOL' && Boolean(tenantId);

    const currentSummaryKey = isSchoolPortal && canReadReports ? `summary:${reloadCounter}` : 'summary:disabled';
    const isSummaryLoading = isSchoolPortal && canReadReports && settledSummaryKey !== currentSummaryKey;

    const currentPaymentsKey = isSchoolPortal && canReadPayments ? `payments:${reloadCounter}` : 'payments:disabled';
    const isPaymentsLoading = isSchoolPortal && canReadPayments && settledPaymentsKey !== currentPaymentsKey;

    const reload = useCallback(() => {
        setReloadCounter((prev) => prev + 1);
    }, []);

    useEffect(() => {
        if (!user || classification !== 'SCHOOL' || !tenantId) {
            return;
        }

        const currentVersion = ++requestVersionRef.current;
        const abortController = new AbortController();
        const signal = abortController.signal;

        const summaryCycleKey = `summary:${reloadCounter}`;
        const paymentsCycleKey = `payments:${reloadCounter}`;

        // 1. Fetch Financial Report Summary (if permitted)
        if (canReadReports) {
            getFinancialReportSummary(tenantId, user, signal)
                .then((data) => {
                    if (currentVersion !== requestVersionRef.current) return;
                    setSummary(data);
                    setSummaryError(null);
                    setIsSummaryBackendUnavailable(false);
                    setSettledSummaryKey(summaryCycleKey);
                })
                .catch((error: unknown) => {
                    if (currentVersion !== requestVersionRef.current) return;
                    if (error instanceof ApiError && error.isCancellation) return;

                    setSummary(null);
                    if (isFinanceBackendUnavailableError(error)) {
                        setIsSummaryBackendUnavailable(true);
                        setSummaryError(
                            'Financial summary endpoint (/finance/reports/summary) is not yet active on the backend.'
                        );
                    } else {
                        setIsSummaryBackendUnavailable(false);
                        setSummaryError(
                            formatFinanceOperationError(
                                error,
                                'Unable to load financial report summary.'
                            )
                        );
                    }
                    setSettledSummaryKey(summaryCycleKey);
                });
        }

        // 2. Fetch Recent Payments (if permitted)
        if (canReadPayments) {
            listPayments({ limit: 5 }, tenantId, user, signal)
                .then((data) => {
                    if (currentVersion !== requestVersionRef.current) return;
                    setRecentPayments(data.items);
                    setPaymentsError(null);
                    setIsPaymentsBackendUnavailable(false);
                    setSettledPaymentsKey(paymentsCycleKey);
                })
                .catch((error: unknown) => {
                    if (currentVersion !== requestVersionRef.current) return;
                    if (error instanceof ApiError && error.isCancellation) return;

                    setRecentPayments([]);
                    if (isFinanceBackendUnavailableError(error)) {
                        setIsPaymentsBackendUnavailable(true);
                        setPaymentsError(
                            'Payments endpoint (/finance/payments) is not yet active on the backend.'
                        );
                    } else {
                        setIsPaymentsBackendUnavailable(false);
                        setPaymentsError(
                            formatFinanceOperationError(
                                error,
                                'Unable to load recent payment transactions.'
                            )
                        );
                    }
                    setSettledPaymentsKey(paymentsCycleKey);
                });
        }

        return () => {
            abortController.abort();
        };
    }, [user, tenantId, classification, canReadReports, canReadPayments, reloadCounter]);

    return {
        summary,
        isSummaryLoading,
        summaryError,
        isSummaryBackendUnavailable,
        recentPayments,
        isPaymentsLoading,
        paymentsError,
        isPaymentsBackendUnavailable,
        canReadPayments,
        canVerifyPayments,
        canReadReports,
        reload,
    };
}
