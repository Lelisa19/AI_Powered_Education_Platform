import { DEFAULT_SCHOOL_BRANDING } from '../types/school.types';

const HEX_6_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * Validates and normalizes a 6-digit hex color string (uppercase), returning null if invalid.
 * Prevents CSS injection from untrusted strings.
 */
export function sanitizeBrandHexColor(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!HEX_6_PATTERN.test(trimmed)) {
        return null;
    }
    return trimmed.toUpperCase();
}

function parseHexRgb(hex: string): [number, number, number] | null {
    const normalized = sanitizeBrandHexColor(hex);
    if (!normalized) return null;

    const r = Number.parseInt(normalized.slice(1, 3), 16);
    const g = Number.parseInt(normalized.slice(3, 5), 16);
    const b = Number.parseInt(normalized.slice(5, 7), 16);
    return [r, g, b];
}

function linearizeChannel(channel: number): number {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

/**
 * Computes WCAG 2.1 relative luminance for a 6-digit hex color.
 */
export function getRelativeLuminance(hex: string): number {
    const rgb = parseHexRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(linearizeChannel);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates WCAG contrast ratio between two hex colors.
 */
export function getHexContrastRatio(hexA: string, hexB: string): number {
    const lumA = getRelativeLuminance(hexA);
    const lumB = getRelativeLuminance(hexB);
    const lighter = Math.max(lumA, lumB);
    const darker = Math.min(lumA, lumB);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns an accessible foreground text color (`#FFFFFF` or `#0F172A`) for the provided hex background.
 */
export function getReadableContrastColor(backgroundHex: string): '#FFFFFF' | '#0F172A' {
    const whiteContrast = getHexContrastRatio(backgroundHex, '#FFFFFF');
    const darkContrast = getHexContrastRatio(backgroundHex, '#0F172A');
    return whiteContrast >= darkContrast ? '#FFFFFF' : '#0F172A';
}

/**
 * Converts a validated hex color into an `rgba(r, g, b, alpha)` tint string.
 */
export function hexToRgba(hex: string, alpha: number): string {
    const rgb = parseHexRgb(hex) ?? parseHexRgb(DEFAULT_SCHOOL_BRANDING.primaryColor)!;
    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clampedAlpha})`;
}

function isSafeRootRelativePath(trimmed: string): boolean {
    return (
        trimmed.startsWith('/') &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/\\') &&
        !trimmed.includes('..')
    );
}

/**
 * Validates that a URL is strictly an `https:` URL with a valid hostname,
 * no embedded credentials, and no whitespace.
 * Rejects `http:`, `javascript:`, `data:`, `file://`, and malformed URLs.
 */
export function sanitizeStrictHttpsUrl(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed || /\s/.test(trimmed)) return null;

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
            return null;
        }
        return parsed.toString();
    } catch {
        return null;
    }
}

/**
 * Sanitizes external or app-relative asset URLs (logos, favicons, banners).
 * Accepts strictly `https:` URLs or safe root-relative paths (`/assets/...`), rejecting
 * `javascript:`, `data:`, `file://`, protocol-relative `//`, `/\`, and directory traversal (`..`).
 */
export function sanitizeSchoolAssetUrl(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed || /\s/.test(trimmed)) return null;

    if (isSafeRootRelativePath(trimmed)) {
        return trimmed;
    }

    return sanitizeStrictHttpsUrl(trimmed);
}

const SAFE_FRAGMENT_ANCHOR_PATTERN = /^#[A-Za-z][A-Za-z0-9_-]*$/;

/**
 * Sanitizes Call-To-Action destinations for public school websites.
 * Accepts safe in-page fragment anchors (`#programs`), safe root-relative paths (`/register`),
 * or strict credential-free `https:` URLs. Rejects `javascript:`, `data:`, `file:`, `http:`,
 * protocol-relative `//`, `/\`, directory traversal, and malformed strings.
 */
export function sanitizeWebsiteCtaUrl(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed || /\s/.test(trimmed)) return null;

    if (SAFE_FRAGMENT_ANCHOR_PATTERN.test(trimmed)) {
        return trimmed;
    }

    if (isSafeRootRelativePath(trimmed)) {
        return trimmed;
    }

    return sanitizeStrictHttpsUrl(trimmed);
}

