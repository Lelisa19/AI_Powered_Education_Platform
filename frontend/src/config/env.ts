// frontend/src/config/env.ts
const isDev = import.meta.env.DEV;

export const env = {
    API_BASE_URL: (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5000/api',
    // Expected to be a comma-separated list of exact root platform hostnames (e.g., "eduplatform.com,localhost")
    PLATFORM_DOMAINS:
        (import.meta.env.VITE_PLATFORM_DOMAINS as string) ||
        (isDev ? 'platform.localhost,localhost' : 'localhost'),
    // Optional dedicated exact admin hostname (e.g., "admin.eduplatform.com")
    PLATFORM_ADMIN_DOMAIN:
        (import.meta.env.VITE_PLATFORM_ADMIN_DOMAIN as string) ||
        (isDev ? 'admin.localhost' : ''),
    // Strictly development-only flag for temporary Platform Admin frontend testing.
    ENABLE_PLATFORM_ADMIN_DEV_AUTH:
        isDev && import.meta.env.VITE_ENABLE_PLATFORM_ADMIN_DEV_AUTH === 'true',
};
