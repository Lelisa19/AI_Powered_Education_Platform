// frontend/src/app/router/index.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTenantContext } from '../providers/TenantProvider';

// Shared Guards & Layouts
import { ProtectedRoute, RoleGuard, PublicRoute } from './RouteGuards';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';

// Error Pages
import { DomainUnavailablePage } from '../../modules/errors/pages/DomainUnavailablePage';

// Platform Pages
import { PlatformLandingPage } from '../../modules/platform-website/pages/PlatformLandingPage';
import { PlatformRoutes } from './platform.routes';
import PlatformLoginPage from '../../modules/auth/pages/PlatformLoginPage';

const AcceptPlatformInvitationPage = lazy(() =>
  import('../../modules/platform-admin/pages/AcceptPlatformInvitationPage').then((module) => ({
    default: module.AcceptPlatformInvitationPage,
  }))
);

// School Pages
import LoginPage from '../../modules/auth/pages/LoginPage';
import RegisterPage from '../../modules/auth/pages/RegisterPage';
import { StaffInvitePage } from '../../modules/auth/pages/StaffInvitePage';
import { SchoolLandingPage } from '../../modules/website-builder/pages/SchoolLandingPage';
// Placeholders for future School flows
const ForgotPasswordPage = () => <div className="p-8 text-center">Forgot Password (Pending Implementation)</div>;

// School Dashboards
import { SchoolAdminRoutes } from './school-admin.routes';
import { TeacherDashboardPage } from '../../modules/teachers/pages/TeacherDashboardPage';
import { StudentDashboardPage } from '../../modules/students/pages/StudentDashboardPage';
import { AccountantDashboardPage } from '../../modules/accountants/pages/AccountantDashboardPage';

// Fallback components
const NotFound: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8 text-center">
    <div>
      <h1 className="mb-2 text-3xl font-bold text-red-600">404</h1>
      <p className="text-gray-600">Page Not Found</p>
    </div>
  </div>
);

const Unauthorized = () => (
  <div className="flex h-full items-center justify-center text-center">
    <div>
      <h1 className="text-3xl font-bold text-red-600">403 - Unauthorized Access</h1>
    </div>
  </div>
);

const ResolvingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      <p className="font-medium text-gray-600">Resolving Environment...</p>
    </div>
  </div>
);

// --- 1. PUBLIC PLATFORM ROUTER ---
const PlatformRouter = () => (
  <Routes>
    <Route path="/" element={<PlatformLandingPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

// --- 2. PRIVATE PLATFORM ADMIN ROUTER ---
const PlatformAdminRouter = () => (
  <Routes>
    <Route element={<PublicRoute />}>
      <Route path="/" element={<PlatformLoginPage />} />
      <Route
        path="/accept-invitation"
        element={
          <Suspense fallback={<ResolvingScreen />}>
            <AcceptPlatformInvitationPage />
          </Suspense>
        }
      />
    </Route>

    <Route element={<ProtectedRoute redirectTo="/" />}>
      <Route element={<DashboardLayout />}>
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route element={<RoleGuard roles={['PLATFORM_ADMIN']} />}>
          <Route path="/dashboard/*" element={<PlatformRoutes />} />
        </Route>
      </Route>
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

// --- 3. SCHOOL ROUTER ---
const SchoolRouter = () => (
  <Routes>
    <Route path="/" element={<SchoolLandingPage />} />

    <Route element={<PublicRoute />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/invite" element={<StaffInvitePage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route element={<DashboardLayout />}>
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route element={<RoleGuard roles={['SCHOOL_ADMIN']} />}>
          <Route path="/admin/*" element={<SchoolAdminRoutes />} />
        </Route>
        <Route element={<RoleGuard roles={['TEACHER']} />}>
          <Route path="/teacher/*" element={<TeacherDashboardPage />} />
        </Route>
        <Route element={<RoleGuard roles={['STUDENT']} />}>
          <Route path="/student/*" element={<StudentDashboardPage />} />
        </Route>
        <Route element={<RoleGuard roles={['SCHOOL_ACCOUNTANT']} />}>
          <Route path="/accountant/*" element={<AccountantDashboardPage />} />
        </Route>
      </Route>
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

// --- MAIN APP ROUTER ---
export const AppRouter: React.FC = () => {
  const { classification, isResolving } = useTenantContext();

  // 1. Show loading screen while the backend verifies the domain
  if (isResolving || classification === 'PENDING_RESOLUTION') {
    return <ResolvingScreen />;
  }

  // 2. Render the physically isolated routing tree based on verified classification
  return (
    <BrowserRouter>
      {classification === 'PLATFORM' && <PlatformRouter />}
      {classification === 'PLATFORM_ADMIN' && <PlatformAdminRouter />}
      {classification === 'SCHOOL' && <SchoolRouter />}
      {classification === 'UNKNOWN' && <DomainUnavailablePage />}
    </BrowserRouter>
  );
};