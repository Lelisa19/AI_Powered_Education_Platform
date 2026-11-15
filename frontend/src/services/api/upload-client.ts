import axios from 'axios';
import type { AxiosRequestConfig, AxiosProgressEvent } from 'axios';
import { env } from '../../config/env';
import { applyCommonApiInterceptors } from './api-client';

export const uploadApiClient = applyCommonApiInterceptors(
    axios.create({
        baseURL: env.API_BASE_URL,
        timeout: 60000,
        headers: {
            'Accept': 'application/json',
            // Content-Type is intentionally omitted so the browser automatically
            // sets 'multipart/form-data' with the correct boundary based on the FormData payload.
        },
    })
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
