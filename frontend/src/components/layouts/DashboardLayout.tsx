import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';

const SIDEBAR_ID = 'dashboard-sidebar';
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

export const DashboardLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState<boolean>(() =>
        typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MEDIA_QUERY).matches : true
    );
    const toggleButtonRef = useRef<HTMLButtonElement>(null);
    const restoreFocusFrameRef = useRef<number | null>(null);

    const isMobileOpen = isSidebarOpen && !isDesktop;

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
        const handleMediaChange = (event: MediaQueryListEvent) => {
            const sidebarElement = document.getElementById(SIDEBAR_ID);
            const activeElement = document.activeElement;
            const isFocusInSidebar =
                activeElement instanceof HTMLElement &&
                sidebarElement !== null &&
                sidebarElement.contains(activeElement);

            if (event.matches) {
                setIsSidebarOpen(false);
                if (isFocusInSidebar) {
                    const firstNavLink = sidebarElement.querySelector<HTMLElement>('nav a[href]');
                    if (firstNavLink) {
                        requestAnimationFrame(() => firstNavLink.focus());
                    }
                }
            } else if (isFocusInSidebar) {
                requestAnimationFrame(() => {
                    const toggleButton = toggleButtonRef.current;
                    if (
                        toggleButton &&
                        toggleButton.isConnected &&
                        window.getComputedStyle(toggleButton).display !== 'none'
                    ) {
                        toggleButton.focus();
                    }
                });
            }

            setIsDesktop(event.matches);
        };

        mediaQuery.addEventListener('change', handleMediaChange);
        return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }, []);

    useEffect(() => {
        return () => {
            if (restoreFocusFrameRef.current !== null) {
                cancelAnimationFrame(restoreFocusFrameRef.current);
            }
        };
    }, []);

    const handleOpenSidebar = useCallback(() => {
        if (restoreFocusFrameRef.current !== null) {
            cancelAnimationFrame(restoreFocusFrameRef.current);
            restoreFocusFrameRef.current = null;
        }
        setIsSidebarOpen(true);
    }, []);

    const handleCloseSidebar = useCallback(
        (restoreFocus = false) => {
            if (restoreFocusFrameRef.current !== null) {
                cancelAnimationFrame(restoreFocusFrameRef.current);
                restoreFocusFrameRef.current = null;
            }

            setIsSidebarOpen(false);

            if (restoreFocus && !isDesktop) {
                restoreFocusFrameRef.current = requestAnimationFrame(() => {
                    restoreFocusFrameRef.current = null;
                    const toggleButton = toggleButtonRef.current;
                    if (
                        toggleButton &&
                        toggleButton.isConnected &&
                        !toggleButton.closest('[inert]') &&
                        window.getComputedStyle(toggleButton).display !== 'none'
                    ) {
                        toggleButton.focus();
                    }
                });
            }
        },
        [isDesktop]
    );

    return (
        <div
            className={`flex bg-gray-50 ${
                isMobileOpen ? 'h-dvh overflow-hidden' : 'min-h-dvh lg:h-dvh lg:overflow-hidden'
            }`}
        >
            <Sidebar
                id={SIDEBAR_ID}
                isOpen={isSidebarOpen}
                isDesktop={isDesktop}
                onClose={handleCloseSidebar}
            />

            <div
                inert={isMobileOpen}
                aria-hidden={isMobileOpen || undefined}
                className="flex min-w-0 flex-1 flex-col lg:overflow-hidden"
            >
                <Header
                    onOpenSidebar={handleOpenSidebar}
                    isSidebarOpen={isSidebarOpen}
                    sidebarId={SIDEBAR_ID}
                    toggleButtonRef={toggleButtonRef}
                />

                <main className="flex-1 p-4 sm:p-6 lg:overflow-y-auto lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
