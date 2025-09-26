import axios from 'axios';
import { LoginCredentials, RegisterData, User, ApiResponse } from '../types';

const API_BASE_URL = '/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For refresh token cookies
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = refreshResponse.data.data.token;
        localStorage.setItem('auth_token', newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>(
      '/auth/login',
      credentials
    );

    if (response.data.success && response.data.data) {
      const { user, token } = response.data.data;
      localStorage.setItem('auth_token', token);
      return { user, token };
    }

    throw new Error(response.data.message || 'Login failed');
  },

  async register(userData: RegisterData): Promise<{ user: User; token: string }> {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>(
      '/auth/register',
      userData
    );

    if (response.data.success && response.data.data) {
      const { user, token } = response.data.data;
      localStorage.setItem('auth_token', token);
      return { user, token };
    }

    throw new Error(response.data.message || 'Registration failed');
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('auth_token');
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to get user data');
  },

  async verifyToken(): Promise<boolean> {
    try {
      const response = await api.get<ApiResponse>('/auth/verify-token');
      return response.data.success;
    } catch (error) {
      return false;
    }
  },

  getStoredToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  clearStoredToken(): void {
    localStorage.removeItem('auth_token');
  }
};

export default authService;