import React, { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { PLATFORM_PERMISSIONS } from '../../constants/permissions';
import { PermissionGuard } from './RouteGuards';

const PlatformDashboardPage = lazy(() =>
    import('../../modules/platform-admin/pages/PlatformDashboardPage').then((module) => ({
        default: module.PlatformDashboardPage,
    }))
);
const TenantsPage = lazy(() =>
    import('../../modules/tenants/pages/TenantsPage').then((module) => ({
        default: module.TenantsPage,
    }))
);
const DomainsPage = lazy(() =>
    import('../../modules/domains/pages/DomainsPage').then((module) => ({
        default: module.DomainsPage,
    }))
);
const OnboardingPage = lazy(() =>
    import('../../modules/onboarding/pages/OnboardingPage').then((module) => ({
        default: module.OnboardingPage,
    }))
);
const AdministratorsPage = lazy(() =>
    import('../../modules/platform-admin/pages/AdministratorsPage').then((module) => ({
        default: module.AdministratorsPage,
    }))
);
const PlatformSettingsPage = lazy(() =>
    import('../../modules/settings/pages/PlatformSettingsPage').then((module) => ({
        default: module.PlatformSettingsPage,
    }))
);
const AuditLogsPage = lazy(() =>
    import('../../modules/platform-admin/pages/AuditLogsPage').then((module) => ({
        default: module.AuditLogsPage,
    }))
);
const SystemMonitoringPage = lazy(() =>
    import('../../modules/platform-admin/pages/SystemMonitoringPage').then((module) => ({
        default: module.SystemMonitoringPage,
    }))
);
const SupportManagementPage = lazy(() =>
    import('../../modules/support/pages/SupportManagementPage').then((module) => ({
        default: module.SupportManagementPage,
    }))
);

const PlatformRouteLoadingFallback: React.FC = () => (
    <div
        role="status"
        className="mx-auto flex max-w-7xl flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center shadow-sm"
    >
        <div
            className="mb-3 h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
            aria-hidden="true"
        />
        <p className="text-sm font-medium text-gray-700">Loading platform administration view...</p>
    </div>
);

const PlatformNotFoundPage: React.FC = () => (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">404 - Page Not Found</h1>
        <p className="mt-2 text-sm text-gray-600">
            The requested Platform Administration route does not exist.
        </p>
        <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
            Return to Platform Dashboard
        </Link>
    </div>
);

export const PlatformRoutes: React.FC = () => {
    return (
        <Suspense fallback={<PlatformRouteLoadingFallback />}>
            <Routes>
                <Route index element={<PlatformDashboardPage />} />
                <Route element={<PermissionGuard permission={PLATFORM_PERMISSIONS.TENANTS_MANAGE} />}>
                    <Route path="tenants" element={<TenantsPage />} />
                </Route>
                <Route element={<PermissionGuard permission={PLATFORM_PERMISSIONS.DOMAINS_MANAGE} />}>
                    <Route path="domains" element={<DomainsPage />} />
                </Route>
                <Route element={<PermissionGuard permission={PLATFORM_PERMISSIONS.ONBOARDING_MANAGE} />}>
                    <Route path="onboarding" element={<OnboardingPage />} />
                </Route>
                <Route element={<PermissionGuard permission={PLATFORM_PERMISSIONS.ADMINS_MANAGE} />}>
                    <Route path="administrators" element={<AdministratorsPage />} />
                </Route>
                <Route element={<PermissionGuard permission={PLATFORM_PERMISSIONS.SETTINGS_MANAGE} />}>
                    <Route path="settings" element={<PlatformSettingsPage />} />
                </Route>
                <Route element={<PermissionGuard permission={PLATFORM_PERMISSIONS.AUDIT_LOGS_VIEW} />}>
                    <Route path="audit-logs" element={<AuditLogsPage />} />
                </Route>
                <Route element={<PermissionGuard permission={PLATFORM_PERMISSIONS.MONITORING_ACCESS} />}>
                    <Route path="monitoring" element={<SystemMonitoringPage />} />
                </Route>
                <Route element={<PermissionGuard permission={PLATFORM_PERMISSIONS.SUPPORT_MANAGE} />}>
                    <Route path="support" element={<SupportManagementPage />} />
                </Route>
                <Route path="*" element={<PlatformNotFoundPage />} />
            </Routes>
        </Suspense>
    );
};

