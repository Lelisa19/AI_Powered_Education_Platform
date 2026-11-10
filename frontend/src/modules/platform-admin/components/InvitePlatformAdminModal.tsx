import React, { useEffect, useRef, useState } from 'react';
import type { PlatformPermissionKey } from '../../../constants/permissions';
import { ApiError } from '../../../services/api/api-error';
import {
    createPlatformAdminInvitation,
    isPlatformAdminBackendUnavailableError,
} from '../services/platform-admin-service';
import type { PlatformAdminInvitation } from '../types/platform-admin.types';
import { PermissionRestrictionsEditor } from './PermissionRestrictionsEditor';

interface InvitePlatformAdminModalProps {
    isSuperAdminActor: boolean;
    onClose: () => void;
    onSuccess: (invitation: PlatformAdminInvitation) => void;
}

interface FieldErrors {
    email?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const InvitePlatformAdminModal: React.FC<InvitePlatformAdminModalProps> = ({
    isSuperAdminActor,
    onClose,
    onSuccess,
}) => {
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [restrictedPermissions, setRestrictedPermissions] = useState<PlatformPermissionKey[]>([]);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSubmittingRef = useRef(false);
    const emailInputRef = useRef<HTMLInputElement>(null);

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
        if (!isSuperAdminActor || isSubmittingRef.current || isSubmitting) {
            return;
        }

        setSubmitError('');
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setFieldErrors({ email: 'Email address is required.' });
            return;
        }
        if (!EMAIL_PATTERN.test(trimmedEmail)) {
            setFieldErrors({ email: 'Please enter a valid administrator email address.' });
            return;
        }
        setFieldErrors({});

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            const response = await createPlatformAdminInvitation({
                email: trimmedEmail,
                firstName: firstName.trim() || undefined,
                lastName: lastName.trim() || undefined,
                restrictedPermissions:
                    restrictedPermissions.length > 0 ? restrictedPermissions : undefined,
            });
            onSuccess(response.invitation);
        } catch (error: unknown) {
            if (error instanceof ApiError && error.validationErrors) {
                setFieldErrors({
                    email: error.validationErrors.email?.[0],
                });
            }

            if (isPlatformAdminBackendUnavailableError(error)) {
                setSubmitError(
                    'Platform Admin invitation API is currently unavailable or pending backend implementation. No invitation was created.'
                );
            } else {
                setSubmitError(
                    error instanceof Error && error.message
                        ? error.message
                        : 'Unable to send administrator invitation.'
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
                aria-labelledby="invite-platform-admin-title"
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2
                            id="invite-platform-admin-title"
                            className="text-lg font-semibold text-gray-900"
                        >
                            Invite Platform Administrator
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Invited administrators share the common <span className="font-mono font-semibold">PLATFORM_ADMIN</span> role and create their own credentials via a secure, single-use backend invitation link.
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        aria-label="Close invite administrator dialog"
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
                    {!isSuperAdminActor && (
                        <div
                            role="alert"
                            className="rounded-md border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                        >
                            Only the initial Super Admin can invite new platform administrators.
                        </div>
                    )}

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
                            htmlFor="platform-admin-invite-email"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Administrator Email <span className="text-red-600">*</span>
                        </label>
                        <input
                            ref={emailInputRef}
                            id="platform-admin-invite-email"
                            type="email"
                            required
                            disabled={isSubmitting || !isSuperAdminActor}
                            value={email}
                            onChange={(event) => {
                                setEmail(event.target.value);
                                if (fieldErrors.email) {
                                    setFieldErrors({});
                                }
                            }}
                            placeholder="colleague@platform.example"
                            aria-invalid={Boolean(fieldErrors.email)}
                            aria-describedby={
                                fieldErrors.email ? 'platform-admin-invite-email-error' : undefined
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.email && (
                            <p
                                id="platform-admin-invite-email-error"
                                className="mt-1.5 text-sm text-red-600"
                            >
                                {fieldErrors.email}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="platform-admin-invite-first-name"
                                className="block text-sm font-medium text-gray-700"
                            >
                                First Name <span className="font-normal text-gray-400">(Optional)</span>
                            </label>
                            <input
                                id="platform-admin-invite-first-name"
                                type="text"
                                disabled={isSubmitting || !isSuperAdminActor}
                                value={firstName}
                                onChange={(event) => setFirstName(event.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="platform-admin-invite-last-name"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Last Name <span className="font-normal text-gray-400">(Optional)</span>
                            </label>
                            <input
                                id="platform-admin-invite-last-name"
                                type="text"
                                disabled={isSubmitting || !isSuperAdminActor}
                                value={lastName}
                                onChange={(event) => setLastName(event.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 border-t border-gray-200 pt-4">
                        <h3 className="text-sm font-semibold text-gray-900">
                            Optional Permission Restrictions
                        </h3>
                        <PermissionRestrictionsEditor
                            restrictedPermissions={restrictedPermissions}
                            readOnly={!isSuperAdminActor}
                            disabled={isSubmitting}
                            onChange={setRestrictedPermissions}
                        />
                    </div>

                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                        Security note: Invitation tokens are generated, hashed, audited, and emailed strictly by the backend. No raw token or activation URL is created or exposed in the frontend, and no password is set here.
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
                            disabled={isSubmitting || !isSuperAdminActor}
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

