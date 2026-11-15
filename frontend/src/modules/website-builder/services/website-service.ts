// frontend/src/modules/website-builder/services/website-service.ts
import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import { DEFAULT_SCHOOL_BRANDING } from '../../../types/school.types';
import {
    sanitizeBrandHexColor,
    sanitizeSchoolAssetUrl,
    sanitizeStrictHttpsUrl,
    sanitizeWebsiteCtaUrl,
} from '../../../utils/branding';
import {
    createEmptyEditableContent,
    toWebsiteCmsFormValues,
    validateWebsiteCmsForm,
} from '../schemas/website-cms-schema';
import type {
    FeaturedProgram,
    PublishWebsiteResponse,
    SaveWebsiteDraftResponse,
    SchoolSocialLinks,
    SchoolWebsiteCmsState,
    SchoolWebsiteConfig,
    SchoolWebsiteEditableContent,
    WebsiteAuditUser,
    WebsiteCanonicalPreviewSnapshot,
    WebsitePublicationStatus,
} from '../types/website.types';

/**
 * Public API endpoint for retrieving the current school tenant's published website configuration.
 *
 * TENANT RESOLUTION CONTRACT:
 * - The backend MUST resolve the tenant identity strictly from the verified request host/domain
 *   (supplied via Host header or trusted proxy header like X-Requested-Tenant-Domain).
 * - Under NO circumstances should the client pass a query param or request body containing `tenantId`
 *   to determine or select the school.
 */
export const SCHOOL_WEBSITE_CONFIG_ENDPOINT = API_ENDPOINTS.PUBLIC_WEBSITE.CONFIG;

const FORBIDDEN_WEBSITE_SENSITIVE_KEYS = [
    'storagePath',
    'diskPath',
    'localPath',
    'filePath',
    'bucket',
    'objectKey',
    's3Key',
    'token',
    'signedToken',
    'secret',
    'password',
    'accessKey',
    'privateKey',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoExposedSensitiveFields(obj: Record<string, unknown>): void {
    for (const key of FORBIDDEN_WEBSITE_SENSITIVE_KEYS) {
        if (key in obj && obj[key] !== undefined && obj[key] !== null) {
            throw new ApiError(
                'Security violation: Website configuration response exposed sensitive or internal metadata.',
                502
            );
        }
    }
}

function assertMatchingTenantId(
    actualTenantId: string,
    expectedTenantId?: string | null
): void {
    if (expectedTenantId === undefined || expectedTenantId === null) {
        return;
    }
    if (typeof expectedTenantId !== 'string' || expectedTenantId.trim() === '') {
        throw new ApiError('Verified school tenant context is required.', 400);
    }
    if (actualTenantId !== expectedTenantId) {
        throw new ApiError(
            'Security violation: Website CMS response belongs to a different school tenant.',
            502
        );
    }
}

function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

function sanitizeSocialLinks(rawSocial: Record<string, unknown> | undefined): SchoolSocialLinks | undefined {
    if (!rawSocial) return undefined;

    const facebook = sanitizeStrictHttpsUrl(rawSocial.facebook) ?? undefined;
    const twitter = sanitizeStrictHttpsUrl(rawSocial.twitter) ?? undefined;
    const instagram = sanitizeStrictHttpsUrl(rawSocial.instagram) ?? undefined;
    const linkedin = sanitizeStrictHttpsUrl(rawSocial.linkedin) ?? undefined;
    const youtube = sanitizeStrictHttpsUrl(rawSocial.youtube) ?? undefined;

    if (!facebook && !twitter && !instagram && !linkedin && !youtube) {
        return undefined;
    }

    return {
        ...(facebook ? { facebook } : {}),
        ...(twitter ? { twitter } : {}),
        ...(instagram ? { instagram } : {}),
        ...(linkedin ? { linkedin } : {}),
        ...(youtube ? { youtube } : {}),
    };
}

function parseFeaturedPrograms(rawPrograms: unknown): FeaturedProgram[] {
    if (!Array.isArray(rawPrograms)) return [];

    return rawPrograms
        .filter(isPlainObject)
        .filter(
            (program) =>
                typeof program.id === 'string' &&
                program.id.trim() !== '' &&
                typeof program.title === 'string' &&
                program.title.trim() !== ''
        )
        .map((program) => ({
            id: (program.id as string).trim(),
            title: (program.title as string).trim(),
            description:
                typeof program.description === 'string' ? program.description.trim() : '',
            category: normalizeOptionalText(program.category),
            imageUrl: sanitizeSchoolAssetUrl(program.imageUrl) ?? undefined,
        }));
}

function sanitizeEditableContent(
    raw: unknown,
    fallbackSchoolName?: string
): SchoolWebsiteEditableContent {
    if (!isPlainObject(raw)) {
        throw new ApiError('Invalid backend website content section payload.', 502);
    }
    assertNoExposedSensitiveFields(raw);

    const rawHero = isPlainObject(raw.hero) ? raw.hero : null;
    const heroHeadline =
        rawHero && typeof rawHero.headline === 'string'
            ? rawHero.headline.trim()
            : fallbackSchoolName
              ? `Welcome to ${fallbackSchoolName}`
              : '';

    const ctaText = normalizeOptionalText(rawHero?.ctaText);
    const ctaUrl = sanitizeWebsiteCtaUrl(rawHero?.ctaUrl) ?? undefined;
    const heroImageUrl = sanitizeSchoolAssetUrl(rawHero?.imageUrl) ?? undefined;
    const heroSubtitle = normalizeOptionalText(rawHero?.subtitle);

    const rawAbout = isPlainObject(raw.about) ? raw.about : null;
    const aboutHeading = normalizeOptionalText(rawAbout?.heading);
    const aboutDescription =
        rawAbout && typeof rawAbout.description === 'string' ? rawAbout.description.trim() : '';
    const aboutMission = normalizeOptionalText(rawAbout?.mission);

    const featuredProgramsHeading = normalizeOptionalText(raw.featuredProgramsHeading);
    const featuredPrograms = parseFeaturedPrograms(raw.featuredPrograms);

    const rawSocial = isPlainObject(raw.socialLinks) ? raw.socialLinks : undefined;
    const socialLinks = sanitizeSocialLinks(rawSocial);

    return {
        hero: {
            headline: heroHeadline,
            ...(heroSubtitle ? { subtitle: heroSubtitle } : {}),
            ...(ctaText && ctaUrl ? { ctaText, ctaUrl } : {}),
            ...(heroImageUrl ? { imageUrl: heroImageUrl } : {}),
        },
        about: {
            ...(aboutHeading ? { heading: aboutHeading } : {}),
            description: aboutDescription,
            ...(aboutMission ? { mission: aboutMission } : {}),
        },
        ...(featuredProgramsHeading ? { featuredProgramsHeading } : {}),
        featuredPrograms,
        ...(socialLinks ? { socialLinks } : {}),
    };
}

function sanitizeWebsiteConfig(raw: unknown): SchoolWebsiteConfig {
    if (!isPlainObject(raw)) {
        throw new ApiError('Invalid school website configuration payload.', 502);
    }
    assertNoExposedSensitiveFields(raw);

    const rawIdentity = isPlainObject(raw.identity) ? raw.identity : null;
    if (!rawIdentity || typeof rawIdentity.name !== 'string' || rawIdentity.name.trim() === '') {
        throw new ApiError('Invalid school website payload: school name is required.', 502);
    }

    const schoolName = rawIdentity.name.trim();
    const editable = sanitizeEditableContent(raw, schoolName);

    const rawBranding = isPlainObject(raw.branding) ? raw.branding : {};
    const primaryColor =
        sanitizeBrandHexColor(rawBranding.primaryColor) ?? DEFAULT_SCHOOL_BRANDING.primaryColor;
    const secondaryColor =
        sanitizeBrandHexColor(rawBranding.secondaryColor) ?? DEFAULT_SCHOOL_BRANDING.secondaryColor;

    const rawContact = isPlainObject(raw.contact) ? raw.contact : {};

    return {
        identity: {
            name: schoolName,
            logoUrl: sanitizeSchoolAssetUrl(rawIdentity.logoUrl) ?? undefined,
            faviconUrl: sanitizeSchoolAssetUrl(rawIdentity.faviconUrl) ?? undefined,
        },
        branding: {
            primaryColor,
            secondaryColor,
        },
        hero: editable.hero,
        about: editable.about,
        ...(editable.featuredProgramsHeading
            ? { featuredProgramsHeading: editable.featuredProgramsHeading }
            : {}),
        featuredPrograms: editable.featuredPrograms,
        contact: {
            email: typeof rawContact.email === 'string' ? rawContact.email.trim() : '',
            phone: normalizeOptionalText(rawContact.phone),
            address: normalizeOptionalText(rawContact.address),
            city: normalizeOptionalText(rawContact.city),
            country: normalizeOptionalText(rawContact.country),
        },
        ...(editable.socialLinks ? { socialLinks: editable.socialLinks } : {}),
    };
}

function parseOptionalNullableString(value: unknown, fieldName: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(`Invalid backend website payload: '${fieldName}' must be a string.`, 502);
    }
    return value;
}

function parseAuditUser(value: unknown): WebsiteAuditUser | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value) || typeof value.id !== 'string' || value.id.trim() === '') {
        throw new ApiError('Invalid backend website payload: malformed audit user metadata.', 502);
    }

    return {
        id: value.id,
        name: parseOptionalNullableString(value.name, 'auditUser.name'),
        email: parseOptionalNullableString(value.email, 'auditUser.email'),
    };
}

function parsePublicationStatus(value: unknown): WebsitePublicationStatus {
    if (value === 'UNPUBLISHED' || value === 'PUBLISHED' || value === 'DRAFT_CHANGES') {
        return value;
    }
    throw new ApiError('Invalid backend website payload: unrecognized publicationStatus.', 502);
}

function parseCanonicalPreviewSnapshot(
    value: unknown
): WebsiteCanonicalPreviewSnapshot | undefined {
    if (!isPlainObject(value)) return undefined;

    const rawIdentity = isPlainObject(value.identity) ? value.identity : undefined;
    const rawBranding = isPlainObject(value.branding) ? value.branding : undefined;
    const rawContact = isPlainObject(value.contact) ? value.contact : undefined;

    const identityName = normalizeOptionalText(rawIdentity?.name);
    const identityLogoUrl = sanitizeSchoolAssetUrl(rawIdentity?.logoUrl) ?? undefined;
    const identityFaviconUrl = sanitizeSchoolAssetUrl(rawIdentity?.faviconUrl) ?? undefined;

    const primaryColor = sanitizeBrandHexColor(rawBranding?.primaryColor) ?? undefined;
    const secondaryColor = sanitizeBrandHexColor(rawBranding?.secondaryColor) ?? undefined;

    return {
        ...(rawIdentity
            ? {
                  identity: {
                      ...(identityName ? { name: identityName } : {}),
                      ...(identityLogoUrl ? { logoUrl: identityLogoUrl } : {}),
                      ...(identityFaviconUrl ? { faviconUrl: identityFaviconUrl } : {}),
                  },
              }
            : {}),
        ...(primaryColor || secondaryColor
            ? {
                  branding: {
                      ...(primaryColor ? { primaryColor } : {}),
                      ...(secondaryColor ? { secondaryColor } : {}),
                  },
              }
            : {}),
        ...(rawContact
            ? {
                  contact: {
                      email: normalizeOptionalText(rawContact.email) ?? '',
                      phone: normalizeOptionalText(rawContact.phone),
                      address: normalizeOptionalText(rawContact.address),
                      city: normalizeOptionalText(rawContact.city),
                      country: normalizeOptionalText(rawContact.country),
                  },
              }
            : {}),
    };
}

function parseWebsiteCmsState(
    data: unknown,
    expectedTenantId?: string | null
): SchoolWebsiteCmsState {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend website CMS state payload.', 502);
    }
    assertNoExposedSensitiveFields(data);

    const { tenantId, publicationStatus, hasUnpublishedChanges, draft, published } = data;
    if (typeof tenantId !== 'string' || tenantId.trim() === '') {
        throw new ApiError('Invalid backend website CMS payload: missing tenantId.', 502);
    }
    assertMatchingTenantId(tenantId, expectedTenantId);

    const parsedStatus = parsePublicationStatus(publicationStatus);
    const parsedDraft =
        draft === null || draft === undefined
            ? createEmptyEditableContent()
            : sanitizeEditableContent(draft);
    const parsedPublished =
        published === null || published === undefined
            ? null
            : sanitizeEditableContent(published);

    const derivedHasUnpublished =
        typeof hasUnpublishedChanges === 'boolean'
            ? hasUnpublishedChanges
            : parsedStatus !== 'PUBLISHED';

    return {
        tenantId,
        publicationStatus: parsedStatus,
        hasUnpublishedChanges: derivedHasUnpublished,
        draft: parsedDraft,
        published: parsedPublished,
        lastDraftSavedAt: parseOptionalNullableString(data.lastDraftSavedAt, 'lastDraftSavedAt'),
        lastDraftSavedBy: parseAuditUser(data.lastDraftSavedBy),
        publishedAt: parseOptionalNullableString(data.publishedAt, 'publishedAt'),
        publishedBy: parseAuditUser(data.publishedBy),
        canonicalPreview: parseCanonicalPreviewSnapshot(data.canonicalPreview),
    };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isWebsiteCmsBackendUnavailableError(error: unknown): boolean {
    if (!(error instanceof ApiError) || error.isCancellation) {
        return false;
    }

    return (
        error.isNetworkError ||
        error.statusCode === 404 ||
        error.statusCode === 501 ||
        error.statusCode === 502 ||
        error.statusCode === 503
    );
}

/**
 * Fetches and normalizes the PUBLISHED public website configuration for the current school tenant.
 * Never returns draft or unpublished content.
 */
export async function getSchoolWebsiteConfig(): Promise<SchoolWebsiteConfig> {
    const response = await apiClient.get<unknown>(SCHOOL_WEBSITE_CONFIG_ENDPOINT);
    return sanitizeWebsiteConfig(response.data);
}

/**
 * Retrieves the authenticated school tenant's website CMS draft, publication status,
 * and audit metadata via `GET /school/website`.
 */
export async function getSchoolWebsiteCmsState(
    expectedTenantId?: string | null,
    signal?: AbortSignal
): Promise<SchoolWebsiteCmsState> {
    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.SCHOOL_WEBSITE.BASE, {
            signal,
        });
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Backend website CMS endpoint returned an unexpected response.', 502);
        }

        const candidate = 'website' in payload ? payload.website : payload;
        return parseWebsiteCmsState(candidate, expectedTenantId);
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Saves validated CMS draft content without modifying published live website content
 * or canonical school profile/branding records (`PUT /school/website/draft`).
 */
export async function saveSchoolWebsiteDraft(
    content: SchoolWebsiteEditableContent,
    expectedTenantId?: string | null
): Promise<SaveWebsiteDraftResponse> {
    const validation = validateWebsiteCmsForm(toWebsiteCmsFormValues(content));
    if (!validation.valid) {
        throw new ApiError(
            'Please fix the highlighted website content errors before saving draft.',
            400
        );
    }

    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.SCHOOL_WEBSITE.DRAFT,
            validation.payload
        );
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend website draft save response.', 502);
        }

        const candidate = 'website' in payload ? payload.website : payload;
        return {
            website: parseWebsiteCmsState(candidate, expectedTenantId),
            ...(typeof payload.message === 'string' && payload.message.trim() !== ''
                ? { message: payload.message }
                : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Publishes validated CMS draft content to the live public website (`POST /school/website/publish`).
 * When `draftContent` is supplied, validates it client-side and sends `{ draft }`; otherwise sends `{}`
 * to publish the persisted server-side draft cleanly under `website.publish`.
 */
export async function publishSchoolWebsite(
    expectedTenantId?: string | null,
    draftContent?: SchoolWebsiteEditableContent
): Promise<PublishWebsiteResponse> {
    let body: { draft?: SchoolWebsiteEditableContent } = {};

    if (draftContent) {
        const validation = validateWebsiteCmsForm(toWebsiteCmsFormValues(draftContent));
        if (!validation.valid) {
            throw new ApiError(
                'Please fix all website content validation errors before publishing.',
                400
            );
        }
        body = { draft: validation.payload };
    }

    try {
        const response = await apiClient.post<unknown>(API_ENDPOINTS.SCHOOL_WEBSITE.PUBLISH, body);
        const payload = response.data;
        if (!isPlainObject(payload)) {
            throw new ApiError('Invalid backend website publish response.', 502);
        }

        const candidate = 'website' in payload ? payload.website : payload;
        return {
            website: parseWebsiteCmsState(candidate, expectedTenantId),
            ...(typeof payload.message === 'string' && payload.message.trim() !== ''
                ? { message: payload.message }
                : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * ============================================================================
 * DEVELOPMENT-ONLY MOCK DATA
 * ============================================================================
 * Strictly for isolated component prototyping before backend endpoints exist.
 * Never used silently as a fallback for failed API requests.
 */
export const DEV_MOCK_SCHOOL_WEBSITE_CONFIG: Readonly<SchoolWebsiteConfig> = Object.freeze({
    identity: {
        name: 'Oakridge Academy',
        logoUrl: undefined,
        faviconUrl: undefined,
    },
    branding: {
        primaryColor: '#1E40AF',
        secondaryColor: '#3B82F6',
    },
    hero: {
        headline: 'Empowering Minds, Shaping the Future',
        subtitle: 'Experience world-class education with dedicated faculty and an innovative curriculum designed for tomorrow.',
        ctaText: 'Explore Programs',
        ctaUrl: '#programs',
        imageUrl: undefined,
    },
    about: {
        heading: 'About Oakridge Academy',
        description: 'Oakridge Academy is committed to delivering holistic academic excellence and leadership development for all students.',
        mission: 'To foster intellectual curiosity, ethical character, and lifelong learning in a supportive global community.',
    },
    featuredProgramsHeading: 'Featured Academic Programs',
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
