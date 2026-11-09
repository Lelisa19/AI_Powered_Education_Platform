import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { getDefaultDashboard } from '../../utils/authorization';
import type { PlatformRole, SchoolRole } from '../../types/auth';

const LoadingScreen: React.FC = () => (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="font-medium text-gray-600">Loading...</p>
        </div>
    </div>
);

export const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        // Preserve requested pathname, search parameters, and hash
        const returnUrl = location.pathname + location.search + location.hash;
        return <Navigate to="/login" replace state={{ from: returnUrl }} />;
    }

    return <Outlet />;
};

export const PublicRoute: React.FC = () => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (isAuthenticated) {
        return <Navigate to={getDefaultDashboard(user)} replace />;
    }

    return <Outlet />;
};

interface RoleGuardProps {
    roles: (PlatformRole | SchoolRole)[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ roles }) => {
    const { user } = useAuth();
    const { hasAnyRole } = usePermissions();
    const location = useLocation();

    if (!hasAnyRole(roles)) {
        const defaultDashboard = getDefaultDashboard(user);

        // Prevent infinite redirect loops if the user lacks access to their own default dashboard
        if (location.pathname === defaultDashboard) {
            return <Navigate to="/unauthorized" replace />;
        }

        return <Navigate to={defaultDashboard} replace />;
    }

    return <Outlet />;
};

interface PermissionGuardProps {
    permission?: string;
    permissions?: string[];
    requireAll?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    permission,
    permissions = [],
    requireAll = false
}) => {
    const { user } = useAuth();
    const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
    const location = useLocation();

    let isAuthorized = false;

    if (permission) {
        isAuthorized = hasPermission(permission);
    } else if (permissions.length > 0) {
        isAuthorized = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
    }

    if (!isAuthorized) {
        const defaultDashboard = getDefaultDashboard(user);

        // Prevent infinite redirect loops if the user lacks access to their own default dashboard
        if (location.pathname === defaultDashboard) {
            return <Navigate to="/unauthorized" replace />;
        }

        return <Navigate to={defaultDashboard} replace />;
    }

    return <Outlet />;
};