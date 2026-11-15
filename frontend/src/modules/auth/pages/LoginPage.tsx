// frontend/src/modules/auth/pages/LoginPage.tsx
import React, { useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { getAuthorizedRedirectPath, getDefaultDashboard } from '../../../utils/authorization';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { env } from '../../../config/env';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const { classification, tenantId, hostname, allowsPublicRegistration } = useTenantContext();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSubmittingRef = useRef(false);

    const successMessage = (location.state as { message?: string } | null)?.message;

    const normalizedHostname = (hostname || '').trim().toLowerCase().replace(/\.+$/, '');
    const isDevSchoolAuthActive =
        import.meta.env.DEV &&
        env.ENABLE_SCHOOL_DEV_AUTH &&
        classification === 'SCHOOL' &&
        Boolean(env.DEV_SCHOOL_DOMAIN) &&
        normalizedHostname === env.DEV_SCHOOL_DOMAIN.toLowerCase();

    const handleSelectDevAccount = (devEmail: string, devPass: string) => {
        setEmail(devEmail);
        setPassword(devPass);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmittingRef.current || isSubmitting) {
            return;
        }

        setError('');
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        try {
            const userData = await login({ email: email.trim(), password });
            const rawFrom = (location.state as { from?: unknown } | null)?.from;
            const destination =
                getAuthorizedRedirectPath(rawFrom, userData, classification, tenantId) ??
                getDefaultDashboard(userData, classification, tenantId);
            navigate(destination, { replace: true });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Invalid email or password.');
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">Sign in to your school</h2>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 shadow-sm sm:px-10">
                    {successMessage && <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">{successMessage}</div>}
                    {error && <div role="alert" aria-live="assertive" className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="school-login-email" className="block text-sm font-medium text-gray-700">Email address</label>
                            <input id="school-login-email" type="email" required disabled={isSubmitting} value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="school-login-password" className="block text-sm font-medium text-gray-700">Password</label>
                                <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500">Forgot password?</Link>
                            </div>
                            <input id="school-login-password" type="password" required disabled={isSubmitting} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500" />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full flex justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                            {isSubmitting ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>

                    {/* Development Mode Quick-Fill Helper (Local Development Only) */}
                    {isDevSchoolAuthActive && (
                        <div className="mt-6 rounded-md border border-dashed border-amber-300 bg-amber-50/60 p-3.5 text-left">
                            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800">
                                <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Development Test Accounts
                            </div>
                            <p className="mt-1 text-[11px] text-amber-700">
                                Local frontend testing fixtures (password: <code className="font-mono text-[10px] font-bold">LocalSchoolAdmin2026!</code> / <code className="font-mono text-[10px] font-bold">LocalRestrictedAdmin2026!</code> / <code className="font-mono text-[10px] font-bold">LocalAccountant2026!</code>)
                            </p>
                            <div className="mt-2.5 flex flex-col gap-1.5 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => handleSelectDevAccount('admin@school.local.test', 'LocalSchoolAdmin2026!')}
                                    className="flex-1 rounded border border-amber-300 bg-white px-2.5 py-1 text-center text-xs font-medium text-amber-900 shadow-sm hover:bg-amber-100/60 focus:outline-none"
                                >
                                    Full Admin
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSelectDevAccount('restricted@school.local.test', 'LocalRestrictedAdmin2026!')}
                                    className="flex-1 rounded border border-amber-300 bg-white px-2.5 py-1 text-center text-xs font-medium text-amber-900 shadow-sm hover:bg-amber-100/60 focus:outline-none"
                                >
                                    Restricted Admin
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSelectDevAccount('accountant@school.local.test', 'LocalAccountant2026!')}
                                    className="flex-1 rounded border border-amber-300 bg-white px-2.5 py-1 text-center text-xs font-medium text-amber-900 shadow-sm hover:bg-amber-100/60 focus:outline-none"
                                >
                                    Accountant
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Conditionally render registration link based on verified tenant configuration */}
                    {allowsPublicRegistration && (
                        <div className="mt-6 text-center">
                            <Link to="/register" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                                Student Registration
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default LoginPage;