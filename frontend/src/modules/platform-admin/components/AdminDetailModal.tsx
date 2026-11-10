import React, { useEffect, useRef, useState } from 'react';
import type { PlatformPermissionKey } from '../../../constants/permissions';
import {
    isPlatformAdminBackendUnavailableError,
    updatePlatformAdminRestrictions,
} from '../services/platform-admin-service';
import type { PlatformAdminAccount } from '../types/platform-admin.types';
import {
    formatPlatformAdminDate,
    formatPlatformAdminName,
} from '../utils/platform-admin-formatters';
import { AdminAccountStatusBadge, AdminTierBadge } from './AdminStatusBadge';
import { PermissionRestrictionsEditor } from './PermissionRestrictionsEditor';

interface AdminDetailModalProps {
    admin: PlatformAdminAccount;
    currentActorId: string | null;
    isSuperAdminActor: boolean;
    canManageTargetRestrictions: boolean;
    onClose: () => void;
    onAdminUpdated: (admin: PlatformAdminAccount, notice?: string) => void;
}

export const AdminDetailModal: React.FC<AdminDetailModalProps> = ({
    admin,
    currentActorId,
    isSuperAdminActor,
    canManageTargetRestrictions,
    onClose,
    onAdminUpdated,
}) => {
    const [detail, setDetail] = useState<PlatformAdminAccount>(admin);
    const [draftRestrictions, setDraftRestrictions] = useState<PlatformPermissionKey[]>(
        admin.restrictedPermissions ?? []
    );
    const [saveNotice, setSaveNotice] = useState('');
    const [saveError, setSaveError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isSavingRef = useRef(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const frameId = requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isSavingRef.current) {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            cancelAnimationFrame(frameId);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const handleSaveRestrictions = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canManageTargetRestrictions || detail.isSuperAdmin || isSavingRef.current || isSaving) {
            return;
        }

        setSaveError('');
        setSaveNotice('');
        isSavingRef.current = true;
        setIsSaving(true);

        try {
            const response = await updatePlatformAdminRestrictions({
                adminId: detail.id,
                restrictedPermissions: draftRestrictions,
            });
            setDetail(response.admin);
            setDraftRestrictions(response.admin.restrictedPermissions ?? []);
            const message = `Updated permission restrictions for ${formatPlatformAdminName(
                response.admin.firstName,
                response.admin.lastName,
                response.admin.email
            )}.`;
            setSaveNotice(message);
            onAdminUpdated(response.admin, message);
        } catch (error: unknown) {
            if (isPlatformAdminBackendUnavailableError(error)) {
                setSaveError(
                    'Permission restriction update API is currently unavailable or pending backend implementation. No restrictions were modified.'
                );
            } else {
                setSaveError(
                    error instanceof Error && error.message
                        ? error.message
                        : 'Unable to update administrator permission restrictions.'
                );
            }
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    const isSelf = currentActorId !== null && detail.id === currentActorId;

    const restrictionReadOnlyReason = detail.isSuperAdmin
        ? 'Initial Super Admin accounts cannot be restricted or modified.'
        : !isSuperAdminActor
          ? 'Read-only view: Only the initial Super Admin can modify administrator restrictions.'
          : isSelf
            ? 'Administrators cannot modify their own permission restrictions.'
            : null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
                if (!isSaving) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-detail-title"
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2 id="admin-detail-title" className="text-lg font-semibold text-gray-900">
                            {formatPlatformAdminName(detail.firstName, detail.lastName, detail.email)}
                        </h2>
                        <p className="mt-0.5 text-sm text-gray-600">{detail.email}</p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        disabled={isSaving}
                        onClick={onClose}
                        aria-label="Close administrator details dialog"
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6 px-6 py-5">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Account Role & Tier
                            </dt>
                            <dd className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs text-gray-700">{detail.role}</span>
                                <AdminTierBadge isSuperAdmin={detail.isSuperAdmin} />
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Account Status
                            </dt>
                            <dd className="mt-1">
                                <AdminAccountStatusBadge isActive={detail.isActive} />
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Created
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatPlatformAdminDate(detail.createdAt)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Activated
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatPlatformAdminDate(detail.activatedAt)}
                            </dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Administrator ID
                            </dt>
                            <dd className="mt-1 font-mono text-xs text-gray-600">{detail.id}</dd>
                        </div>
                    </dl>

                    <form onSubmit={handleSaveRestrictions} aria-busy={isSaving} className="space-y-4 border-t border-gray-200 pt-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">
                                Individual Permission Restrictions
                            </h3>
                            {!canManageTargetRestrictions && restrictionReadOnlyReason && (
                                <span className="text-xs text-gray-600">{restrictionReadOnlyReason}</span>
                            )}
                        </div>

                        {saveNotice && (
                            <div
                                role="status"
                                className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                            >
                                {saveNotice}
                            </div>
                        )}

                        {saveError && (
                            <div
                                role="alert"
                                aria-live="assertive"
                                className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                            >
                                {saveError}
                            </div>
                        )}

                        <PermissionRestrictionsEditor
                            restrictedPermissions={draftRestrictions}
                            isSuperAdminTarget={detail.isSuperAdmin}
                            readOnly={!canManageTargetRestrictions}
                            disabled={isSaving}
                            onChange={setDraftRestrictions}
                        />

                        {canManageTargetRestrictions && !detail.isSuperAdmin && (
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => setDraftRestrictions(detail.restrictedPermissions ?? [])}
                                    className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Reset Changes
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSaving ? 'Saving...' : 'Save Restrictions'}
                                </button>
                            </div>
                        )}
                    </form>

                    {!detail.isSuperAdmin && isSuperAdminActor && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                            Account deactivation for invited administrators is pending a dedicated backend account-lifecycle contract and cannot be executed from the frontend yet.
                        </div>
                    )}

                    <div className="flex justify-end border-t border-gray-200 pt-4">
                        <button
                            type="button"
                            disabled={isSaving}
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

