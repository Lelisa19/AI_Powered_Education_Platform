import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import type { PaginationMeta } from '../../../types/api.types';
import {
    isSchoolStaffBackendUnavailableError,
    listSchoolStaffAccounts,
    listSchoolStaffInvitations,
} from '../services/school-staff-service';
import type {
    SchoolStaffAccount,
    SchoolStaffAccountStatus,
    SchoolStaffInvitation,
    SchoolStaffInvitationStatus,
    SchoolStaffRole,
    StaffDirectoryStatusFilter,
} from '../types/school-staff.types';

export interface StaffDirectoryFetchError {
    message: string;
    isBackendUnavailable: boolean;
}

export interface StaffDirectoryQueryState {
    accountsPage: number;
    invitationsPage: number;
    limit: number;
    search: string;
    role: '' | SchoolStaffRole;
    statusFilter: StaffDirectoryStatusFilter;
}

function isAccountStatusFilter(
    filter: StaffDirectoryStatusFilter
): filter is SchoolStaffAccountStatus {
    return filter === 'ACTIVE' || filter === 'INACTIVE';
}

function isInvitationStatusFilter(
    filter: StaffDirectoryStatusFilter
): filter is SchoolStaffInvitationStatus {
    return (
        filter === 'PENDING' ||
        filter === 'REVOKED' ||
        filter === 'EXPIRED' ||
        filter === 'ACCEPTED'
    );
}

export function useSchoolStaffDirectory(
    query: StaffDirectoryQueryState,
    expectedTenantId: string | null,
    enabled: boolean
) {
    const [accounts, setAccounts] = useState<SchoolStaffAccount[]>([]);
    const [accountsPagination, setAccountsPagination] = useState<PaginationMeta | null>(null);
    const [accountsError, setAccountsError] = useState<StaffDirectoryFetchError | null>(null);
    const [settledAccountsKey, setSettledAccountsKey] = useState<string | null>(null);

    const [invitations, setInvitations] = useState<SchoolStaffInvitation[]>([]);
    const [invitationsPagination, setInvitationsPagination] = useState<PaginationMeta | null>(null);
    const [invitationsError, setInvitationsError] = useState<StaffDirectoryFetchError | null>(null);
    const [settledInvitationsKey, setSettledInvitationsKey] = useState<string | null>(null);

    const [reloadCounter, setReloadCounter] = useState(0);
    const requestVersionRef = useRef(0);

    const showAccountsSection =
        query.statusFilter === 'ALL' || isAccountStatusFilter(query.statusFilter);
    const showInvitationsSection =
        query.statusFilter === 'ALL' || isInvitationStatusFilter(query.statusFilter);

    const normalizedSearch = query.search.trim();
    const accountsRequestKey =
        enabled && expectedTenantId && showAccountsSection
            ? JSON.stringify({
                  scope: 'accounts',
                  page: query.accountsPage,
                  limit: query.limit,
                  search: normalizedSearch,
                  role: query.role,
                  status: query.statusFilter,
                  expectedTenantId,
                  reloadCounter,
              })
            : null;

    const invitationsRequestKey =
        enabled && expectedTenantId && showInvitationsSection
            ? JSON.stringify({
                  scope: 'invitations',
                  page: query.invitationsPage,
                  limit: query.limit,
                  search: normalizedSearch,
                  role: query.role,
                  status: query.statusFilter,
                  expectedTenantId,
                  reloadCounter,
              })
            : null;

    useEffect(() => {
        if (!accountsRequestKey && !invitationsRequestKey) {
            return;
        }
        if (!expectedTenantId) {
            return;
        }

        const controller = new AbortController();
        const currentVersion = ++requestVersionRef.current;
        const searchParam = normalizedSearch || undefined;
        const roleFilter = query.role || undefined;

        if (accountsRequestKey) {
            const activeAccountsKey = accountsRequestKey;
            listSchoolStaffAccounts(
                {
                    page: query.accountsPage,
                    limit: query.limit,
                    search: searchParam,
                    role: roleFilter,
                    status: isAccountStatusFilter(query.statusFilter)
                        ? query.statusFilter
                        : undefined,
                },
                expectedTenantId,
                controller.signal
            )
                .then((response) => {
                    if (currentVersion !== requestVersionRef.current) return;
                    setAccounts(response.items);
                    setAccountsPagination(response.pagination);
                    setAccountsError(null);
                    setSettledAccountsKey(activeAccountsKey);
                })
                .catch((error: unknown) => {
                    if (currentVersion !== requestVersionRef.current) return;
                    if (error instanceof ApiError && error.isCancellation) return;

                    setAccounts([]);
                    setAccountsPagination(null);
                    setAccountsError({
                        isBackendUnavailable: isSchoolStaffBackendUnavailableError(error),
                        message:
                            error instanceof Error && error.message
                                ? error.message
                                : 'Unable to load school staff accounts.',
                    });
                    setSettledAccountsKey(activeAccountsKey);
                });
        }

        if (invitationsRequestKey) {
            const activeInvitationsKey = invitationsRequestKey;
            listSchoolStaffInvitations(
                {
                    page: query.invitationsPage,
                    limit: query.limit,
                    search: searchParam,
                    role: roleFilter,
                    status: isInvitationStatusFilter(query.statusFilter)
                        ? query.statusFilter
                        : undefined,
                },
                expectedTenantId,
                controller.signal
            )
                .then((response) => {
                    if (currentVersion !== requestVersionRef.current) return;
                    setInvitations(response.items);
                    setInvitationsPagination(response.pagination);
                    setInvitationsError(null);
                    setSettledInvitationsKey(activeInvitationsKey);
                })
                .catch((error: unknown) => {
                    if (currentVersion !== requestVersionRef.current) return;
                    if (error instanceof ApiError && error.isCancellation) return;

                    setInvitations([]);
                    setInvitationsPagination(null);
                    setInvitationsError({
                        isBackendUnavailable: isSchoolStaffBackendUnavailableError(error),
                        message:
                            error instanceof Error && error.message
                                ? error.message
                                : 'Unable to load staff invitations.',
                    });
                    setSettledInvitationsKey(activeInvitationsKey);
                });
        }

        return () => {
            controller.abort();
        };
    }, [
        accountsRequestKey,
        invitationsRequestKey,
        expectedTenantId,
        normalizedSearch,
        query.accountsPage,
        query.invitationsPage,
        query.limit,
        query.role,
        query.statusFilter,
    ]);

    const reloadDirectory = useCallback(() => {
        setReloadCounter((count) => count + 1);
    }, []);

    const accountsLoading =
        Boolean(accountsRequestKey) && settledAccountsKey !== accountsRequestKey;
    const invitationsLoading =
        Boolean(invitationsRequestKey) && settledInvitationsKey !== invitationsRequestKey;

    return {
        accounts: showAccountsSection && enabled ? accounts : [],
        setAccounts,
        accountsPagination: showAccountsSection && enabled ? accountsPagination : null,
        accountsLoading,
        accountsError: showAccountsSection && enabled ? accountsError : null,
        showAccountsSection,
        invitations: showInvitationsSection && enabled ? invitations : [],
        setInvitations,
        invitationsPagination: showInvitationsSection && enabled ? invitationsPagination : null,
        invitationsLoading,
        invitationsError: showInvitationsSection && enabled ? invitationsError : null,
        showInvitationsSection,
        reloadDirectory,
    };
}
