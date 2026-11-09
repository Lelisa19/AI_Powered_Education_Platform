// frontend/src/modules/website-builder/components/layout/SchoolFooter.tsx
import React from 'react';
import type { SchoolIdentity, SchoolContactInfo, SchoolSocialLinks } from '../../types/website.types';

export interface SchoolFooterProps {
    identity: SchoolIdentity;
    contact: SchoolContactInfo;
    socialLinks?: SchoolSocialLinks;
}

/**
 * Validates that a given URL string is non-empty, well-formed, and strictly uses the https: protocol.
 * Rejects empty strings, malformed URLs, javascript:, http:, and other non-https protocols.
 */
const isValidHttpsUrl = (urlString?: string): boolean => {
    if (!urlString || typeof urlString !== 'string') {
        return false;
    }
    const trimmed = urlString.trim();
    if (!trimmed) {
        return false;
    }
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'https:';
    } catch {
        return false;
    }
};

export const SchoolFooter: React.FC<SchoolFooterProps> = ({ identity, contact, socialLinks }) => {
    const currentYear = new Date().getFullYear();

    // Filter social links to only those that have valid HTTPS URLs
    const validSocialLinks = [
        { name: 'Facebook', url: socialLinks?.facebook },
        { name: 'Twitter', url: socialLinks?.twitter },
        { name: 'Instagram', url: socialLinks?.instagram },
        { name: 'LinkedIn', url: socialLinks?.linkedin },
        { name: 'YouTube', url: socialLinks?.youtube },
    ].filter((link): link is { name: string; url: string } => isValidHttpsUrl(link.url));

    const hasPhone = Boolean(contact.phone && contact.phone.trim() !== '');
    const hasAddress = Boolean(contact.address && contact.address.trim() !== '');
    const hasEmail = Boolean(contact.email && contact.email.trim() !== '');

    return (
        <footer className="border-t border-gray-800 bg-gray-900 text-gray-300">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {/* Column 1: School Identity */}
                    <div>
                        <div className="flex items-center space-x-3">
                            {identity.logoUrl ? (
                                <img
                                    src={identity.logoUrl}
                                    alt={`${identity.name} Logo`}
                                    className="h-10 w-auto max-w-[140px] object-contain brightness-200"
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
                            <span className="text-xl font-bold text-white tracking-tight">
                                {identity.name}
                            </span>
                        </div>
                        <p className="mt-3 text-sm text-gray-400 max-w-sm">
                            Official public portal for {identity.name}. Connecting students, faculty, and our academic community.
                        </p>
                    </div>

                    {/* Column 2: Contact Information */}
                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                            Contact Us
                        </h3>
                        <ul className="mt-4 space-y-2 text-sm text-gray-400">
                            {hasEmail && (
                                <li>
                                    <span className="text-gray-300 font-medium">Email: </span>
                                    <a
                                        href={`mailto:${contact.email.trim()}`}
                                        className="hover:text-white transition-colors underline-offset-2 hover:underline"
                                    >
                                        {contact.email.trim()}
                                    </a>
                                </li>
                            )}
                            {hasPhone && (
                                <li>
                                    <span className="text-gray-300 font-medium">Phone: </span>
                                    <a
                                        href={`tel:${contact.phone!.trim().replace(/[^\d+]/g, '')}`}
                                        className="hover:text-white transition-colors"
                                    >
                                        {contact.phone!.trim()}
                                    </a>
                                </li>
                            )}
                            {hasAddress && (
                                <li>
                                    <span className="text-gray-300 font-medium">Address: </span>
                                    <span>{contact.address!.trim()}</span>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Column 3: Social Media Links */}
                    {validSocialLinks.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                                Follow Us
                            </h3>
                            <ul className="mt-4 flex flex-wrap gap-3 text-sm text-gray-400">
                                {validSocialLinks.map((item) => (
                                    <li key={item.name}>
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center rounded-md bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
                                        >
                                            {item.name}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Bottom Bar: Copyright */}
                <div className="mt-12 border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
                    &copy; {currentYear} {identity.name}. All rights reserved.
                </div>
            </div>
        </footer>
    );
};

