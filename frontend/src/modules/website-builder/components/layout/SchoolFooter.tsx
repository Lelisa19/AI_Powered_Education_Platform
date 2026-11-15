// frontend/src/modules/website-builder/components/layout/SchoolFooter.tsx
import React, { useState } from 'react';
import { sanitizeStrictHttpsUrl } from '../../../../utils/branding';
import type { SchoolIdentity, SchoolContactInfo, SchoolSocialLinks } from '../../types/website.types';

export interface SchoolFooterProps {
    identity: SchoolIdentity;
    contact: SchoolContactInfo;
    socialLinks?: SchoolSocialLinks;
    previewMode?: boolean;
}

export const SchoolFooter: React.FC<SchoolFooterProps> = ({
    identity,
    contact,
    socialLinks,
    previewMode = false,
}) => {
    const currentYear = new Date().getFullYear();
    const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);

    // Filter social links to strictly credential-free HTTPS URLs
    const validSocialLinks = [
        { name: 'Facebook', url: sanitizeStrictHttpsUrl(socialLinks?.facebook) },
        { name: 'Twitter', url: sanitizeStrictHttpsUrl(socialLinks?.twitter) },
        { name: 'Instagram', url: sanitizeStrictHttpsUrl(socialLinks?.instagram) },
        { name: 'LinkedIn', url: sanitizeStrictHttpsUrl(socialLinks?.linkedin) },
        { name: 'YouTube', url: sanitizeStrictHttpsUrl(socialLinks?.youtube) },
    ].filter((link): link is { name: string; url: string } => Boolean(link.url));

    const hasPhone = Boolean(contact.phone && contact.phone.trim() !== '');
    const formattedAddress = [contact.address, contact.city, contact.country]
        .map((segment) => segment?.trim())
        .filter((segment): segment is string => Boolean(segment))
        .join(', ');
    const hasAddress = formattedAddress.length > 0;
    const hasEmail = Boolean(contact.email && contact.email.trim() !== '');
    const showLogo = Boolean(identity.logoUrl && failedLogoUrl !== identity.logoUrl);

    return (
        <footer className="border-t border-gray-800 bg-gray-900 text-gray-300">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {/* Column 1: School Identity */}
                    <div>
                        <div className="flex items-center space-x-3">
                            {showLogo ? (
                                <img
                                    src={identity.logoUrl}
                                    alt={`${identity.name} Logo`}
                                    onError={() => setFailedLogoUrl(identity.logoUrl ?? null)}
                                    className="h-10 w-auto max-w-[140px] object-contain brightness-200"
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
                                    <span>{formattedAddress}</span>
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
                                            onClick={(e) => {
                                                if (previewMode) e.preventDefault();
                                            }}
                                            title={previewMode ? `${item.name} link (${item.url})` : undefined}
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

