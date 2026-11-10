import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { getNavigationItems } from '../../config/navigation';
import { useTenantContext } from '../../app/providers/TenantProvider';
import { usePermissions } from '../../hooks/usePermissions';

interface SidebarProps {
    id: string;
    isOpen: boolean;
    isDesktop: boolean;
    onClose: (restoreFocus?: boolean) => void;
}

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
        if (element.closest('[inert]') || element.closest('[aria-hidden="true"]')) {
            return false;
        }
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
    });
}

export const Sidebar: React.FC<SidebarProps> = ({ id, isOpen, isDesktop, onClose }) => {
    const { classification } = useTenantContext();
    const { hasAnyRole, hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
    const asideRef = useRef<HTMLElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    const isMobileOpen = !isDesktop && isOpen;
    const isMobileClosed = !isDesktop && !isOpen;

    useEffect(() => {
        if (!isMobileOpen) return;

        const frameId = requestAnimationFrame(() => {
            const aside = asideRef.current;
            if (!aside) return;

            const closeButton = closeButtonRef.current;
            if (closeButton && window.getComputedStyle(closeButton).display !== 'none') {
                closeButton.focus();
                return;
            }

            const focusable = getFocusableElements(aside);
            if (focusable.length > 0) {
                focusable[0].focus();
            } else {
                aside.focus();
            }
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose(true);
                return;
            }

            if (event.key !== 'Tab') return;

            const aside = asideRef.current;
            if (!aside) return;

            const focusable = getFocusableElements(aside);
            if (focusable.length === 0) {
                event.preventDefault();
                aside.focus();
                return;
            }

            const firstElement = focusable[0];
            const lastElement = focusable[focusable.length - 1];
            const activeElement = document.activeElement;

            if (
                !(activeElement instanceof HTMLElement) ||
                !aside.contains(activeElement) ||
                activeElement === aside
            ) {
                event.preventDefault();
                (event.shiftKey ? lastElement : firstElement).focus();
                return;
            }

            if (event.shiftKey && activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            cancelAnimationFrame(frameId);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMobileOpen, onClose]);

    const navItems = getNavigationItems(classification);

    const filteredNavItems = navItems.filter((item) => {
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
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 transition-opacity lg:hidden"
                    onClick={() => onClose(true)}
                    aria-hidden="true"
                />
            )}

            <aside
                ref={asideRef}
                id={id}
                role={isMobileOpen ? 'dialog' : undefined}
                aria-modal={isMobileOpen || undefined}
                aria-label={isMobileOpen ? 'Navigation menu' : 'Sidebar'}
                tabIndex={isMobileOpen ? -1 : undefined}
                inert={isMobileClosed}
                aria-hidden={isMobileClosed || undefined}
                className={`fixed inset-y-0 left-0 z-30 flex h-dvh w-64 transform flex-col bg-gray-900 text-white transition-transform duration-300 ease-in-out lg:static lg:h-auto lg:translate-x-0 ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4 lg:justify-center">
                    <span className="text-xl font-bold tracking-wider">EduPlatform</span>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={() => onClose(true)}
                        tabIndex={isMobileClosed ? -1 : undefined}
                        aria-label="Close navigation sidebar"
                        className="rounded-md p-1.5 text-gray-300 transition-colors hover:bg-gray-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <nav className="mt-6 flex flex-1 flex-col space-y-1 overflow-y-auto px-3" aria-label="Primary navigation">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            tabIndex={isMobileClosed ? -1 : undefined}
                            onClick={() => onClose(false)}
                            className={({ isActive }) =>
                                `rounded-md px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${isActive
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
