import React, { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import { useAvailableTenants } from '../hooks/useAvailableTenants';
import {
    isDomainBackendUnavailableError,
    registerDomain,
    validateDomainHostnameInput,
} from '../services/domain-management-service';
import type { ManagedDomain } from '../types/domain-management.types';

export interface PreselectedDomainTenant {
    id: string;
    name: string;
    slug?: string;
}

interface RegisterDomainModalProps {
    isOpen: boolean;
    preselectedTenant?: PreselectedDomainTenant | null;
    onClose: () => void;
    onSuccess: (domain: ManagedDomain) => void;
}

interface FieldErrors {
    hostname?: string;
    tenantId?: string;
}

export const RegisterDomainModal: React.FC<RegisterDomainModalProps> = ({
    isOpen,
    preselectedTenant = null,
    onClose,
    onSuccess,
}) => {
    const isPreselectedMode = Boolean(preselectedTenant);

    const {
        tenants,
        isLoadingTenants,
        tenantsError,
        isTenantsBackendUnavailable,
        reloadTenants,
    } = useAvailableTenants(isOpen && !isPreselectedMode);

    const [hostname, setHostname] = useState('');
    const [tenantId, setTenantId] = useState('');
    const [isPrimary, setIsPrimary] = useState(isPreselectedMode);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSubmittingRef = useRef(false);
    const hostnameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const frameId = requestAnimationFrame(() => {
            hostnameInputRef.current?.focus();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isSubmittingRef.current) {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            cancelAnimationFrame(frameId);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    const effectiveTenantId = preselectedTenant ? preselectedTenant.id : tenantId;

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmittingRef.current || isSubmitting) {
            return;
        }

        setSubmitError('');
        const nextErrors: FieldErrors = {};

        try {
            validateDomainHostnameInput(hostname);
        } catch (error: unknown) {
            nextErrors.hostname =
                error instanceof Error ? error.message : 'Enter a valid domain hostname.';
        }

        if (!effectiveTenantId.trim()) {
            nextErrors.tenantId = 'Please select an existing school tenant.';
        }

        setFieldErrors(nextErrors);
        if (nextErrors.hostname || nextErrors.tenantId) {
            return;
        }

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            const response = await registerDomain({
                hostname,
                tenantId: effectiveTenantId,
                isPrimary,
            });
            onSuccess(response.domain);
        } catch (error: unknown) {
            if (error instanceof ApiError && error.validationErrors) {
                setFieldErrors({
                    hostname: error.validationErrors.hostname?.[0],
                    tenantId: error.validationErrors.tenantId?.[0],
                });
            }

            if (isDomainBackendUnavailableError(error)) {
                setSubmitError(
                    'Domain registration API is currently unavailable or pending backend implementation. The school tenant remains saved and you can retry domain registration.'
                );
            } else {
                setSubmitError(
                    error instanceof Error && error.message
                        ? error.message
                        : 'Unable to register domain. Please verify inputs and try again.'
                );
            }
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    const hasAvailableSchools =
        isPreselectedMode || (!isLoadingTenants && !tenantsError && tenants.length > 0);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
                if (!isSubmitting) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="register-domain-title"
                className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2 id="register-domain-title" className="text-lg font-semibold text-gray-900">
                            Register School Domain
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                            {preselectedTenant
                                ? `Register a hostname for newly provisioned school "${preselectedTenant.name}". Domain verification occurs separately via the backend.`
                                : 'Associate a hostname with an existing provisioned school. DNS verification occurs separately via the backend.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        aria-label="Close register domain dialog"
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-5 px-6 py-5">
                    {submitError && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="rounded-md border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                        >
                            {submitError}
                        </div>
                    )}

                    <div>
                        <label htmlFor="domain-hostname" className="block text-sm font-medium text-gray-700">
                            Domain Hostname <span className="text-red-600">*</span>
                        </label>
                        <input
                            ref={hostnameInputRef}
                            id="domain-hostname"
                            name="hostname"
                            type="text"
                            required
                            disabled={isSubmitting}
                            value={hostname}
                            onChange={(event) => {
                                setHostname(event.target.value);
                                if (fieldErrors.hostname) {
                                    setFieldErrors((prev) => ({ ...prev, hostname: undefined }));
                                }
                            }}
                            placeholder="e.g., portal.greenwood.edu or school-a.localhost"
                            aria-invalid={Boolean(fieldErrors.hostname)}
                            aria-describedby={fieldErrors.hostname ? 'domain-hostname-error' : 'domain-hostname-help'}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                        <p id="domain-hostname-help" className="mt-1 text-xs text-gray-500">
                            Enter an exact hostname without http://, ports, paths, or wildcards.
                        </p>
                        {fieldErrors.hostname && (
                            <p id="domain-hostname-error" className="mt-1.5 text-sm text-red-600">
                                {fieldErrors.hostname}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="domain-tenant-select" className="block text-sm font-medium text-gray-700">
                            Associated School (Tenant) <span className="text-red-600">*</span>
                        </label>

                        {preselectedTenant ? (
                            <div
                                id="domain-tenant-select"
                                className="mt-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-950"
                            >
                                <div className="font-medium">
                                    {preselectedTenant.name}
                                    {preselectedTenant.slug && (
                                        <span className="ml-1.5 font-mono text-xs text-blue-800">
                                            ({preselectedTenant.slug})
                                        </span>
                                    )}
                                </div>
                                <div className="mt-0.5 font-mono text-xs text-blue-800">
                                    Preselected tenant ID: {preselectedTenant.id}
                                </div>
                            </div>
                        ) : isLoadingTenants ? (
                            <div
                                role="status"
                                className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600"
                            >
                                Loading available schools...
                            </div>
                        ) : tenantsError ? (
                            <div
                                role="alert"
                                className="mt-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                            >
                                <p>
                                    {isTenantsBackendUnavailable
                                        ? 'Unable to load available schools because the Tenant Management backend endpoint is unavailable.'
                                        : `Unable to load available schools: ${tenantsError}`}
                                </p>
                                <button
                                    type="button"
                                    onClick={reloadTenants}
                                    className="mt-2 rounded border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                                >
                                    Retry Loading Schools
                                </button>
                            </div>
                        ) : tenants.length === 0 ? (
                            <div
                                role="status"
                                className="mt-1 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
                            >
                                No provisioned schools found. Provision a school under Schools / Tenant Management first before assigning a domain.
                            </div>
                        ) : (
                            <select
                                id="domain-tenant-select"
                                name="tenantId"
                                required
                                disabled={isSubmitting || !hasAvailableSchools}
                                value={tenantId}
                                onChange={(event) => {
                                    setTenantId(event.target.value);
                                    if (fieldErrors.tenantId) {
                                        setFieldErrors((prev) => ({ ...prev, tenantId: undefined }));
                                    }
                                }}
                                aria-invalid={Boolean(fieldErrors.tenantId)}
                                aria-describedby={fieldErrors.tenantId ? 'domain-tenant-error' : undefined}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                            >
                                <option value="">Select an existing school...</option>
                                {tenants.map((tenant) => (
                                    <option key={tenant.id} value={tenant.id}>
                                        {tenant.name} ({tenant.slug})
                                    </option>
                                ))}
                            </select>
                        )}

                        {fieldErrors.tenantId && (
                            <p id="domain-tenant-error" className="mt-1.5 text-sm text-red-600">
                                {fieldErrors.tenantId}
                            </p>
                        )}
                    </div>

                    <div className="flex items-start gap-2.5">
                        <input
                            id="domain-is-primary"
                            name="isPrimary"
                            type="checkbox"
                            disabled={isSubmitting}
                            checked={isPrimary}
                            onChange={(event) => setIsPrimary(event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                        />
                        <label htmlFor="domain-is-primary" className="text-sm text-gray-700">
                            Request as primary domain for the selected school
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onClose}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !hasAvailableSchools}
                            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? (
                                <>
                                    <span
                                        className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                                        aria-hidden="true"
                                    />
                                    Registering...
                                </>
                            ) : (
                                'Register Domain'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
