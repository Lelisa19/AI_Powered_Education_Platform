import React, { type ReactNode } from 'react';
import { SchoolHeader } from './SchoolHeader';
import { SchoolFooter } from './SchoolFooter';
import type { SchoolWebsiteConfig } from '../../types/website.types';

export interface SchoolWebsiteLayoutProps {
    config: SchoolWebsiteConfig;
    children: ReactNode;
}

export const SchoolWebsiteLayout: React.FC<SchoolWebsiteLayoutProps> = ({ config, children }) => {
    // Safe fallback branding colors if optional branding is omitted or invalid
    const primaryColor = config.branding?.primaryColor?.trim() || '#1E40AF';
    const secondaryColor = config.branding?.secondaryColor?.trim() || '#3B82F6';

    const brandStyle = {
        '--school-primary': primaryColor,
        '--school-secondary': secondaryColor,
    } as React.CSSProperties;

    return (
        <div
            className="flex min-h-screen flex-col bg-gray-50 text-gray-900 font-sans"
            style={brandStyle}
        >
            <SchoolHeader identity={config.identity} />

            <main className="flex-1">
                {children}
            </main>

            <SchoolFooter
                identity={config.identity}
                contact={config.contact}
                socialLinks={config.socialLinks}
            />
        </div>
    );
};

