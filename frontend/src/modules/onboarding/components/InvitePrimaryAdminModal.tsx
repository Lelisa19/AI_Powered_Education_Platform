import React, { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import type { ManagedTenant } from '../../tenants/types/tenant-management.types';
import { useOnboardingTenants } from '../hooks/useOnboardingTenants';
import {
    invitePrimarySchoolAdmin,
    isOnboardingBackendUnavailableError,
    validatePrimaryAdminInvitationInput,
} from '../services/onboarding-service';
import type { PrimaryAdminInvitationResponse } from '../types/onboarding.types';

interface InvitePrimaryAdminModalProps {
    lockedTenant?: ManagedTenant | null;
    onClose: () => void;
    onSuccess: (response: PrimaryAdminInvitationResponse) => void;
}

interface FieldErrors {
    tenantId?: string;
    email?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const InvitePrimaryAdminModal: React.FC<InvitePrimaryAdminModalProps> = ({
    lockedTenant = null,
    onClose,
    onSuccess,
}) => {
    const shouldFetchTenants = !lockedTenant;
    const {
        tenants,
        isLoadingTenants,
        tenantsError,
        isTenantsBackendUnavailable,
        reloadTenants,
    } = useOnboardingTenants(shouldFetchTenants);

    const [selectedTenantId, setSelectedTenantId] = useState(lockedTenant?.id ?? '');
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSubmittingRef = useRef(false);
    const emailInputRef = useRef<HTMLInputElement>(null);

    const selectedTenant =
        lockedTenant ?? tenants.find((item) => item.id === selectedTenantId) ?? null;

    useEffect(() => {
        const frameId = requestAnimationFrame(() => {
            emailInputRef.current?.focus();
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
    }, [onClose]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmittingRef.current || isSubmitting) {
            return;
        }

        setSubmitError('');
        const nextErrors: FieldErrors = {};
        const effectiveTenantId = lockedTenant?.id ?? selectedTenantId;

        if (!effectiveTenantId.trim()) {
            nextErrors.tenantId = 'Select an existing provisioned school.';
        }

        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            nextErrors.email = 'Primary School Admin email is required.';
        } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
            nextErrors.email = 'Please enter a valid email address.';
        }

        setFieldErrors(nextErrors);
        if (nextErrors.tenantId || nextErrors.email) {
            return;
        }

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            const payload = validatePrimaryAdminInvitationInput({
                tenantId: effectiveTenantId,
                email: trimmedEmail,
                firstName: firstName.trim() || undefined,
                lastName: lastName.trim() || undefined,
            });
            const response = await invitePrimarySchoolAdmin(payload);
            onSuccess(response);
        } catch (error: unknown) {
            if (error instanceof ApiError && error.validationErrors) {
                setFieldErrors({
                    tenantId: error.validationErrors.tenantId?.[0],
                    email: error.validationErrors.email?.[0],
                });
            }

            if (isOnboardingBackendUnavailableError(error)) {
                setSubmitError(
                    'Primary School Admin invitation endpoint is unavailable or pending backend implementation. No invitation was sent.'
                );
            } else {
                setSubmitError(
                    error instanceof Error && error.message
                        ? error.message
                        : 'Unable to send Primary School Admin invitation.'
                );
            }
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    const hasAvailableSchool =
        Boolean(lockedTenant) || (!isLoadingTenants && !tenantsError && tenants.length > 0);

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
                aria-labelledby="invite-primary-admin-title"
                className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2
                            id="invite-primary-admin-title"
                            className="text-lg font-semibold text-gray-900"
                        >
                            Invite Primary School Admin
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Send an onboarding invitation bound to an existing school. The recipient creates their own password during account activation.
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        aria-label="Close primary admin invitation dialog"
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    noValidate
                    aria-busy={isSubmitting}
                    className="space-y-5 px-6 py-5"
                >
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
                        <label
                            htmlFor="invite-school-select"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Target School <span className="text-red-600">*</span>
                        </label>

                        {lockedTenant ? (
                            <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
                                <span className="font-medium">{lockedTenant.name}</span>{' '}
                                <span className="font-mono text-xs text-gray-500">
                                    ({lockedTenant.slug})
                                </span>
                            </div>
                        ) : isLoadingTenants ? (
                            <div
                                role="status"
                                className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600"
                            >
                                Loading provisioned schools...
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
                                No provisioned schools found. Provision a school first before inviting a Primary School Admin.
                            </div>
                        ) : (
                            <select
                                id="invite-school-select"
                                name="tenantId"
                                required
                                disabled={isSubmitting}
                                value={selectedTenantId}
                                onChange={(event) => {
                                    setSelectedTenantId(event.target.value);
                                    if (fieldErrors.tenantId) {
                                        setFieldErrors((prev) => ({ ...prev, tenantId: undefined }));
                                    }
                                }}
                                aria-invalid={Boolean(fieldErrors.tenantId)}
                                aria-describedby={fieldErrors.tenantId ? 'invite-school-error' : undefined}
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

                        {selectedTenant && !lockedTenant && (
                            <p className="mt-1 text-xs text-gray-600">
                                Inviting Primary Admin for: <span className="font-medium">{selectedTenant.name}</span>
                            </p>
                        )}

                        {fieldErrors.tenantId && (
                            <p id="invite-school-error" className="mt-1.5 text-sm text-red-600">
                                {fieldErrors.tenantId}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="invite-admin-email" className="block text-sm font-medium text-gray-700">
                            Primary School Admin Email <span className="text-red-600">*</span>
                        </label>
                        <input
                            ref={emailInputRef}
                            id="invite-admin-email"
                            name="email"
                            type="email"
                            required
                            disabled={isSubmitting}
                            value={email}
                            onChange={(event) => {
                                setEmail(event.target.value);
                                if (fieldErrors.email) {
                                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                                }
                            }}
                            placeholder="principal@school.example"
                            aria-invalid={Boolean(fieldErrors.email)}
                            aria-describedby={fieldErrors.email ? 'invite-email-error' : undefined}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                        {fieldErrors.email && (
                            <p id="invite-email-error" className="mt-1.5 text-sm text-red-600">
                                {fieldErrors.email}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="invite-first-name" className="block text-sm font-medium text-gray-700">
                                First Name <span className="font-normal text-gray-400">(Optional)</span>
                            </label>
                            <input
                                id="invite-first-name"
                                type="text"
                                disabled={isSubmitting}
                                value={firstName}
                                onChange={(event) => setFirstName(event.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                            />
                        </div>
                        <div>
                            <label htmlFor="invite-last-name" className="block text-sm font-medium text-gray-700">
                                Last Name <span className="font-normal text-gray-400">(Optional)</span>
                            </label>
                            <input
                                id="invite-last-name"
                                type="text"
                                disabled={isSubmitting}
                                value={lastName}
                                onChange={(event) => setLastName(event.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                            />
                        </div>
                    </div>

                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                        Invitation tokens are generated and delivered solely by the backend and activated via the existing staff invitation flow. No password or raw token is generated here.
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
                            disabled={isSubmitting || !hasAvailableSchool}
                            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? (
                                <>
                                    <span
                                        className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                                        aria-hidden="true"
                                    />
                                    Sending Invitation...
                                </>
                            ) : (
                                'Send Invitation'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

