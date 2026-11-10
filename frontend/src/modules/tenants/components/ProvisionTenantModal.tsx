import React, { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import {
    createTenant,
    isTenantBackendUnavailableError,
    normalizeTenantSlug,
    validateCreateTenantInput,
} from '../services/tenant-management-service';
import type { ManagedTenant } from '../types/tenant-management.types';
import { deriveTenantSlug } from '../utils/tenant-formatters';

interface ProvisionTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (tenant: ManagedTenant) => void;
}

interface FieldErrors {
    name?: string;
    slug?: string;
    contactEmail?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ProvisionTenantModal: React.FC<ProvisionTenantModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);
    const [contactEmail, setContactEmail] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSubmittingRef = useRef(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const frameId = requestAnimationFrame(() => {
            nameInputRef.current?.focus();
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

    const validateForm = (): FieldErrors => {
        const errors: FieldErrors = {};
        const trimmedName = name.trim();
        const normalizedSlug = normalizeTenantSlug(slug);
        const trimmedEmail = contactEmail.trim();

        if (!trimmedName) {
            errors.name = 'School name is required.';
        } else if (trimmedName.length < 2 || trimmedName.length > 120) {
            errors.name = 'School name must be between 2 and 120 characters.';
        }

        if (!normalizedSlug) {
            errors.slug = 'School identifier is required.';
        } else if (
            normalizedSlug.length < 2 ||
            normalizedSlug.length > 63 ||
            !SLUG_PATTERN.test(normalizedSlug)
        ) {
            errors.slug =
                'Use 2-63 lowercase letters, numbers, or hyphens (e.g., greenwood-academy).';
        }

        if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
            errors.contactEmail = 'Please enter a valid institutional email address.';
        }

        return errors;
    };

    const handleNameChange = (value: string) => {
        setName(value);
        if (!slugTouched) {
            setSlug(deriveTenantSlug(value));
            if (fieldErrors.slug) {
                setFieldErrors((prev) => ({ ...prev, slug: undefined }));
            }
        }
        if (fieldErrors.name) {
            setFieldErrors((prev) => ({ ...prev, name: undefined }));
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmittingRef.current || isSubmitting) {
            return;
        }

        setSubmitError('');
        const validationErrors = validateForm();
        setFieldErrors(validationErrors);
        if (validationErrors.name || validationErrors.slug || validationErrors.contactEmail) {
            return;
        }

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            const validatedInput = validateCreateTenantInput({
                name,
                slug,
                contactEmail: contactEmail.trim() || undefined,
            });
            const response = await createTenant(validatedInput);
            onSuccess(response.tenant);
        } catch (error: unknown) {
            if (error instanceof ApiError && error.validationErrors) {
                setFieldErrors({
                    name: error.validationErrors.name?.[0],
                    slug: error.validationErrors.slug?.[0],
                    contactEmail: error.validationErrors.contactEmail?.[0],
                });
            }

            if (isTenantBackendUnavailableError(error)) {
                setSubmitError(
                    'Tenant provisioning API is currently unavailable or pending backend implementation. No school record was created.'
                );
            } else {
                setSubmitError(
                    error instanceof Error && error.message
                        ? error.message
                        : 'Unable to provision school tenant. Please verify inputs and try again.'
                );
            }
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

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
                aria-labelledby="provision-tenant-title"
                className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2 id="provision-tenant-title" className="text-lg font-semibold text-gray-900">
                            Provision New School
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Create an initial school tenant record. Domain mapping and admin invitations are configured in separate steps.
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        aria-label="Close provision school dialog"
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
                        <label htmlFor="tenant-name" className="block text-sm font-medium text-gray-700">
                            School Name <span className="text-red-600">*</span>
                        </label>
                        <input
                            ref={nameInputRef}
                            id="tenant-name"
                            name="name"
                            type="text"
                            required
                            disabled={isSubmitting}
                            value={name}
                            onChange={(event) => handleNameChange(event.target.value)}
                            placeholder="e.g., Greenwood Academy"
                            aria-invalid={Boolean(fieldErrors.name)}
                            aria-describedby={fieldErrors.name ? 'tenant-name-error' : undefined}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                        {fieldErrors.name && (
                            <p id="tenant-name-error" className="mt-1.5 text-sm text-red-600">
                                {fieldErrors.name}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="tenant-slug" className="block text-sm font-medium text-gray-700">
                            School Identifier (Slug) <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="tenant-slug"
                            name="slug"
                            type="text"
                            required
                            disabled={isSubmitting}
                            value={slug}
                            onChange={(event) => {
                                setSlugTouched(true);
                                setSlug(event.target.value);
                                if (fieldErrors.slug) {
                                    setFieldErrors((prev) => ({ ...prev, slug: undefined }));
                                }
                            }}
                            placeholder="greenwood-academy"
                            aria-invalid={Boolean(fieldErrors.slug)}
                            aria-describedby={fieldErrors.slug ? 'tenant-slug-error' : 'tenant-slug-help'}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                        <p id="tenant-slug-help" className="mt-1 text-xs text-gray-500">
                            Unique lowercase identifier (letters, numbers, hyphens).
                        </p>
                        {fieldErrors.slug && (
                            <p id="tenant-slug-error" className="mt-1.5 text-sm text-red-600">
                                {fieldErrors.slug}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="tenant-contact-email" className="block text-sm font-medium text-gray-700">
                            Institutional Contact Email <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                            id="tenant-contact-email"
                            name="contactEmail"
                            type="email"
                            disabled={isSubmitting}
                            value={contactEmail}
                            onChange={(event) => {
                                setContactEmail(event.target.value);
                                if (fieldErrors.contactEmail) {
                                    setFieldErrors((prev) => ({ ...prev, contactEmail: undefined }));
                                }
                            }}
                            placeholder="office@school.example"
                            aria-invalid={Boolean(fieldErrors.contactEmail)}
                            aria-describedby={fieldErrors.contactEmail ? 'tenant-email-error' : undefined}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                        {fieldErrors.contactEmail && (
                            <p id="tenant-email-error" className="mt-1.5 text-sm text-red-600">
                                {fieldErrors.contactEmail}
                            </p>
                        )}
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
                            disabled={isSubmitting}
                            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? (
                                <>
                                    <span
                                        className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                                        aria-hidden="true"
                                    />
                                    Provisioning...
                                </>
                            ) : (
                                'Provision School'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

