// frontend/src/modules/website-builder/components/layout/SchoolHeader.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenantContext } from '../../../../app/providers/TenantProvider';
import type { SchoolIdentity } from '../../types/website.types';

export interface SchoolHeaderProps {
    identity: SchoolIdentity;
}

export const SchoolHeader: React.FC<SchoolHeaderProps> = ({ identity }) => {
    const { allowsPublicRegistration } = useTenantContext();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur shadow-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* School Identity: Logo & Name */}
                    <div className="flex items-center space-x-3">
                        <Link to="/" className="flex items-center space-x-3 focus:outline-none" onClick={closeMobileMenu}>
                            {identity.logoUrl ? (
                                <img
                                    src={identity.logoUrl}
                                    alt={`${identity.name} Logo`}
                                    className="h-10 w-auto max-w-[140px] object-contain"
                                />
                            ) : (
                                <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white shadow-sm"
                                    style={{ backgroundColor: 'var(--school-primary, #1E40AF)' }}
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
                        <a href="#about" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                            About
                        </a>
                        <a href="#programs" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                            Programs
                        </a>
                        <a href="#contact" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                            Contact
                        </a>
                    </nav>

                    {/* Desktop Auth Actions */}
                    <div className="hidden md:flex md:items-center md:space-x-4">
                        <Link
                            to="/login"
                            className="rounded-md px-3.5 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                            Login
                        </Link>

                        {allowsPublicRegistration && (
                            <Link
                                to="/register"
                                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-opacity"
                                style={{ backgroundColor: 'var(--school-primary, #1E40AF)' }}
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
                            onClick={closeMobileMenu}
                            className="rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                        >
                            About
                        </a>
                        <a
                            href="#programs"
                            onClick={closeMobileMenu}
                            className="rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                        >
                            Programs
                        </a>
                        <a
                            href="#contact"
                            onClick={closeMobileMenu}
                            className="rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                        >
                            Contact
                        </a>
                    </nav>

                    <div className="mt-4 border-t border-gray-200 pt-4 flex flex-col space-y-2">
                        <Link
                            to="/login"
                            onClick={closeMobileMenu}
                            className="w-full text-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Login
                        </Link>

                        {allowsPublicRegistration && (
                            <Link
                                to="/register"
                                onClick={closeMobileMenu}
                                className="w-full text-center rounded-md px-4 py-2 text-base font-medium text-white shadow-sm hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: 'var(--school-primary, #1E40AF)' }}
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

