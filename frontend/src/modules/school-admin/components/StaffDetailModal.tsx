import React, { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import { validateStaffActionReason } from '../schemas/school-staff-schema';
import {
    getSchoolStaffAccountById,
    isSchoolStaffBackendUnavailableError,
    updateSchoolStaffAccountStatus,
} from '../services/school-staff-service';
import type { SchoolStaffAccount, SchoolStaffAccountStatus } from '../types/school-staff.types';
import {
    evaluateStaffStatusToggleEligibility,
    formatStaffDateTime,
    formatStaffFullName,
    type AnyPermissionCheckFn,
    type PermissionCheckFn,
} from '../utils/school-staff-formatters';
import { StaffAccountStatusBadge, StaffRoleBadge } from './StaffBadges';

interface StaffDetailModalProps {
    staff: SchoolStaffAccount;
    expectedTenantId: string;
    currentActorId: string | null;
    hasPermission: PermissionCheckFn;
    hasAnyPermission: AnyPermissionCheckFn;
    onClose: () => void;
    onStaffUpdated: (staff: SchoolStaffAccount, notice?: string) => void;
}

export const StaffDetailModal: React.FC<StaffDetailModalProps> = ({
    staff,
    expectedTenantId,
    currentActorId,
    hasPermission,
    hasAnyPermission,
    onClose,
    onStaffUpdated,
}) => {
    const [detail, setDetail] = useState<SchoolStaffAccount>(staff);
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [detailNotice, setDetailNotice] = useState<string | null>(null);

    const [confirmingTargetStatus, setConfirmingTargetStatus] =
        useState<SchoolStaffAccountStatus | null>(null);
    const [statusReason, setStatusReason] = useState('');
    const [statusError, setStatusError] = useState('');
    const [statusSuccessNotice, setStatusSuccessNotice] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const isMutatingRef = useRef(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const controller = new AbortController();
        let isActive = true;

        getSchoolStaffAccountById(staff.id, expectedTenantId, controller.signal)
            .then((response) => {
                if (!isActive) return;
                setDetail(response.staff);
                setDetailNotice(null);
            })
            .catch((error: unknown) => {
                if (!isActive) return;
                if (error instanceof ApiError && error.isCancellation) return;

                setDetailNotice(
                    isSchoolStaffBackendUnavailableError(error)
                        ? 'Showing summary directory record because the detail endpoint is pending backend implementation.'
                        : error instanceof Error && error.message
                          ? `Unable to refresh full staff details (${error.message}).`
                          : 'Unable to refresh full staff details.'
                );
            })
            .finally(() => {
                if (isActive) {
                    setIsRefreshing(false);
                }
            });

        const frameId = requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isMutatingRef.current) {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            isActive = false;
            controller.abort();
            cancelAnimationFrame(frameId);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [staff.id, expectedTenantId, onClose]);

    const statusEligibility = evaluateStaffStatusToggleEligibility(
        detail,
        currentActorId,
        hasPermission,
        hasAnyPermission
    );

    const nextStatus: SchoolStaffAccountStatus =
        detail.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const handleConfirmStatusChange = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (
            !statusEligibility.allowed ||
            !confirmingTargetStatus ||
            isMutatingRef.current ||
            isUpdatingStatus
        ) {
            return;
        }

        const reasonValidation = validateStaffActionReason(statusReason);
        if (!reasonValidation.valid) {
            setStatusError(reasonValidation.error);
            return;
        }

        setStatusError('');
        setStatusSuccessNotice('');
        isMutatingRef.current = true;
        setIsUpdatingStatus(true);

        try {
            const response = await updateSchoolStaffAccountStatus(
                {
                    staffId: detail.id,
                    status: confirmingTargetStatus,
                    reason: reasonValidation.reason,
                },
                expectedTenantId
            );
            setDetail(response.staff);
            setConfirmingTargetStatus(null);
            setStatusReason('');
            const message =
                response.message ||
                `${confirmingTargetStatus === 'INACTIVE' ? 'Disabled' : 'Reactivated'} staff account for ${formatStaffFullName(
                    response.staff.firstName,
                    response.staff.lastName,
                    response.staff.email
                )}.`;
            setStatusSuccessNotice(message);
            onStaffUpdated(response.staff, message);
        } catch (error: unknown) {
            setStatusError(
                isSchoolStaffBackendUnavailableError(error)
                    ? 'Staff account status update endpoint is unavailable or pending backend implementation. No changes were saved.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to update staff account status.'
            );
        } finally {
            isMutatingRef.current = false;
            setIsUpdatingStatus(false);
        }
    };

    const fullName = formatStaffFullName(detail.firstName, detail.lastName, detail.email);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
                if (!isUpdatingStatus) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="staff-detail-title"
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2 id="staff-detail-title" className="text-lg font-semibold text-gray-900">
                            {fullName}
                        </h2>
                        <p className="mt-0.5 text-sm text-gray-600">{detail.email}</p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={onClose}
                        aria-label="Close staff account details dialog"
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6 px-6 py-5">
                    {isRefreshing && (
                        <div role="status" className="text-xs text-gray-500">
                            Refreshing account record...
                        </div>
                    )}

                    {detailNotice && (
                        <div
                            role="status"
                            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
                        >
                            {detailNotice}
                        </div>
                    )}

                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Assigned Roles
                            </dt>
                            <dd className="mt-1 flex flex-wrap gap-1.5">
                                {detail.roles.map((role) => (
                                    <StaffRoleBadge key={role} role={role} />
                                ))}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Account Status
                            </dt>
                            <dd className="mt-1">
                                <StaffAccountStatusBadge
                                    status={detail.status}
                                    isPrimaryAdmin={detail.isPrimaryAdmin}
                                />
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Phone
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">{detail.phone || '—'}</dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Department
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {detail.department || '—'}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Created
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatStaffDateTime(detail.createdAt)}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Activated
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatStaffDateTime(detail.activatedAt)}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Last Sign-In
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatStaffDateTime(detail.lastLoginAt)}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Invited By
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {detail.invitedByName || detail.invitedById || '—'}
                            </dd>
                        </div>

                        <div className="sm:col-span-2">
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Account &amp; Tenant Identifiers
                            </dt>
                            <dd className="mt-1 font-mono text-xs text-gray-600">
                                ID: {detail.id} · Tenant: {detail.tenantId}
                            </dd>
                        </div>
                    </dl>

                    <div className="space-y-3 border-t border-gray-200 pt-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">
                                Reported Permissions (Read-Only)
                            </h3>
                            <span className="text-xs text-gray-500">
                                {detail.permissions.length} permission
                                {detail.permissions.length === 1 ? '' : 's'}
                            </span>
                        </div>

                        <div
                            role="note"
                            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
                        >
                            Permission assignment and restriction editing are intentionally withheld until Primary School Admin vs. Additional School Admin authority rules are confirmed by backend authorization policy.
                        </div>

                        {detail.permissions.length === 0 ? (
                            <p className="text-xs text-gray-600">
                                No granular permissions reported on this summary record.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {detail.permissions.map((perm) => (
                                    <code
                                        key={perm}
                                        className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-700"
                                    >
                                        {perm}
                                    </code>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 border-t border-gray-200 pt-5">
                        <h3 className="text-sm font-semibold text-gray-900">Account Lifecycle</h3>

                        {statusSuccessNotice && (
                            <div
                                role="status"
                                className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                            >
                                {statusSuccessNotice}
                            </div>
                        )}

                        {statusError && (
                            <div
                                role="alert"
                                aria-live="assertive"
                                className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                            >
                                {statusError}
                            </div>
                        )}

                        {!statusEligibility.allowed ? (
                            <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                                {statusEligibility.reason}
                            </p>
                        ) : confirmingTargetStatus ? (
                            <form
                                onSubmit={handleConfirmStatusChange}
                                aria-busy={isUpdatingStatus}
                                className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4"
                            >
                                <p className="text-sm font-medium text-gray-900">
                                    {confirmingTargetStatus === 'INACTIVE'
                                        ? `Confirm disabling account for ${fullName}?`
                                        : `Confirm reactivating account for ${fullName}?`}
                                </p>
                                <div>
                                    <label
                                        htmlFor="staff-status-reason"
                                        className="block text-xs font-medium text-gray-700"
                                    >
                                        Optional Reason / Note
                                    </label>
                                    <input
                                        id="staff-status-reason"
                                        type="text"
                                        maxLength={500}
                                        disabled={isUpdatingStatus}
                                        value={statusReason}
                                        onChange={(event) => setStatusReason(event.target.value)}
                                        placeholder="Enter an audit note if required..."
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="submit"
                                        disabled={isUpdatingStatus}
                                        className={`rounded-md px-3.5 py-1.5 text-xs font-medium text-white shadow-sm disabled:opacity-60 ${
                                            confirmingTargetStatus === 'INACTIVE'
                                                ? 'bg-red-600 hover:bg-red-700'
                                                : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                    >
                                        {isUpdatingStatus
                                            ? 'Updating...'
                                            : confirmingTargetStatus === 'INACTIVE'
                                              ? 'Confirm Disable'
                                              : 'Confirm Reactivate'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isUpdatingStatus}
                                        onClick={() => {
                                            setConfirmingTargetStatus(null);
                                            setStatusError('');
                                        }}
                                        className="rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 p-3.5">
                                <p className="text-xs text-gray-700">
                                    {detail.status === 'ACTIVE'
                                        ? 'Disabling this account immediately prevents sign-in without deleting historical records.'
                                        : 'Reactivating this account restores access under its currently assigned roles.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusError('');
                                        setStatusSuccessNotice('');
                                        setConfirmingTargetStatus(nextStatus);
                                    }}
                                    className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm ${
                                        detail.status === 'ACTIVE'
                                            ? 'border-red-300 bg-white text-red-700 hover:bg-red-50'
                                            : 'border-green-300 bg-white text-green-700 hover:bg-green-50'
                                    }`}
                                >
                                    {detail.status === 'ACTIVE'
                                        ? 'Disable Account'
                                        : 'Reactivate Account'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end border-t border-gray-200 pt-4">
                        <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={onClose}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

