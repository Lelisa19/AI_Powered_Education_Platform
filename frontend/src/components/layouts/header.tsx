import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { useTenantContext } from '../../app/providers/TenantProvider';
import { useTheme } from '../../app/providers/ThemeProvider';
import { formatAuthenticatedUserRoles } from '../../utils/authorization';

interface HeaderProps {
    onOpenSidebar: () => void;
    isSidebarOpen: boolean;
    sidebarId: string;
    toggleButtonRef?: React.RefObject<HTMLButtonElement | null>;
    notificationSlot?: React.ReactNode;
}

const PreparedSchoolNotificationControl: React.FC = () => (
    <button
        type="button"
        disabled
        aria-label="School notifications pending backend integration"
        title="Notifications will be available once school communication features are connected."
        className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-400 opacity-75"
    >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
        </svg>
    </button>
);

export const Header: React.FC<HeaderProps> = ({
    onOpenSidebar,
    isSidebarOpen,
    sidebarId,
    toggleButtonRef,
    notificationSlot,
}) => {
    const { user, logout } = useAuth();
    const { isPlatformAdmin } = usePermissions();
    const { classification, tenantId, hostname, schoolName, schoolLogoUrl } = useTenantContext();
    const { isSchoolThemeActive, schoolTheme } = useTheme();
    const [logoutError, setLogoutError] = useState<string | null>(null);
    const [failedHeaderLogoUrl, setFailedHeaderLogoUrl] = useState<string | null>(null);

    const handleLogout = async () => {
        try {
            setLogoutError(null);
            await logout();
        } catch (error) {
            setLogoutError('Failed to log out securely. Please try again.');
            console.error('Logout error:', error);
        }
    };

    const isVerifiedSchoolSession =
        !isPlatformAdmin &&
        classification === 'SCHOOL' &&
        Boolean(tenantId) &&
        user?.accountType === 'SCHOOL' &&
        user.tenantId === tenantId;

    const effectiveSchoolName = isVerifiedSchoolSession
        ? schoolTheme.schoolName || schoolName || hostname || 'Verified School'
        : null;
    const effectiveLogoUrl = isVerifiedSchoolSession
        ? schoolTheme.logoUrl || schoolLogoUrl
        : null;
    const showHeaderLogo = Boolean(
        effectiveLogoUrl && failedHeaderLogoUrl !== effectiveLogoUrl
    );

    const portalLabel = isPlatformAdmin && classification === 'PLATFORM_ADMIN'
        ? 'Platform Administration'
        : isVerifiedSchoolSession && effectiveSchoolName
          ? effectiveSchoolName
          : 'Portal';

    const showVerifiedDomainSubtitle = Boolean(
        isVerifiedSchoolSession &&
            effectiveSchoolName &&
            hostname &&
            effectiveSchoolName !== hostname
    );

    const userName = user ? `${user.firstName} ${user.lastName}` : 'User';
    const roleLabel = formatAuthenticatedUserRoles(user);

    return (
        <header
            style={
                isVerifiedSchoolSession && isSchoolThemeActive
                    ? { borderTop: `3px solid ${schoolTheme.primaryColor}` }
                    : undefined
            }
            className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:static lg:px-8"
        >
            <div className="flex min-w-0 items-center gap-3">
                <button
                    ref={toggleButtonRef}
                    type="button"
                    className="rounded-md p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
                    onClick={onOpenSidebar}
                    aria-label="Open navigation sidebar"
                    aria-expanded={isSidebarOpen}
                    aria-controls={sidebarId}
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                {showHeaderLogo && (
                    <img
                        src={effectiveLogoUrl!}
                        alt={`${portalLabel} Logo`}
                        onError={() => setFailedHeaderLogoUrl(effectiveLogoUrl)}
                        className="hidden h-7 w-7 shrink-0 rounded object-contain sm:block"
                    />
                )}
                <div className="flex min-w-0 items-baseline gap-2.5">
                    <span className="truncate text-lg font-semibold text-gray-900" title={portalLabel}>
                        {portalLabel}
                    </span>
                    {showVerifiedDomainSubtitle && (
                        <span className="hidden truncate text-xs font-medium text-gray-500 md:inline">
                            {hostname}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 items-center space-x-3 sm:space-x-4">
                {isVerifiedSchoolSession
                    ? notificationSlot ?? <PreparedSchoolNotificationControl />
                    : notificationSlot ?? null}
                {roleLabel && (
                    <span
                        style={
                            isVerifiedSchoolSession && isSchoolThemeActive
                                ? { borderColor: schoolTheme.secondaryColor }
                                : undefined
                        }
                        className="hidden rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 sm:inline-flex"
                    >
                        {roleLabel}
                    </span>
                )}
                <span className="hidden text-sm font-medium text-gray-700 sm:block">
                    {userName}
                </span>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Logout
                </button>
            </div>

            {logoutError && (
                <div
                    role="alert"
                    aria-live="assertive"
                    className="absolute left-0 right-0 top-full z-20 border-b border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm sm:px-6 lg:px-8"
                >
                    {logoutError}
                </div>
            )}
        </header>
    );
};
