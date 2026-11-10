import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DashboardEmptyState } from '../../../components/Dashboards/DashboardEmptyState';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { ALL_PLATFORM_PERMISSIONS } from '../../../constants/permissions';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { AdminDetailModal } from '../components/AdminDetailModal';
import {
    AdminAccountStatusBadge,
    AdminInvitationStatusBadge,
    AdminTierBadge,
} from '../components/AdminStatusBadge';
import { InvitePlatformAdminModal } from '../components/InvitePlatformAdminModal';
import {
    isPlatformAdminBackendUnavailableError,
    listPlatformAdminInvitations,
    listPlatformAdmins,
    revokePlatformAdminInvitation,
} from '../services/platform-admin-service';
import type { PlatformAdminAccount, PlatformAdminInvitation } from '../types/platform-admin.types';
import {
    computeEffectiveAdminPermissions,
    formatPlatformAdminDate,
    formatPlatformAdminName,
} from '../utils/platform-admin-formatters';

interface FetchErrorState {
    message: string;
    isBackendUnavailable: boolean;
}

type AdminFilterMode = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUPER_ADMIN' | 'INVITED_ADMIN';

export const AdministratorsPage: React.FC = () => {
    const { user } = useAuth();
    const { isPlatformSuperAdmin, canManageAdminRestrictions } = usePermissions();

    const [admins, setAdmins] = useState<PlatformAdminAccount[]>([]);
    const [adminsLoading, setAdminsLoading] = useState(true);
    const [adminsError, setAdminsError] = useState<FetchErrorState | null>(null);

    const [invitations, setInvitations] = useState<PlatformAdminInvitation[]>([]);
    const [invitationsLoading, setInvitationsLoading] = useState(true);
    const [invitationsError, setInvitationsError] = useState<FetchErrorState | null>(null);

    const [searchText, setSearchText] = useState('');
    const [filterMode, setFilterMode] = useState<AdminFilterMode>('ALL');
    const [reloadCounter, setReloadCounter] = useState(0);

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<PlatformAdminAccount | null>(null);
    const [statusNotice, setStatusNotice] = useState<string | null>(null);

    const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [revokeError, setRevokeError] = useState<string | null>(null);

    const requestVersionRef = useRef(0);
    const isRevokingRef = useRef(false);

    useEffect(() => {
        const currentVersion = ++requestVersionRef.current;

        Promise.allSettled([listPlatformAdmins(), listPlatformAdminInvitations()])
            .then(([adminsResult, invitationsResult]) => {
                if (currentVersion !== requestVersionRef.current) return;

                if (adminsResult.status === 'fulfilled') {
                    setAdmins(adminsResult.value);
                    setAdminsError(null);
                } else {
                    const err: unknown = adminsResult.reason;
                    setAdmins([]);
                    setAdminsError({
                        isBackendUnavailable: isPlatformAdminBackendUnavailableError(err),
                        message:
                            err instanceof Error && err.message
                                ? err.message
                                : 'Unable to load platform administrators.',
                    });
                }

                if (invitationsResult.status === 'fulfilled') {
                    setInvitations(invitationsResult.value);
                    setInvitationsError(null);
                } else {
                    const err: unknown = invitationsResult.reason;
                    setInvitations([]);
                    setInvitationsError({
                        isBackendUnavailable: isPlatformAdminBackendUnavailableError(err),
                        message:
                            err instanceof Error && err.message
                                ? err.message
                                : 'Unable to load administrator invitations.',
                    });
                }
            })
            .finally(() => {
                if (currentVersion === requestVersionRef.current) {
                    setAdminsLoading(false);
                    setInvitationsLoading(false);
                }
            });
    }, [reloadCounter]);

    const triggerReload = useCallback(() => {
        setAdminsLoading(true);
        setInvitationsLoading(true);
        setAdminsError(null);
        setInvitationsError(null);
        setConfirmRevokeId(null);
        setRevokeError(null);
        setReloadCounter((count) => count + 1);
    }, []);

    const filteredAdmins = useMemo(() => {
        const normalizedSearch = searchText.trim().toLowerCase();

        return admins.filter((admin) => {
            if (filterMode === 'ACTIVE' && !admin.isActive) return false;
            if (filterMode === 'INACTIVE' && admin.isActive) return false;
            if (filterMode === 'SUPER_ADMIN' && !admin.isSuperAdmin) return false;
            if (filterMode === 'INVITED_ADMIN' && admin.isSuperAdmin) return false;

            if (!normalizedSearch) return true;

            const fullName = formatPlatformAdminName(admin.firstName, admin.lastName).toLowerCase();
            return (
                fullName.includes(normalizedSearch) ||
                admin.email.toLowerCase().includes(normalizedSearch)
            );
        });
    }, [admins, searchText, filterMode]);

    const handleInviteSuccess = (invitation: PlatformAdminInvitation) => {
        setIsInviteModalOpen(false);
        setStatusNotice(`Platform Admin invitation created for ${invitation.email}.`);
        triggerReload();
    };

    const handleAdminUpdated = (updatedAdmin: PlatformAdminAccount, notice?: string) => {
        setAdmins((prev) =>
            prev.map((item) => (item.id === updatedAdmin.id ? updatedAdmin : item))
        );
        setSelectedAdmin(updatedAdmin);
        if (notice) {
            setStatusNotice(notice);
        }
    };

    const handleConfirmRevoke = async (invitation: PlatformAdminInvitation) => {
        if (!isPlatformSuperAdmin || isRevokingRef.current || revokingId) {
            return;
        }

        setRevokeError(null);
        isRevokingRef.current = true;
        setRevokingId(invitation.id);

        try {
            await revokePlatformAdminInvitation({ invitationId: invitation.id });
            setConfirmRevokeId(null);
            setStatusNotice(`Revoked pending invitation for ${invitation.email}.`);
            triggerReload();
        } catch (error: unknown) {
            setRevokeError(
                isPlatformAdminBackendUnavailableError(error)
                    ? 'Invitation revocation endpoint is unavailable or pending backend implementation.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to revoke invitation.'
            );
        } finally {
            isRevokingRef.current = false;
            setRevokingId(null);
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <DashboardPageHeader
                    title="Platform Administrators"
                    subtitle="Manage platform administrator access under the common PLATFORM_ADMIN role and optional individual permission restrictions."
                />

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                        type="button"
                        disabled={adminsLoading || invitationsLoading}
                        onClick={triggerReload}
                        className="rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    >
                        Refresh
                    </button>
                    {isPlatformSuperAdmin && (
                        <button
                            type="button"
                            onClick={() => {
                                setStatusNotice(null);
                                setIsInviteModalOpen(true);
                            }}
                            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                        >
                            Invite Administrator
                        </button>
                    )}
                </div>
            </div>

            {!isPlatformSuperAdmin && (
                <div
                    role="status"
                    className="rounded-md border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700"
                >
                    Read-only mode: Only the initial Super Admin can invite administrators, revoke invitations, or modify individual permission restrictions.
                </div>
            )}

            {statusNotice && (
                <div
                    role="status"
                    className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
                >
                    {statusNotice}
                </div>
            )}

            <DashboardOverviewCard title="Administrator Directory">
                <div className="space-y-6">
                    {admins.length > 0 && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <label
                                    htmlFor="admin-search"
                                    className="block text-xs font-medium text-gray-700"
                                >
                                    Search Administrators
                                </label>
                                <input
                                    id="admin-search"
                                    type="search"
                                    value={searchText}
                                    onChange={(event) => setSearchText(event.target.value)}
                                    placeholder="Filter loaded administrators by name or email"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                            <div className="sm:w-52">
                                <label
                                    htmlFor="admin-filter"
                                    className="block text-xs font-medium text-gray-700"
                                >
                                    Filter
                                </label>
                                <select
                                    id="admin-filter"
                                    value={filterMode}
                                    onChange={(event) =>
                                        setFilterMode(event.target.value as AdminFilterMode)
                                    }
                                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    <option value="ALL">All Administrators</option>
                                    <option value="ACTIVE">Active Only</option>
                                    <option value="INACTIVE">Inactive Only</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                    <option value="INVITED_ADMIN">Invited Admins</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {adminsLoading ? (
                        <div
                            role="status"
                            className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-12 text-center"
                        >
                            <div
                                className="mb-3 h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
                                aria-hidden="true"
                            />
                            <p className="text-sm font-medium text-gray-700">
                                Loading platform administrators...
                            </p>
                        </div>
                    ) : adminsError ? (
                        adminsError.isBackendUnavailable ? (
                            <div
                                role="status"
                                className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                            >
                                <h3 className="text-base font-semibold text-amber-900">
                                    Platform Administrator Directory API Pending Backend Implementation
                                </h3>
                                <p className="mx-auto mt-2 max-w-lg text-sm text-amber-800">
                                    The frontend failed closed because the backend platform administrator directory endpoint is unavailable ({adminsError.message}).
                                </p>
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={triggerReload}
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
                                    Unable to Load Platform Administrators
                                </h3>
                                <p className="mx-auto mt-2 max-w-lg text-sm text-red-700">
                                    {adminsError.message}
                                </p>
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={triggerReload}
                                        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 shadow-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        )
                    ) : filteredAdmins.length === 0 ? (
                        <DashboardEmptyState
                            headingLevel="h3"
                            title={
                                admins.length > 0
                                    ? 'No Matching Administrators'
                                    : 'No Platform Administrators Found'
                            }
                            description={
                                admins.length > 0
                                    ? 'No administrators match your current search or filter.'
                                    : 'Administrator records returned by the backend directory endpoint will appear here.'
                            }
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Administrator</th>
                                        <th scope="col" className="px-4 py-3">Identity</th>
                                        <th scope="col" className="px-4 py-3">Status</th>
                                        <th scope="col" className="px-4 py-3">Permissions</th>
                                        <th scope="col" className="px-4 py-3">Created</th>
                                        <th scope="col" className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {filteredAdmins.map((admin) => {
                                        const effective = computeEffectiveAdminPermissions(admin);
                                        const restrictedCount = admin.isSuperAdmin
                                            ? 0
                                            : ALL_PLATFORM_PERMISSIONS.length - effective.length;
                                        const canEdit = canManageAdminRestrictions(admin);

                                        return (
                                            <tr key={admin.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">
                                                        {formatPlatformAdminName(
                                                            admin.firstName,
                                                            admin.lastName,
                                                            admin.email
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{admin.email}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <AdminTierBadge isSuperAdmin={admin.isSuperAdmin} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <AdminAccountStatusBadge isActive={admin.isActive} />
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-700">
                                                    <div>
                                                        {effective.length} / {ALL_PLATFORM_PERMISSIONS.length}{' '}
                                                        granted
                                                    </div>
                                                    {restrictedCount > 0 && (
                                                        <div className="text-red-700">
                                                            {restrictedCount} restricted
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {formatPlatformAdminDate(admin.createdAt)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedAdmin(admin)}
                                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                                    >
                                                        {canEdit ? 'Manage Restrictions' : 'View Details'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </DashboardOverviewCard>

            <DashboardOverviewCard title="Administrator Invitations">
                <div className="space-y-4">
                    {revokeError && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="rounded-md border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                        >
                            {revokeError}
                        </div>
                    )}

                    {invitationsLoading ? (
                        <div
                            role="status"
                            className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-10 text-center"
                        >
                            <p className="text-sm font-medium text-gray-700">
                                Loading administrator invitations...
                            </p>
                        </div>
                    ) : invitationsError ? (
                        invitationsError.isBackendUnavailable ? (
                            <div
                                role="status"
                                className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
                            >
                                <h3 className="text-base font-semibold text-amber-900">
                                    Administrator Invitations API Pending Backend Implementation
                                </h3>
                                <p className="mx-auto mt-2 max-w-lg text-sm text-amber-800">
                                    The frontend failed closed because the backend invitations endpoint is unavailable ({invitationsError.message}).
                                </p>
                            </div>
                        ) : (
                            <div
                                role="alert"
                                className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
                            >
                                <h3 className="text-base font-semibold text-red-900">
                                    Unable to Load Invitations
                                </h3>
                                <p className="mx-auto mt-2 max-w-lg text-sm text-red-700">
                                    {invitationsError.message}
                                </p>
                            </div>
                        )
                    ) : invitations.length === 0 ? (
                        <DashboardEmptyState
                            headingLevel="h3"
                            title="No Platform Admin Invitations"
                            description="Pending, accepted, expired, and revoked platform administrator invitations will appear here."
                        />
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                    <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th scope="col" className="px-4 py-3">Invitee</th>
                                            <th scope="col" className="px-4 py-3">Status</th>
                                            <th scope="col" className="px-4 py-3">Initial Restrictions</th>
                                            <th scope="col" className="px-4 py-3">Expires</th>
                                            <th scope="col" className="px-4 py-3">Created</th>
                                            <th scope="col" className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {invitations.map((invitation) => {
                                            const restrictionCount =
                                                invitation.restrictedPermissions?.length ?? 0;
                                            const isPending = invitation.status === 'PENDING';
                                            const isConfirming = confirmRevokeId === invitation.id;
                                            const isRevokingThis = revokingId === invitation.id;

                                            return (
                                                <tr key={invitation.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">
                                                            {formatPlatformAdminName(
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
                                                        <AdminInvitationStatusBadge
                                                            status={invitation.status}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-700">
                                                        {restrictionCount === 0
                                                            ? 'None (All permissions)'
                                                            : `${restrictionCount} restricted`}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {formatPlatformAdminDate(invitation.expiresAt)}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {formatPlatformAdminDate(invitation.createdAt)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {isPlatformSuperAdmin && isPending ? (
                                                            isConfirming ? (
                                                                <div className="inline-flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        disabled={isRevokingThis}
                                                                        onClick={() =>
                                                                            handleConfirmRevoke(invitation)
                                                                        }
                                                                        className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                                                                    >
                                                                        {isRevokingThis
                                                                            ? 'Revoking...'
                                                                            : 'Confirm Revoke'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={isRevokingThis}
                                                                        onClick={() => setConfirmRevokeId(null)}
                                                                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setConfirmRevokeId(invitation.id)
                                                                    }
                                                                    className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600"
                                                                >
                                                                    Revoke
                                                                </button>
                                                            )
                                                        ) : (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {isPlatformSuperAdmin && (
                                <p className="text-xs text-gray-500">
                                    Note: Resending an existing invitation requires a dedicated backend resend contract not yet defined in PlatformAdminServiceContract.
                                </p>
                            )}
                        </>
                    )}
                </div>
            </DashboardOverviewCard>

            {isInviteModalOpen && isPlatformSuperAdmin && (
                <InvitePlatformAdminModal
                    isSuperAdminActor={isPlatformSuperAdmin}
                    onClose={() => setIsInviteModalOpen(false)}
                    onSuccess={handleInviteSuccess}
                />
            )}

            {selectedAdmin && (
                <AdminDetailModal
                    key={selectedAdmin.id}
                    admin={selectedAdmin}
                    currentActorId={user?.id ?? null}
                    isSuperAdminActor={isPlatformSuperAdmin}
                    canManageTargetRestrictions={canManageAdminRestrictions(selectedAdmin)}
                    onClose={() => setSelectedAdmin(null)}
                    onAdminUpdated={handleAdminUpdated}
                />
            )}
        </div>
    );
};

