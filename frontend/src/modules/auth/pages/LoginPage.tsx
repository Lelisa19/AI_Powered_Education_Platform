// frontend/src/modules/auth/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { getDefaultDashboard } from '../../../utils/authorization';
import { useTenantContext } from '../../../app/providers/TenantProvider';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const { allowsPublicRegistration } = useTenantContext();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const successMessage = (location.state as { message?: string })?.message;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const userData = await login({ email, password });
            const from = (location.state as { from?: string })?.from;
            navigate(from || getDefaultDashboard(userData), { replace: true });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Invalid email or password.');
        } finally {
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
                    {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email address</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500">Forgot password?</Link>
                            </div>
                            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full flex justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                            {isSubmitting ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>

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