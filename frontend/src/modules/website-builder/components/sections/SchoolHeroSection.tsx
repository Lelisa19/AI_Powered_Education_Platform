// frontend/src/modules/website-builder/components/sections/SchoolHeroSection.tsx
import React, { useState } from 'react';
import { sanitizeSchoolAssetUrl, sanitizeWebsiteCtaUrl } from '../../../../utils/branding';
import type { SchoolHeroSection as SchoolHeroSectionData } from '../../types/website.types';

export interface SchoolHeroSectionProps {
    hero: SchoolHeroSectionData;
    previewMode?: boolean;
}

export const SchoolHeroSection: React.FC<SchoolHeroSectionProps> = ({
    hero,
    previewMode = false,
}) => {
    const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
    const sanitizedImageUrl = sanitizeSchoolAssetUrl(hero.imageUrl);
    const hasImage = Boolean(sanitizedImageUrl && failedImageUrl !== sanitizedImageUrl);
    const hasSubtitle = Boolean(hero.subtitle && hero.subtitle.trim() !== '');
    const headlineText =
        hero.headline && hero.headline.trim() !== ''
            ? hero.headline.trim()
            : 'Welcome to Our School';

    const customCtaUrl = sanitizeWebsiteCtaUrl(hero.ctaUrl);
    const customCtaText = hero.ctaText?.trim();
    const primaryCtaLabel = customCtaText && customCtaUrl ? customCtaText : 'Explore Programs';
    const primaryCtaHref = customCtaText && customCtaUrl ? customCtaUrl : '#programs';
    const isExternalCta = primaryCtaHref.startsWith('https://');

    const handleCtaClick = (
        event: React.MouseEvent<HTMLAnchorElement>,
        href: string
    ) => {
        if (!previewMode) return;

        if (href.startsWith('#')) {
            event.preventDefault();
            const root = event.currentTarget.closest('[data-website-preview-root="true"]');
            const target = root?.querySelector(href);
            if (target && typeof target.scrollIntoView === 'function') {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            return;
        }

        event.preventDefault();
    };

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
                            {headlineText}
                        </h1>

                        {hasSubtitle && (
                            <p className={`mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl ${hasImage ? '' : 'mx-auto'}`}>
                                {hero.subtitle!.trim()}
                            </p>
                        )}

                        {/* In-page or configured CTA navigation actions */}
                        <div className={`mt-8 flex flex-wrap gap-4 ${hasImage ? '' : 'justify-center'}`}>
                            <a
                                href={primaryCtaHref}
                                target={isExternalCta ? '_blank' : undefined}
                                rel={isExternalCta ? 'noopener noreferrer' : undefined}
                                onClick={(e) => handleCtaClick(e, primaryCtaHref)}
                                title={
                                    previewMode && !primaryCtaHref.startsWith('#')
                                        ? `CTA destination preview: ${primaryCtaHref}`
                                        : undefined
                                }
                                className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2"
                                style={{
                                    backgroundColor: 'var(--school-primary, #1E40AF)',
                                    color: 'var(--school-primary-foreground, #FFFFFF)',
                                }}
                            >
                                {primaryCtaLabel}
                            </a>
                            <a
                                href="#about"
                                onClick={(e) => handleCtaClick(e, '#about')}
                                className="inline-flex items-center justify-center rounded-lg border-2 bg-white px-6 py-3 text-base font-semibold text-gray-800 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                                style={{ borderColor: 'var(--school-secondary, #3B82F6)' }}
                            >
                                Learn More
                            </a>
                        </div>
                    </div>

                    {/* Hero Image (if valid and loaded successfully) */}
                    {hasImage && sanitizedImageUrl && (
                        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
                            <div className="overflow-hidden rounded-2xl shadow-xl ring-1 ring-gray-900/10 aspect-[4/3] bg-gray-100">
                                <img
                                    src={sanitizedImageUrl}
                                    alt={headlineText}
                                    className="h-full w-full object-cover"
                                    onError={() => setFailedImageUrl(sanitizedImageUrl)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

