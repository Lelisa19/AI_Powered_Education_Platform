import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAVIGATION_ITEMS } from '../../constants/navigation';
import { usePermissions } from '../../hooks/usePermissions';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { hasAnyRole, hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

    const filteredNavItems = NAVIGATION_ITEMS.filter((item) => {
        let hasRequiredRole = true;
        let hasRequiredPermission = true;

        // Check role requirements
        if (item.roles && item.roles.length > 0) {
            hasRequiredRole = hasAnyRole(item.roles);
        }

        // Check permission requirements
        if (item.permission) {
            hasRequiredPermission = hasPermission(item.permission);
        } else if (item.permissions && item.permissions.length > 0) {
            hasRequiredPermission = item.requireAll
                ? hasAllPermissions(item.permissions)
                : hasAnyPermission(item.permissions);
        }

        // Both conditions must pass if both are defined
        return hasRequiredRole && hasRequiredPermission;
    });

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 transition-opacity lg:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-gray-900 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex h-16 items-center justify-center border-b border-gray-800">
                    <span className="text-xl font-bold tracking-wider">EduPlatform</span>
                </div>
                <nav className="mt-6 flex flex-col space-y-1 px-3">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                }`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </>
    );
};