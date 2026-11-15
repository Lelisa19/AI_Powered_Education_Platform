import type { ValidationErrors } from '../../../services/api/api-error';
import {
    sanitizeSchoolAssetUrl,
    sanitizeStrictHttpsUrl,
    sanitizeWebsiteCtaUrl,
} from '../../../utils/branding';
import type {
    FeaturedProgram,
    FeaturedProgramFieldErrors,
    FeaturedProgramFormItem,
    SchoolSocialLinks,
    SchoolWebsiteEditableContent,
    SocialLinkFormItem,
    SocialPlatformKey,
    WebsiteCmsFormValues,
    WebsiteCmsSectionId,
    WebsiteCmsValidationErrors,
} from '../types/website.types';

export const WEBSITE_CMS_LIMITS = {
    HERO_HEADLINE_MIN: 3,
    HERO_HEADLINE_MAX: 140,
    HERO_SUBTITLE_MAX: 500,
    HERO_CTA_TEXT_MAX: 60,
    HERO_CTA_URL_MAX: 500,
    IMAGE_URL_MAX: 2048,
    ABOUT_HEADING_MAX: 120,
    ABOUT_DESCRIPTION_MIN: 10,
    ABOUT_DESCRIPTION_MAX: 3000,
    ABOUT_MISSION_MAX: 600,
    PROGRAMS_HEADING_MAX: 120,
    MAX_FEATURED_PROGRAMS: 12,
    PROGRAM_TITLE_MIN: 2,
    PROGRAM_TITLE_MAX: 100,
    PROGRAM_DESCRIPTION_MIN: 5,
    PROGRAM_DESCRIPTION_MAX: 500,
    PROGRAM_CATEGORY_MAX: 60,
    SOCIAL_URL_MAX: 500,
} as const;

export interface SocialPlatformMeta {
    key: SocialPlatformKey;
    label: string;
    placeholder: string;
}

export const SUPPORTED_SOCIAL_PLATFORMS: readonly SocialPlatformMeta[] = [
    { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourschool' },
    { key: 'twitter', label: 'Twitter / X', placeholder: 'https://twitter.com/yourschool' },
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourschool' },
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/school/yourschool' },
    { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourschool' },
];

const SOCIAL_PLATFORM_KEYS = SUPPORTED_SOCIAL_PLATFORMS.map((item) => item.key);
const SOCIAL_PLATFORM_SET = new Set<string>(SOCIAL_PLATFORM_KEYS);

export function isSocialPlatformKey(value: unknown): value is SocialPlatformKey {
    return typeof value === 'string' && SOCIAL_PLATFORM_SET.has(value);
}

function normalizeOptionalString(raw: string): string | undefined {
    const trimmed = raw.trim();
    return trimmed === '' ? undefined : trimmed;
}

export function createEmptyWebsiteCmsFormValues(): WebsiteCmsFormValues {
    return {
        heroHeadline: '',
        heroSubtitle: '',
        heroCtaText: '',
        heroCtaUrl: '',
        heroImageUrl: '',
        aboutHeading: '',
        aboutDescription: '',
        aboutMission: '',
        featuredProgramsHeading: '',
        featuredPrograms: [],
        socialLinks: [],
    };
}

export function createEmptyEditableContent(): SchoolWebsiteEditableContent {
    return {
        hero: {
            headline: '',
        },
        about: {
            description: '',
        },
        featuredPrograms: [],
    };
}

export function toWebsiteCmsFormValues(
    content: SchoolWebsiteEditableContent
): WebsiteCmsFormValues {
    const socialLinks: SocialLinkFormItem[] = [];
    for (const platform of SOCIAL_PLATFORM_KEYS) {
        const url = content.socialLinks?.[platform];
        if (typeof url === 'string' && url.trim() !== '') {
            socialLinks.push({
                platform,
                url: url.trim(),
            });
        }
    }

    return {
        heroHeadline: content.hero.headline ?? '',
        heroSubtitle: content.hero.subtitle ?? '',
        heroCtaText: content.hero.ctaText ?? '',
        heroCtaUrl: content.hero.ctaUrl ?? '',
        heroImageUrl: content.hero.imageUrl ?? '',
        aboutHeading: content.about.heading ?? '',
        aboutDescription: content.about.description ?? '',
        aboutMission: content.about.mission ?? '',
        featuredProgramsHeading: content.featuredProgramsHeading ?? '',
        featuredPrograms: content.featuredPrograms.map((program) => ({
            id: program.id,
            title: program.title,
            description: program.description,
            category: program.category ?? '',
            imageUrl: program.imageUrl ?? '',
        })),
        socialLinks,
    };
}

export function normalizeWebsiteCmsFormToContent(
    values: WebsiteCmsFormValues
): SchoolWebsiteEditableContent {
    const featuredPrograms: FeaturedProgram[] = values.featuredPrograms.map((item) => {
        const category = normalizeOptionalString(item.category);
        const sanitizedImageUrl = normalizeOptionalString(item.imageUrl)
            ? sanitizeSchoolAssetUrl(item.imageUrl) ?? undefined
            : undefined;

        return {
            id: item.id,
            title: item.title.trim(),
            description: item.description.trim(),
            ...(category ? { category } : {}),
            ...(sanitizedImageUrl ? { imageUrl: sanitizedImageUrl } : {}),
        };
    });

    const normalizedSocial: SchoolSocialLinks = {};
    let hasSocialLinks = false;

    for (const entry of values.socialLinks) {
        const sanitized = sanitizeStrictHttpsUrl(entry.url);
        if (sanitized) {
            normalizedSocial[entry.platform] = sanitized;
            hasSocialLinks = true;
        }
    }

    const heroSubtitle = normalizeOptionalString(values.heroSubtitle);
    const heroCtaText = normalizeOptionalString(values.heroCtaText);
    const heroCtaUrl = normalizeOptionalString(values.heroCtaUrl)
        ? sanitizeWebsiteCtaUrl(values.heroCtaUrl) ?? undefined
        : undefined;
    const heroImageUrl = normalizeOptionalString(values.heroImageUrl)
        ? sanitizeSchoolAssetUrl(values.heroImageUrl) ?? undefined
        : undefined;

    const aboutHeading = normalizeOptionalString(values.aboutHeading);
    const aboutMission = normalizeOptionalString(values.aboutMission);
    const featuredProgramsHeading = normalizeOptionalString(values.featuredProgramsHeading);

    return {
        hero: {
            headline: values.heroHeadline.trim(),
            ...(heroSubtitle ? { subtitle: heroSubtitle } : {}),
            ...(heroCtaText ? { ctaText: heroCtaText } : {}),
            ...(heroCtaUrl ? { ctaUrl: heroCtaUrl } : {}),
            ...(heroImageUrl ? { imageUrl: heroImageUrl } : {}),
        },
        about: {
            ...(aboutHeading ? { heading: aboutHeading } : {}),
            description: values.aboutDescription.trim(),
            ...(aboutMission ? { mission: aboutMission } : {}),
        },
        ...(featuredProgramsHeading ? { featuredProgramsHeading } : {}),
        featuredPrograms,
        ...(hasSocialLinks ? { socialLinks: normalizedSocial } : {}),
    };
}

function areProgramItemsEqual(
    left: FeaturedProgramFormItem[],
    right: FeaturedProgramFormItem[]
): boolean {
    if (left.length !== right.length) return false;

    return left.every((item, index) => {
        const other = right[index];
        return (
            item.id === other.id &&
            item.title.trim() === other.title.trim() &&
            item.description.trim() === other.description.trim() &&
            item.category.trim() === other.category.trim() &&
            item.imageUrl.trim() === other.imageUrl.trim()
        );
    });
}

function areSocialItemsEqual(left: SocialLinkFormItem[], right: SocialLinkFormItem[]): boolean {
    if (left.length !== right.length) return false;

    const leftSorted = [...left].sort((a, b) => a.platform.localeCompare(b.platform));
    const rightSorted = [...right].sort((a, b) => a.platform.localeCompare(b.platform));

    return leftSorted.every(
        (item, index) =>
            item.platform === rightSorted[index].platform &&
            item.url.trim() === rightSorted[index].url.trim()
    );
}

export function areHeroSectionValuesEqual(
    values: WebsiteCmsFormValues,
    savedContent: SchoolWebsiteEditableContent
): boolean {
    const saved = toWebsiteCmsFormValues(savedContent);
    return (
        values.heroHeadline.trim() === saved.heroHeadline.trim() &&
        values.heroSubtitle.trim() === saved.heroSubtitle.trim() &&
        values.heroCtaText.trim() === saved.heroCtaText.trim() &&
        values.heroCtaUrl.trim() === saved.heroCtaUrl.trim() &&
        values.heroImageUrl.trim() === saved.heroImageUrl.trim()
    );
}

export function areAboutSectionValuesEqual(
    values: WebsiteCmsFormValues,
    savedContent: SchoolWebsiteEditableContent
): boolean {
    const saved = toWebsiteCmsFormValues(savedContent);
    return (
        values.aboutHeading.trim() === saved.aboutHeading.trim() &&
        values.aboutDescription.trim() === saved.aboutDescription.trim() &&
        values.aboutMission.trim() === saved.aboutMission.trim()
    );
}

export function areProgramsSectionValuesEqual(
    values: WebsiteCmsFormValues,
    savedContent: SchoolWebsiteEditableContent
): boolean {
    const saved = toWebsiteCmsFormValues(savedContent);
    return (
        values.featuredProgramsHeading.trim() === saved.featuredProgramsHeading.trim() &&
        areProgramItemsEqual(values.featuredPrograms, saved.featuredPrograms)
    );
}

export function areSocialSectionValuesEqual(
    values: WebsiteCmsFormValues,
    savedContent: SchoolWebsiteEditableContent
): boolean {
    const saved = toWebsiteCmsFormValues(savedContent);
    return areSocialItemsEqual(values.socialLinks, saved.socialLinks);
}

export function areWebsiteCmsFormValuesEqual(
    values: WebsiteCmsFormValues,
    savedContent: SchoolWebsiteEditableContent
): boolean {
    return (
        areHeroSectionValuesEqual(values, savedContent) &&
        areAboutSectionValuesEqual(values, savedContent) &&
        areProgramsSectionValuesEqual(values, savedContent) &&
        areSocialSectionValuesEqual(values, savedContent)
    );
}

export function getSectionUnsavedChangesMap(
    values: WebsiteCmsFormValues | null,
    savedContent: SchoolWebsiteEditableContent | null
): Record<WebsiteCmsSectionId, boolean> {
    if (!values || !savedContent) {
        return { hero: false, about: false, programs: false, social: false };
    }

    return {
        hero: !areHeroSectionValuesEqual(values, savedContent),
        about: !areAboutSectionValuesEqual(values, savedContent),
        programs: !areProgramsSectionValuesEqual(values, savedContent),
        social: !areSocialSectionValuesEqual(values, savedContent),
    };
}

export type WebsiteCmsValidationResult =
    | { valid: true; payload: SchoolWebsiteEditableContent }
    | { valid: false; errors: WebsiteCmsValidationErrors };

function validateOptionalImageField(rawValue: string): string | undefined {
    const trimmed = rawValue.trim();
    if (!trimmed) return undefined;

    if (trimmed.length > WEBSITE_CMS_LIMITS.IMAGE_URL_MAX) {
        return `Image URL must be ${WEBSITE_CMS_LIMITS.IMAGE_URL_MAX} characters or fewer.`;
    }

    if (!sanitizeSchoolAssetUrl(trimmed)) {
        return 'Image URL must use https:// or a safe site-relative /path without unsafe protocols or credentials.';
    }

    return undefined;
}

export function validateWebsiteCmsForm(values: WebsiteCmsFormValues): WebsiteCmsValidationResult {
    const errors: WebsiteCmsValidationErrors = {};

    // 1. Hero Section
    const heroHeadline = values.heroHeadline.trim();
    if (
        heroHeadline.length < WEBSITE_CMS_LIMITS.HERO_HEADLINE_MIN ||
        heroHeadline.length > WEBSITE_CMS_LIMITS.HERO_HEADLINE_MAX
    ) {
        errors.heroHeadline = `Main hero heading must be between ${WEBSITE_CMS_LIMITS.HERO_HEADLINE_MIN} and ${WEBSITE_CMS_LIMITS.HERO_HEADLINE_MAX} characters.`;
    }

    const heroSubtitle = values.heroSubtitle.trim();
    if (heroSubtitle.length > WEBSITE_CMS_LIMITS.HERO_SUBTITLE_MAX) {
        errors.heroSubtitle = `Supporting hero description must be ${WEBSITE_CMS_LIMITS.HERO_SUBTITLE_MAX} characters or fewer.`;
    }

    const heroCtaText = values.heroCtaText.trim();
    const heroCtaUrl = values.heroCtaUrl.trim();

    if (heroCtaText.length > WEBSITE_CMS_LIMITS.HERO_CTA_TEXT_MAX) {
        errors.heroCtaText = `Call-to-action label must be ${WEBSITE_CMS_LIMITS.HERO_CTA_TEXT_MAX} characters or fewer.`;
    } else if (heroCtaUrl && !heroCtaText) {
        errors.heroCtaText = 'Enter call-to-action button text when specifying a destination link.';
    }

    if (heroCtaUrl.length > WEBSITE_CMS_LIMITS.HERO_CTA_URL_MAX) {
        errors.heroCtaUrl = `Call-to-action URL must be ${WEBSITE_CMS_LIMITS.HERO_CTA_URL_MAX} characters or fewer.`;
    } else if (heroCtaText && !heroCtaUrl) {
        errors.heroCtaUrl = 'Enter a destination (e.g., #programs, /register, or https://...) for your call-to-action button.';
    } else if (heroCtaUrl && !sanitizeWebsiteCtaUrl(heroCtaUrl)) {
        errors.heroCtaUrl =
            'Destination must be a credential-free https:// URL, an in-page section anchor (#programs), or a safe site path (/register).';
    }

    const heroImageError = validateOptionalImageField(values.heroImageUrl);
    if (heroImageError) {
        errors.heroImageUrl = heroImageError;
    }

    // 2. About Section
    const aboutHeading = values.aboutHeading.trim();
    if (aboutHeading.length > WEBSITE_CMS_LIMITS.ABOUT_HEADING_MAX) {
        errors.aboutHeading = `About heading must be ${WEBSITE_CMS_LIMITS.ABOUT_HEADING_MAX} characters or fewer.`;
    }

    const aboutDescription = values.aboutDescription.trim();
    if (
        aboutDescription.length < WEBSITE_CMS_LIMITS.ABOUT_DESCRIPTION_MIN ||
        aboutDescription.length > WEBSITE_CMS_LIMITS.ABOUT_DESCRIPTION_MAX
    ) {
        errors.aboutDescription = `School introduction must be between ${WEBSITE_CMS_LIMITS.ABOUT_DESCRIPTION_MIN} and ${WEBSITE_CMS_LIMITS.ABOUT_DESCRIPTION_MAX} characters.`;
    }

    const aboutMission = values.aboutMission.trim();
    if (aboutMission.length > WEBSITE_CMS_LIMITS.ABOUT_MISSION_MAX) {
        errors.aboutMission = `Mission callout must be ${WEBSITE_CMS_LIMITS.ABOUT_MISSION_MAX} characters or fewer.`;
    }

    // 3. Featured Programs Section
    const programsHeading = values.featuredProgramsHeading.trim();
    if (programsHeading.length > WEBSITE_CMS_LIMITS.PROGRAMS_HEADING_MAX) {
        errors.featuredProgramsHeading = `Programs section heading must be ${WEBSITE_CMS_LIMITS.PROGRAMS_HEADING_MAX} characters or fewer.`;
    }

    if (values.featuredPrograms.length > WEBSITE_CMS_LIMITS.MAX_FEATURED_PROGRAMS) {
        errors.featuredProgramsLimit = `A maximum of ${WEBSITE_CMS_LIMITS.MAX_FEATURED_PROGRAMS} featured entries is supported on the landing page.`;
    }

    const programErrors: Record<string, FeaturedProgramFieldErrors> = {};
    for (const item of values.featuredPrograms) {
        const itemError: FeaturedProgramFieldErrors = {};

        const title = item.title.trim();
        if (
            title.length < WEBSITE_CMS_LIMITS.PROGRAM_TITLE_MIN ||
            title.length > WEBSITE_CMS_LIMITS.PROGRAM_TITLE_MAX
        ) {
            itemError.title = `Entry title must be between ${WEBSITE_CMS_LIMITS.PROGRAM_TITLE_MIN} and ${WEBSITE_CMS_LIMITS.PROGRAM_TITLE_MAX} characters.`;
        }

        const description = item.description.trim();
        if (
            description.length < WEBSITE_CMS_LIMITS.PROGRAM_DESCRIPTION_MIN ||
            description.length > WEBSITE_CMS_LIMITS.PROGRAM_DESCRIPTION_MAX
        ) {
            itemError.description = `Entry summary must be between ${WEBSITE_CMS_LIMITS.PROGRAM_DESCRIPTION_MIN} and ${WEBSITE_CMS_LIMITS.PROGRAM_DESCRIPTION_MAX} characters.`;
        }

        const category = item.category.trim();
        if (category.length > WEBSITE_CMS_LIMITS.PROGRAM_CATEGORY_MAX) {
            itemError.category = `Category tag must be ${WEBSITE_CMS_LIMITS.PROGRAM_CATEGORY_MAX} characters or fewer.`;
        }

        const imageError = validateOptionalImageField(item.imageUrl);
        if (imageError) {
            itemError.imageUrl = imageError;
        }

        if (Object.keys(itemError).length > 0) {
            programErrors[item.id] = itemError;
        }
    }

    if (Object.keys(programErrors).length > 0) {
        errors.programItems = programErrors;
    }

    // 4. Social Links
    const socialErrors: Partial<Record<SocialPlatformKey, string>> = {};
    const seenPlatforms = new Set<SocialPlatformKey>();

    for (const link of values.socialLinks) {
        if (seenPlatforms.has(link.platform)) {
            socialErrors[link.platform] = 'Duplicate social platform entry is not allowed.';
            continue;
        }
        seenPlatforms.add(link.platform);

        const trimmedUrl = link.url.trim();
        if (!trimmedUrl) {
            socialErrors[link.platform] =
                'Enter an https:// URL for this social profile or remove the row.';
            continue;
        }

        if (trimmedUrl.length > WEBSITE_CMS_LIMITS.SOCIAL_URL_MAX) {
            socialErrors[link.platform] =
                `Social link URL must be ${WEBSITE_CMS_LIMITS.SOCIAL_URL_MAX} characters or fewer.`;
            continue;
        }

        if (!sanitizeStrictHttpsUrl(trimmedUrl)) {
            socialErrors[link.platform] =
                'Social link must be a valid https:// URL without embedded credentials.';
        }
    }

    if (Object.keys(socialErrors).length > 0) {
        errors.socialLinks = socialErrors;
    }

    if (hasAnyWebsiteValidationError(errors)) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        payload: normalizeWebsiteCmsFormToContent(values),
    };
}

export function getSectionErrorCounts(
    errors: WebsiteCmsValidationErrors
): Record<WebsiteCmsSectionId, number> {
    const heroCount = [
        errors.heroHeadline,
        errors.heroSubtitle,
        errors.heroCtaText,
        errors.heroCtaUrl,
        errors.heroImageUrl,
    ].filter(Boolean).length;

    const aboutCount = [
        errors.aboutHeading,
        errors.aboutDescription,
        errors.aboutMission,
    ].filter(Boolean).length;

    let programsCount = [errors.featuredProgramsHeading, errors.featuredProgramsLimit].filter(
        Boolean
    ).length;
    if (errors.programItems) {
        for (const itemErrors of Object.values(errors.programItems)) {
            programsCount += Object.values(itemErrors).filter(Boolean).length;
        }
    }

    const socialCount = errors.socialLinks
        ? Object.values(errors.socialLinks).filter(Boolean).length
        : 0;

    return {
        hero: heroCount,
        about: aboutCount,
        programs: programsCount,
        social: socialCount,
    };
}

export function hasAnyWebsiteValidationError(errors: WebsiteCmsValidationErrors): boolean {
    const counts = getSectionErrorCounts(errors);
    return counts.hero + counts.about + counts.programs + counts.social > 0;
}

export function getFirstSectionWithErrors(
    errors: WebsiteCmsValidationErrors
): WebsiteCmsSectionId | null {
    const counts = getSectionErrorCounts(errors);
    const ordered: WebsiteCmsSectionId[] = ['hero', 'about', 'programs', 'social'];
    return ordered.find((section) => counts[section] > 0) ?? null;
}

export function mapBackendWebsiteValidationErrors(
    validationErrors: ValidationErrors | undefined,
    programIds: readonly string[]
): WebsiteCmsValidationErrors {
    if (!validationErrors) return {};

    const mapped: WebsiteCmsValidationErrors = {};

    for (const [key, messages] of Object.entries(validationErrors)) {
        const message = Array.isArray(messages) && messages.length > 0 ? messages[0] : null;
        if (!message) continue;

        if (key === 'hero.headline' || key === 'heroHeadline') mapped.heroHeadline = message;
        else if (key === 'hero.subtitle' || key === 'heroSubtitle') mapped.heroSubtitle = message;
        else if (key === 'hero.ctaText' || key === 'heroCtaText') mapped.heroCtaText = message;
        else if (key === 'hero.ctaUrl' || key === 'heroCtaUrl') mapped.heroCtaUrl = message;
        else if (key === 'hero.imageUrl' || key === 'heroImageUrl') mapped.heroImageUrl = message;
        else if (key === 'about.heading' || key === 'aboutHeading') mapped.aboutHeading = message;
        else if (key === 'about.description' || key === 'aboutDescription')
            mapped.aboutDescription = message;
        else if (key === 'about.mission' || key === 'aboutMission') mapped.aboutMission = message;
        else if (key === 'featuredProgramsHeading') mapped.featuredProgramsHeading = message;
        else if (key === 'featuredPrograms') mapped.featuredProgramsLimit = message;
        else if (key.startsWith('featuredPrograms.')) {
            const parts = key.split('.');
            const index = Number.parseInt(parts[1] ?? '', 10);
            const field = parts[2];
            const programId = !Number.isNaN(index) ? programIds[index] : undefined;
            if (
                programId &&
                (field === 'title' ||
                    field === 'description' ||
                    field === 'category' ||
                    field === 'imageUrl')
            ) {
                mapped.programItems = mapped.programItems ?? {};
                mapped.programItems[programId] = {
                    ...(mapped.programItems[programId] ?? {}),
                    [field]: message,
                };
            }
        } else if (key.startsWith('socialLinks.')) {
            const platform = key.slice('socialLinks.'.length);
            if (isSocialPlatformKey(platform)) {
                mapped.socialLinks = mapped.socialLinks ?? {};
                mapped.socialLinks[platform] = message;
            }
        }
    }

    return mapped;
}

export function formatWebsiteTimestamp(value?: string | null): string | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function buildDraftPreviewConfig(options: {
    form: WebsiteCmsFormValues;
    schoolName: string;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    primaryColor: string;
    secondaryColor?: string;
    contact?: {
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        country?: string;
    };
}) {
    const content = normalizeWebsiteCmsFormToContent(options.form);

    return {
        identity: {
            name: options.schoolName,
            ...(options.logoUrl ? { logoUrl: options.logoUrl } : {}),
            ...(options.faviconUrl ? { faviconUrl: options.faviconUrl } : {}),
        },
        branding: {
            primaryColor: options.primaryColor,
            ...(options.secondaryColor ? { secondaryColor: options.secondaryColor } : {}),
        },
        hero: content.hero,
        about: content.about,
        featuredProgramsHeading: content.featuredProgramsHeading,
        featuredPrograms: content.featuredPrograms,
        contact: {
            email: options.contact?.email?.trim() ?? '',
            ...(options.contact?.phone ? { phone: options.contact.phone } : {}),
            ...(options.contact?.address ? { address: options.contact.address } : {}),
            ...(options.contact?.city ? { city: options.contact.city } : {}),
            ...(options.contact?.country ? { country: options.contact.country } : {}),
        },
        ...(content.socialLinks ? { socialLinks: content.socialLinks } : {}),
    };
}

