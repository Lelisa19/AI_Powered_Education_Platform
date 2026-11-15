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
    listStudentBalances,
} from '../services/accountant-service';
import type { StudentBalanceSummary } from '../types/accountant.types';

export interface StudentFinancialFilterState {
    page: number;
    limit: number;
    search: string;
    overdueOnly: boolean;
}

export interface UseStudentFinancialRecordsResult {
    // Records and Metadata
    records: StudentBalanceSummary[];
    pagination: PaginationMeta | null;
    isLoading: boolean;
    error: string | null;
    isBackendUnavailable: boolean;

    // Filter Controls
    filters: StudentFinancialFilterState;
    setPage: (page: number) => void;
    setSearch: (search: string) => void;
    setOverdueOnly: (overdueOnly: boolean) => void;
    resetFilters: () => void;

    // Refresh Action
    reload: () => void;

    // Permission Flags
    canReadPayments: boolean;
    canReadStudents: boolean;
    hasRequiredPermissions: boolean;
}

export const DEFAULT_STUDENT_FINANCIAL_FILTERS: StudentFinancialFilterState = {
    page: 1,
    limit: 10,
    search: '',
    overdueOnly: false,
};

export function useStudentFinancialRecords(): UseStudentFinancialRecordsResult {
    const { user } = useAuth();
    const { tenantId, classification } = useTenantContext();
    const { hasPermission } = usePermissions();

    const canReadPayments = hasPermission(PERMISSIONS.PAYMENTS.READ);
    const canReadStudents = hasPermission(PERMISSIONS.STUDENTS.READ);
    const hasRequiredPermissions = canReadPayments && canReadStudents;

    const isSchoolSession =
        user?.accountType === 'SCHOOL' &&
        classification === 'SCHOOL' &&
        Boolean(tenantId) &&
        user.tenantId === tenantId;

    const [filters, setFilters] = useState<StudentFinancialFilterState>(
        DEFAULT_STUDENT_FINANCIAL_FILTERS
    );

    const [records, setRecords] = useState<StudentBalanceSummary[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isBackendUnavailable, setIsBackendUnavailable] = useState(false);
    const [settledKey, setSettledKey] = useState<string | null>(null);

    const [reloadCounter, setReloadCounter] = useState(0);
    const requestVersionRef = useRef(0);

    const currentKey =
        isSchoolSession && hasRequiredPermissions
            ? `students:${reloadCounter}:${filters.page}:${filters.limit}:${filters.search}:${filters.overdueOnly}`
            : 'students:disabled';

    const isLoading = isSchoolSession && hasRequiredPermissions && settledKey !== currentKey;

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

    const setOverdueOnly = useCallback((overdueOnly: boolean) => {
        setFilters((prev) => ({
            ...prev,
            overdueOnly,
            page: 1,
        }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters(DEFAULT_STUDENT_FINANCIAL_FILTERS);
    }, []);

    // Fetch records
    useEffect(() => {
        if (!isSchoolSession || !hasRequiredPermissions) {
            return;
        }

        const currentVersion = ++requestVersionRef.current;
        const abortController = new AbortController();
        const cycleKey = `students:${reloadCounter}:${filters.page}:${filters.limit}:${filters.search}:${filters.overdueOnly}`;

        const query = {
            page: filters.page,
            limit: filters.limit,
            search: filters.search.trim() || undefined,
            isOverdue: filters.overdueOnly ? true : undefined,
        };

        listStudentBalances(query, tenantId, user, abortController.signal)
            .then((data) => {
                if (currentVersion !== requestVersionRef.current) return;
                setRecords(data.items);
                setPagination(data.pagination ?? null);
                setError(null);
                setIsBackendUnavailable(false);
                setSettledKey(cycleKey);
            })
            .catch((err: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                if (err instanceof ApiError && err.isCancellation) return;

                setRecords([]);
                setPagination(null);

                if (isFinanceBackendUnavailableError(err)) {
                    setIsBackendUnavailable(true);
                    setError(null);
                } else {
                    setIsBackendUnavailable(false);
                    setError(
                        formatFinanceOperationError(
                            err,
                            'Failed to load student financial records.'
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
        hasRequiredPermissions,
        tenantId,
        user,
        filters.page,
        filters.limit,
        filters.search,
        filters.overdueOnly,
        reloadCounter,
    ]);

    return {
        records,
        pagination,
        isLoading,
        error,
        isBackendUnavailable,
        filters,
        setPage,
        setSearch,
        setOverdueOnly,
        resetFilters,
        reload,
        canReadPayments,
        canReadStudents,
        hasRequiredPermissions,
    };
}

