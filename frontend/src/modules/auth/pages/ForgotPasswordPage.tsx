// frontend/src/modules/auth/pages/ForgotPasswordPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    // Explicitly flag the endpoint as unready
    const isEndpointImplemented = false;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isEndpointImplemented) {
            setStatus('error');
            setMessage('Password recovery is temporarily unavailable pending backend integration. Please contact your school administrator.');
            return;
        }

        setIsSubmitting(true);
        setStatus('idle');

        try {
            // BACKEND CONTRACT REQUIRED: POST /auth/forgot-password
            // await apiClient.post('/auth/forgot-password', { email });
            // setStatus('success');
            // setMessage('If an account exists with this email, a recovery link has been sent.');
        } catch (err: unknown) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">Reset Password</h2>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white px-4 py-8 shadow-sm sm:rounded-lg sm:px-10 border border-gray-200">
                    {status === 'error' && <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">{message}</div>}
                    {status === 'success' ? (
                        <div className="text-center">
                            <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-700 border border-green-200">{message}</div>
                            <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">Return to Login</Link>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={!isEndpointImplemented}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!isEndpointImplemented || isSubmitting}
                                className="w-full flex justify-center rounded-md bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Sending...' : 'Send Recovery Link'}
                            </button>
                        </form>
                    )}
                    <div className="text-center mt-4">
                        <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Back to Login</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};