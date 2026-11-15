import React from 'react';
import { DashboardOverviewCard } from '../../../../components/Dashboards/DashboardOverviewCard';
import { SUPPORTED_SOCIAL_PLATFORMS, WEBSITE_CMS_LIMITS } from '../../schemas/website-cms-schema';
import type {
    SocialPlatformKey,
    WebsiteCmsFormValues,
    WebsiteCmsValidationErrors,
} from '../../types/website.types';

interface WebsiteSocialLinksEditorProps {
    values: WebsiteCmsFormValues;
    errors: WebsiteCmsValidationErrors;
    disabled: boolean;
    onAddSocialLink: () => void;
    onChangePlatform: (currentPlatform: SocialPlatformKey, nextPlatform: SocialPlatformKey) => void;
    onUpdateUrl: (platform: SocialPlatformKey, url: string) => void;
    onRemoveSocialLink: (platform: SocialPlatformKey) => void;
}

export const WebsiteSocialLinksEditor: React.FC<WebsiteSocialLinksEditorProps> = ({
    values,
    errors,
    disabled,
    onAddSocialLink,
    onChangePlatform,
    onUpdateUrl,
    onRemoveSocialLink,
}) => {
    const usedPlatforms = new Set(values.socialLinks.map((item) => item.platform));
    const canAddMore =
        !disabled && values.socialLinks.length < SUPPORTED_SOCIAL_PLATFORMS.length;

    return (
        <DashboardOverviewCard title="Official Social Media Links">
            <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-600">
                        Link official school social profiles shown in the public website footer.
                        Only credential-free <code>https://</code> URLs are accepted.
                    </p>

                    <button
                        type="button"
                        disabled={!canAddMore}
                        onClick={onAddSocialLink}
                        className="shrink-0 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        + Add Social Link
                    </button>
                </div>

                {values.socialLinks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                        <p className="text-sm font-medium text-gray-700">
                            No social media links configured.
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            Add your school&apos;s Facebook, Twitter / X, Instagram, LinkedIn, or
                            YouTube page.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {values.socialLinks.map((entry) => {
                            const platformMeta = SUPPORTED_SOCIAL_PLATFORMS.find(
                                (item) => item.key === entry.platform
                            );
                            const errorMsg = errors.socialLinks?.[entry.platform];

                            return (
                                <div
                                    key={entry.platform}
                                    className="rounded-lg border border-gray-200 bg-gray-50/70 p-4"
                                >
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-start">
                                        <div className="sm:col-span-4">
                                            <label
                                                htmlFor={`social-platform-${entry.platform}`}
                                                className="block text-xs font-medium text-gray-700"
                                            >
                                                Platform
                                            </label>
                                            <select
                                                id={`social-platform-${entry.platform}`}
                                                disabled={disabled}
                                                value={entry.platform}
                                                onChange={(e) =>
                                                    onChangePlatform(
                                                        entry.platform,
                                                        e.target.value as SocialPlatformKey
                                                    )
                                                }
                                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                                            >
                                                {SUPPORTED_SOCIAL_PLATFORMS.map((option) => {
                                                    const isTaken =
                                                        option.key !== entry.platform &&
                                                        usedPlatforms.has(option.key);
                                                    return (
                                                        <option
                                                            key={option.key}
                                                            value={option.key}
                                                            disabled={isTaken}
                                                        >
                                                            {option.label}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        <div className="sm:col-span-6">
                                            <label
                                                htmlFor={`social-url-${entry.platform}`}
                                                className="block text-xs font-medium text-gray-700"
                                            >
                                                Profile URL (HTTPS) <span className="text-red-600">*</span>
                                            </label>
                                            <input
                                                id={`social-url-${entry.platform}`}
                                                type="url"
                                                disabled={disabled}
                                                value={entry.url}
                                                maxLength={WEBSITE_CMS_LIMITS.SOCIAL_URL_MAX}
                                                onChange={(e) =>
                                                    onUpdateUrl(entry.platform, e.target.value)
                                                }
                                                placeholder={
                                                    platformMeta?.placeholder ?? 'https://...'
                                                }
                                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                                            />
                                            {errorMsg && (
                                                <p role="alert" className="mt-1 text-xs text-red-600">
                                                    {errorMsg}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex sm:col-span-2 sm:justify-end sm:pt-6">
                                            <button
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => onRemoveSocialLink(entry.platform)}
                                                aria-label={`Remove ${platformMeta?.label ?? entry.platform} social link`}
                                                className="w-full rounded border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardOverviewCard>
    );
};

