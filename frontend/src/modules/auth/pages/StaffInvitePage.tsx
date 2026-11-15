import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { ApiError } from '../../../services/api/api-error';
import type { SchoolAuthenticatedUser } from '../../../types/auth';
import {
    STAFF_NAME_MAX_LENGTH,
    type StaffActivationFieldErrors,
    type StaffActivationFormValues,
    validateStaffActivationForm,
} from '../../school-admin/schemas/school-staff-schema';
import {
    activateSchoolStaffInvitation,
    isSchoolStaffBackendUnavailableError,
    validateSchoolStaffInvitation,
} from '../../school-admin/services/school-staff-service';
import type {
    SchoolStaffInvitationStatus,
    ValidateSchoolStaffInvitationResponse,
} from '../../school-admin/types/school-staff.types';
import {
    formatStaffDateTime,
    formatStaffFullName,
    formatStaffRoleLabel,
} from '../../school-admin/utils/school-staff-formatters';

type ActivationPhase =
    | 'missing_token'
    | 'validating'
    | 'backend_unavailable'
    | 'invalid_or_inactive'
    | 'ready'
    | 'activated';

function resolveInactiveCopy(
    status?: SchoolStaffInvitationStatus,
    reason?: string
): { title: string; description: string } {
    if (status === 'EXPIRED') {
        return {
            title: 'Invitation Expired',
            description:
                reason ||
                'This staff invitation link has expired. Contact your School Administrator to request a new invitation.',
        };
    }

    if (status === 'REVOKED') {
        return {
            title: 'Invitation Revoked',
            description:
                reason ||
                'This staff invitation was revoked by your school administration and can no longer be activated.',
        };
    }

    if (status === 'ACCEPTED') {
        return {
            title: 'Invitation Already Used',
            description:
                reason ||
                'This invitation has already been activated. Sign in with your school credentials.',
        };
    }

    return {
        title: 'Invalid or Unavailable Invitation',
        description:
            reason ||
            'This staff invitation link could not be verified for this school. Confirm the full link from your email or contact your School Administrator.',
    };
}

export const StaffInvitePage: React.FC = () => {
    const { classification, tenantId, schoolName, hostname } = useTenantContext();
    const location = useLocation();
    const navigate = useNavigate();

    // Capture the raw invitation token strictly in React memory; never store in browser storage or log.
    const [capturedToken, setCapturedToken] = useState<string | null>(() => {
        const raw = new URLSearchParams(location.search).get('token');
        const trimmed = raw?.trim() ?? '';
        if (!trimmed || /\s/.test(trimmed)) {
            return null;
        }
        return trimmed;
    });

    const [validationRetryCount, setValidationRetryCount] = useState(0);
    const [validationResult, setValidationResult] =
        useState<ValidateSchoolStaffInvitationResponse | null>(null);
    const [validationErrorMessage, setValidationErrorMessage] = useState<string | null>(null);
    const [isValidationBackendUnavailable, setIsValidationBackendUnavailable] = useState(false);
    const [settledValidationKey, setSettledValidationKey] = useState<string | null>(null);

    const [formValues, setFormValues] = useState<StaffActivationFormValues>({
        firstName: '',
        lastName: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [fieldErrors, setFieldErrors] = useState<StaffActivationFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitBackendUnavailable, setIsSubmitBackendUnavailable] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activatedAccount, setActivatedAccount] = useState<SchoolAuthenticatedUser | null>(null);

    const requestVersionRef = useRef(0);
    const isSubmittingRef = useRef(false);

    const isAllowedSchoolDomain = classification === 'SCHOOL' && Boolean(tenantId);

    // Strip the sensitive invitation token from the visible URL bar and history immediately.
    useEffect(() => {
        if (!isAllowedSchoolDomain) return;
        if (location.search || location.hash) {
            navigate(location.pathname, { replace: true });
        }
    }, [isAllowedSchoolDomain, location.hash, location.pathname, location.search, navigate]);

    const currentValidationKey =
        isAllowedSchoolDomain && capturedToken && !activatedAccount
            ? `validate:${tenantId}:${validationRetryCount}`
            : null;
    const isValidating =
        Boolean(currentValidationKey) && settledValidationKey !== currentValidationKey;

    useEffect(() => {
        if (!isAllowedSchoolDomain || !tenantId || !capturedToken || activatedAccount) {
            return;
        }

        const cycleKey = `validate:${tenantId}:${validationRetryCount}`;
        const currentVersion = ++requestVersionRef.current;
        const controller = new AbortController();

        validateSchoolStaffInvitation({ token: capturedToken }, tenantId, controller.signal)
            .then((response) => {
                if (currentVersion !== requestVersionRef.current) return;

                setValidationResult(response);
                setValidationErrorMessage(response.reason ?? null);
                setIsValidationBackendUnavailable(false);

                if (response.valid) {
                    setFormValues((prev) => ({
                        ...prev,
                        firstName: prev.firstName || response.firstName || '',
                        lastName: prev.lastName || response.lastName || '',
                        phone: prev.phone || response.phone || '',
                    }));
                }
                setSettledValidationKey(cycleKey);
            })
            .catch((error: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;

                const unavailable = isSchoolStaffBackendUnavailableError(error);
                setValidationResult(null);
                setIsValidationBackendUnavailable(unavailable);
                setValidationErrorMessage(
                    error instanceof Error && error.message
                        ? error.message
                        : 'Unable to validate invitation link.'
                );
                setSettledValidationKey(cycleKey);
            });

        return () => {
            controller.abort();
        };
    }, [activatedAccount, capturedToken, isAllowedSchoolDomain, tenantId, validationRetryCount]);

    const handleRetryValidation = useCallback(() => {
        if (!capturedToken || isSubmittingRef.current) return;
        setValidationErrorMessage(null);
        setIsValidationBackendUnavailable(false);
        setValidationRetryCount((count) => count + 1);
    }, [capturedToken]);

    const resolvePhase = (): ActivationPhase => {
        if (activatedAccount) return 'activated';
        if (!capturedToken) return 'missing_token';
        if (isValidating) return 'validating';
        if (isValidationBackendUnavailable) return 'backend_unavailable';
        if (
            validationResult &&
            validationResult.valid &&
            validationResult.status === 'PENDING' &&
            validationResult.role
        ) {
            return 'ready';
        }
        return 'invalid_or_inactive';
    };

    const handleFieldChange = <K extends keyof StaffActivationFormValues>(
        field: K,
        value: StaffActivationFormValues[K]
    ) => {
        setFormValues((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) {
            setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!capturedToken || !tenantId || isSubmittingRef.current || isSubmitting) {
            return;
        }

        setSubmitError(null);
        setIsSubmitBackendUnavailable(false);

        const validation = validateStaffActivationForm(formValues);
        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            return;
        }
        setFieldErrors({});

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            const response = await activateSchoolStaffInvitation(
                {
                    token: capturedToken,
                    firstName: validation.payload.firstName,
                    lastName: validation.payload.lastName,
                    password: validation.payload.password,
                    ...(validation.payload.phone ? { phone: validation.payload.phone } : {}),
                },
                tenantId
            );

            // Scrub sensitive token and password values from React state immediately after activation.
            setCapturedToken(null);
            setFormValues((prev) => ({
                ...prev,
                password: '',
                confirmPassword: '',
            }));
            setActivatedAccount(response.account);
        } catch (error: unknown) {
            const unavailable = isSchoolStaffBackendUnavailableError(error);
            setIsSubmitBackendUnavailable(unavailable);

            if (error instanceof ApiError && error.validationErrors) {
                setFieldErrors({
                    firstName: error.validationErrors.firstName?.[0],
                    lastName: error.validationErrors.lastName?.[0],
                    phone: error.validationErrors.phone?.[0],
                    password: error.validationErrors.password?.[0],
                });
            }

            setSubmitError(
                unavailable
                    ? 'Staff invitation activation endpoint is unavailable or pending backend implementation. Your account was not activated.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to activate school staff account.'
            );
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    if (!isAllowedSchoolDomain || !tenantId) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
                <div className="max-w-md rounded-lg border border-red-200 bg-white p-8 shadow-sm">
                    <h1 className="text-xl font-bold text-red-700">Unavailable Domain Context</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        School staff invitations can only be validated and activated on a verified school domain.
                    </p>
                </div>
            </main>
        );
    }

    const verifiedSchoolDisplayName =
        validationResult?.schoolName || schoolName || hostname || 'Verified School';
    const phase = resolvePhase();
    const inactiveCopy = resolveInactiveCopy(
        validationResult?.status,
        validationErrorMessage ?? undefined
    );

    return (
        <main className="flex min-h-screen flex-col justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div
                    className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-sm"
                    aria-hidden="true"
                >
                    {verifiedSchoolDisplayName.trim().charAt(0).toUpperCase() || 'S'}
                </div>
                <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    Activate School Staff Account
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                    {verifiedSchoolDisplayName}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-10">
                    {phase === 'missing_token' && (
                        <div className="space-y-4 text-center">
                            <h2 className="text-base font-semibold text-red-700">
                                Invalid or Missing Invitation Link
                            </h2>
                            <p className="text-sm text-gray-600">
                                No valid invitation token was found in this link. Open the full invitation URL sent to your email or contact your School Administrator.
                            </p>
                            <div className="pt-2">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                                >
                                    Return to School Sign In
                                </Link>
                            </div>
                        </div>
                    )}

                    {phase === 'validating' && (
                        <div role="status" className="flex flex-col items-center py-6 text-center">
                            <div
                                className="mb-3 h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
                                aria-hidden="true"
                            />
                            <p className="text-sm font-medium text-gray-700">
                                Validating your school staff invitation...
                            </p>
                        </div>
                    )}

                    {phase === 'backend_unavailable' && (
                        <div className="space-y-4 text-center">
                            <div
                                role="status"
                                className="rounded-md border border-amber-200 bg-amber-50 p-4 text-left"
                            >
                                <h2 className="text-sm font-semibold text-amber-900">
                                    Invitation Validation Pending Backend Implementation
                                </h2>
                                <p className="mt-1 text-xs text-amber-800">
                                    The invitation could not be verified because{' '}
                                    <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">
                                        POST /api/school/staff/invitations/validate
                                    </code>{' '}
                                    is unavailable ({validationErrorMessage}).
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                                <button
                                    type="button"
                                    onClick={handleRetryValidation}
                                    className="rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-600"
                                >
                                    Retry Validation
                                </button>
                                <Link
                                    to="/login"
                                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    Go to Sign In
                                </Link>
                            </div>
                        </div>
                    )}

                    {phase === 'invalid_or_inactive' && (
                        <div className="space-y-4 text-center">
                            <div
                                role="alert"
                                className="rounded-md border border-red-200 bg-red-50 p-4 text-left"
                            >
                                <h2 className="text-sm font-semibold text-red-900">
                                    {inactiveCopy.title}
                                </h2>
                                <p className="mt-1 text-xs text-red-700">
                                    {inactiveCopy.description}
                                </p>
                            </div>

                            <div className="pt-1">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                                >
                                    Go to School Sign In
                                </Link>
                            </div>
                        </div>
                    )}

                    {phase === 'ready' && validationResult && validationResult.role && (
                        <form
                            onSubmit={handleSubmit}
                            noValidate
                            aria-busy={isSubmitting}
                            className="space-y-5"
                        >
                            <div className="space-y-1 rounded-md border border-gray-200 bg-gray-50 p-3.5 text-xs text-gray-700">
                                <div>
                                    <span className="font-medium text-gray-900">School:</span>{' '}
                                    {verifiedSchoolDisplayName}
                                </div>
                                {validationResult.email && (
                                    <div>
                                        <span className="font-medium text-gray-900">Email:</span>{' '}
                                        {validationResult.email}
                                    </div>
                                )}
                                <div>
                                    <span className="font-medium text-gray-900">Assigned Role:</span>{' '}
                                    {formatStaffRoleLabel(validationResult.role)} (
                                    <span className="font-mono">{validationResult.role}</span>)
                                </div>
                                {validationResult.expiresAt && (
                                    <div>
                                        <span className="font-medium text-gray-900">Expires:</span>{' '}
                                        {formatStaffDateTime(validationResult.expiresAt)}
                                    </div>
                                )}
                            </div>

                            {submitError && (
                                <div
                                    role={isSubmitBackendUnavailable ? 'status' : 'alert'}
                                    className={`rounded-md border p-3.5 text-sm ${
                                        isSubmitBackendUnavailable
                                            ? 'border-amber-200 bg-amber-50 text-amber-900'
                                            : 'border-red-200 bg-red-50 text-red-700'
                                    }`}
                                >
                                    {submitError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="staff-activate-first-name"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        First Name <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        id="staff-activate-first-name"
                                        type="text"
                                        required
                                        maxLength={STAFF_NAME_MAX_LENGTH}
                                        disabled={isSubmitting}
                                        value={formValues.firstName}
                                        onChange={(event) =>
                                            handleFieldChange('firstName', event.target.value)
                                        }
                                        aria-invalid={Boolean(fieldErrors.firstName)}
                                        aria-describedby={
                                            fieldErrors.firstName
                                                ? 'staff-activate-first-name-error'
                                                : undefined
                                        }
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                    />
                                    {fieldErrors.firstName && (
                                        <p
                                            id="staff-activate-first-name-error"
                                            className="mt-1 text-xs text-red-600"
                                        >
                                            {fieldErrors.firstName}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="staff-activate-last-name"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Last Name <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        id="staff-activate-last-name"
                                        type="text"
                                        required
                                        maxLength={STAFF_NAME_MAX_LENGTH}
                                        disabled={isSubmitting}
                                        value={formValues.lastName}
                                        onChange={(event) =>
                                            handleFieldChange('lastName', event.target.value)
                                        }
                                        aria-invalid={Boolean(fieldErrors.lastName)}
                                        aria-describedby={
                                            fieldErrors.lastName
                                                ? 'staff-activate-last-name-error'
                                                : undefined
                                        }
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                    />
                                    {fieldErrors.lastName && (
                                        <p
                                            id="staff-activate-last-name-error"
                                            className="mt-1 text-xs text-red-600"
                                        >
                                            {fieldErrors.lastName}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="staff-activate-phone"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Phone Number{' '}
                                    <span className="font-normal text-gray-400">(Optional)</span>
                                </label>
                                <input
                                    id="staff-activate-phone"
                                    type="tel"
                                    disabled={isSubmitting}
                                    value={formValues.phone}
                                    onChange={(event) =>
                                        handleFieldChange('phone', event.target.value)
                                    }
                                    aria-invalid={Boolean(fieldErrors.phone)}
                                    aria-describedby={
                                        fieldErrors.phone ? 'staff-activate-phone-error' : undefined
                                    }
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                />
                                {fieldErrors.phone && (
                                    <p
                                        id="staff-activate-phone-error"
                                        className="mt-1 text-xs text-red-600"
                                    >
                                        {fieldErrors.phone}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="staff-activate-password"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    New Password <span className="text-red-600">*</span>
                                </label>
                                <input
                                    id="staff-activate-password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    disabled={isSubmitting}
                                    value={formValues.password}
                                    onChange={(event) =>
                                        handleFieldChange('password', event.target.value)
                                    }
                                    aria-invalid={Boolean(fieldErrors.password)}
                                    aria-describedby="staff-activate-password-requirements"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                />
                                <p
                                    id="staff-activate-password-requirements"
                                    className="mt-1 text-xs text-gray-500"
                                >
                                    Minimum 8 characters with uppercase, lowercase, and a number.
                                </p>
                                {fieldErrors.password && (
                                    <p className="mt-1 text-xs text-red-600">
                                        {fieldErrors.password}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="staff-activate-confirm-password"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Confirm Password <span className="text-red-600">*</span>
                                </label>
                                <input
                                    id="staff-activate-confirm-password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    disabled={isSubmitting}
                                    value={formValues.confirmPassword}
                                    onChange={(event) =>
                                        handleFieldChange('confirmPassword', event.target.value)
                                    }
                                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                                    aria-describedby={
                                        fieldErrors.confirmPassword
                                            ? 'staff-activate-confirm-password-error'
                                            : undefined
                                    }
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                />
                                {fieldErrors.confirmPassword && (
                                    <p
                                        id="staff-activate-confirm-password-error"
                                        className="mt-1 text-xs text-red-600"
                                    >
                                        {fieldErrors.confirmPassword}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? 'Activating Account...' : 'Activate Account'}
                            </button>
                        </form>
                    )}

                    {phase === 'activated' && activatedAccount && (
                        <div className="space-y-4 text-center">
                            <div
                                role="status"
                                className="rounded-md border border-green-200 bg-green-50 p-4 text-left"
                            >
                                <h2 className="text-sm font-semibold text-green-900">
                                    School Staff Account Activated
                                </h2>
                                <p className="mt-1 text-xs text-green-800">
                                    Account{' '}
                                    <strong>
                                        {formatStaffFullName(
                                            activatedAccount.firstName,
                                            activatedAccount.lastName,
                                            activatedAccount.email
                                        )}
                                    </strong>{' '}
                                    ({activatedAccount.email}) is now active at{' '}
                                    <strong>{verifiedSchoolDisplayName}</strong> with role{' '}
                                    <span className="font-mono font-semibold">
                                        {activatedAccount.roles.join(', ')}
                                    </span>
                                    . Sign in to access your portal.
                                </p>
                            </div>

                            <Link
                                to="/login"
                                className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                            >
                                Proceed to School Sign In
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};
