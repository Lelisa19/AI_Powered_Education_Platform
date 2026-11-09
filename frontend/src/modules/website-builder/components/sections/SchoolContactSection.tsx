// frontend/src/modules/website-builder/components/sections/SchoolContactSection.tsx
import React from 'react';
import type { SchoolContactInfo, SchoolIdentity } from '../../types/website.types';

export interface SchoolContactSectionProps {
    contact: SchoolContactInfo;
    identity?: SchoolIdentity;
}

export const SchoolContactSection: React.FC<SchoolContactSectionProps> = ({ contact, identity }) => {
    const hasEmail = Boolean(contact.email && contact.email.trim() !== '');
    const hasPhone = Boolean(contact.phone && contact.phone.trim() !== '');
    const hasAddress = Boolean(contact.address && contact.address.trim() !== '');

    const headingText = identity?.name ? `Contact ${identity.name}` : 'Contact Information';

    return (
        <section
            id="contact"
            className="scroll-mt-20 bg-white py-16 sm:py-20 lg:py-24 border-t border-gray-200"
            aria-labelledby="contact-heading"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-16">
                    <h2
                        id="contact-heading"
                        className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
                    >
                        {headingText}
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-gray-600">
                        Have questions or need further information? Reach out to our administrative office.
                    </p>
                    <div
                        className="mx-auto mt-4 h-1 w-16 rounded-full"
                        style={{ backgroundColor: 'var(--school-primary, #1E40AF)' }}
                        aria-hidden="true"
                    />
                </div>

                <div className="mx-auto max-w-4xl">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Email Card */}
                        {hasEmail && (
                            <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50/50 p-6 text-center shadow-sm">
                                <div
                                    className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm mb-4"
                                    style={{ backgroundColor: 'var(--school-primary, #1E40AF)' }}
                                    aria-hidden="true"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold text-gray-900">Email Inquiries</h3>
                                <p className="mt-2 text-sm text-gray-600">Official correspondence</p>
                                <a
                                    href={`mailto:${contact.email.trim()}`}
                                    className="mt-4 text-sm font-semibold hover:underline underline-offset-4 transition-colors"
                                    style={{ color: 'var(--school-primary, #1E40AF)' }}
                                >
                                    {contact.email.trim()}
                                </a>
                            </div>
                        )}

                        {/* Phone Card */}
                        {hasPhone && (
                            <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50/50 p-6 text-center shadow-sm">
                                <div
                                    className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm mb-4"
                                    style={{ backgroundColor: 'var(--school-primary, #1E40AF)' }}
                                    aria-hidden="true"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold text-gray-900">Phone Support</h3>
                                <p className="mt-2 text-sm text-gray-600">Office hours assistance</p>
                                <a
                                    href={`tel:${contact.phone!.trim().replace(/[^\d+]/g, '')}`}
                                    className="mt-4 text-sm font-semibold hover:underline underline-offset-4 transition-colors"
                                    style={{ color: 'var(--school-primary, #1E40AF)' }}
                                >
                                    {contact.phone!.trim()}
                                </a>
                            </div>
                        )}

                        {/* Campus Address Card */}
                        {hasAddress && (
                            <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50/50 p-6 text-center shadow-sm sm:col-span-2 lg:col-span-1">
                                <div
                                    className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm mb-4"
                                    style={{ backgroundColor: 'var(--school-primary, #1E40AF)' }}
                                    aria-hidden="true"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold text-gray-900">Campus Location</h3>
                                <p className="mt-2 text-sm text-gray-600">Administrative offices</p>
                                <address className="mt-4 not-italic text-sm text-gray-700 leading-relaxed">
                                    {contact.address!.trim()}
                                </address>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

