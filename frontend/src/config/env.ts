// frontend/src/config/env.ts
export const env = {
    API_BASE_URL: (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5000/api',
    // Expected to be a comma-separated list of root platform domains (e.g., "eduplatform.com,localhost")
    PLATFORM_DOMAINS: (import.meta.env.VITE_PLATFORM_DOMAINS as string) || 'localhost',
    // Optional dedicated admin domain (e.g., "admin.eduplatform.com")
    PLATFORM_ADMIN_DOMAIN: (import.meta.env.VITE_PLATFORM_ADMIN_DOMAIN as string) || '',
};