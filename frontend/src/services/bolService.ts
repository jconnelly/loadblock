import axios from 'axios';
import {
  BoL,
  CreateBoLRequest,
  UpdateBoLRequest,
  BoLFilters,
  BoLListResponse,
  ApiResponse
} from '../types';

const API_BASE_URL = '/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
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
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const bolService = {
  /**
   * Get list of BoLs with filtering and pagination
   */
  async getBols(filters?: BoLFilters & { page?: number; limit?: number }): Promise<BoLListResponse> {
    const params = new URLSearchParams();

    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.status) {
      filters.status.forEach(status => params.append('status', status));
    }
    if (filters?.search) params.append('search', filters.search);
    if (filters?.carrierIds) {
      filters.carrierIds.forEach(id => params.append('carrierId', id));
    }
    if (filters?.shipperIds) {
      filters.shipperIds.forEach(id => params.append('shipperId', id));
    }

    const response = await api.get(`/bol?${params}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch BoLs');
  },

  /**
   * Get specific BoL by ID
   */
  async getBoL(id: string): Promise<BoL> {
    const response = await api.get(`/bol/${id}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch BoL');
  },

  /**
   * Create new BoL
   */
  async createBoL(bolData: CreateBoLRequest): Promise<BoL> {
    const response = await api.post('/bol', bolData);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to create BoL');
  },

  /**
   * Update existing BoL
   */
  async updateBoL(id: string, bolData: UpdateBoLRequest): Promise<BoL> {
    const response = await api.put(`/bol/${id}`, bolData);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to update BoL');
  },

  /**
   * Update BoL status
   */
  async updateBoLStatus(id: string, status: string, notes?: string): Promise<BoL> {
    const response = await api.patch(`/bol/${id}/status`, {
      status,
      notes
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to update BoL status');
  },

  /**
   * Delete BoL
   */
  async deleteBoL(id: string): Promise<void> {
    const response = await api.delete(`/bol/${id}`);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete BoL');
    }
  },

  /**
   * Get BoL statistics
   */
  async getBolStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    totalValue: number;
    totalWeight: number;
  }> {
    const response = await api.get('/bol/stats');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch BoL statistics');
  },
};

export default bolService;