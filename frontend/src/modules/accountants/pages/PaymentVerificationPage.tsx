import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';

export const PaymentVerificationPage: React.FC = () => {
    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <DashboardPageHeader
                title="Payment Verification"
                subtitle="Review offline bank deposits, mobile banking transactions, and student payment receipts."
            />

            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-8 text-center sm:p-12">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
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
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                    Payment Verification Queue
                </h2>
                <span className="mt-1 inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    Under Development (Step 5.11.3)
                </span>
                <p className="mx-auto mt-3 max-w-lg text-sm text-gray-600">
                    The payment verification review workflow, slip viewer modal, and decision submission
                    (VERIFIED / REJECTED) are scheduled for implementation in Step 5.11.3.
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

