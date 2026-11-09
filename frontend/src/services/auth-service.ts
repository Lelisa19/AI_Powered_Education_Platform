import { apiClient } from './api/api-client';
import { API_ENDPOINTS } from './api/api-endpoints';
import type { AuthenticatedUser } from '../types/auth';
import { parseAuthenticatedUser } from '../types/auth';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

export async function login(credentials: LoginRequest): Promise<unknown> {
    const response = await apiClient.post<unknown>(API_ENDPOINTS.AUTH.LOGIN, credentials);
    return response.data;
}

export async function register(data: RegisterRequest): Promise<unknown> {
    const response = await apiClient.post<unknown>(API_ENDPOINTS.AUTH.REGISTER, data);
    return response.data;
}

export async function logout(): Promise<unknown> {
    const response = await apiClient.post<unknown>(API_ENDPOINTS.AUTH.LOGOUT);
    return response.data;
}

export async function getCurrentUser(): Promise<AuthenticatedUser> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.AUTH.ME);
    // Do not cast blindly. Validate the raw payload through our strict runtime parser.
    return parseAuthenticatedUser(response.data);
}

