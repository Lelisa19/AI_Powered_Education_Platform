import axios from 'axios';
import type { AxiosRequestConfig, AxiosProgressEvent } from 'axios';
import { normalizeApiError } from './api-error';

export const uploadApiClient = axios.create({
    baseURL: (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5000/api',
    timeout: 60000,
    headers: {
        'Accept': 'application/json',
        // Content-Type is intentionally omitted so the browser automatically 
        // sets 'multipart/form-data' with the correct boundary based on the FormData payload.
    },
});

uploadApiClient.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(normalizeApiError(error))
);

uploadApiClient.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(normalizeApiError(error))
);

export interface UploadOptions extends Omit<AxiosRequestConfig, 'data' | 'url'> {
    endpoint: string;
    file: File;
    fieldName?: string;
    additionalData?: Record<string, string | Blob>;
    onProgress?: (progressEvent: AxiosProgressEvent) => void;
}

export async function uploadFile<T = unknown>({
    endpoint,
    file,
    fieldName = 'file',
    additionalData,
    onProgress,
    ...axiosConfig
}: UploadOptions): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

    if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value);
        });
    }

    const response = await uploadApiClient.post<T>(endpoint, formData, {
        ...axiosConfig,
        onUploadProgress: onProgress,
    });

    return response.data;
}

export default uploadApiClient;
