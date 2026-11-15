import React from 'react';
import { DashboardOverviewCard } from '../../../../components/Dashboards/DashboardOverviewCard';
import { WEBSITE_CMS_LIMITS } from '../../schemas/website-cms-schema';
import type { WebsiteCmsFormValues, WebsiteCmsValidationErrors } from '../../types/website.types';

interface WebsiteAboutEditorProps {
    schoolName: string;
    values: WebsiteCmsFormValues;
    errors: WebsiteCmsValidationErrors;
    disabled: boolean;
    onFieldChange: (
        field: 'aboutHeading' | 'aboutDescription' | 'aboutMission',
        value: string
    ) => void;
}

export const WebsiteAboutEditor: React.FC<WebsiteAboutEditorProps> = ({
    schoolName,
    values,
    errors,
    disabled,
    onFieldChange,
}) => {
    return (
        <DashboardOverviewCard title="About & Mission Content">
            <div className="space-y-5">
                <p className="text-sm text-gray-600">
                    Share your school&apos;s story, educational philosophy, and mission statement.
                </p>

                <div>
                    <label
                        htmlFor="cms-about-heading"
                        className="block text-sm font-medium text-gray-800"
                    >
                        Section Heading (Optional)
                    </label>
                    <input
                        id="cms-about-heading"
                        type="text"
                        disabled={disabled}
                        value={values.aboutHeading}
                        maxLength={WEBSITE_CMS_LIMITS.ABOUT_HEADING_MAX}
                        onChange={(e) => onFieldChange('aboutHeading', e.target.value)}
                        placeholder={`About ${schoolName}`}
                        className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                        <span>
                            {errors.aboutHeading ? (
                                <span role="alert" className="text-red-600">
                                    {errors.aboutHeading}
                                </span>
                            ) : (
                                `Leave blank to display "About ${schoolName}".`
                            )}
                        </span>
                        <span>
                            {values.aboutHeading.length}/{WEBSITE_CMS_LIMITS.ABOUT_HEADING_MAX}
                        </span>
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="cms-about-description"
                        className="block text-sm font-medium text-gray-800"
                    >
                        School Introduction <span className="text-red-600">*</span>
                    </label>
                    <textarea
                        id="cms-about-description"
                        rows={6}
                        disabled={disabled}
                        value={values.aboutDescription}
                        maxLength={WEBSITE_CMS_LIMITS.ABOUT_DESCRIPTION_MAX}
                        onChange={(e) => onFieldChange('aboutDescription', e.target.value)}
                        placeholder="Describe your school's history, campus culture, faculty approach, and commitment to student success. Separate paragraphs with blank lines."
                        className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                        <span>
                            {errors.aboutDescription ? (
                                <span role="alert" className="text-red-600">
                                    {errors.aboutDescription}
                                </span>
                            ) : (
                                'Line breaks create structured paragraphs on the public page.'
                            )}
                        </span>
                        <span>
                            {values.aboutDescription.length}/{WEBSITE_CMS_LIMITS.ABOUT_DESCRIPTION_MAX}
                        </span>
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="cms-about-mission"
                        className="block text-sm font-medium text-gray-800"
                    >
                        Mission Statement Callout (Optional)
                    </label>
                    <textarea
                        id="cms-about-mission"
                        rows={3}
                        disabled={disabled}
                        value={values.aboutMission}
                        maxLength={WEBSITE_CMS_LIMITS.ABOUT_MISSION_MAX}
                        onChange={(e) => onFieldChange('aboutMission', e.target.value)}
                        placeholder="To foster intellectual curiosity, ethical character, and lifelong learning..."
                        className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                        <span>
                            {errors.aboutMission ? (
                                <span role="alert" className="text-red-600">
                                    {errors.aboutMission}
                                </span>
                            ) : (
                                'Highlighted as an accent blockquote card below your introduction.'
                            )}
                        </span>
                        <span>
                            {values.aboutMission.length}/{WEBSITE_CMS_LIMITS.ABOUT_MISSION_MAX}
                        </span>
                    </div>
                </div>
            </div>
        </DashboardOverviewCard>
    );
};

