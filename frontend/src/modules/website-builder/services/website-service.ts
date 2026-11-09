// frontend/src/modules/website-builder/services/website-service.ts
import { apiClient } from '../../../services/api/api-client';
import type { SchoolWebsiteConfig } from '../types/website.types';

/**
 * Public API endpoint for retrieving the current school tenant's website configuration.
 * 
 * TENANT RESOLUTION CONTRACT:
 * - The backend MUST resolve the tenant identity strictly from the verified request host/domain
 *   (supplied via Host header or trusted proxy header like X-Requested-Tenant-Domain).
 * - Under NO circumstances should the client pass a query param or request body containing `tenantId`
 *   to determine or select the school.
 */
export const SCHOOL_WEBSITE_CONFIG_ENDPOINT = '/public/website-config';

/**
 * Fetches the public website configuration for the current school tenant.
 * 
 * This function communicates directly with the backend REST API via `apiClient`.
 * If the endpoint is unavailable or returns an error, the error is propagated to the caller.
 * No silent fallback or mock data injection is performed in production code paths.
 */
export async function getSchoolWebsiteConfig(): Promise<SchoolWebsiteConfig> {
    const response = await apiClient.get<SchoolWebsiteConfig>(SCHOOL_WEBSITE_CONFIG_ENDPOINT);
    return response.data;
}

/**
 * ============================================================================
 * DEVELOPMENT-ONLY MOCK DATA
 * ============================================================================
 * The data below is strictly for local frontend component prototyping and testing
 * before the backend `/public/website-config` endpoint is fully implemented.
 * 
 * WARNING:
 * - This mock data must NEVER be silently used as a fallback for failed API requests.
 * - This mock data does NOT control registration availability; public registration
 *   is strictly governed by `TenantProvider`'s `allowsPublicRegistration`.
 */
export const DEV_MOCK_SCHOOL_WEBSITE_CONFIG: Readonly<SchoolWebsiteConfig> = Object.freeze({
    identity: {
        name: 'Oakridge Academy',
        logoUrl: undefined,
        faviconUrl: undefined,
    },
    branding: {
        primaryColor: '#1E40AF', // Blue 800
        secondaryColor: '#3B82F6', // Blue 500
    },
    hero: {
        headline: 'Empowering Minds, Shaping the Future',
        subtitle: 'Experience world-class education with dedicated faculty and an innovative curriculum designed for tomorrow.',
        imageUrl: undefined,
    },
    about: {
        description: 'Oakridge Academy is committed to delivering holistic academic excellence and leadership development for all students.',
        mission: 'To foster intellectual curiosity, ethical character, and lifelong learning in a supportive global community.',
    },
    featuredPrograms: [
        {
            id: 'prog-1',
            title: 'Advanced STEM Curriculum',
            description: 'Comprehensive hands-on training in robotics, computer science, mathematics, and advanced physical sciences.',
            category: 'Science & Technology',
        },
        {
            id: 'prog-2',
            title: 'Humanities & Global Leadership',
            description: 'Cultivating critical thinking, rhetorical mastery, and international perspectives through immersive seminars.',
            category: 'Humanities',
        },
        {
            id: 'prog-3',
            title: 'Arts & Creative Expression',
            description: 'A vibrant arts program spanning visual arts, performance theater, and digital media production.',
            category: 'Fine Arts',
        },
    ],
    contact: {
        email: 'info@oakridge.edu',
        phone: '+1 (555) 234-5678',
        address: '124 Academic Way, Education District, Metropolis',
    },
    socialLinks: {
        facebook: 'https://facebook.com',
        twitter: 'https://twitter.com',
        linkedin: 'https://linkedin.com',
    },
});

