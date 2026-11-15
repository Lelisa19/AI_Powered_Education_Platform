import React from 'react';
import { Link } from 'react-router-dom';
import type { SchoolWebsiteConfig } from '../../types/website.types';
import { SchoolWebsiteLayout } from '../layout/SchoolWebsiteLayout';
import { SchoolAboutSection } from '../sections/SchoolAboutSection';
import { SchoolContactSection } from '../sections/SchoolContactSection';
import { SchoolHeroSection } from '../sections/SchoolHeroSection';
import { SchoolProgramsSection } from '../sections/SchoolProgramsSection';

interface WebsiteDraftPreviewPaneProps {
    config: SchoolWebsiteConfig;
    canAccessSchoolProfile: boolean;
    onOpenSchoolProfile?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export const WebsiteDraftPreviewPane: React.FC<WebsiteDraftPreviewPaneProps> = ({
    config,
    canAccessSchoolProfile,
    onOpenSchoolProfile,
}) => {
    const hasContactDetails = Boolean(
        config.contact.email ||
            config.contact.phone ||
            config.contact.address ||
            config.contact.city ||
            config.contact.country
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="font-semibold">
                        Authenticated Draft Preview (Private to School Admin Session)
                    </p>
                    <p className="mt-1">
                        Rendering your current local draft alongside authoritative School Identity,
                        Visual Branding, and Contact settings. Public visitors continue seeing
                        published content until you publish.
                        {!hasContactDetails &&
                            ' Contact details will populate in the Contact section and footer once configured in School Profile.'}
                    </p>
                </div>

                {canAccessSchoolProfile && (
                    <Link
                        to="/admin/profile"
                        onClick={onOpenSchoolProfile}
                        className="shrink-0 rounded-md border border-blue-300 bg-white px-3 py-1.5 font-medium text-blue-800 hover:bg-blue-100"
                    >
                        Edit Identity &amp; Branding
                    </Link>
                )}
            </div>

            <SchoolWebsiteLayout config={config} previewMode>
                <SchoolHeroSection hero={config.hero} previewMode />
                <SchoolAboutSection about={config.about} identity={config.identity} />
                <SchoolProgramsSection
                    programs={config.featuredPrograms}
                    heading={config.featuredProgramsHeading}
                />
                <SchoolContactSection contact={config.contact} identity={config.identity} />
            </SchoolWebsiteLayout>
        </div>
    );
};
