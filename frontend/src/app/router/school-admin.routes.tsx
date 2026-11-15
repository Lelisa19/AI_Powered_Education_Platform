import React, { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { PERMISSIONS, SCHOOL_ADMIN_ROUTE_PERMISSIONS } from '../../constants/permissions';
import { PermissionGuard } from './RouteGuards';

const SchoolAdminDashboardPage = lazy(() =>
    import('../../modules/school-admin/pages/SchoolAdminDashboardPage').then((module) => ({
        default: module.SchoolAdminDashboardPage,
    }))
);
const SchoolProfilePage = lazy(() =>
    import('../../modules/school-admin/pages/SchoolProfilePage').then((module) => ({
        default: module.SchoolProfilePage,
    }))
);
const SchoolWebsiteManagementPage = lazy(() =>
    import('../../modules/website-builder/pages/SchoolWebsiteManagementPage').then((module) => ({
        default: module.SchoolWebsiteManagementPage,
    }))
);
const SchoolSettingsPage = lazy(() =>
    import('../../modules/school-admin/pages/SchoolSettingsPage').then((module) => ({
        default: module.SchoolSettingsPage,
    }))
);
const StaffManagementPage = lazy(() =>
    import('../../modules/school-admin/pages/StaffManagementPage').then((module) => ({
        default: module.StaffManagementPage,
    }))
);
const TeacherManagementPage = lazy(() =>
    import('../../modules/teachers/pages/TeacherManagementPage').then((module) => ({
        default: module.TeacherManagementPage,
    }))
);
const StudentManagementPage = lazy(() =>
    import('../../modules/students/pages/StudentManagementPage').then((module) => ({
        default: module.StudentManagementPage,
    }))
);
const AcademicStructurePage = lazy(() =>
    import('../../modules/academic/pages/AcademicStructurePage').then((module) => ({
        default: module.AcademicStructurePage,
    }))
);
const ProgramsAndCoursesPage = lazy(() =>
    import('../../modules/programs-courses/pages/ProgramsAndCoursesPage').then((module) => ({
        default: module.ProgramsAndCoursesPage,
    }))
);
const SchoolAdminFinancePage = lazy(() =>
    import('../../modules/school-admin/pages/SchoolAdminFinancePage').then((module) => ({
        default: module.SchoolAdminFinancePage,
    }))
);

const SchoolAdminRouteLoadingFallback: React.FC = () => (
    <div
        role="status"
        className="mx-auto flex max-w-7xl flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center shadow-sm"
    >
        <div
            className="mb-3 h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
            aria-hidden="true"
        />
        <p className="text-sm font-medium text-gray-700">Loading school administration view...</p>
    </div>
);

const SchoolAdminNotFoundPage: React.FC = () => (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">404 - Page Not Found</h1>
        <p className="mt-2 text-sm text-gray-600">
            The requested School Administration route does not exist.
        </p>
        <Link
            to="/admin"
            className="mt-6 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
            Return to Admin Dashboard
        </Link>
    </div>
);

export const SchoolAdminRoutes: React.FC = () => {
    return (
        <Suspense fallback={<SchoolAdminRouteLoadingFallback />}>
            <Routes>
                <Route index element={<SchoolAdminDashboardPage />} />
                <Route
                    element={
                        <PermissionGuard permissions={[...SCHOOL_ADMIN_ROUTE_PERMISSIONS.PROFILE]} />
                    }
                >
                    <Route path="profile" element={<SchoolProfilePage />} />
                </Route>
                <Route
                    element={
                        <PermissionGuard permission={PERMISSIONS.WEBSITE.READ} />
                    }
                >
                    <Route path="website" element={<SchoolWebsiteManagementPage />} />
                </Route>
                <Route
                    element={
                        <PermissionGuard permission={PERMISSIONS.SETTINGS.READ} />
                    }
                >
                    <Route path="settings" element={<SchoolSettingsPage />} />
                </Route>
                <Route
                    element={
                        <PermissionGuard permissions={[...SCHOOL_ADMIN_ROUTE_PERMISSIONS.STAFF]} />
                    }
                >
                    <Route path="staff" element={<StaffManagementPage />} />
                </Route>
                <Route
                    element={
                        <PermissionGuard permission={PERMISSIONS.TEACHERS.READ} />
                    }
                >
                    <Route path="teachers" element={<TeacherManagementPage />} />
                </Route>
                <Route
                    element={
                        <PermissionGuard
                            permissions={[...SCHOOL_ADMIN_ROUTE_PERMISSIONS.STUDENTS]}
                        />
                    }
                >
                    <Route path="students" element={<StudentManagementPage />} />
                </Route>
                <Route
                    element={
                        <PermissionGuard
                            permissions={[...SCHOOL_ADMIN_ROUTE_PERMISSIONS.ACADEMIC_STRUCTURE]}
                        />
                    }
                >
                    <Route path="academic-structure" element={<AcademicStructurePage />} />
                </Route>
                <Route
                    element={
                        <PermissionGuard
                            permissions={[...SCHOOL_ADMIN_ROUTE_PERMISSIONS.PROGRAMS_COURSES]}
                        />
                    }
                >
                    <Route path="programs-courses" element={<ProgramsAndCoursesPage />} />
                </Route>
                <Route
                    element={
                        <PermissionGuard
                            permissions={[...SCHOOL_ADMIN_ROUTE_PERMISSIONS.FINANCE]}
                            requireAll
                        />
                    }
                >
                    <Route path="finance" element={<SchoolAdminFinancePage />} />
                </Route>
                <Route path="*" element={<SchoolAdminNotFoundPage />} />
            </Routes>
        </Suspense>
    );
};