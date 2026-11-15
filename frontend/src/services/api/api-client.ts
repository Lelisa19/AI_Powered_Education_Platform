// frontend/src/services/api/api-client.ts
import axios, { type AxiosInstance } from 'axios';
import { normalizeApiError } from './api-error';
import { env } from '../../config/env';

export function applyCommonApiInterceptors(client: AxiosInstance): AxiosInstance {
    client.interceptors.request.use(
        (config) => {
            // Attach the raw hostname as an untrusted header for backend resolution
            // This is an input for the backend to resolve the tenant, NOT a security claim.
            if (typeof window !== 'undefined' && window.location.hostname) {
                config.headers['X-Requested-Tenant-Domain'] = window.location.hostname;
            }
            return config;
        },
        (error) => Promise.reject(normalizeApiError(error))
    );

    client.interceptors.response.use(
        (response) => response,
        (error) => Promise.reject(normalizeApiError(error))
    );

    return client;
}

export const apiClient = applyCommonApiInterceptors(
    axios.create({
        baseURL: env.API_BASE_URL,
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    })
);

export default apiClient;