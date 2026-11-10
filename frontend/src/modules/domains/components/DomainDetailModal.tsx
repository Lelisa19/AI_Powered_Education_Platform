import React, { useEffect, useRef, useState } from 'react';
import { useAvailableTenants } from '../hooks/useAvailableTenants';
import {
    assignDomainToTenant,
    getDomainById,
    isDomainBackendUnavailableError,
    isProposedDomainOperationalStatus,
    requestDomainVerification,
    updateDomainStatus,
} from '../services/domain-management-service';
import {
    PROPOSED_DOMAIN_OPERATIONAL_STATUSES,
    type ManagedDomain,
    type ProposedDomainOperationalStatus,
} from '../types/domain-management.types';
import { formatDomainDate } from '../utils/domain-formatters';
import { DomainVerificationBadge } from './DomainVerificationBadge';

interface DomainDetailModalProps {
    domain: ManagedDomain;
    canManageDomains: boolean;
    onClose: () => void;
    onDomainUpdated: (domain: ManagedDomain, notice?: string) => void;
}

export const DomainDetailModal: React.FC<DomainDetailModalProps> = ({
    domain,
    canManageDomains,
    onClose,
    onDomainUpdated,
}) => {
    const [detail, setDetail] = useState<ManagedDomain>(domain);
    const [isLoadingDetail, setIsLoadingDetail] = useState(true);
    const [detailError, setDetailError] = useState('');

    const [verificationNotice, setVerificationNotice] = useState('');
    const [verificationError, setVerificationError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const [selectedTenantId, setSelectedTenantId] = useState(domain.tenantId);
    const [selectedPrimary, setSelectedPrimary] = useState(domain.isPrimary);
    const [assignError, setAssignError] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);

    const [selectedOperationalStatus, setSelectedOperationalStatus] =
        useState<ProposedDomainOperationalStatus>(
            isProposedDomainOperationalStatus(domain.status) ? domain.status : 'ACTIVE'
        );
    const [statusError, setStatusError] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const {
        tenants,
        isLoadingTenants,
        tenantsError,
        isTenantsBackendUnavailable,
        reloadTenants,
    } = useAvailableTenants(canManageDomains);

    const isBusyRef = useRef(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    const isBusy = isVerifying || isAssigning || isUpdatingStatus;

    useEffect(() => {
        let isActive = true;

        getDomainById(domain.id)
            .then((response) => {
                if (!isActive) return;
                setDetail(response.domain);
                setSelectedTenantId(response.domain.tenantId);
                setSelectedPrimary(response.domain.isPrimary);
                if (isProposedDomainOperationalStatus(response.domain.status)) {
                    setSelectedOperationalStatus(response.domain.status);
                }
            })
            .catch((error: unknown) => {
                if (!isActive) return;
                setDetailError(
                    isDomainBackendUnavailableError(error)
                        ? 'Domain detail endpoint is unavailable or pending backend implementation.'
                        : error instanceof Error && error.message
                          ? error.message
                          : 'Unable to load latest domain details.'
                );
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
            if (event.key === 'Escape' && !isBusyRef.current) {
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
    }, [domain.id, onClose]);

    const handleRefreshStatus = async () => {
        if (isBusyRef.current || isBusy) return;
        isBusyRef.current = true;
        setIsLoadingDetail(true);
        setDetailError('');
        setVerificationError('');
        setVerificationNotice('');

        try {
            const response = await getDomainById(detail.id);
            setDetail(response.domain);
            onDomainUpdated(response.domain);
        } catch (error: unknown) {
            setDetailError(
                isDomainBackendUnavailableError(error)
                    ? 'Domain status refresh failed because the backend endpoint is unavailable.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to refresh domain status.'
            );
        } finally {
            isBusyRef.current = false;
            setIsLoadingDetail(false);
        }
    };

    const handleRequestVerification = async () => {
        if (!canManageDomains || isBusyRef.current || isBusy) return;
        isBusyRef.current = true;
        setIsVerifying(true);
        setVerificationError('');
        setVerificationNotice('');

        try {
            const response = await requestDomainVerification({ domainId: detail.id });
            setDetail(response.domain);
            const message =
                response.message ||
                `Verification check completed with status: ${response.domain.verificationStatus}.`;
            setVerificationNotice(message);
            onDomainUpdated(response.domain, message);
        } catch (error: unknown) {
            if (isDomainBackendUnavailableError(error)) {
                setVerificationError(
                    'Backend domain verification endpoint is unavailable or pending implementation. Verification could not be completed and domain status remains unchanged.'
                );
            } else {
                setVerificationError(
                    error instanceof Error && error.message
                        ? error.message
                        : 'Domain verification request failed.'
                );
            }
        } finally {
            isBusyRef.current = false;
            setIsVerifying(false);
        }
    };

    const handleAssignSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canManageDomains || isBusyRef.current || isBusy) return;

        setAssignError('');
        if (!selectedTenantId.trim()) {
            setAssignError('Select an existing school tenant to assign.');
            return;
        }

        isBusyRef.current = true;
        setIsAssigning(true);

        try {
            const response = await assignDomainToTenant({
                domainId: detail.id,
                tenantId: selectedTenantId,
                isPrimary: selectedPrimary,
            });
            setDetail(response.domain);
            onDomainUpdated(response.domain, `Updated school assignment for "${response.domain.hostname}".`);
        } catch (error: unknown) {
            setAssignError(
                isDomainBackendUnavailableError(error)
                    ? 'Domain assignment endpoint is unavailable or pending backend implementation. No assignment change was saved.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to assign domain to selected school.'
            );
        } finally {
            isBusyRef.current = false;
            setIsAssigning(false);
        }
    };

    const handleStatusUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canManageDomains || isBusyRef.current || isBusy) return;

        setStatusError('');
        isBusyRef.current = true;
        setIsUpdatingStatus(true);

        try {
            const response = await updateDomainStatus({
                domainId: detail.id,
                status: selectedOperationalStatus,
            });
            setDetail(response.domain);
            onDomainUpdated(response.domain, `Updated domain status for "${response.domain.hostname}".`);
        } catch (error: unknown) {
            setStatusError(
                isDomainBackendUnavailableError(error)
                    ? 'Domain status endpoint is unavailable or pending backend implementation. No status change was saved.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to update domain operational status.'
            );
        } finally {
            isBusyRef.current = false;
            setIsUpdatingStatus(false);
        }
    };

    const schoolLabel = detail.schoolName
        ? detail.schoolSlug
            ? `${detail.schoolName} (${detail.schoolSlug})`
            : detail.schoolName
        : detail.tenantId;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
                if (!isBusy) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="domain-detail-title"
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2 id="domain-detail-title" className="font-mono text-lg font-semibold text-gray-900">
                            {detail.hostname}
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500">Domain ID: {detail.id}</p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        disabled={isBusy}
                        onClick={onClose}
                        aria-label="Close domain details dialog"
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
                            Loading latest domain status...
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
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Verification Status
                            </dt>
                            <dd className="mt-1">
                                <DomainVerificationBadge status={detail.verificationStatus} />
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Primary Domain
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {detail.isPrimary ? 'Primary Domain' : 'Secondary Domain'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Associated School
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">{schoolLabel}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Operational Status
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">{detail.status || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Created
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">{formatDomainDate(detail.createdAt)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Last Verified
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatDomainDate(detail.lastVerifiedAt)}
                            </dd>
                        </div>
                    </dl>

                    {detail.verificationFailureReason && (
                        <div
                            role="status"
                            className="rounded-md border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                        >
                            <span className="font-medium">Verification note:</span>{' '}
                            {detail.verificationFailureReason}
                        </div>
                    )}

                    {detail.verificationInstructions && (
                        <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                            <h3 className="font-semibold">Backend Verification Instructions</h3>
                            <p className="text-xs text-blue-900">
                                Method: {detail.verificationInstructions.method}
                            </p>
                            {detail.verificationInstructions.message && (
                                <p>{detail.verificationInstructions.message}</p>
                            )}
                            {(detail.verificationInstructions.recordType ||
                                detail.verificationInstructions.host ||
                                detail.verificationInstructions.value) && (
                                <dl className="grid grid-cols-1 gap-2 rounded bg-white/80 p-3 font-mono text-xs sm:grid-cols-3">
                                    {detail.verificationInstructions.recordType && (
                                        <div>
                                            <dt className="text-gray-500">Record Type</dt>
                                            <dd className="mt-0.5 text-gray-900">
                                                {detail.verificationInstructions.recordType}
                                            </dd>
                                        </div>
                                    )}
                                    {detail.verificationInstructions.host && (
                                        <div>
                                            <dt className="text-gray-500">Host</dt>
                                            <dd className="mt-0.5 break-all text-gray-900">
                                                {detail.verificationInstructions.host}
                                            </dd>
                                        </div>
                                    )}
                                    {detail.verificationInstructions.value && (
                                        <div>
                                            <dt className="text-gray-500">Value</dt>
                                            <dd className="mt-0.5 break-all text-gray-900">
                                                {detail.verificationInstructions.value}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            )}
                        </div>
                    )}

                    <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Domain Verification</h3>
                                <p className="text-xs text-gray-600">
                                    Verification is performed strictly by the backend service.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={isBusy || isLoadingDetail}
                                    onClick={handleRefreshStatus}
                                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                                >
                                    Refresh Status
                                </button>
                                {canManageDomains && (
                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={handleRequestVerification}
                                        className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
                                    >
                                        {isVerifying ? 'Requesting...' : 'Request Verification'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {verificationNotice && (
                            <div
                                role="status"
                                className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"
                            >
                                {verificationNotice}
                            </div>
                        )}

                        {verificationError && (
                            <div
                                role="alert"
                                aria-live="assertive"
                                className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                            >
                                {verificationError}
                            </div>
                        )}
                    </div>

                    {canManageDomains && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <form
                                onSubmit={handleAssignSubmit}
                                aria-busy={isAssigning}
                                className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4"
                            >
                                <h3 className="text-sm font-semibold text-gray-900">School Assignment</h3>

                                {assignError && (
                                    <div
                                        role="alert"
                                        className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700"
                                    >
                                        {assignError}
                                    </div>
                                )}

                                <div>
                                    <label
                                        htmlFor="reassign-tenant-select"
                                        className="block text-xs font-medium text-gray-700"
                                    >
                                        Assigned School
                                    </label>
                                    {isLoadingTenants ? (
                                        <p className="mt-1 text-xs text-gray-600">Loading available schools...</p>
                                    ) : tenantsError ? (
                                        <div className="mt-1 text-xs text-amber-800">
                                            <p>
                                                {isTenantsBackendUnavailable
                                                    ? 'School list unavailable (backend pending).'
                                                    : tenantsError}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={reloadTenants}
                                                className="mt-1 font-medium underline"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    ) : tenants.length === 0 ? (
                                        <p className="mt-1 text-xs text-gray-600">No provisioned schools available.</p>
                                    ) : (
                                        <select
                                            id="reassign-tenant-select"
                                            disabled={isBusy}
                                            value={selectedTenantId}
                                            onChange={(event) => setSelectedTenantId(event.target.value)}
                                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                        >
                                            <option value="">Select school...</option>
                                            {tenants.map((tenant) => (
                                                <option key={tenant.id} value={tenant.id}>
                                                    {tenant.name} ({tenant.slug})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        id="reassign-primary-domain"
                                        type="checkbox"
                                        disabled={isBusy}
                                        checked={selectedPrimary}
                                        onChange={(event) => setSelectedPrimary(event.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                    />
                                    <label htmlFor="reassign-primary-domain" className="text-xs text-gray-700">
                                        Primary domain
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isBusy || isLoadingTenants || Boolean(tenantsError) || tenants.length === 0}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isAssigning ? 'Saving...' : 'Save Assignment'}
                                </button>
                            </form>

                            <form
                                onSubmit={handleStatusUpdate}
                                aria-busy={isUpdatingStatus}
                                className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4"
                            >
                                <h3 className="text-sm font-semibold text-gray-900">Operational Status</h3>

                                {statusError && (
                                    <div
                                        role="alert"
                                        className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700"
                                    >
                                        {statusError}
                                    </div>
                                )}

                                <div>
                                    <label
                                        htmlFor="domain-operational-status"
                                        className="block text-xs font-medium text-gray-700"
                                    >
                                        Proposed Domain Status
                                    </label>
                                    <select
                                        id="domain-operational-status"
                                        disabled={isBusy}
                                        value={selectedOperationalStatus}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            if (isProposedDomainOperationalStatus(value)) {
                                                setSelectedOperationalStatus(value);
                                            }
                                        }}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                    >
                                        {PROPOSED_DOMAIN_OPERATIONAL_STATUSES.map((statusOption) => (
                                            <option key={statusOption} value={statusOption}>
                                                {statusOption === 'ACTIVE' ? 'Active' : 'Inactive'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isBusy}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isUpdatingStatus ? 'Updating...' : 'Update Domain Status'}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="flex justify-end border-t border-gray-200 pt-4">
                        <button
                            type="button"
                            disabled={isBusy}
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

