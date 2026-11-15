// frontend/src/modules/website-builder/types/website.types.ts
import type {
    SchoolBranding,
    SchoolContactDetails,
    SchoolIdentity,
} from '../../../types/school.types';

export type { SchoolBranding, SchoolIdentity };

/**
 * Hero banner section content displayed on the public school landing page.
 */
export interface SchoolHeroSection {
    headline: string;
    subtitle?: string;
    ctaText?: string;
    ctaUrl?: string;
    imageUrl?: string;
}

/**
 * Informational section detailing the school's background and mission.
 */
export interface SchoolAboutSection {
    heading?: string;
    description: string;
    mission?: string;
}

/**
 * An individual academic program or course highlight presented on the school's public website.
 * Presentation content only; authoritative academic structures live in Academic Management.
 */
export interface FeaturedProgram {
    id: string;
    title: string;
    description: string;
    category?: string;
    imageUrl?: string;
}

/**
 * Public-facing subset of the authoritative school contact details.
 */
export type SchoolContactInfo = Pick<
    SchoolContactDetails,
    'email' | 'phone' | 'address' | 'city' | 'country'
>;

export type SocialPlatformKey = 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube';

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
 * - `identity`, `branding`, and `contact` reflect the single authoritative school identity,
 *   branding, and contact contracts defined in `types/school.types.ts` (Step 5.4).
 * - Public student registration availability is intentionally NOT defined in this website
 *   configuration model. The `allowsPublicRegistration` flag from `TenantProvider` remains
 *   the single authoritative source of truth, determined strictly by verified backend tenant policy.
 */
export interface SchoolWebsiteConfig {
    identity: SchoolIdentity;
    branding: SchoolBranding;
    hero: SchoolHeroSection;
    about: SchoolAboutSection;
    featuredProgramsHeading?: string;
    featuredPrograms: FeaturedProgram[];
    contact: SchoolContactInfo;
    socialLinks?: SchoolSocialLinks;
}

/**
 * Editable public landing page sections managed in the School Website CMS.
 * Excludes canonical school identity, branding, and contact fields managed in Step 5.4.
 */
export interface SchoolWebsiteEditableContent {
    hero: SchoolHeroSection;
    about: SchoolAboutSection;
    featuredProgramsHeading?: string;
    featuredPrograms: FeaturedProgram[];
    socialLinks?: SchoolSocialLinks;
}

export type WebsitePublicationStatus = 'UNPUBLISHED' | 'PUBLISHED' | 'DRAFT_CHANGES';

export interface WebsiteAuditUser {
    id: string;
    name?: string | null;
    email?: string | null;
}

/**
 * Optional read-only canonical identity/branding/contact snapshot supplied alongside CMS
 * state for preview fidelity; never mutated by CMS endpoints.
 */
export interface WebsiteCanonicalPreviewSnapshot {
    identity?: Partial<SchoolIdentity>;
    branding?: Partial<SchoolBranding>;
    contact?: Partial<SchoolContactInfo>;
}

export interface SchoolWebsiteCmsState {
    tenantId: string;
    publicationStatus: WebsitePublicationStatus;
    hasUnpublishedChanges: boolean;
    draft: SchoolWebsiteEditableContent;
    published: SchoolWebsiteEditableContent | null;
    lastDraftSavedAt?: string | null;
    lastDraftSavedBy?: WebsiteAuditUser | null;
    publishedAt?: string | null;
    publishedBy?: WebsiteAuditUser | null;
    canonicalPreview?: WebsiteCanonicalPreviewSnapshot;
}

export type SaveWebsiteDraftRequest = SchoolWebsiteEditableContent;

export interface SaveWebsiteDraftResponse {
    website: SchoolWebsiteCmsState;
    message?: string;
}

export interface PublishWebsiteRequest {
    draft?: SchoolWebsiteEditableContent;
}

export interface PublishWebsiteResponse {
    website: SchoolWebsiteCmsState;
    message?: string;
}

export type WebsiteCmsSectionId = 'hero' | 'about' | 'programs' | 'social';

export interface FeaturedProgramFormItem {
    id: string;
    title: string;
    description: string;
    category: string;
    imageUrl: string;
}

export interface SocialLinkFormItem {
    platform: SocialPlatformKey;
    url: string;
}

export interface WebsiteCmsFormValues {
    heroHeadline: string;
    heroSubtitle: string;
    heroCtaText: string;
    heroCtaUrl: string;
    heroImageUrl: string;
    aboutHeading: string;
    aboutDescription: string;
    aboutMission: string;
    featuredProgramsHeading: string;
    featuredPrograms: FeaturedProgramFormItem[];
    socialLinks: SocialLinkFormItem[];
}

export interface FeaturedProgramFieldErrors {
    title?: string;
    description?: string;
    category?: string;
    imageUrl?: string;
}

export interface WebsiteCmsValidationErrors {
    heroHeadline?: string;
    heroSubtitle?: string;
    heroCtaText?: string;
    heroCtaUrl?: string;
    heroImageUrl?: string;
    aboutHeading?: string;
    aboutDescription?: string;
    aboutMission?: string;
    featuredProgramsHeading?: string;
    featuredProgramsLimit?: string;
    programItems?: Record<string, FeaturedProgramFieldErrors>;
    socialLinks?: Partial<Record<SocialPlatformKey, string>>;
}
