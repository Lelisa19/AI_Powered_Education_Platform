import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';

interface HeaderProps {
    onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
    const { user, logout } = useAuth();
    const { isPlatformAdmin } = usePermissions();
    const [logoutError, setLogoutError] = useState<string | null>(null);

    const handleLogout = async () => {
        try {
            setLogoutError(null);
            await logout();
        } catch (error) {
            setLogoutError('Failed to log out securely. Please try again.');
            console.error('Logout error:', error);
        }
    };

    // isPlatformAdmin is a boolean property, not a function
    const portalLabel = isPlatformAdmin ? 'Platform Administration' : 'School Portal';
    const userName = user ? `${user.firstName} ${user.lastName}` : 'User';

    return (
        <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
            <div className="flex items-center">
                <button
                    type="button"
                    className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
                    onClick={onOpenSidebar}
                    aria-label="Open sidebar"
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <h1 className="ml-4 text-lg font-semibold text-gray-900 lg:ml-0">{portalLabel}</h1>
            </div>

            <div className="flex items-center space-x-4">
                <span className="hidden text-sm font-medium text-gray-700 sm:block">
                    {userName}
                </span>
                <button
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