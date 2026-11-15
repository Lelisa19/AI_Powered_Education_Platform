import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';

export const FinancialReportsPage: React.FC = () => {
    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <DashboardPageHeader
                title="Financial Reports & Insights"
                subtitle="School revenue summaries, payment collection methods, and outstanding fee aging."
            />

            <div className="rounded-lg border border-dashed border-purple-300 bg-purple-50/50 p-8 text-center sm:p-12">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                    <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                    </svg>
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                    Financial Reporting & Export
                </h2>
                <span className="mt-1 inline-flex items-center rounded-full border border-purple-300 bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                    Under Development (Step 5.11.5)
                </span>
                <p className="mx-auto mt-3 max-w-lg text-sm text-gray-600">
                    Comprehensive tuition collection reports, payment method aggregates (Telebirr, CBE Birr, Cash),
                    and financial CSV exports are scheduled for implementation in Step 5.11.5.
                </p>
                <div className="mt-6">
                    <Link
                        to="/accountant"
                        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                    >
                        Return to Financial Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
};

