import axios from 'axios';
import { getCookie } from '../utils/cookies';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

// Mirrors the readable csrfToken cookie into a header for the double-submit CSRF check.
api.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = getCookie('csrfToken');
    if (csrfToken) {
      config.headers = config.headers ?? {};
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

export interface ApiErrorShape {
  error: { message: string; details?: unknown };
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined;
    if (data?.error?.message) return data.error.message;
  }
  return 'Something went wrong. Please try again.';
}
