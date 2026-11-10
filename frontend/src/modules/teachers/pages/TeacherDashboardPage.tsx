import React from 'react';
import { useAuth } from '../../../hooks/useAuth';

export const TeacherDashboardPage: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Teacher Portal</h1>
                <p className="mt-2 text-sm text-gray-600 sm:text-base">
                    Welcome back, {user?.firstName || 'Teacher'}. Manage your courses, lessons, and student progress.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                        <h2 className="text-base font-semibold leading-6 text-gray-900">My Courses & Lessons</h2>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-sm text-gray-500">Assigned courses and lesson plans will appear here once course assignment and backend integration are implemented.</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                        <h2 className="text-base font-semibold leading-6 text-gray-900">Pending Submissions</h2>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-sm text-gray-500">Student assignments and submissions will appear here once grading features and backend integration are implemented.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};