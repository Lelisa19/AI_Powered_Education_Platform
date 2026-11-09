// frontend/src/modules/auth/pages/StaffInvitePage.tsx
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export const StaffInvitePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="text-center bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Invalid Invitation</h2>
                    <p className="text-gray-600">No invitation token provided in the link.</p>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);
        try {
            // BACKEND CONTRACT REQUIRED: POST /auth/activate
            // await apiClient.post('/auth/activate', { token, password });
            throw new Error("Staff activation endpoint is pending implementation.");

            // On success:
            // navigate('/login', { state: { message: 'Account activated successfully. Please log in.' } });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Activation failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">Activate Staff Account</h2>
                <p className="mt-2 text-center text-sm text-gray-600">Set your password to accept the invitation</p>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white px-4 py-8 shadow-sm sm:rounded-lg sm:px-10 border border-gray-200">
                    {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">New Password</label>
                            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full flex justify-center rounded-md bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
                            {isSubmitting ? 'Activating...' : 'Activate Account'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};