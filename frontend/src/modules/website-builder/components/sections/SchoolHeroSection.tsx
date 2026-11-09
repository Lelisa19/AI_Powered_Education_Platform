// frontend/src/modules/website-builder/components/sections/SchoolHeroSection.tsx
import React, { useState } from 'react';
import type { SchoolHeroSection as SchoolHeroSectionData } from '../../types/website.types';

export interface SchoolHeroSectionProps {
    hero: SchoolHeroSectionData;
}

export const SchoolHeroSection: React.FC<SchoolHeroSectionProps> = ({ hero }) => {
    const [imageError, setImageError] = useState(false);
    const hasImage = Boolean(hero.imageUrl && hero.imageUrl.trim() !== '' && !imageError);
    const hasSubtitle = Boolean(hero.subtitle && hero.subtitle.trim() !== '');

    return (
        <section
            id="home"
            className="scroll-mt-20 relative overflow-hidden bg-gradient-to-b from-white to-gray-50 py-16 sm:py-24 lg:py-28"
            aria-label="Welcome and Overview"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`grid gap-12 items-center ${hasImage ? 'lg:grid-cols-2' : 'max-w-4xl mx-auto text-center'}`}>
                    {/* Hero Text Content */}
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl leading-tight">
                            {hero.headline}
                        </h1>

                        {hasSubtitle && (
                            <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl">
                                {hero.subtitle}
                            </p>
                        )}

                        {/* In-page public navigation actions */}
                        <div className={`mt-8 flex flex-wrap gap-4 ${hasImage ? '' : 'justify-center'}`}>
                            <a
                                href="#programs"
                                className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold text-white shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2"
                                style={{ backgroundColor: 'var(--school-primary, #1E40AF)' }}
                            >
                                Explore Programs
                            </a>
                            <a
                                href="#about"
                                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                            >
                                Learn More
                            </a>
                        </div>
                    </div>

                    {/* Hero Image (if available and loaded successfully) */}
                    {hasImage && (
                        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
                            <div className="overflow-hidden rounded-2xl shadow-xl ring-1 ring-gray-900/10 aspect-[4/3] bg-gray-100">
                                <img
                                    src={hero.imageUrl!.trim()}
                                    alt={hero.headline}
                                    className="h-full w-full object-cover"
                                    onError={() => setImageError(true)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

