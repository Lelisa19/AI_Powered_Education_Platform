import React, { useEffect, useRef, useState } from 'react';
import {
    getTenantById,
    isProposedTenantStatus,
    isTenantBackendUnavailableError,
    updateTenantStatus,
} from '../services/tenant-management-service';
import {
    PROPOSED_TENANT_STATUSES,
    type ManagedTenant,
    type ProposedTenantStatus,
} from '../types/tenant-management.types';
import { formatTenantDate, formatTenantStatusLabel } from '../utils/tenant-formatters';
import { TenantStatusBadge } from './TenantStatusBadge';

interface TenantDetailModalProps {
    tenant: ManagedTenant;
    canManageTenants: boolean;
    onClose: () => void;
    onTenantUpdated: (tenant: ManagedTenant) => void;
}

export const TenantDetailModal: React.FC<TenantDetailModalProps> = ({
    tenant,
    canManageTenants,
    onClose,
    onTenantUpdated,
}) => {
    const [detail, setDetail] = useState<ManagedTenant>(tenant);
    const [isLoadingDetail, setIsLoadingDetail] = useState(true);
    const [detailError, setDetailError] = useState('');

    const [selectedStatus, setSelectedStatus] = useState<ProposedTenantStatus>(
        isProposedTenantStatus(tenant.status) ? tenant.status : 'ACTIVE'
    );
    const [reason, setReason] = useState('');
    const [statusError, setStatusError] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const isUpdatingRef = useRef(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        let isActive = true;

        getTenantById(tenant.id)
            .then((response) => {
                if (!isActive) return;
                setDetail(response.tenant);
                if (isProposedTenantStatus(response.tenant.status)) {
                    setSelectedStatus(response.tenant.status);
                }
            })
            .catch((error: unknown) => {
                if (!isActive) return;
                if (isTenantBackendUnavailableError(error)) {
                    setDetailError(
                        'Tenant detail endpoint is unavailable or pending backend implementation.'
                    );
                } else {
                    setDetailError(
                        error instanceof Error && error.message
                            ? error.message
                            : 'Unable to load latest tenant details.'
                    );
                }
            })
            .finally(() => {
                if (isActive) {
                    setIsLoadingDetail(false);
                }
            });

        const frameId = requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isUpdatingRef.current) {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            isActive = false;
            cancelAnimationFrame(frameId);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [tenant.id, onClose]);

    const handleStatusUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canManageTenants || isUpdatingRef.current || isUpdatingStatus) {
            return;
        }

        setStatusError('');
        isUpdatingRef.current = true;
        setIsUpdatingStatus(true);

        try {
            const response = await updateTenantStatus({
                tenantId: detail.id,
                status: selectedStatus,
                reason: reason.trim() || undefined,
            });
            setDetail(response.tenant);
            setReason('');
            onTenantUpdated(response.tenant);
        } catch (error: unknown) {
            if (isTenantBackendUnavailableError(error)) {
                setStatusError(
                    'Tenant status update endpoint is unavailable or pending backend implementation. No status change was saved.'
                );
            } else {
                setStatusError(
                    error instanceof Error && error.message
                        ? error.message
                        : 'Unable to update tenant status.'
                );
            }
        } finally {
            isUpdatingRef.current = false;
            setIsUpdatingStatus(false);
        }
    };

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
                aria-labelledby="tenant-detail-title"
                className="w-full max-w-xl rounded-lg border border-gray-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2 id="tenant-detail-title" className="text-lg font-semibold text-gray-900">
                            {detail.name}
                        </h2>
                        <p className="mt-0.5 font-mono text-xs text-gray-500">{detail.slug}</p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={onClose}
                        aria-label="Close school details dialog"
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6 px-6 py-5">
                    {isLoadingDetail && (
                        <div role="status" className="text-sm text-gray-600">
                            Refreshing tenant details...
                        </div>
                    )}

                    {detailError && (
                        <div
                            role="alert"
                            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                        >
                            {detailError}
                        </div>
                    )}

                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</dt>
                            <dd className="mt-1">
                                <TenantStatusBadge status={detail.status} />
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Primary Domain</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {detail.primaryDomain || 'Not configured'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Contact Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{detail.contactEmail || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Created</dt>
                            <dd className="mt-1 text-sm text-gray-900">{formatTenantDate(detail.createdAt)}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Record ID</dt>
                            <dd className="mt-1 font-mono text-xs text-gray-600">{detail.id}</dd>
                        </div>
                    </dl>

                    {canManageTenants && (
                        <form
                            onSubmit={handleStatusUpdate}
                            aria-busy={isUpdatingStatus}
                            className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4"
                        >
                            <h3 className="text-sm font-semibold text-gray-900">Manage Tenant Status</h3>

                            {statusError && (
                                <div
                                    role="alert"
                                    aria-live="assertive"
                                    className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                                >
                                    {statusError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="tenant-status-select"
                                        className="block text-xs font-medium text-gray-700"
                                    >
                                        Proposed Status
                                    </label>
                                    <select
                                        id="tenant-status-select"
                                        disabled={isUpdatingStatus}
                                        value={selectedStatus}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            if (isProposedTenantStatus(value)) {
                                                setSelectedStatus(value);
                                            }
                                        }}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                    >
                                        {PROPOSED_TENANT_STATUSES.map((statusValue) => (
                                            <option key={statusValue} value={statusValue}>
                                                {formatTenantStatusLabel(statusValue)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor="tenant-status-reason"
                                        className="block text-xs font-medium text-gray-700"
                                    >
                                        Note / Reason (Optional)
                                    </label>
                                    <input
                                        id="tenant-status-reason"
                                        type="text"
                                        disabled={isUpdatingStatus}
                                        value={reason}
                                        onChange={(event) => setReason(event.target.value)}
                                        placeholder="Administrative note"
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isUpdatingStatus}
                                    className="rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                                </button>
                            </div>
                        </form>
                    )}

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
