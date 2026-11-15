import React, { useState } from 'react';
import { DashboardOverviewCard } from '../../../../components/Dashboards/DashboardOverviewCard';
import { sanitizeSchoolAssetUrl } from '../../../../utils/branding';
import { WEBSITE_CMS_LIMITS } from '../../schemas/website-cms-schema';
import type { WebsiteCmsFormValues, WebsiteCmsValidationErrors } from '../../types/website.types';

interface WebsiteHeroEditorProps {
    values: WebsiteCmsFormValues;
    errors: WebsiteCmsValidationErrors;
    disabled: boolean;
    onFieldChange: (
        field: 'heroHeadline' | 'heroSubtitle' | 'heroCtaText' | 'heroCtaUrl' | 'heroImageUrl',
        value: string
    ) => void;
}

export const WebsiteHeroEditor: React.FC<WebsiteHeroEditorProps> = ({
    values,
    errors,
    disabled,
    onFieldChange,
}) => {
    const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
    const sanitizedPreviewUrl = sanitizeSchoolAssetUrl(values.heroImageUrl);
    const showThumbnail = Boolean(sanitizedPreviewUrl && failedImageUrl !== sanitizedPreviewUrl);

    return (
        <DashboardOverviewCard title="Hero Banner Content">
            <div className="space-y-5">
                <p className="text-sm text-gray-600">
                    Configure the headline banner, call-to-action button, and optional hero visual
                    visitors first see on your school&apos;s public landing page.
                </p>

                <div>
                    <label
                        htmlFor="cms-hero-headline"
                        className="block text-sm font-medium text-gray-800"
                    >
                        Main Heading <span className="text-red-600">*</span>
                    </label>
                    <input
                        id="cms-hero-headline"
                        type="text"
                        disabled={disabled}
                        value={values.heroHeadline}
                        maxLength={WEBSITE_CMS_LIMITS.HERO_HEADLINE_MAX}
                        onChange={(e) => onFieldChange('heroHeadline', e.target.value)}
                        placeholder="e.g., Empowering Minds, Shaping Tomorrow"
                        className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                        <span>
                            {errors.heroHeadline ? (
                                <span role="alert" className="text-red-600">
                                    {errors.heroHeadline}
                                </span>
                            ) : (
                                'Clear, concise headline for prospective students and families.'
                            )}
                        </span>
                        <span>
                            {values.heroHeadline.length}/{WEBSITE_CMS_LIMITS.HERO_HEADLINE_MAX}
                        </span>
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="cms-hero-subtitle"
                        className="block text-sm font-medium text-gray-800"
                    >
                        Supporting Description
                    </label>
                    <textarea
                        id="cms-hero-subtitle"
                        rows={3}
                        disabled={disabled}
                        value={values.heroSubtitle}
                        maxLength={WEBSITE_CMS_LIMITS.HERO_SUBTITLE_MAX}
                        onChange={(e) => onFieldChange('heroSubtitle', e.target.value)}
                        placeholder="Brief welcome summary highlighting your educational approach and community."
                        className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                        <span>
                            {errors.heroSubtitle ? (
                                <span role="alert" className="text-red-600">
                                    {errors.heroSubtitle}
                                </span>
                            ) : (
                                'Optional subtitle displayed beneath the main heading.'
                            )}
                        </span>
                        <span>
                            {values.heroSubtitle.length}/{WEBSITE_CMS_LIMITS.HERO_SUBTITLE_MAX}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-md border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="cms-hero-cta-text"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Primary CTA Label (Optional)
                        </label>
                        <input
                            id="cms-hero-cta-text"
                            type="text"
                            disabled={disabled}
                            value={values.heroCtaText}
                            maxLength={WEBSITE_CMS_LIMITS.HERO_CTA_TEXT_MAX}
                            onChange={(e) => onFieldChange('heroCtaText', e.target.value)}
                            placeholder="e.g., Explore Programs (default)"
                            className="mt-1.5 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                        {errors.heroCtaText && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {errors.heroCtaText}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="cms-hero-cta-url"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Primary CTA Destination (Optional)
                        </label>
                        <input
                            id="cms-hero-cta-url"
                            type="text"
                            disabled={disabled}
                            value={values.heroCtaUrl}
                            maxLength={WEBSITE_CMS_LIMITS.HERO_CTA_URL_MAX}
                            onChange={(e) => onFieldChange('heroCtaUrl', e.target.value)}
                            placeholder="e.g., #programs, /register, or https://..."
                            className="mt-1.5 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                        {errors.heroCtaUrl ? (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {errors.heroCtaUrl}
                            </p>
                        ) : (
                            <p className="mt-1 text-xs text-gray-500">
                                Leave both CTA fields blank to use &ldquo;Explore Programs&rdquo; (<code>#programs</code>).
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="cms-hero-image-url"
                        className="block text-sm font-medium text-gray-800"
                    >
                        Hero Image URL (Optional)
                    </label>
                    <input
                        id="cms-hero-image-url"
                        type="url"
                        disabled={disabled}
                        value={values.heroImageUrl}
                        maxLength={WEBSITE_CMS_LIMITS.IMAGE_URL_MAX}
                        onChange={(e) => onFieldChange('heroImageUrl', e.target.value)}
                        placeholder="https://cdn.example.edu/campus-hero.jpg"
                        className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    {errors.heroImageUrl ? (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {errors.heroImageUrl}
                        </p>
                    ) : (
                        <p className="mt-1 text-xs text-gray-500">
                            Supports HTTPS image URLs or safe root-relative paths (e.g., <code>/assets/hero.jpg</code>).
                        </p>
                    )}

                    {showThumbnail && sanitizedPreviewUrl && (
                        <div className="mt-3 flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-2.5">
                            <img
                                src={sanitizedPreviewUrl}
                                alt="Hero banner preview thumbnail"
                                onError={() => setFailedImageUrl(sanitizedPreviewUrl)}
                                className="h-16 w-24 rounded object-cover"
                            />
                            <div className="min-w-0 flex-1 text-xs text-gray-600">
                                <p className="font-medium text-gray-800">Hero image preview loaded</p>
                                <p className="truncate">{sanitizedPreviewUrl}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardOverviewCard>
    );
};

