import React, { useMemo, useRef, useState } from 'react';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { DashboardEmptyState } from '../../../components/Dashboards/DashboardEmptyState';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PERMISSIONS, SCHOOL_ADMIN_ROUTE_PERMISSIONS } from '../../../constants/permissions';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import type { PaginationMeta } from '../../../types/api.types';
import { InviteSchoolStaffModal } from '../components/InviteSchoolStaffModal';
import {
    StaffAccountStatusBadge,
    StaffInvitationStatusBadge,
    StaffRoleBadge,
} from '../components/StaffBadges';
import { StaffDetailModal } from '../components/StaffDetailModal';
import {
    type StaffDirectoryQueryState,
    useSchoolStaffDirectory,
} from '../hooks/useSchoolStaffDirectory';
import {
    isSchoolStaffBackendUnavailableError,
    resendSchoolStaffInvitation,
    revokeSchoolStaffInvitation,
} from '../services/school-staff-service';
import {
    SCHOOL_STAFF_ROLES,
    type SchoolStaffAccount,
    type SchoolStaffInvitation,
    type SchoolStaffRole,
    type StaffDirectoryStatusFilter,
} from '../types/school-staff.types';
import {
    canActorResendStaffInvitation,
    canActorRevokeStaffInvitation,
    evaluateStaffStatusToggleEligibility,
    formatStaffDateTime,
    formatStaffFullName,
    formatStaffRoleLabel,
    getActorInvitableStaffRoles,
} from '../utils/school-staff-formatters';

interface PaginationBarProps {
    pagination: PaginationMeta | null;
    isLoading: boolean;
    onPageChange: (nextPage: number) => void;
}

const StaffPaginationControls: React.FC<PaginationBarProps> = ({
    pagination,
    isLoading,
    onPageChange,
}) => {
    if (!pagination || pagination.totalPages <= 1) {
        return null;
    }

    return (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 sm:flex-row">
            <p className="text-xs text-gray-600">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total.toLocaleString()}{' '}
                total)
            </p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={pagination.page <= 1 || isLoading}
                    onClick={() => onPageChange(pagination.page - 1)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Previous
                </button>
                <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages || isLoading}
                    onClick={() => onPageChange(pagination.page + 1)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

const INITIAL_QUERY: StaffDirectoryQueryState = {
    accountsPage: 1,
    invitationsPage: 1,
    limit: 10,
    search: '',
    role: '',
    statusFilter: 'ALL',
};

export const StaffManagementPage: React.FC = () => {
    const { user } = useAuth();
    const { tenantId, schoolName, hostname, classification } = useTenantContext();
    const { hasPermission, hasAnyPermission } = usePermissions();

    const canViewDirectory = hasAnyPermission([...SCHOOL_ADMIN_ROUTE_PERMISSIONS.STAFF]);
    const isVerifiedSchoolAdminSession =
        classification === 'SCHOOL' &&
        Boolean(tenantId) &&
        user?.accountType === 'SCHOOL' &&
        user.tenantId === tenantId;

    const invitableRoles = useMemo(
        () => getActorInvitableStaffRoles(hasPermission, hasAnyPermission),
        [hasPermission, hasAnyPermission]
    );

    const [query, setQuery] = useState<StaffDirectoryQueryState>(INITIAL_QUERY);
    const [searchInput, setSearchInput] = useState('');

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<SchoolStaffAccount | null>(null);
    const [statusNotice, setStatusNotice] = useState<string | null>(null);

    const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
    const [mutatingInvitationId, setMutatingInvitationId] = useState<string | null>(null);
    const [invitationActionError, setInvitationActionError] = useState<string | null>(null);

    const isMutatingInvitationRef = useRef(false);

    const {
        accounts,
        setAccounts,
        accountsPagination,
        accountsLoading,
        accountsError,
        showAccountsSection,
        invitations,
        invitationsPagination,
        invitationsLoading,
        invitationsError,
        showInvitationsSection,
        reloadDirectory,
    } = useSchoolStaffDirectory(
        query,
        tenantId,
        canViewDirectory && isVerifiedSchoolAdminSession
    );

    const schoolDisplayName = schoolName || hostname || 'this school';

    const handleApplySearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setConfirmRevokeId(null);
        setInvitationActionError(null);
        setQuery((prev) => ({
            ...prev,
            accountsPage: 1,
            invitationsPage: 1,
            search: searchInput.trim(),
        }));
    };

    const handleResetFilters = () => {
        setSearchInput('');
        setConfirmRevokeId(null);
        setInvitationActionError(null);
        setQuery(INITIAL_QUERY);
    };

    const handleInviteSuccess = (invitation: SchoolStaffInvitation, message?: string) => {
        setIsInviteModalOpen(false);
        setInvitationActionError(null);
        setStatusNotice(
            message ||
                `${formatStaffRoleLabel(invitation.role)} invitation sent to ${invitation.email}.`
        );
        reloadDirectory();
    };

    const handleStaffUpdated = (updatedStaff: SchoolStaffAccount, notice?: string) => {
        setAccounts((prev) =>
            prev.map((item) => (item.id === updatedStaff.id ? updatedStaff : item))
        );
        setSelectedStaff(updatedStaff);
        if (notice) {
            setStatusNotice(notice);
        }
    };

    const handleResendInvitation = async (invitation: SchoolStaffInvitation) => {
        if (
            !tenantId ||
            !canActorResendStaffInvitation(invitation, hasPermission, hasAnyPermission) ||
            isMutatingInvitationRef.current ||
            mutatingInvitationId
        ) {
            return;
        }

        setInvitationActionError(null);
        setStatusNotice(null);
        setConfirmRevokeId(null);
        isMutatingInvitationRef.current = true;
        setMutatingInvitationId(invitation.id);

        try {
            const response = await resendSchoolStaffInvitation(
                { invitationId: invitation.id },
                tenantId
            );
            setStatusNotice(
                response.message || `Resent staff invitation to ${response.invitation.email}.`
            );
            reloadDirectory();
        } catch (error: unknown) {
            setInvitationActionError(
                isSchoolStaffBackendUnavailableError(error)
                    ? 'Staff invitation resend endpoint is unavailable or pending backend implementation.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to resend staff invitation.'
            );
        } finally {
            isMutatingInvitationRef.current = false;
            setMutatingInvitationId(null);
        }
    };

    const handleConfirmRevoke = async (invitation: SchoolStaffInvitation) => {
        if (
            !tenantId ||
            !canActorRevokeStaffInvitation(invitation, hasPermission, hasAnyPermission) ||
            isMutatingInvitationRef.current ||
            mutatingInvitationId
        ) {
            return;
        }

        setInvitationActionError(null);
        setStatusNotice(null);
        isMutatingInvitationRef.current = true;
        setMutatingInvitationId(invitation.id);

        try {
            const response = await revokeSchoolStaffInvitation(
                { invitationId: invitation.id },
                tenantId
            );
            setConfirmRevokeId(null);
            setStatusNotice(
                response.message || `Revoked invitation for ${response.invitation.email}.`
            );
            reloadDirectory();
        } catch (error: unknown) {
            setInvitationActionError(
                isSchoolStaffBackendUnavailableError(error)
                    ? 'Staff invitation revocation endpoint is unavailable or pending backend implementation.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to revoke staff invitation.'
            );
        } finally {
            isMutatingInvitationRef.current = false;
            setMutatingInvitationId(null);
        }
    };

    if (!isVerifiedSchoolAdminSession) {
        return (
            <div className="mx-auto max-w-5xl">
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access Denied: Staff management is strictly scoped to a verified school tenant administrator session.
                </div>
            </div>
        );
    }

    const hasActiveFilters = Boolean(query.search || query.role || query.statusFilter !== 'ALL');

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <DashboardPageHeader
                    title="Staff & Administrators"
                    subtitle={`Invite and manage School Admins, Teachers, and School Accountants for ${schoolDisplayName}.`}
                />

                {canViewDirectory && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                            type="button"
                            disabled={accountsLoading || invitationsLoading}
                            onClick={reloadDirectory}
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                        >
                            Refresh
                        </button>
                        {invitableRoles.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setStatusNotice(null);
                                    setInvitationActionError(null);
                                    setIsInviteModalOpen(true);
                                }}
                                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                            >
                                Invite Staff
                            </button>
                        )}
                    </div>
                )}
            </div>

            {!canViewDirectory ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access Denied: Viewing school staff requires at least one of{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.SCHOOL_ADMINS.READ}
                    </code>
                    ,{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.TEACHERS.READ}
                    </code>
                    , or{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.USERS.READ}
                    </code>
                    .
                </div>
            ) : (
                <>
                    <div
                        role="note"
                        className="rounded-md border border-gray-200 bg-gray-100 p-4 text-xs text-gray-700"
                    >
                        <p>
                            Role &amp; tenant isolation: This directory manages only <span className="font-semibold">SCHOOL_ADMIN</span>, <span className="font-semibold">TEACHER</span>, and <span className="font-semibold">SCHOOL_ACCOUNTANT</span> accounts for <span className="font-semibold">{schoolDisplayName}</span>. Teachers and staff do not self-register, and Accountant financial workflows remain strictly separate.
                        </p>
                        <p className="mt-1 text-gray-600">
                            Governance notice: Permission assignment and School Admin restriction editing are not enabled here until Primary vs. Additional School Admin authority rules are established on the backend.
                        </p>
                    </div>

                    {statusNotice && (
                        <div
                            role="status"
                            className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
                        >
                            {statusNotice}
                        </div>
                    )}

                    <DashboardOverviewCard title="Filter Staff & Invitations">
                        <form
                            onSubmit={handleApplySearch}
                            className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end"
                        >
                            <div className="md:col-span-5">
                                <label
                                    htmlFor="staff-search"
                                    className="block text-xs font-medium text-gray-700"
                                >
                                    Search by Name or Email
                                </label>
                                <input
                                    id="staff-search"
                                    type="search"
                                    value={searchInput}
                                    onChange={(event) => setSearchInput(event.target.value)}
                                    placeholder="e.g. name or user@school.example"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>

                            <div className="md:col-span-3">
                                <label
                                    htmlFor="staff-role-filter"
                                    className="block text-xs font-medium text-gray-700"
                                >
                                    Staff Role
                                </label>
                                <select
                                    id="staff-role-filter"
                                    value={query.role}
                                    onChange={(event) => {
                                        setConfirmRevokeId(null);
                                        setQuery((prev) => ({
                                            ...prev,
                                            accountsPage: 1,
                                            invitationsPage: 1,
                                            role: event.target.value as '' | SchoolStaffRole,
                                        }));
                                    }}
                                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    <option value="">All Staff Roles</option>
                                    {SCHOOL_STAFF_ROLES.map((role) => (
                                        <option key={role} value={role}>
                                            {formatStaffRoleLabel(role)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label
                                    htmlFor="staff-status-filter"
                                    className="block text-xs font-medium text-gray-700"
                                >
                                    Account / Invite Status
                                </label>
                                <select
                                    id="staff-status-filter"
                                    value={query.statusFilter}
                                    onChange={(event) => {
                                        setConfirmRevokeId(null);
                                        setQuery((prev) => ({
                                            ...prev,
                                            accountsPage: 1,
                                            invitationsPage: 1,
                                            statusFilter: event.target
                                                .value as StaffDirectoryStatusFilter,
                                        }));
                                    }}
                                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    <option value="ALL">All States</option>
                                    <option value="ACTIVE">Active Accounts</option>
                                    <option value="INACTIVE">Inactive Accounts</option>
                                    <option value="PENDING">Pending Invitations</option>
                                    <option value="REVOKED">Revoked Invitations</option>
                                    <option value="EXPIRED">Expired Invitations</option>
                                    <option value="ACCEPTED">Accepted Invitations</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 md:col-span-2">
                                <button
                                    type="submit"
                                    className="flex-1 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900"
                                >
                                    Search
                                </button>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </form>
                    </DashboardOverviewCard>

                    {showAccountsSection && (
                        <DashboardOverviewCard title="Staff Accounts Directory">
                            <div className="space-y-4">
                                {accountsLoading ? (
                                    <div
                                        role="status"
                                        className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-12 text-center"
                                    >
                                        <div
                                            className="mb-3 h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
                                            aria-hidden="true"
                                        />
                                        <p className="text-sm font-medium text-gray-700">
                                            Loading school staff accounts...
                                        </p>
                                    </div>
                                ) : accountsError ? (
                                    accountsError.isBackendUnavailable ? (
                                        <div
                                            role="status"
                                            className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                                        >
                                            <h3 className="text-base font-semibold text-amber-900">
                                                School Staff Directory API Pending Backend Implementation
                                            </h3>
                                            <p className="mx-auto mt-2 max-w-xl text-sm text-amber-800">
                                                The frontend failed closed without showing fabricated staff records because{' '}
                                                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                                                    GET /api/school/staff
                                                </code>{' '}
                                                is unavailable ({accountsError.message}).
                                            </p>
                                            <div className="mt-4">
                                                <button
                                                    type="button"
                                                    onClick={reloadDirectory}
                                                    className="rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
                                                >
                                                    Retry Connection
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            role="alert"
                                            className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
                                        >
                                            <h3 className="text-base font-semibold text-red-900">
                                                Unable to Load School Staff Accounts
                                            </h3>
                                            <p className="mx-auto mt-2 max-w-xl text-sm text-red-700">
                                                {accountsError.message}
                                            </p>
                                        </div>
                                    )
                                ) : accounts.length === 0 ? (
                                    <DashboardEmptyState
                                        headingLevel="h3"
                                        title={
                                            hasActiveFilters
                                                ? 'No Matching Staff Accounts'
                                                : 'No School Staff Accounts Found'
                                        }
                                        description={
                                            hasActiveFilters
                                                ? 'Try clearing or adjusting your role, status, or search filters.'
                                                : 'Active and inactive School Admin, Teacher, and School Accountant accounts will appear here once staff members activate their invitations.'
                                        }
                                    />
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    <tr>
                                                        <th scope="col" className="px-4 py-3">
                                                            Staff Member
                                                        </th>
                                                        <th scope="col" className="px-4 py-3">
                                                            Roles
                                                        </th>
                                                        <th scope="col" className="px-4 py-3">
                                                            Status
                                                        </th>
                                                        <th scope="col" className="px-4 py-3">
                                                            Activated
                                                        </th>
                                                        <th
                                                            scope="col"
                                                            className="px-4 py-3 text-right"
                                                        >
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 bg-white">
                                                    {accounts.map((account) => {
                                                        const statusEligibility =
                                                            evaluateStaffStatusToggleEligibility(
                                                                account,
                                                                user?.id ?? null,
                                                                hasPermission,
                                                                hasAnyPermission
                                                            );

                                                        return (
                                                            <tr
                                                                key={account.id}
                                                                className="hover:bg-gray-50"
                                                            >
                                                                <td className="px-4 py-3">
                                                                    <div className="font-medium text-gray-900">
                                                                        {formatStaffFullName(
                                                                            account.firstName,
                                                                            account.lastName,
                                                                            account.email
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {account.email}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {account.roles.map(
                                                                            (role) => (
                                                                                <StaffRoleBadge
                                                                                    key={role}
                                                                                    role={role}
                                                                                />
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <StaffAccountStatusBadge
                                                                        status={account.status}
                                                                        isPrimaryAdmin={
                                                                            account.isPrimaryAdmin
                                                                        }
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-gray-600">
                                                                    {formatStaffDateTime(
                                                                        account.activatedAt ??
                                                                            account.createdAt
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setSelectedStaff(account)
                                                                        }
                                                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                                                    >
                                                                        {statusEligibility.allowed
                                                                            ? 'Manage Account'
                                                                            : 'View Details'}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        <StaffPaginationControls
                                            pagination={accountsPagination}
                                            isLoading={accountsLoading}
                                            onPageChange={(nextPage) =>
                                                setQuery((prev) => ({
                                                    ...prev,
                                                    accountsPage: nextPage,
                                                }))
                                            }
                                        />
                                    </>
                                )}
                            </div>
                        </DashboardOverviewCard>
                    )}

                    {showInvitationsSection && (
                        <DashboardOverviewCard title="Staff Invitations">
                            <div className="space-y-4">
                                {invitationActionError && (
                                    <div
                                        role="alert"
                                        aria-live="assertive"
                                        className="rounded-md border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                                    >
                                        {invitationActionError}
                                    </div>
                                )}

                                {invitationsLoading ? (
                                    <div
                                        role="status"
                                        className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-10 text-center"
                                    >
                                        <div
                                            className="mb-3 h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
                                            aria-hidden="true"
                                        />
                                        <p className="text-sm font-medium text-gray-700">
                                            Loading staff invitations...
                                        </p>
                                    </div>
                                ) : invitationsError ? (
                                    invitationsError.isBackendUnavailable ? (
                                        <div
                                            role="status"
                                            className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                                        >
                                            <h3 className="text-base font-semibold text-amber-900">
                                                Staff Invitations API Pending Backend Implementation
                                            </h3>
                                            <p className="mx-auto mt-2 max-w-xl text-sm text-amber-800">
                                                The frontend failed closed because{' '}
                                                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                                                    GET /api/school/staff/invitations
                                                </code>{' '}
                                                is unavailable ({invitationsError.message}).
                                            </p>
                                        </div>
                                    ) : (
                                        <div
                                            role="alert"
                                            className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
                                        >
                                            <h3 className="text-base font-semibold text-red-900">
                                                Unable to Load Staff Invitations
                                            </h3>
                                            <p className="mx-auto mt-2 max-w-xl text-sm text-red-700">
                                                {invitationsError.message}
                                            </p>
                                        </div>
                                    )
                                ) : invitations.length === 0 ? (
                                    <DashboardEmptyState
                                        headingLevel="h3"
                                        title={
                                            hasActiveFilters
                                                ? 'No Matching Staff Invitations'
                                                : 'No Staff Invitations'
                                        }
                                        description={
                                            hasActiveFilters
                                                ? 'No staff invitations match your current search or filter criteria.'
                                                : 'Pending, accepted, expired, and revoked School Admin, Teacher, and School Accountant invitations will appear here.'
                                        }
                                    />
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    <tr>
                                                        <th scope="col" className="px-4 py-3">
                                                            Invitee
                                                        </th>
                                                        <th scope="col" className="px-4 py-3">
                                                            Role
                                                        </th>
                                                        <th scope="col" className="px-4 py-3">
                                                            Status
                                                        </th>
                                                        <th scope="col" className="px-4 py-3">
                                                            Created / Sent
                                                        </th>
                                                        <th scope="col" className="px-4 py-3">
                                                            Expires
                                                        </th>
                                                        <th
                                                            scope="col"
                                                            className="px-4 py-3 text-right"
                                                        >
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 bg-white">
                                                    {invitations.map((invitation) => {
                                                        const canResend =
                                                            canActorResendStaffInvitation(
                                                                invitation,
                                                                hasPermission,
                                                                hasAnyPermission
                                                            );
                                                        const canRevoke =
                                                            canActorRevokeStaffInvitation(
                                                                invitation,
                                                                hasPermission,
                                                                hasAnyPermission
                                                            );
                                                        const isConfirmingRevoke =
                                                            confirmRevokeId === invitation.id;
                                                        const isMutatingThis =
                                                            mutatingInvitationId === invitation.id;

                                                        return (
                                                            <tr
                                                                key={invitation.id}
                                                                className="hover:bg-gray-50"
                                                            >
                                                                <td className="px-4 py-3">
                                                                    <div className="font-medium text-gray-900">
                                                                        {formatStaffFullName(
                                                                            invitation.firstName,
                                                                            invitation.lastName,
                                                                            invitation.email
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {invitation.email}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <StaffRoleBadge
                                                                        role={invitation.role}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <StaffInvitationStatusBadge
                                                                        status={invitation.status}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-gray-600">
                                                                    {formatStaffDateTime(
                                                                        invitation.sentAt ??
                                                                            invitation.createdAt
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-gray-600">
                                                                    {formatStaffDateTime(
                                                                        invitation.expiresAt
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    {!canResend && !canRevoke ? (
                                                                        <span className="text-xs text-gray-400">
                                                                            —
                                                                        </span>
                                                                    ) : isConfirmingRevoke ? (
                                                                        <div className="inline-flex items-center gap-2">
                                                                            <button
                                                                                type="button"
                                                                                disabled={
                                                                                    isMutatingThis
                                                                                }
                                                                                onClick={() =>
                                                                                    handleConfirmRevoke(
                                                                                        invitation
                                                                                    )
                                                                                }
                                                                                className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                                                                            >
                                                                                {isMutatingThis
                                                                                    ? 'Revoking...'
                                                                                    : 'Confirm Revoke'}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                disabled={
                                                                                    isMutatingThis
                                                                                }
                                                                                onClick={() =>
                                                                                    setConfirmRevokeId(
                                                                                        null
                                                                                    )
                                                                                }
                                                                                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="inline-flex items-center gap-2">
                                                                            {canResend && (
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={
                                                                                        Boolean(
                                                                                            mutatingInvitationId
                                                                                        )
                                                                                    }
                                                                                    onClick={() =>
                                                                                        handleResendInvitation(
                                                                                            invitation
                                                                                        )
                                                                                    }
                                                                                    className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                                                                                >
                                                                                    {isMutatingThis
                                                                                        ? 'Working...'
                                                                                        : 'Resend'}
                                                                                </button>
                                                                            )}
                                                                            {canRevoke && (
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={
                                                                                        Boolean(
                                                                                            mutatingInvitationId
                                                                                        )
                                                                                    }
                                                                                    onClick={() =>
                                                                                        setConfirmRevokeId(
                                                                                            invitation.id
                                                                                        )
                                                                                    }
                                                                                    className="rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50"
                                                                                >
                                                                                    Revoke
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        <StaffPaginationControls
                                            pagination={invitationsPagination}
                                            isLoading={invitationsLoading}
                                            onPageChange={(nextPage) =>
                                                setQuery((prev) => ({
                                                    ...prev,
                                                    invitationsPage: nextPage,
                                                }))
                                            }
                                        />
                                    </>
                                )}
                            </div>
                        </DashboardOverviewCard>
                    )}
                </>
            )}

            {isInviteModalOpen && invitableRoles.length > 0 && tenantId && (
                <InviteSchoolStaffModal
                    allowedRoles={invitableRoles}
                    expectedTenantId={tenantId}
                    schoolDisplayName={schoolDisplayName}
                    onClose={() => setIsInviteModalOpen(false)}
                    onSuccess={handleInviteSuccess}
                />
            )}

            {selectedStaff && tenantId && (
                <StaffDetailModal
                    key={selectedStaff.id}
                    staff={selectedStaff}
                    expectedTenantId={tenantId}
                    currentActorId={user?.id ?? null}
                    hasPermission={hasPermission}
                    hasAnyPermission={hasAnyPermission}
                    onClose={() => setSelectedStaff(null)}
                    onStaffUpdated={handleStaffUpdated}
                />
            )}
        </div>
    );
};

