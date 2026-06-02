import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { authService } from './authService';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Queue for requests waiting while refreshing tokens
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
};

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/public',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
  (error: AxiosError) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (typeof response.data === 'string') {
      const match = (response.data as string).match(/\{[\s\S]*\}/);
      if (match) {
        try {
          response.data = JSON.parse(match[0]);
        } catch {
        }
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.url &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('sigecat_refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('sigecat_user_id');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const tokens = await authService.refreshTokens(refreshToken);
        // Store the new refresh token (the access token is in the cookie)
        localStorage.setItem('sigecat_refresh_token', tokens.refresh_token);

        // Process all queued requests
        processQueue();
        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        localStorage.removeItem('sigecat_refresh_token');
        localStorage.removeItem('sigecat_user_id');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;