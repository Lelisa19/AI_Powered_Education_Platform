import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getNavigationItems } from '../../config/navigation';
import type { NavItem } from '../../constants/navigation';
import { useTenantContext } from '../../app/providers/TenantProvider';
import { useTheme } from '../../app/providers/ThemeProvider';
import { usePermissions } from '../../hooks/usePermissions';

interface SidebarProps {
    id: string;
    isOpen: boolean;
    isDesktop: boolean;
    onClose: (restoreFocus?: boolean) => void;
}

interface SidebarNavGroup {
    section: string | null;
    items: NavItem[];
}

function groupNavItemsBySection(items: NavItem[]): SidebarNavGroup[] {
    const groups: SidebarNavGroup[] = [];

    for (const item of items) {
        const sectionName = item.section ?? null;
        const existingGroup = groups.find((group) => group.section === sectionName);

        if (existingGroup) {
            existingGroup.items.push(item);
        } else {
            groups.push({ section: sectionName, items: [item] });
        }
    }

    return groups;
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
    const { classification, tenantId, hostname, schoolName, schoolLogoUrl } = useTenantContext();
    const { isSchoolThemeActive, schoolTheme } = useTheme();
    const { hasAnyRole, hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
    const asideRef = useRef<HTMLElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);

    const isMobileOpen = !isDesktop && isOpen;
    const isMobileClosed = !isDesktop && !isOpen;
    const isVerifiedSchoolPortal = classification === 'SCHOOL' && Boolean(tenantId);
    const resolvedSchoolLogo = isVerifiedSchoolPortal
        ? schoolTheme.logoUrl || schoolLogoUrl
        : null;
    const schoolDisplayName = isVerifiedSchoolPortal
        ? schoolTheme.schoolName || schoolName || hostname || 'Verified School'
        : null;
    const showSchoolLogo = Boolean(
        resolvedSchoolLogo && failedLogoUrl !== resolvedSchoolLogo
    );

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

    const filteredNavItems = useMemo(
        () =>
            navItems.filter((item) => {
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
            }),
        [navItems, hasAnyRole, hasPermission, hasAnyPermission, hasAllPermissions]
    );

    const navGroups = useMemo(() => groupNavItemsBySection(filteredNavItems), [filteredNavItems]);

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
                <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4">
                    {classification === 'PLATFORM_ADMIN' ? (
                        <span className="text-xl font-bold tracking-wider lg:mx-auto">EduPlatform</span>
                    ) : isVerifiedSchoolPortal && schoolDisplayName ? (
                        <div className="flex min-w-0 items-center gap-2.5">
                            {showSchoolLogo ? (
                                <img
                                    src={resolvedSchoolLogo!}
                                    alt={`${schoolDisplayName} Logo`}
                                    onError={() => setFailedLogoUrl(resolvedSchoolLogo)}
                                    className="h-8 w-8 shrink-0 rounded-md bg-white object-contain p-0.5"
                                />
                            ) : (
                                <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold"
                                    style={
                                        isSchoolThemeActive
                                            ? {
                                                  backgroundColor: schoolTheme.primaryColor,
                                                  color: schoolTheme.primaryForegroundColor,
                                              }
                                            : { backgroundColor: '#2563EB', color: '#FFFFFF' }
                                    }
                                    aria-hidden="true"
                                >
                                    {schoolDisplayName.trim().charAt(0).toUpperCase() || 'S'}
                                </div>
                            )}
                            <span
                                className="truncate text-base font-bold tracking-tight text-white"
                                title={schoolDisplayName}
                            >
                                {schoolDisplayName}
                            </span>
                        </div>
                    ) : (
                        <span className="text-xl font-bold tracking-wider lg:mx-auto">Portal</span>
                    )}
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
                <nav className="mt-4 flex flex-1 flex-col space-y-4 overflow-y-auto px-3 pb-4" aria-label="Primary navigation">
                    {navGroups.map((group) => (
                        <div key={group.section ?? '__ungrouped__'} className="flex flex-col space-y-1">
                            {group.section && (
                                <div className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                                    {group.section}
                                </div>
                            )}
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.end}
                                    tabIndex={isMobileClosed ? -1 : undefined}
                                    onClick={() => onClose(false)}
                                    style={({ isActive }) =>
                                        isActive && isVerifiedSchoolPortal && isSchoolThemeActive
                                            ? {
                                                  backgroundColor: schoolTheme.primaryColor,
                                                  color: schoolTheme.primaryForegroundColor,
                                                  borderLeft: `3px solid ${schoolTheme.secondaryColor}`,
                                              }
                                            : undefined
                                    }
                                    className={({ isActive }) =>
                                        `rounded-md px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            isActive
                                                ? isVerifiedSchoolPortal && isSchoolThemeActive
                                                    ? ''
                                                    : 'bg-blue-600 text-white'
                                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                        }`
                                    }
                                >
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>
            </aside>
        </>
    );
};
