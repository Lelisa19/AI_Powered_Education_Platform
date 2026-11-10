import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { ApiError } from '../../../services/api/api-error';
import {
    activatePlatformAdminInvitation,
    isPlatformAdminBackendUnavailableError,
    validatePlatformAdminInvitation,
} from '../services/platform-admin-service';
import type {
    PlatformAdminAccount,
    PlatformAdminInvitationStatus,
    ValidatePlatformAdminInvitationResponse,
} from '../types/platform-admin.types';
import {
    formatPlatformAdminDate,
    formatPlatformAdminName,
} from '../utils/platform-admin-formatters';

interface ActivationFieldErrors {
    firstName?: string;
    lastName?: string;
    password?: string;
    confirmPassword?: string;
}

type ValidationPhase =
    | 'missing_token'
    | 'validating'
    | 'backend_unavailable'
    | 'invalid_or_inactive'
    | 'ready'
    | 'activated';

function resolveInactiveCopy(
    status?: PlatformAdminInvitationStatus,
    reason?: string
): { title: string; description: string } {
    if (status === 'EXPIRED') {
        return {
            title: 'Invitation Expired',
            description:
                reason ||
                'This Platform Administrator invitation has expired. Ask the Super Admin to send a new invitation.',
        };
    }

    if (status === 'REVOKED') {
        return {
            title: 'Invitation Revoked',
            description:
                reason ||
                'This Platform Administrator invitation was revoked and can no longer be used to activate an account.',
        };
    }

    if (status === 'ACCEPTED') {
        return {
            title: 'Invitation Already Used',
            description:
                reason ||
                'This Platform Administrator invitation has already been activated. Sign in using your credentials.',
        };
    }

    return {
        title: 'Invalid or Unavailable Invitation',
        description:
            reason ||
            'This Platform Administrator invitation link could not be verified. Confirm the link from your email or request a new invitation.',
    };
}

export const AcceptPlatformInvitationPage: React.FC = () => {
    const { classification } = useTenantContext();
    const location = useLocation();
    const navigate = useNavigate();

    // Capture token solely in React memory and never persist to storage.
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
        useState<ValidatePlatformAdminInvitationResponse | null>(null);
    const [validationErrorMessage, setValidationErrorMessage] = useState<string | null>(null);
    const [isValidationBackendUnavailable, setIsValidationBackendUnavailable] = useState(false);
    const [settledValidationKey, setSettledValidationKey] = useState<string | null>(null);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState<ActivationFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitBackendUnavailable, setIsSubmitBackendUnavailable] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activatedAccount, setActivatedAccount] = useState<PlatformAdminAccount | null>(null);

    const requestVersionRef = useRef(0);
    const isSubmittingRef = useRef(false);

    const isAllowedDomain = classification === 'PLATFORM_ADMIN';

    // Remove the sensitive invitation token from the visible URL bar/history as soon as captured.
    useEffect(() => {
        if (!isAllowedDomain) return;
        if (location.search || location.hash) {
            navigate(location.pathname, { replace: true });
        }
    }, [isAllowedDomain, location.hash, location.pathname, location.search, navigate]);

    const currentValidationKey =
        isAllowedDomain && capturedToken && !activatedAccount
            ? `validate:${validationRetryCount}`
            : null;
    const isValidating =
        Boolean(currentValidationKey) && settledValidationKey !== currentValidationKey;

    useEffect(() => {
        if (!isAllowedDomain || !capturedToken || activatedAccount) {
            return;
        }

        const cycleKey = `validate:${validationRetryCount}`;
        const currentVersion = ++requestVersionRef.current;
        const controller = new AbortController();

        validatePlatformAdminInvitation({ token: capturedToken }, controller.signal)
            .then((response) => {
                if (currentVersion !== requestVersionRef.current) return;

                setValidationResult(response);
                setValidationErrorMessage(response.reason ?? null);
                setIsValidationBackendUnavailable(false);

                if (response.valid) {
                    if (response.firstName) {
                        setFirstName((prev) => prev || response.firstName || '');
                    }
                    if (response.lastName) {
                        setLastName((prev) => prev || response.lastName || '');
                    }
                }
                setSettledValidationKey(cycleKey);
            })
            .catch((err: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                if (err instanceof ApiError && err.isCancellation) return;

                const unavailable = isPlatformAdminBackendUnavailableError(err);
                setValidationResult(null);
                setIsValidationBackendUnavailable(unavailable);
                setValidationErrorMessage(
                    err instanceof Error && err.message
                        ? err.message
                        : 'Unable to validate invitation link.'
                );
                setSettledValidationKey(cycleKey);
            });

        return () => {
            controller.abort();
        };
    }, [activatedAccount, capturedToken, isAllowedDomain, validationRetryCount]);

    const handleRetryValidation = useCallback(() => {
        if (!capturedToken || isSubmittingRef.current) return;
        setValidationErrorMessage(null);
        setIsValidationBackendUnavailable(false);
        setValidationRetryCount((count) => count + 1);
    }, [capturedToken]);

    const resolvePhase = (): ValidationPhase => {
        if (activatedAccount) return 'activated';
        if (!capturedToken) return 'missing_token';
        if (isValidating) return 'validating';
        if (isValidationBackendUnavailable) return 'backend_unavailable';
        if (validationResult && validationResult.valid && validationResult.status === 'PENDING') {
            return 'ready';
        }
        return 'invalid_or_inactive';
    };

    const validateForm = (): ActivationFieldErrors => {
        const errors: ActivationFieldErrors = {};
        const trimmedFirst = firstName.trim();
        const trimmedLast = lastName.trim();

        if (!trimmedFirst) {
            errors.firstName = 'First name is required.';
        } else if (trimmedFirst.length > 100) {
            errors.firstName = 'First name must be 100 characters or fewer.';
        }

        if (!trimmedLast) {
            errors.lastName = 'Last name is required.';
        } else if (trimmedLast.length > 100) {
            errors.lastName = 'Last name must be 100 characters or fewer.';
        }

        if (!password) {
            errors.password = 'Password is required.';
        } else if (password.length < 8) {
            errors.password = 'Password must be at least 8 characters long.';
        }

        if (!confirmPassword) {
            errors.confirmPassword = 'Confirm your password.';
        } else if (password !== confirmPassword) {
            errors.confirmPassword = 'Passwords do not match.';
        }

        return errors;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!capturedToken || isSubmittingRef.current || isSubmitting) {
            return;
        }

        setSubmitError(null);
        setIsSubmitBackendUnavailable(false);
        const errors = validateForm();
        setFieldErrors(errors);
        if (errors.firstName || errors.lastName || errors.password || errors.confirmPassword) {
            return;
        }

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            const response = await activatePlatformAdminInvitation({
                token: capturedToken,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                password,
            });

            // Clear token and password fields from memory once backend confirms activation.
            setCapturedToken(null);
            setPassword('');
            setConfirmPassword('');
            setActivatedAccount(response.account);
        } catch (err: unknown) {
            const unavailable = isPlatformAdminBackendUnavailableError(err);
            setIsSubmitBackendUnavailable(unavailable);

            if (err instanceof ApiError && err.validationErrors) {
                setFieldErrors({
                    firstName: err.validationErrors.firstName?.[0],
                    lastName: err.validationErrors.lastName?.[0],
                    password: err.validationErrors.password?.[0],
                });
            }

            setSubmitError(
                unavailable
                    ? 'Platform Admin invitation activation endpoint is unavailable or pending backend implementation. Your account was not activated.'
                    : err instanceof Error && err.message
                      ? err.message
                      : 'Unable to activate administrator account.'
            );
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    if (!isAllowedDomain) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
                <div className="max-w-md rounded-lg border border-red-200 bg-white p-8 shadow-sm">
                    <h1 className="text-xl font-bold text-red-700">Unavailable Domain Context</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Platform Administrator invitations can only be accepted on the private Platform Admin domain.
                    </p>
                </div>
            </main>
        );
    }

    const phase = resolvePhase();
    const inactiveCopy = resolveInactiveCopy(
        validationResult?.status,
        validationErrorMessage ?? undefined
    );

    return (
        <main className="flex min-h-screen flex-col justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div
                    className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white shadow-sm"
                    aria-hidden="true"
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                    </svg>
                </div>
                <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    Platform Admin Invitation
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                    Activate your invited platform administrator account
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
                                No valid invitation token was found in this link. Open the full invitation URL sent to your email or contact the Super Admin.
                            </p>
                            <div className="pt-2">
                                <Link
                                    to="/"
                                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                                >
                                    Return to Platform Admin Sign In
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
                                Validating your platform administrator invitation...
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
                                        POST /api/platform/admins/invitations/validate
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
                                    to="/"
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
                                    to="/"
                                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                                >
                                    Go to Platform Admin Sign In
                                </Link>
                            </div>
                        </div>
                    )}

                    {phase === 'ready' && validationResult && (
                        <form
                            onSubmit={handleSubmit}
                            noValidate
                            aria-busy={isSubmitting}
                            className="space-y-5"
                        >
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-3.5 text-xs text-gray-700">
                                {validationResult.email && (
                                    <div>
                                        <span className="font-medium text-gray-900">Email:</span>{' '}
                                        {validationResult.email}
                                    </div>
                                )}
                                <div className="mt-1">
                                    <span className="font-medium text-gray-900">Role:</span>{' '}
                                    <span className="font-mono">PLATFORM_ADMIN</span> (Invited Administrator)
                                </div>
                                {validationResult.expiresAt && (
                                    <div className="mt-1">
                                        <span className="font-medium text-gray-900">Expires:</span>{' '}
                                        {formatPlatformAdminDate(validationResult.expiresAt)}
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
                                        htmlFor="invite-first-name"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        First Name <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        id="invite-first-name"
                                        type="text"
                                        required
                                        maxLength={100}
                                        disabled={isSubmitting}
                                        value={firstName}
                                        onChange={(event) => {
                                            setFirstName(event.target.value);
                                            if (fieldErrors.firstName) {
                                                setFieldErrors((prev) => ({
                                                    ...prev,
                                                    firstName: undefined,
                                                }));
                                            }
                                        }}
                                        aria-invalid={Boolean(fieldErrors.firstName)}
                                        aria-describedby={
                                            fieldErrors.firstName
                                                ? 'invite-first-name-error'
                                                : undefined
                                        }
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                    />
                                    {fieldErrors.firstName && (
                                        <p
                                            id="invite-first-name-error"
                                            className="mt-1 text-xs text-red-600"
                                        >
                                            {fieldErrors.firstName}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="invite-last-name"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Last Name <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        id="invite-last-name"
                                        type="text"
                                        required
                                        maxLength={100}
                                        disabled={isSubmitting}
                                        value={lastName}
                                        onChange={(event) => {
                                            setLastName(event.target.value);
                                            if (fieldErrors.lastName) {
                                                setFieldErrors((prev) => ({
                                                    ...prev,
                                                    lastName: undefined,
                                                }));
                                            }
                                        }}
                                        aria-invalid={Boolean(fieldErrors.lastName)}
                                        aria-describedby={
                                            fieldErrors.lastName
                                                ? 'invite-last-name-error'
                                                : undefined
                                        }
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                    />
                                    {fieldErrors.lastName && (
                                        <p
                                            id="invite-last-name-error"
                                            className="mt-1 text-xs text-red-600"
                                        >
                                            {fieldErrors.lastName}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="invite-password"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    New Password <span className="text-red-600">*</span>
                                </label>
                                <input
                                    id="invite-password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    disabled={isSubmitting}
                                    value={password}
                                    onChange={(event) => {
                                        setPassword(event.target.value);
                                        if (fieldErrors.password) {
                                            setFieldErrors((prev) => ({
                                                ...prev,
                                                password: undefined,
                                            }));
                                        }
                                    }}
                                    aria-invalid={Boolean(fieldErrors.password)}
                                    aria-describedby={
                                        fieldErrors.password ? 'invite-password-error' : undefined
                                    }
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                />
                                {fieldErrors.password && (
                                    <p
                                        id="invite-password-error"
                                        className="mt-1 text-xs text-red-600"
                                    >
                                        {fieldErrors.password}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="invite-confirm-password"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Confirm Password <span className="text-red-600">*</span>
                                </label>
                                <input
                                    id="invite-confirm-password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    disabled={isSubmitting}
                                    value={confirmPassword}
                                    onChange={(event) => {
                                        setConfirmPassword(event.target.value);
                                        if (fieldErrors.confirmPassword) {
                                            setFieldErrors((prev) => ({
                                                ...prev,
                                                confirmPassword: undefined,
                                            }));
                                        }
                                    }}
                                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                                    aria-describedby={
                                        fieldErrors.confirmPassword
                                            ? 'invite-confirm-password-error'
                                            : undefined
                                    }
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                />
                                {fieldErrors.confirmPassword && (
                                    <p
                                        id="invite-confirm-password-error"
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
                                    Platform Administrator Account Activated
                                </h2>
                                <p className="mt-1 text-xs text-green-800">
                                    Account{' '}
                                    <strong>
                                        {formatPlatformAdminName(
                                            activatedAccount.firstName,
                                            activatedAccount.lastName,
                                            activatedAccount.email
                                        )}
                                    </strong>{' '}
                                    ({activatedAccount.email}) is now active under the{' '}
                                    <span className="font-mono font-semibold">
                                        {activatedAccount.role}
                                    </span>{' '}
                                    role. Sign in to access the Platform Administration workspace.
                                </p>
                            </div>

                            <Link
                                to="/"
                                className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                            >
                                Proceed to Platform Admin Sign In
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default AcceptPlatformInvitationPage;

