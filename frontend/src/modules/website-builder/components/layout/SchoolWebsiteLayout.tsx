import React, { type ReactNode } from 'react';
import { DEFAULT_SCHOOL_BRANDING } from '../../../../types/school.types';
import {
    getReadableContrastColor,
    hexToRgba,
    sanitizeBrandHexColor,
} from '../../../../utils/branding';
import { SchoolHeader } from './SchoolHeader';
import { SchoolFooter } from './SchoolFooter';
import type { SchoolWebsiteConfig } from '../../types/website.types';

export interface SchoolWebsiteLayoutProps {
    config: SchoolWebsiteConfig;
    children: ReactNode;
    previewMode?: boolean;
}

export const SchoolWebsiteLayout: React.FC<SchoolWebsiteLayoutProps> = ({
    config,
    children,
    previewMode = false,
}) => {
    // Sanitize and compute WCAG-accessible branding tokens with safe defaults
    const primaryColor =
        sanitizeBrandHexColor(config.branding?.primaryColor) ??
        DEFAULT_SCHOOL_BRANDING.primaryColor;
    const secondaryColor =
        sanitizeBrandHexColor(config.branding?.secondaryColor) ??
        DEFAULT_SCHOOL_BRANDING.secondaryColor;

    const brandStyle = {
        '--school-primary': primaryColor,
        '--school-primary-foreground': getReadableContrastColor(primaryColor),
        '--school-primary-soft': hexToRgba(primaryColor, 0.1),
        '--school-secondary': secondaryColor,
        '--school-secondary-foreground': getReadableContrastColor(secondaryColor),
    } as React.CSSProperties;

    return (
        <div
            data-website-preview-root={previewMode ? 'true' : undefined}
            className={`flex flex-col bg-gray-50 font-sans text-gray-900 ${
                previewMode
                    ? 'min-h-[640px] overflow-hidden rounded-lg border border-gray-200 shadow-inner'
                    : 'min-h-screen'
            }`}
            style={brandStyle}
        >
            <SchoolHeader identity={config.identity} previewMode={previewMode} />

            <main className="flex-1">
                {children}
            </main>

            <SchoolFooter
                identity={config.identity}
                contact={config.contact}
                socialLinks={config.socialLinks}
                previewMode={previewMode}
            />
        </div>
    );
};

