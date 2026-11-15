// frontend/src/modules/website-builder/components/layout/SchoolHeader.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenantContext } from '../../../../app/providers/TenantProvider';
import type { SchoolIdentity } from '../../types/website.types';

export interface SchoolHeaderProps {
    identity: SchoolIdentity;
    previewMode?: boolean;
}

export const SchoolHeader: React.FC<SchoolHeaderProps> = ({ identity, previewMode = false }) => {
    const { allowsPublicRegistration } = useTenantContext();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);

    const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);
    const showLogo = Boolean(identity.logoUrl && failedLogoUrl !== identity.logoUrl);

    const handlePreviewRouteClick = (event: React.MouseEvent) => {
        closeMobileMenu();
        if (previewMode) {
            event.preventDefault();
        }
    };

    const handleAnchorClick = (event: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
        closeMobileMenu();
        if (!previewMode) return;
        event.preventDefault();
        const root = event.currentTarget.closest('[data-website-preview-root="true"]');
        const target = root?.querySelector(`#${sectionId}`);
        if (target && typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <header
            className={`${
                previewMode ? 'relative z-10' : 'sticky top-0 z-40'
            } border-b border-gray-200 bg-white/95 backdrop-blur shadow-sm`}
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* School Identity: Logo & Name */}
                    <div className="flex items-center space-x-3">
                        <Link
                            to="/"
                            className="flex items-center space-x-3 focus:outline-none"
                            onClick={handlePreviewRouteClick}
                            title={previewMode ? 'Preview navigation disabled in CMS preview' : undefined}
                        >
                            {showLogo ? (
                                <img
                                    src={identity.logoUrl}
                                    alt={`${identity.name} Logo`}
                                    onError={() => setFailedLogoUrl(identity.logoUrl ?? null)}
                                    className="h-10 w-auto max-w-[140px] object-contain"
                                />
                            ) : (
                                <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold shadow-sm"
                                    style={{
                                        backgroundColor: 'var(--school-primary, #1E40AF)',
                                        color: 'var(--school-primary-foreground, #FFFFFF)',
                                    }}
                                    aria-hidden="true"
                                >
                                    {identity.name ? identity.name.trim().charAt(0).toUpperCase() : 'S'}
                                </div>
                            )}
                            <span className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl line-clamp-1">
                                {identity.name}
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden md:flex md:items-center md:space-x-8" aria-label="Main Navigation">
                        <a
                            href="#about"
                            onClick={(e) => handleAnchorClick(e, 'about')}
                            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            About
                        </a>
                        <a
                            href="#programs"
                            onClick={(e) => handleAnchorClick(e, 'programs')}
                            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Programs
                        </a>
                        <a
                            href="#contact"
                            onClick={(e) => handleAnchorClick(e, 'contact')}
                            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Contact
                        </a>
                    </nav>

                    {/* Desktop Auth Actions */}
                    <div className="hidden md:flex md:items-center md:space-x-4">
                        <Link
                            to="/login"
                            onClick={handlePreviewRouteClick}
                            title={previewMode ? 'Login link disabled in CMS preview' : undefined}
                            className="rounded-md px-3.5 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                            Login
                        </Link>

                        {allowsPublicRegistration && (
                            <Link
                                to="/register"
                                onClick={handlePreviewRouteClick}
                                title={previewMode ? 'Registration link disabled in CMS preview' : undefined}
                                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-opacity"
                                style={{
                                    backgroundColor: 'var(--school-primary, #1E40AF)',
                                    color: 'var(--school-primary-foreground, #FFFFFF)',
                                }}
                            >
                                Student Registration
                            </Link>
                        )}
                    </div>

                    {/* Mobile Hamburger Button */}
                    <div className="flex md:hidden">
                        <button
                            type="button"
                            onClick={toggleMobileMenu}
                            className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                            aria-expanded={isMobileMenuOpen}
                            aria-controls="school-mobile-menu"
                            aria-label="Toggle navigation menu"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {isMobileMenuOpen && (
                <div id="school-mobile-menu" className="border-b border-gray-200 bg-white px-4 pt-2 pb-4 shadow-lg md:hidden">
                    <nav className="flex flex-col space-y-2" aria-label="Mobile Navigation">
                        <a
                            href="#about"
                            onClick={(e) => handleAnchorClick(e, 'about')}
                            className="rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                        >
                            About
                        </a>
                        <a
                            href="#programs"
                            onClick={(e) => handleAnchorClick(e, 'programs')}
                            className="rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                        >
                            Programs
                        </a>
                        <a
                            href="#contact"
                            onClick={(e) => handleAnchorClick(e, 'contact')}
                            className="rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                        >
                            Contact
                        </a>
                    </nav>

                    <div className="mt-4 border-t border-gray-200 pt-4 flex flex-col space-y-2">
                        <Link
                            to="/login"
                            onClick={handlePreviewRouteClick}
                            className="w-full text-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Login
                        </Link>

                        {allowsPublicRegistration && (
                            <Link
                                to="/register"
                                onClick={handlePreviewRouteClick}
                                className="w-full text-center rounded-md px-4 py-2 text-base font-medium shadow-sm hover:opacity-90 transition-opacity"
                                style={{
                                    backgroundColor: 'var(--school-primary, #1E40AF)',
                                    color: 'var(--school-primary-foreground, #FFFFFF)',
                                }}
                            >
                                Student Registration
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

