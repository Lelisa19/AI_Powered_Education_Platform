// frontend/src/modules/website-builder/pages/SchoolLandingPage.tsx
import React, { useState, useEffect } from 'react';
import type { SchoolWebsiteConfig } from '../types/website.types';
import { getSchoolWebsiteConfig } from '../services/website-service';
import { SchoolWebsiteLayout } from '../components/layout/SchoolWebsiteLayout';
import { SchoolHeroSection } from '../components/sections/SchoolHeroSection';
import { SchoolAboutSection } from '../components/sections/SchoolAboutSection';
import { SchoolProgramsSection } from '../components/sections/SchoolProgramsSection';
import { SchoolContactSection } from '../components/sections/SchoolContactSection';

export const SchoolLandingPage: React.FC = () => {
    const [config, setConfig] = useState<SchoolWebsiteConfig | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [hasError, setHasError] = useState<boolean>(false);
    const [retryTrigger, setRetryTrigger] = useState<number>(0);

    useEffect(() => {
        let isMounted = true;

        const loadConfig = async () => {
            try {
                const data = await getSchoolWebsiteConfig();
                if (isMounted) {
                    setConfig(data);
                    setHasError(false);
                    setIsLoading(false);
                }
            } catch {
                if (isMounted) {
                    setConfig(null);
                    setHasError(true);
                    setIsLoading(false);
                }
            }
        };

        loadConfig();

        return () => {
            isMounted = false;
        };
    }, [retryTrigger]);

    const handleRetry = () => {
        setIsLoading(true);
        setHasError(false);
        setRetryTrigger(prev => prev + 1);
    };

    // 1. Loading State
    if (isLoading) {
        return (
            <div
                className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center"
                role="status"
                aria-live="polite"
                aria-label="Loading school website"
            >
                <div className="relative mb-6">
                    <div
                        className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin"
                        aria-hidden="true"
                    />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                    Loading School Website...
                </h1>
                <p className="mt-2 text-sm text-gray-500 max-w-sm">
                    Please wait while we prepare the institution&apos;s public portal.
                </p>
            </div>
        );
    }

    // 2. Error and Unavailable State
    if (hasError || !config) {
        return (
            <div
                className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-16 text-center"
                role="alert"
                aria-live="assertive"
            >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-6 shadow-sm ring-1 ring-amber-200">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    School Website Unavailable
                </h1>
                <p className="mt-3 text-base text-gray-600 max-w-md">
                    This school&apos;s public website is currently unavailable or still completing initial setup. Please check back shortly or try reloading the page.
                </p>
                <div className="mt-8">
                    <button
                        type="button"
                        onClick={handleRetry}
                        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // 3. Successful Page Composition
    return (
        <SchoolWebsiteLayout config={config}>
            <SchoolHeroSection hero={config.hero} />
            <SchoolAboutSection about={config.about} identity={config.identity} />
            <SchoolProgramsSection programs={config.featuredPrograms} />
            <SchoolContactSection contact={config.contact} identity={config.identity} />
        </SchoolWebsiteLayout>
    );
};

export default SchoolLandingPage;
