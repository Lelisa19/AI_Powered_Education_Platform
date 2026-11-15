import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { DashboardEmptyState } from '../../../components/Dashboards/DashboardEmptyState';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PERMISSIONS, SCHOOL_ADMIN_ROUTE_PERMISSIONS } from '../../../constants/permissions';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { InviteSchoolStaffModal } from '../../school-admin/components/InviteSchoolStaffModal';
import {
    StaffAccountStatusBadge,
    StaffInvitationStatusBadge,
    StaffRoleBadge,
} from '../../school-admin/components/StaffBadges';
import {
    isSchoolStaffBackendUnavailableError,
    resendSchoolStaffInvitation,
    revokeSchoolStaffInvitation,
} from '../../school-admin/services/school-staff-service';
import type {
    SchoolStaffInvitation,
    SchoolStaffRole,
} from '../../school-admin/types/school-staff.types';
import {
    canActorInviteStaffRole,
    canActorResendStaffInvitation,
    canActorRevokeStaffInvitation,
    evaluateStaffStatusToggleEligibility,
    formatStaffDate,
    formatStaffDateTime,
    formatStaffFullName,
} from '../../school-admin/utils/school-staff-formatters';
import type { PaginationMeta } from '../../../types/api.types';
import { TeacherDetailModal } from '../components/TeacherDetailModal';
import { useTeacherManagement } from '../hooks/useTeacherManagement';
import type { TeacherDirectoryStatusFilter } from '../types/teacher-management.types';

interface TeacherPaginationBarProps {
    pagination: PaginationMeta | null;
    isLoading: boolean;
    itemLabel: string;
    onPageChange: (nextPage: number) => void;
}

const TeacherPaginationBar: React.FC<TeacherPaginationBarProps> = ({
    pagination,
    isLoading,
    itemLabel,
    onPageChange,
}) => {
    if (!pagination || (pagination.total === 0 && pagination.totalPages <= 1)) {
        return null;
    }

    return (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 text-xs text-gray-600 sm:flex-row">
            <span>
                Showing page <span className="font-semibold text-gray-900">{pagination.page}</span>{' '}
                of <span className="font-semibold text-gray-900">{Math.max(1, pagination.totalPages)}</span>{' '}
                ({pagination.total} total {itemLabel})
            </span>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={isLoading || pagination.page <= 1}
                    onClick={() => onPageChange(pagination.page - 1)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Previous
                </button>
                <button
                    type="button"
                    disabled={isLoading || pagination.page >= pagination.totalPages}
                    onClick={() => onPageChange(pagination.page + 1)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export const TeacherManagementPage: React.FC = () => {
    const { user } = useAuth();
    const { classification, tenantId, schoolName, hostname } = useTenantContext();
    const { hasPermission, hasAnyPermission } = usePermissions();

    const isVerifiedSchoolSession =
        classification === 'SCHOOL' &&
        Boolean(tenantId) &&
        user?.accountType === 'SCHOOL' &&
        user.tenantId === tenantId;

    const canReadTeachers = hasPermission(PERMISSIONS.TEACHERS.READ);
    const canUpdateTeacher = hasPermission(PERMISSIONS.TEACHERS.UPDATE);
    const canManageTeacherPermissions = hasPermission(PERMISSIONS.TEACHERS.MANAGE_PERMISSIONS);
    const canInviteTeacher = canActorInviteStaffRole('TEACHER', hasPermission, hasAnyPermission);
    const canAccessStaffDirectory = hasAnyPermission([...SCHOOL_ADMIN_ROUTE_PERMISSIONS.STAFF]);

    const allowedInviteRoles: readonly SchoolStaffRole[] = canInviteTeacher ? ['TEACHER'] : [];

    const {
        query,
        setQuery,
        teachers,
        accountsPagination,
        accountsLoading,
        accountsError,
        showAccountsSection,
        teacherInvitations,
        invitationsPagination,
        invitationsLoading,
        invitationsError,
        showInvitationsSection,
        excludedNonTeacherCount,
        excludedNonTeacherInvitationCount,
        reloadDirectory,
        selectedAccount,
        teacherRecord,
        profileLoading,
        hasLoadedProfile,
        profileError,
        formValues,
        fieldErrors,
        isProfileDirty,
        isSaving,
        saveError,
        saveSuccessMessage,
        savedTeacherPermissions,
        draftTeacherPermissions,
        preservedNonTeacherPermissions,
        hasExplicitTeacherPermissionScope,
        isPermissionsDirty,
        isSavingPermissions,
        permissionsSaveError,
        permissionsSaveSuccessMessage,
        openTeacherDetail,
        retryLoadTeacherProfile,
        closeTeacherDetail,
        updateFormField,
        resetProfileForm,
        saveTeacherProfile,
        toggleTeacherPermission,
        setTeacherPermissionCategorySelection,
        resetTeacherPermissions,
        saveTeacherPermissions,
        applyAccountUpdate,
    } = useTeacherManagement({
        actor: user,
        expectedTenantId: tenantId,
        enabled: isVerifiedSchoolSession,
        canReadTeachers,
        canUpdateTeacher,
        canManageTeacherPermissions,
    });

    const [searchInput, setSearchInput] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [pageNotice, setPageNotice] = useState<string | null>(null);
    const [invitationActionError, setInvitationActionError] = useState<string | null>(null);
    const [mutatingInvitationId, setMutatingInvitationId] = useState<string | null>(null);
    const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

    const schoolDisplayName = schoolName || hostname || 'this school';
    const hasActiveFilters = query.search.trim() !== '' || query.statusFilter !== 'ALL';

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setQuery((prev) => ({
            ...prev,
            accountsPage: 1,
            invitationsPage: 1,
            search: searchInput.trim(),
        }));
    };

    const handleResetFilters = () => {
        setSearchInput('');
        setQuery((prev) => ({
            ...prev,
            accountsPage: 1,
            invitationsPage: 1,
            search: '',
            statusFilter: 'ALL',
        }));
    };

    const handleOpenInviteModal = () => {
        if (!isVerifiedSchoolSession || !tenantId || !canInviteTeacher) {
            return;
        }
        setPageNotice(null);
        setIsInviteModalOpen(true);
    };

    const handleInviteSuccess = (invitation: SchoolStaffInvitation, message?: string) => {
        setIsInviteModalOpen(false);
        setPageNotice(
            message ??
                `Teacher invitation sent to ${invitation.email}. Status: ${invitation.status}.`
        );
        reloadDirectory();
    };

    const handleResendInvitation = async (invitation: SchoolStaffInvitation) => {
        if (
            !isVerifiedSchoolSession ||
            !tenantId ||
            mutatingInvitationId ||
            !canActorResendStaffInvitation(invitation, hasPermission, hasAnyPermission)
        ) {
            return;
        }

        setInvitationActionError(null);
        setPageNotice(null);
        setMutatingInvitationId(invitation.id);

        try {
            const response = await resendSchoolStaffInvitation(
                { invitationId: invitation.id },
                tenantId
            );
            setPageNotice(
                response.message ?? `Teacher invitation resent to ${invitation.email}.`
            );
            reloadDirectory();
        } catch (error: unknown) {
            const unavailable = isSchoolStaffBackendUnavailableError(error);
            setInvitationActionError(
                unavailable
                    ? 'Teacher invitation resend endpoint is currently unavailable or pending backend implementation.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to resend teacher invitation.'
            );
        } finally {
            setMutatingInvitationId(null);
        }
    };

    const handleConfirmRevoke = async (invitation: SchoolStaffInvitation) => {
        if (
            !isVerifiedSchoolSession ||
            !tenantId ||
            mutatingInvitationId ||
            !canActorRevokeStaffInvitation(invitation, hasPermission, hasAnyPermission)
        ) {
            return;
        }

        setInvitationActionError(null);
        setPageNotice(null);
        setMutatingInvitationId(invitation.id);

        try {
            const response = await revokeSchoolStaffInvitation(
                { invitationId: invitation.id },
                tenantId
            );
            setConfirmRevokeId(null);
            setPageNotice(
                response.message ?? `Teacher invitation for ${invitation.email} has been revoked.`
            );
            reloadDirectory();
        } catch (error: unknown) {
            const unavailable = isSchoolStaffBackendUnavailableError(error);
            setInvitationActionError(
                unavailable
                    ? 'Teacher invitation revoke endpoint is currently unavailable or pending backend implementation.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to revoke teacher invitation.'
            );
        } finally {
            setMutatingInvitationId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <DashboardPageHeader
                    title="Teacher Management"
                    subtitle={`Manage faculty profiles, onboarding invitations, and active teaching staff accounts for ${schoolDisplayName}.`}
                />

                <div className="flex flex-wrap items-center gap-2.5 sm:pt-1">
                    {isVerifiedSchoolSession && canAccessStaffDirectory && (
                        <Link
                            to="/admin/staff"
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                        >
                            All Staff &amp; Admins
                        </Link>
                    )}
                    {isVerifiedSchoolSession && canInviteTeacher && (
                        <button
                            type="button"
                            onClick={handleOpenInviteModal}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                        >
                            Invite Teacher
                        </button>
                    )}
                </div>
            </div>

            {!isVerifiedSchoolSession ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Verified School Context Required: Teacher management is restricted to an
                    authenticated School Admin session matching the active school tenant.
                </div>
            ) : !canReadTeachers ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access Denied: Viewing the Teacher directory requires the{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.TEACHERS.READ}
                    </code>{' '}
                    permission.
                </div>
            ) : (
                <>
                    <div
                        role="note"
                        className="flex flex-col gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <span>
                            Teacher accounts are backed by the unified School Staff directory (
                            <code className="rounded bg-blue-100 px-1 py-0.5 font-mono">
                                role: TEACHER
                            </code>
                            ). Staff holding both School Admin and Teacher roles appear here
                            automatically without duplicate accounts.
                        </span>
                        {!canUpdateTeacher && (
                            <span className="shrink-0 font-semibold text-blue-950">
                                Read-only profile view ({PERMISSIONS.TEACHERS.UPDATE} required to edit)
                            </span>
                        )}
                    </div>

                    {pageNotice && (
                        <div
                            role="status"
                            className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                        >
                            {pageNotice}
                        </div>
                    )}

                    {(excludedNonTeacherCount > 0 || excludedNonTeacherInvitationCount > 0) && (
                        <div
                            role="status"
                            className="rounded-md border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900"
                        >
                            Client-side role guard filtered{' '}
                            {excludedNonTeacherCount + excludedNonTeacherInvitationCount} non-teacher
                            record(s) returned by the directory endpoint.
                        </div>
                    )}

                    <DashboardOverviewCard title="Search & Filter Teachers">
                        <form
                            onSubmit={handleSearchSubmit}
                            className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end"
                        >
                            <div className="md:col-span-6">
                                <label
                                    htmlFor="teacher-directory-search"
                                    className="block text-xs font-medium uppercase tracking-wide text-gray-600"
                                >
                                    Search Teachers &amp; Invitations
                                </label>
                                <input
                                    id="teacher-directory-search"
                                    type="search"
                                    value={searchInput}
                                    onChange={(event) => setSearchInput(event.target.value)}
                                    placeholder="Search by teacher name, email, department, or phone..."
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>

                            <div className="md:col-span-4">
                                <label
                                    htmlFor="teacher-directory-status-filter"
                                    className="block text-xs font-medium uppercase tracking-wide text-gray-600"
                                >
                                    Status Filter
                                </label>
                                <select
                                    id="teacher-directory-status-filter"
                                    value={query.statusFilter}
                                    onChange={(event) =>
                                        setQuery((prev) => ({
                                            ...prev,
                                            accountsPage: 1,
                                            invitationsPage: 1,
                                            statusFilter: event.target
                                                .value as TeacherDirectoryStatusFilter,
                                        }))
                                    }
                                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    <option value="ALL">All Accounts &amp; Invitations</option>
                                    <option value="ACTIVE">Active Teachers</option>
                                    <option value="INACTIVE">Inactive Teachers</option>
                                    <option value="PENDING">Pending Invitations</option>
                                    <option value="ACCEPTED">Accepted Invitations</option>
                                    <option value="EXPIRED">Expired Invitations</option>
                                    <option value="REVOKED">Revoked Invitations</option>
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
                        <DashboardOverviewCard title="Teacher Directory">
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
                                            Loading teacher accounts...
                                        </p>
                                    </div>
                                ) : accountsError ? (
                                    accountsError.isBackendUnavailable ? (
                                        <div
                                            role="status"
                                            className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                                        >
                                            <h3 className="text-base font-semibold text-amber-900">
                                                Teacher Directory API Pending Backend Implementation
                                            </h3>
                                            <p className="mx-auto mt-2 max-w-xl text-sm text-amber-800">
                                                The frontend failed closed without fabricating
                                                teacher accounts because{' '}
                                                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                                                    GET /api/school/staff?role=TEACHER
                                                </code>{' '}
                                                is unavailable ({accountsError.message}).
                                            </p>
                                            <div className="mt-4">
                                                <button
                                                    type="button"
                                                    onClick={reloadDirectory}
                                                    className="rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-100"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            role="alert"
                                            className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
                                        >
                                            <h3 className="text-base font-semibold text-red-900">
                                                Unable to Load Teacher Directory
                                            </h3>
                                            <p className="mx-auto mt-2 max-w-xl text-sm text-red-700">
                                                {accountsError.message}
                                            </p>
                                            <div className="mt-4">
                                                <button
                                                    type="button"
                                                    onClick={reloadDirectory}
                                                    className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 shadow-sm hover:bg-red-100"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        </div>
                                    )
                                ) : teachers.length === 0 ? (
                                    <DashboardEmptyState
                                        headingLevel="h3"
                                        title={
                                            hasActiveFilters
                                                ? 'No Matching Teachers Found'
                                                : 'No Teacher Accounts Yet'
                                        }
                                        description={
                                            hasActiveFilters
                                                ? 'No teacher accounts matched your search or status filter criteria.'
                                                : 'Invite teachers using the Invite Teacher button. Activated teacher accounts and multi-role teaching staff will appear here.'
                                        }
                                    />
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    <tr>
                                                        <th scope="col" className="px-4 py-3">
                                                            Teacher
                                                        </th>
                                                        <th scope="col" className="px-4 py-3">
                                                            Department &amp; Phone
                                                        </th>
                                                        <th scope="col" className="px-4 py-3">
                                                            Roles
                                                        </th>
                                                        <th scope="col" className="px-4 py-3">
                                                            Status
                                                        </th>
                                                        <th scope="col" className="px-4 py-3">
                                                            Activated / Last Login
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
                                                    {teachers.map((account) => {
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
                                                                <td className="px-4 py-3 text-xs text-gray-700">
                                                                    <div>
                                                                        {account.department ??
                                                                            'Department unassigned'}
                                                                    </div>
                                                                    <div className="text-gray-500">
                                                                        {account.phone ??
                                                                            'No phone listed'}
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
                                                                    <div>
                                                                        Joined:{' '}
                                                                        {formatStaffDateTime(
                                                                            account.activatedAt ??
                                                                                account.createdAt
                                                                        )}
                                                                    </div>
                                                                    <div className="text-gray-500">
                                                                        Login:{' '}
                                                                        {formatStaffDateTime(
                                                                            account.lastLoginAt
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            openTeacherDetail(
                                                                                account
                                                                            )
                                                                        }
                                                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                                                    >
                                                                        {canUpdateTeacher ||
                                                                        canManageTeacherPermissions ||
                                                                        statusEligibility.allowed
                                                                            ? 'Manage Teacher'
                                                                            : 'View Profile'}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        <TeacherPaginationBar
                                            pagination={accountsPagination}
                                            isLoading={accountsLoading}
                                            itemLabel="teacher accounts"
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
                        <DashboardOverviewCard title="Teacher Invitations">
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
                                            Loading teacher invitations...
                                        </p>
                                    </div>
                                ) : invitationsError ? (
                                    invitationsError.isBackendUnavailable ? (
                                        <div
                                            role="status"
                                            className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                                        >
                                            <h3 className="text-base font-semibold text-amber-900">
                                                Teacher Invitations API Pending Backend Implementation
                                            </h3>
                                            <p className="mx-auto mt-2 max-w-xl text-sm text-amber-800">
                                                Unable to fetch{' '}
                                                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                                                    GET /api/school/staff/invitations?role=TEACHER
                                                </code>{' '}
                                                ({invitationsError.message}).
                                            </p>
                                            <div className="mt-4">
                                                <button
                                                    type="button"
                                                    onClick={reloadDirectory}
                                                    className="rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-100"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            role="alert"
                                            className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
                                        >
                                            <h3 className="text-base font-semibold text-red-900">
                                                Unable to Load Teacher Invitations
                                            </h3>
                                            <p className="mx-auto mt-2 max-w-xl text-sm text-red-700">
                                                {invitationsError.message}
                                            </p>
                                            <div className="mt-4">
                                                <button
                                                    type="button"
                                                    onClick={reloadDirectory}
                                                    className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 shadow-sm hover:bg-red-100"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        </div>
                                    )
                                ) : teacherInvitations.length === 0 ? (
                                    <DashboardEmptyState
                                        headingLevel="h3"
                                        title={
                                            hasActiveFilters
                                                ? 'No Matching Teacher Invitations'
                                                : 'No Teacher Invitations'
                                        }
                                        description={
                                            hasActiveFilters
                                                ? 'No teacher invitations matched your current search or filter criteria.'
                                                : 'Pending, accepted, expired, and revoked teacher invitations sent via the shared staff invitation workflow will appear here.'
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
                                                            Sent
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
                                                    {teacherInvitations.map((invitation) => {
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
                                                                    {formatStaffDate(
                                                                        invitation.expiresAt
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    {isConfirmingRevoke ? (
                                                                        <div className="inline-flex items-center gap-2">
                                                                            <button
                                                                                type="button"
                                                                                disabled={
                                                                                    Boolean(
                                                                                        mutatingInvitationId
                                                                                    )
                                                                                }
                                                                                onClick={() =>
                                                                                    handleConfirmRevoke(
                                                                                        invitation
                                                                                    )
                                                                                }
                                                                                className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                                                            >
                                                                                {isMutatingThis
                                                                                    ? 'Revoking...'
                                                                                    : 'Confirm Revoke'}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                disabled={
                                                                                    Boolean(
                                                                                        mutatingInvitationId
                                                                                    )
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

                                        <TeacherPaginationBar
                                            pagination={invitationsPagination}
                                            isLoading={invitationsLoading}
                                            itemLabel="teacher invitations"
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

            {isInviteModalOpen && canInviteTeacher && tenantId && (
                <InviteSchoolStaffModal
                    allowedRoles={allowedInviteRoles}
                    initialRole="TEACHER"
                    lockRole={true}
                    expectedTenantId={tenantId}
                    schoolDisplayName={schoolDisplayName}
                    onClose={() => setIsInviteModalOpen(false)}
                    onSuccess={handleInviteSuccess}
                />
            )}

            {selectedAccount && tenantId && (
                <TeacherDetailModal
                    key={selectedAccount.id}
                    account={selectedAccount}
                    teacherRecord={teacherRecord}
                    expectedTenantId={tenantId}
                    currentActorId={user?.id ?? null}
                    hasPermission={hasPermission}
                    hasAnyPermission={hasAnyPermission}
                    canUpdateTeacher={canUpdateTeacher}
                    canManageTeacherPermissions={canManageTeacherPermissions}
                    profileLoading={profileLoading}
                    hasLoadedProfile={hasLoadedProfile}
                    profileError={profileError}
                    formValues={formValues}
                    fieldErrors={fieldErrors}
                    isProfileDirty={isProfileDirty}
                    isSaving={isSaving}
                    saveError={saveError}
                    saveSuccessMessage={saveSuccessMessage}
                    hasExplicitTeacherPermissionScope={hasExplicitTeacherPermissionScope}
                    savedTeacherPermissions={savedTeacherPermissions}
                    draftTeacherPermissions={draftTeacherPermissions}
                    preservedNonTeacherPermissions={preservedNonTeacherPermissions}
                    isPermissionsDirty={isPermissionsDirty}
                    isSavingPermissions={isSavingPermissions}
                    permissionsSaveError={permissionsSaveError}
                    permissionsSaveSuccessMessage={permissionsSaveSuccessMessage}
                    onRetryLoadProfile={retryLoadTeacherProfile}
                    onFieldChange={updateFormField}
                    onResetForm={resetProfileForm}
                    onSaveProfile={saveTeacherProfile}
                    onToggleTeacherPermission={toggleTeacherPermission}
                    onSetTeacherPermissionCategorySelection={
                        setTeacherPermissionCategorySelection
                    }
                    onResetTeacherPermissions={resetTeacherPermissions}
                    onSaveTeacherPermissions={saveTeacherPermissions}
                    onAccountUpdated={applyAccountUpdate}
                    onClose={closeTeacherDetail}
                />
            )}
        </div>
    );
};
