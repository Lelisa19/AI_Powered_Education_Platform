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
} from '../../accountants/services/accountant-service';
import type { FinancialReportSummary } from '../../accountants/types/accountant.types';

export interface SchoolAdminFinancialSummaryState {
    summary: FinancialReportSummary | null;
    isLoading: boolean;
    error: string | null;
    isBackendUnavailable: boolean;
    canReadReports: boolean;
    canAccessFinance: boolean;
    reload: () => void;
}

export function useSchoolAdminFinancialSummary(): SchoolAdminFinancialSummaryState {
    const { user } = useAuth();
    const { tenantId, classification } = useTenantContext();
    const { hasPermission } = usePermissions();

    const canReadReports = hasPermission(PERMISSIONS.REPORTS.READ);
    const canReadPayments = hasPermission(PERMISSIONS.PAYMENTS.READ);
    const canAccessFinance = canReadReports && canReadPayments;

    const isSchoolSession =
        user?.accountType === 'SCHOOL' &&
        classification === 'SCHOOL' &&
        Boolean(tenantId) &&
        user.tenantId === tenantId;

    const [summary, setSummary] = useState<FinancialReportSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isBackendUnavailable, setIsBackendUnavailable] = useState(false);
    const [settledKey, setSettledKey] = useState<string | null>(null);

    const [reloadCounter, setReloadCounter] = useState(0);
    const requestVersionRef = useRef(0);

    const currentKey =
        isSchoolSession && canReadReports ? `summary:${reloadCounter}` : 'summary:disabled';
    const isLoading = isSchoolSession && canReadReports && settledKey !== currentKey;

    const reload = useCallback(() => {
        setReloadCounter((prev) => prev + 1);
    }, []);

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
                setError(null);
                setIsBackendUnavailable(false);
                setSettledKey(cycleKey);
            })
            .catch((err: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                if (err instanceof ApiError && err.isCancellation) return;

                setSummary(null);
                if (isFinanceBackendUnavailableError(err)) {
                    setIsBackendUnavailable(true);
                    setError(
                        'Financial summary endpoint (/finance/reports/summary) is pending backend implementation.'
                    );
                } else {
                    setIsBackendUnavailable(false);
                    setError(
                        formatFinanceOperationError(
                            err,
                            'Unable to load financial summary.'
                        )
                    );
                }
                setSettledKey(cycleKey);
            });

        return () => {
            abortController.abort();
        };
    }, [isSchoolSession, canReadReports, tenantId, user, reloadCounter]);

    return {
        summary: canReadReports ? summary : null,
        isLoading,
        error: canReadReports ? error : null,
        isBackendUnavailable: canReadReports ? isBackendUnavailable : false,
        canReadReports,
        canAccessFinance,
        reload,
    };
}

