// frontend/src/modules/website-builder/types/website.types.ts

/**
 * Core school identity elements shown across the public website, headers, and metadata.
 */
export interface SchoolIdentity {
    name: string;
    logoUrl?: string;
    faviconUrl?: string;
}

/**
 * Visual branding colors applied to school website styling and theming.
 */
export interface SchoolBranding {
    primaryColor: string;
    secondaryColor?: string;
}

/**
 * Hero banner section content displayed on the public school landing page.
 */
export interface SchoolHeroSection {
    headline: string;
    subtitle?: string;
    imageUrl?: string;
}

/**
 * Informational section detailing the school's background, vision, and mission.
 */
export interface SchoolAboutSection {
    description: string;
    mission?: string;
}

/**
 * An individual academic program or course featured on the school's public website.
 */
export interface FeaturedProgram {
    id: string;
    title: string;
    description: string;
    category?: string;
    imageUrl?: string;
}

/**
 * Institution contact information for public inquiries and footer display.
 */
export interface SchoolContactInfo {
    email: string;
    phone?: string;
    address?: string;
}

/**
 * External social media profile links for the school.
 */
export interface SchoolSocialLinks {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
}

/**
 * Comprehensive public website configuration for an individual school tenant.
 * 
 * IMPORTANT ARCHITECTURAL NOTE:
 * Public student registration availability is intentionally NOT defined in this website
 * configuration model. The `allowsPublicRegistration` flag from `TenantProvider` remains
 * the single authoritative source of truth, determined strictly by verified backend tenant policy.
 */
export interface SchoolWebsiteConfig {
    identity: SchoolIdentity;
    branding: SchoolBranding;
    hero: SchoolHeroSection;
    about: SchoolAboutSection;
    featuredPrograms: FeaturedProgram[];
    contact: SchoolContactInfo;
    socialLinks?: SchoolSocialLinks;
}

