// frontend/src/config/app-config.ts
import { env } from './env';

export const appConfig = {
    api: {
        baseUrl: env.API_BASE_URL,
    },
    domains: {
        platform: env.PLATFORM_DOMAINS.split(',').map((d) => d.trim().toLowerCase()),
        platformAdmin: env.PLATFORM_ADMIN_DOMAIN.trim().toLowerCase(),
    },
};