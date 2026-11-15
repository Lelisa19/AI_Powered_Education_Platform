import React, { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import {
    mapBackendInviteStaffFieldErrors,
    type InviteStaffFieldErrors,
    type InviteStaffFormValues,
    validateInviteStaffForm,
} from '../schemas/school-staff-schema';
import {
    createSchoolStaffInvitation,
    isSchoolStaffBackendUnavailableError,
} from '../services/school-staff-service';
import type { SchoolStaffInvitation, SchoolStaffRole } from '../types/school-staff.types';
import {
    formatStaffRoleDescription,
    formatStaffRoleLabel,
} from '../utils/school-staff-formatters';

interface InviteSchoolStaffModalProps {
    allowedRoles: readonly SchoolStaffRole[];
    expectedTenantId: string;
    schoolDisplayName: string;
    initialRole?: SchoolStaffRole;
    lockRole?: boolean;
    onClose: () => void;
    onSuccess: (invitation: SchoolStaffInvitation, message?: string) => void;
}

const INITIAL_VALUES: InviteStaffFormValues = {
    email: '',
    firstName: '',
    lastName: '',
    role: '',
    phone: '',
};

export const InviteSchoolStaffModal: React.FC<InviteSchoolStaffModalProps> = ({
    allowedRoles,
    expectedTenantId,
    schoolDisplayName,
    initialRole,
    lockRole = false,
    onClose,
    onSuccess,
}) => {
    const resolvedInitialRole: SchoolStaffRole | '' =
        initialRole && allowedRoles.includes(initialRole) ? initialRole : '';
    const isRoleLocked = Boolean(lockRole && initialRole);
    const lockedRoleLabel = isRoleLocked && initialRole ? formatStaffRoleLabel(initialRole) : null;

    const [values, setValues] = useState<InviteStaffFormValues>(() => ({
        ...INITIAL_VALUES,
        role: resolvedInitialRole,
    }));
    const [fieldErrors, setFieldErrors] = useState<InviteStaffFieldErrors>({});
    const [submitError, setSubmitError] = useState('');
    const [isUnavailableError, setIsUnavailableError] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSubmittingRef = useRef(false);
    const roleSelectRef = useRef<HTMLSelectElement>(null);
    const firstNameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const frameId = requestAnimationFrame(() => {
            if (isRoleLocked) {
                firstNameInputRef.current?.focus();
            } else {
                roleSelectRef.current?.focus();
            }
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
    }, [isRoleLocked, onClose]);

    const hasAllowedRoles = allowedRoles.length > 0;

    const handleChange = <K extends keyof InviteStaffFormValues>(
        field: K,
        value: InviteStaffFormValues[K]
    ) => {
        setValues((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) {
            setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!hasAllowedRoles || isSubmittingRef.current || isSubmitting) {
            return;
        }

        setSubmitError('');
        setIsUnavailableError(false);

        const submissionValues: InviteStaffFormValues =
            isRoleLocked && resolvedInitialRole
                ? { ...values, role: resolvedInitialRole }
                : values;
        const validation = validateInviteStaffForm(submissionValues, allowedRoles);
        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            return;
        }
        setFieldErrors({});

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            const response = await createSchoolStaffInvitation(validation.payload, expectedTenantId);
            onSuccess(response.invitation, response.message);
        } catch (error: unknown) {
            if (error instanceof ApiError && error.validationErrors) {
                setFieldErrors(mapBackendInviteStaffFieldErrors(error.validationErrors));
            }

            const unavailable = isSchoolStaffBackendUnavailableError(error);
            setIsUnavailableError(unavailable);
            setSubmitError(
                unavailable
                    ? 'Staff invitation endpoint is currently unavailable or pending backend implementation. No invitation was sent.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to send staff invitation.'
            );
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
                aria-labelledby="invite-school-staff-title"
                className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2
                            id="invite-school-staff-title"
                            className="text-lg font-semibold text-gray-900"
                        >
                            {lockedRoleLabel ? `Invite ${lockedRoleLabel}` : 'Invite School Staff Member'}
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Send an invitation bound to <span className="font-medium text-gray-900">{schoolDisplayName}</span>. Recipients activate their own credentials via email link.
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        aria-label={
                            lockedRoleLabel
                                ? `Close invite ${lockedRoleLabel.toLowerCase()} dialog`
                                : 'Close invite school staff dialog'
                        }
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
                    {!hasAllowedRoles && (
                        <div
                            role="alert"
                            className="rounded-md border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                        >
                            Your account lacks permission to invite School Admins, Teachers, or School Accountants.
                        </div>
                    )}

                    {submitError && (
                        <div
                            role={isUnavailableError ? 'status' : 'alert'}
                            aria-live="assertive"
                            className={`rounded-md border p-3.5 text-sm ${
                                isUnavailableError
                                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                                    : 'border-red-200 bg-red-50 text-red-700'
                            }`}
                        >
                            {submitError}
                        </div>
                    )}

                    {isRoleLocked && initialRole ? (
                        <div>
                            <span className="block text-sm font-medium text-gray-700">
                                Staff Role <span className="text-red-600">*</span>
                            </span>
                            <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-gray-900">
                                        {formatStaffRoleLabel(initialRole)} ({initialRole})
                                    </span>
                                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                        Fixed Role
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-600">
                                    {formatStaffRoleDescription(initialRole)}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label
                                htmlFor="staff-invite-role"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Staff Role <span className="text-red-600">*</span>
                            </label>
                            <select
                                ref={roleSelectRef}
                                id="staff-invite-role"
                                name="role"
                                required
                                disabled={isSubmitting || !hasAllowedRoles}
                                value={values.role}
                                onChange={(event) =>
                                    handleChange('role', event.target.value as '' | SchoolStaffRole)
                                }
                                aria-invalid={Boolean(fieldErrors.role)}
                                aria-describedby={fieldErrors.role ? 'staff-invite-role-error' : undefined}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                            >
                                <option value="">Select staff role...</option>
                                {allowedRoles.map((role) => (
                                    <option key={role} value={role}>
                                        {formatStaffRoleLabel(role)} ({role})
                                    </option>
                                ))}
                            </select>
                            {values.role && (
                                <p className="mt-1.5 text-xs text-gray-600">
                                    {formatStaffRoleDescription(values.role)}
                                </p>
                            )}
                            {fieldErrors.role && (
                                <p id="staff-invite-role-error" className="mt-1.5 text-sm text-red-600">
                                    {fieldErrors.role}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="staff-invite-first-name"
                                className="block text-sm font-medium text-gray-700"
                            >
                                First Name <span className="text-red-600">*</span>
                            </label>
                            <input
                                ref={firstNameInputRef}
                                id="staff-invite-first-name"
                                name="firstName"
                                type="text"
                                required
                                maxLength={100}
                                disabled={isSubmitting || !hasAllowedRoles}
                                value={values.firstName}
                                onChange={(event) => handleChange('firstName', event.target.value)}
                                aria-invalid={Boolean(fieldErrors.firstName)}
                                aria-describedby={
                                    fieldErrors.firstName ? 'staff-invite-first-name-error' : undefined
                                }
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                            />
                            {fieldErrors.firstName && (
                                <p
                                    id="staff-invite-first-name-error"
                                    className="mt-1.5 text-sm text-red-600"
                                >
                                    {fieldErrors.firstName}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="staff-invite-last-name"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Last Name <span className="text-red-600">*</span>
                            </label>
                            <input
                                id="staff-invite-last-name"
                                name="lastName"
                                type="text"
                                required
                                maxLength={100}
                                disabled={isSubmitting || !hasAllowedRoles}
                                value={values.lastName}
                                onChange={(event) => handleChange('lastName', event.target.value)}
                                aria-invalid={Boolean(fieldErrors.lastName)}
                                aria-describedby={
                                    fieldErrors.lastName ? 'staff-invite-last-name-error' : undefined
                                }
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                            />
                            {fieldErrors.lastName && (
                                <p
                                    id="staff-invite-last-name-error"
                                    className="mt-1.5 text-sm text-red-600"
                                >
                                    {fieldErrors.lastName}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="staff-invite-email"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Email Address <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="staff-invite-email"
                            name="email"
                            type="email"
                            required
                            disabled={isSubmitting || !hasAllowedRoles}
                            value={values.email}
                            onChange={(event) => handleChange('email', event.target.value)}
                            placeholder={
                                isRoleLocked && initialRole === 'TEACHER'
                                    ? 'teacher@school.example'
                                    : 'staff@school.example'
                            }
                            aria-invalid={Boolean(fieldErrors.email)}
                            aria-describedby={
                                fieldErrors.email ? 'staff-invite-email-error' : undefined
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.email && (
                            <p
                                id="staff-invite-email-error"
                                className="mt-1.5 text-sm text-red-600"
                            >
                                {fieldErrors.email}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="staff-invite-phone"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Phone Number <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <input
                            id="staff-invite-phone"
                            name="phone"
                            type="tel"
                            disabled={isSubmitting || !hasAllowedRoles}
                            value={values.phone}
                            onChange={(event) => handleChange('phone', event.target.value)}
                            placeholder="+1 (555) 234-5678"
                            aria-invalid={Boolean(fieldErrors.phone)}
                            aria-describedby={
                                fieldErrors.phone ? 'staff-invite-phone-error' : undefined
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.phone && (
                            <p
                                id="staff-invite-phone-error"
                                className="mt-1.5 text-sm text-red-600"
                            >
                                {fieldErrors.phone}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                        <p>
                            Security notice: School staff cannot self-register. Invitation tokens are generated, hashed, and emailed by the backend using your verified tenant session.
                        </p>
                        <p>
                            Permissions policy: Individual permission grants or restrictions are governed by the backend and are not configured from this invitation dialog.
                        </p>
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
                            disabled={isSubmitting || !hasAllowedRoles}
                            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting
                                ? 'Sending Invitation...'
                                : lockedRoleLabel
                                  ? `Send ${lockedRoleLabel} Invitation`
                                  : 'Send Staff Invitation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

