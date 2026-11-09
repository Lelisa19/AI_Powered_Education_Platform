import React from 'react';
import { useAuth } from '../../../hooks/useAuth';

export const SchoolAdminDashboardPage: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">School Administration</h1>
                <p className="mt-2 text-sm text-gray-600 sm:text-base">
                    Welcome, {user?.firstName || 'Administrator'}. Overview of school operations, staff, and enrollments.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                        <h3 className="text-base font-semibold leading-6 text-gray-900">Students & Enrollments</h3>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-sm text-gray-500">Student records and enrollment directories will appear here once enrollment features and backend integration are implemented.</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                        <h3 className="text-base font-semibold leading-6 text-gray-900">Faculty & Staff</h3>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-sm text-gray-500">Faculty and staff directories will appear here once staff management and backend integration are implemented.</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                        <h3 className="text-base font-semibold leading-6 text-gray-900">Courses & Programs</h3>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-sm text-gray-500">Courses and academic program details will appear here once academic management and backend integration are implemented.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};