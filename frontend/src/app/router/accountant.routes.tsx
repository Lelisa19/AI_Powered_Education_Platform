import React, { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { SCHOOL_ACCOUNTANT_ROUTE_PERMISSIONS } from '../../constants/permissions';
import { PermissionGuard } from './RouteGuards';

const AccountantDashboardPage = lazy(() =>
    import('../../modules/accountants/pages/AccountantDashboardPage').then((module) => ({
        default: module.AccountantDashboardPage,
    }))
);
const PaymentVerificationPage = lazy(() =>
    import('../../modules/accountants/pages/PaymentVerificationPage').then((module) => ({
        default: module.PaymentVerificationPage,
    }))
);
const StudentFinancialRecordsPage = lazy(() =>
    import('../../modules/accountants/pages/StudentFinancialRecordsPage').then((module) => ({
        default: module.StudentFinancialRecordsPage,
    }))
);
const FinancialReportsPage = lazy(() =>
    import('../../modules/accountants/pages/FinancialReportsPage').then((module) => ({
        default: module.FinancialReportsPage,
    }))
);

const AccountantRouteLoadingFallback: React.FC = () => (
    <div
        role="status"
        className="mx-auto flex max-w-7xl flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center shadow-sm"
    >
        <div
            className="mb-3 h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
            aria-hidden="true"
        />
        <p className="text-sm font-medium text-gray-700">Loading accountant workspace...</p>
    </div>
);

const AccountantNotFoundPage: React.FC = () => (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">404 - Page Not Found</h1>
        <p className="mt-2 text-sm text-gray-600">
            The requested Financial Management route does not exist.
        </p>
        <Link
            to="/accountant"
            className="mt-6 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
            Return to Accountant Dashboard
        </Link>
    </div>
);

export const AccountantRoutes: React.FC = () => {
    return (
        <Suspense fallback={<AccountantRouteLoadingFallback />}>
            <Routes>
                <Route index element={<AccountantDashboardPage />} />
                <Route
                    element={
                        <PermissionGuard
                            permissions={[...SCHOOL_ACCOUNTANT_ROUTE_PERMISSIONS.PAYMENTS]}
                        />
                    }
                >
                    <Route path="payments" element={<PaymentVerificationPage />} />
                </Route>
                <Route
                    element={
                        <PermissionGuard
                            permissions={[...SCHOOL_ACCOUNTANT_ROUTE_PERMISSIONS.STUDENTS]}
                            requireAll
                        />
                    }
                >
                    <Route path="students" element={<StudentFinancialRecordsPage />} />
                </Route>
                <Route
                    element={
                        <PermissionGuard
                            permissions={[...SCHOOL_ACCOUNTANT_ROUTE_PERMISSIONS.REPORTS]}
                        />
                    }
                >
                    <Route path="reports" element={<FinancialReportsPage />} />
                </Route>
                <Route path="*" element={<AccountantNotFoundPage />} />
            </Routes>
        </Suspense>
    );
};

