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
} from '../services/accountant-service';
import type { FinancialReportSummary } from '../types/accountant.types';

export interface DateRangeFilter {
    startDate: string;
    endDate: string;
}

export interface UseFinancialReportsResult {
    // Summary Data
    summary: FinancialReportSummary | null;
    isLoading: boolean;
    error: string | null;
    isBackendUnavailable: boolean;

    // Date Range Controls
    dateRange: DateRangeFilter;
    validationError: string | null;
    setDateRange: (startDate: string, endDate: string) => void;
    resetDateRange: () => void;
    hasActiveDateFilter: boolean;
    periodLabel: string;

    // Refresh Action
    reload: () => void;

    // Permission Flags
    canReadReports: boolean;
    canExportReports: boolean;
}

export function useFinancialReports(): UseFinancialReportsResult {
    const { user } = useAuth();
    const { tenantId, classification } = useTenantContext();
    const { hasPermission } = usePermissions();

    const canReadReports = hasPermission(PERMISSIONS.REPORTS.READ);
    const canExportReports = hasPermission(PERMISSIONS.REPORTS.EXPORT);

    const isSchoolPortal =
        user?.accountType === 'SCHOOL' &&
        classification === 'SCHOOL' &&
        Boolean(tenantId) &&
        user.tenantId === tenantId;

    const [summary, setSummary] = useState<FinancialReportSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isBackendUnavailable, setIsBackendUnavailable] = useState(false);
    const [settledKey, setSettledKey] = useState<string | null>(null);

    const [dateRange, setDateRangeState] = useState<DateRangeFilter>({
        startDate: '',
        endDate: '',
    });
    const [validationError, setValidationError] = useState<string | null>(null);

    const [reloadCounter, setReloadCounter] = useState(0);
    const requestVersionRef = useRef(0);

    const currentKey =
        isSchoolPortal && canReadReports
            ? `report:${reloadCounter}:${dateRange.startDate}:${dateRange.endDate}`
            : 'report:disabled';

    const isLoading = isSchoolPortal && canReadReports && settledKey !== currentKey;

    const hasActiveDateFilter = Boolean(dateRange.startDate || dateRange.endDate);

    const periodLabel = dateRange.startDate && dateRange.endDate
        ? `${dateRange.startDate} to ${dateRange.endDate}`
        : dateRange.startDate
          ? `From ${dateRange.startDate}`
          : dateRange.endDate
            ? `Up to ${dateRange.endDate}`
            : 'All-Time Cumulative';

    const reload = useCallback(() => {
        setReloadCounter((prev) => prev + 1);
    }, []);

    const setDateRange = useCallback((startDate: string, endDate: string) => {
        const cleanStart = startDate.trim();
        const cleanEnd = endDate.trim();

        if (cleanStart && cleanEnd && cleanStart > cleanEnd) {
            setValidationError('Start date must be on or before end date.');
            return;
        }

        setValidationError(null);
        setDateRangeState({
            startDate: cleanStart,
            endDate: cleanEnd,
        });
    }, []);

    const resetDateRange = useCallback(() => {
        setValidationError(null);
        setDateRangeState({
            startDate: '',
            endDate: '',
        });
    }, []);

    useEffect(() => {
        if (!isSchoolPortal || !canReadReports) {
            return;
        }

        const currentVersion = ++requestVersionRef.current;
        const abortController = new AbortController();
        const cycleKey = `report:${reloadCounter}:${dateRange.startDate}:${dateRange.endDate}`;

        const queryParams = hasActiveDateFilter
            ? {
                  startDate: dateRange.startDate || undefined,
                  endDate: dateRange.endDate || undefined,
              }
            : undefined;

        getFinancialReportSummary(tenantId, user, abortController.signal, queryParams)
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
                    setError(null);
                } else {
                    setIsBackendUnavailable(false);
                    setError(
                        formatFinanceOperationError(
                            err,
                            'Failed to load financial report summary.'
                        )
                    );
                }
                setSettledKey(cycleKey);
            });

        return () => {
            abortController.abort();
        };
    }, [
        isSchoolPortal,
        canReadReports,
        tenantId,
        user,
        dateRange.startDate,
        dateRange.endDate,
        hasActiveDateFilter,
        reloadCounter,
    ]);

    return {
        summary,
        isLoading,
        error,
        isBackendUnavailable,
        dateRange,
        validationError,
        setDateRange,
        resetDateRange,
        hasActiveDateFilter,
        periodLabel,
        reload,
        canReadReports,
        canExportReports,
    };
}

