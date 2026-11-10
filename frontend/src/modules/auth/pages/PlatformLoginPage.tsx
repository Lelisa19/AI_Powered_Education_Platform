// frontend/src/modules/auth/pages/PlatformLoginPage.tsx
import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { getAuthorizedRedirectPath, getDefaultDashboard } from '../../../utils/authorization';
import { ApiError } from '../../../services/api/api-error';

interface FieldErrors {
    email?: string;
    password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PlatformLoginPage: React.FC = () => {
    const { login } = useAuth();
    const { classification } = useTenantContext();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSubmittingRef = useRef(false);

    const validate = (rawEmail: string, rawPassword: string): FieldErrors => {
        const errors: FieldErrors = {};
        const trimmedEmail = rawEmail.trim();

        if (!trimmedEmail) {
            errors.email = 'Email address is required.';
        } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
            errors.email = 'Please enter a valid email address.';
        }

        if (!rawPassword) {
            errors.password = 'Password is required.';
        }

        return errors;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (isSubmittingRef.current || isSubmitting) {
            return;
        }

        setFormError('');
        const validationErrors = validate(email, password);
        setFieldErrors(validationErrors);

        if (validationErrors.email || validationErrors.password) {
            return;
        }

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            const userData = await login({
                email: email.trim(),
                password,
            });

            const rawFrom = (location.state as { from?: unknown } | null)?.from;
            const destination =
                getAuthorizedRedirectPath(rawFrom, userData, classification) ??
                getDefaultDashboard(userData, classification);
            navigate(destination, { replace: true });
        } catch (err: unknown) {
            if (err instanceof ApiError && err.validationErrors) {
                setFieldErrors({
                    email: err.validationErrors.email?.[0],
                    password: err.validationErrors.password?.[0],
                });
            }
            setFormError(
                err instanceof Error && err.message
                    ? err.message
                    : 'Unable to sign in. Please verify your credentials and try again.'
            );
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

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
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                    </svg>
                </div>
                <h1 className="mt-5 text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    Platform Administration
                </h1>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Sign in with your platform administrator account
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-10">
                    {formError && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                        >
                            {formError}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
                        <div>
                            <label
                                htmlFor="platform-email"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Email address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="platform-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    disabled={isSubmitting}
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (fieldErrors.email) {
                                            setFieldErrors((prev) => ({ ...prev, email: undefined }));
                                        }
                                    }}
                                    aria-invalid={Boolean(fieldErrors.email)}
                                    aria-describedby={fieldErrors.email ? 'platform-email-error' : undefined}
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                                />
                            </div>
                            {fieldErrors.email && (
                                <p id="platform-email-error" className="mt-1.5 text-sm text-red-600">
                                    {fieldErrors.email}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="platform-password"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="platform-password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    disabled={isSubmitting}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (fieldErrors.password) {
                                            setFieldErrors((prev) => ({ ...prev, password: undefined }));
                                        }
                                    }}
                                    aria-invalid={Boolean(fieldErrors.password)}
                                    aria-describedby={fieldErrors.password ? 'platform-password-error' : undefined}
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                                />
                            </div>
                            {fieldErrors.password && (
                                <p id="platform-password-error" className="mt-1.5 text-sm text-red-600">
                                    {fieldErrors.password}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? (
                                <>
                                    <span
                                        className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                                        aria-hidden="true"
                                    />
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
};

export default PlatformLoginPage;

