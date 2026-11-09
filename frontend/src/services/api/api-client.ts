// frontend/src/services/api/api-client.ts
import axios from 'axios';
import { normalizeApiError } from './api-error';
import { env } from '../../config/env';

export const apiClient = axios.create({
    baseURL: env.API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        // Attach the raw hostname as an untrusted header for backend resolution
        // This is an input for the backend to resolve the tenant, NOT a security claim.
        config.headers['X-Requested-Tenant-Domain'] = window.location.hostname;
        return config;
    },
    (error) => Promise.reject(normalizeApiError(error))
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(normalizeApiError(error))
);

export default apiClient;