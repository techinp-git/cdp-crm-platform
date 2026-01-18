import axios from 'axios';
import { LoginDto, AuthResponse, RefreshTokenDto } from '@ydm-platform/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and tenant ID
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add active tenant ID for multi-tenant users
  const activeTenantId = localStorage.getItem('activeTenantId');
  if (activeTenantId) {
    config.headers['x-tenant-id'] = activeTenantId;
  }
  
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: LoginDto) => api.post<AuthResponse>('/auth/login', data).then((res) => res.data),
  refresh: (data: RefreshTokenDto) =>
    api.post<AuthResponse>('/auth/refresh', data).then((res) => res.data),
};

export const customerApi = {
  list: (params?: any) => api.get('/customers', { params }).then((res) => res.data),
  get: (id: string) => api.get(`/customers/${id}`).then((res) => res.data),
  create: (data: any) => api.post('/customers', data).then((res) => res.data),
  update: (id: string, data: any) => api.patch(`/customers/${id}`, data).then((res) => res.data),
  delete: (id: string) => api.delete(`/customers/${id}`).then((res) => res.data),
  getEvents: (id: string) => api.get(`/customers/${id}/events`).then((res) => res.data),
};

export const dealApi = {
  list: (params?: any) => api.get('/deals', { params }).then((res) => res.data),
  get: (id: string) => api.get(`/deals/${id}`).then((res) => res.data),
  create: (data: any) => api.post('/deals', data).then((res) => res.data),
  update: (id: string, data: any) => api.patch(`/deals/${id}`, data).then((res) => res.data),
  delete: (id: string) => api.delete(`/deals/${id}`).then((res) => res.data),
};

export const leadApi = {
  list: (params?: any) => api.get('/leads', { params }).then((res) => res.data),
  get: (id: string) => api.get(`/leads/${id}`).then((res) => res.data),
  create: (data: any) => api.post('/leads', data).then((res) => res.data),
  update: (id: string, data: any) => api.patch(`/leads/${id}`, data).then((res) => res.data),
  delete: (id: string) => api.delete(`/leads/${id}`).then((res) => res.data),
};

export const analyticsApi = {
  getDashboardKPIs: () => api.get('/analytics/dashboard').then((res) => res.data),
  getDealPipeline: () => api.get('/analytics/deal-pipeline').then((res) => res.data),
  getCustomerGrowth: (days?: number) =>
    api.get('/analytics/customer-growth', { params: { days } }).then((res) => res.data),
};

export const tenantApi = {
  get: (id: string) => api.get(`/tenants/${id}`).then((res) => res.data),
  me: () => api.get('/tenants/me').then((res) => res.data),
};

export const featureFlagApi = {
  list: () => api.get('/feature-flags').then((res) => res.data),
  get: (key: string) => api.get(`/feature-flags/${key}`).then((res) => res.data),
  isEnabled: (key: string) =>
    api.get(`/feature-flags/${key}/enabled`).then((res) => res.data.enabled),
};

export default api;
