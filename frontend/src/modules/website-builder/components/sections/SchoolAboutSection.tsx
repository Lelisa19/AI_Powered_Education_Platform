// frontend/src/modules/website-builder/components/sections/SchoolAboutSection.tsx
import React from 'react';
import type { SchoolAboutSection as SchoolAboutSectionData, SchoolIdentity } from '../../types/website.types';

export interface SchoolAboutSectionProps {
    about: SchoolAboutSectionData;
    identity?: SchoolIdentity;
}

export const SchoolAboutSection: React.FC<SchoolAboutSectionProps> = ({ about, identity }) => {
    const hasMission = Boolean(about.mission && about.mission.trim().length > 0);
    const sectionTitle = identity?.name ? `About ${identity.name}` : 'About Our School';

    return (
        <section
            id="about"
            className="scroll-mt-20 bg-white py-16 sm:py-20 lg:py-24 border-t border-gray-100"
            aria-labelledby="about-heading"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <h2
                        id="about-heading"
                        className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
                    >
                        {sectionTitle}
                    </h2>
                    <div
                        className="mx-auto mt-4 h-1 w-16 rounded-full"
                        style={{ backgroundColor: 'var(--school-primary, #1E40AF)' }}
                        aria-hidden="true"
                    />
                </div>

                <div className="mx-auto mt-12 max-w-4xl space-y-8">
                    {/* Primary School Description */}
                    <div className="text-base sm:text-lg text-gray-700 leading-relaxed space-y-4">
                        {about.description
                            .split('\n')
                            .filter(paragraph => paragraph.trim().length > 0)
                            .map((paragraph, index) => (
                                <p key={index}>{paragraph.trim()}</p>
                            ))}
                    </div>

                    {/* Optional Mission Statement Callout */}
                    {hasMission && (
                        <div
                            className="relative overflow-hidden rounded-xl border-l-4 bg-gray-50 p-6 sm:p-8 shadow-sm"
                            style={{ borderLeftColor: 'var(--school-primary, #1E40AF)' }}
                        >
                            <h3
                                className="text-sm font-semibold uppercase tracking-wider"
                                style={{ color: 'var(--school-primary, #1E40AF)' }}
                            >
                                Our Mission
                            </h3>
                            <blockquote className="mt-2 text-lg sm:text-xl font-medium italic text-gray-900 leading-relaxed">
                                &ldquo;{about.mission!.trim()}&rdquo;
                            </blockquote>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

