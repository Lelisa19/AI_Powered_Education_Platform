import React from 'react';
import { useAuth } from '../../../hooks/useAuth';

export const AccountantDashboardPage: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Financial Dashboard</h1>
                <p className="mt-2 text-sm text-gray-600 sm:text-base">
                    Welcome, {user?.firstName || 'Accountant'}. Monitor school finances, payments, and student balances.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                        <h3 className="text-base font-semibold leading-6 text-gray-900">Payment Verification</h3>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-sm text-gray-500">Payment verification requests will appear here once payment processing and backend integration are implemented.</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                        <h3 className="text-base font-semibold leading-6 text-gray-900">Outstanding Balances</h3>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-sm text-gray-500">Financial records and outstanding balance reports will appear here once billing features and backend integration are implemented.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};