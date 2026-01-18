import axios from 'axios';
import { LoginDto, AuthResponse, RefreshTokenDto } from '@ydm-platform/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: add auth token and tenant header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add x-tenant-id header for super admin tenant switching
  const activeTenantId = localStorage.getItem('activeTenantId');
  if (activeTenantId) {
    config.headers['x-tenant-id'] = activeTenantId;
  }
  
  return config;
});

// Response interceptor: handle token refresh
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
};

export const adminApi = {
  getStats: () => api.get('/admin/stats').then((res) => res.data),
  getTenants: () => api.get('/tenants').then((res) => res.data),
  getTenant: (id: string) => api.get(`/tenants/${id}`).then((res) => res.data),
  createTenant: (data: any) => api.post('/tenants', data).then((res) => res.data),
  updateTenant: (id: string, data: any) => api.patch(`/tenants/${id}`, data).then((res) => res.data),
  deleteTenant: (id: string) => api.delete(`/tenants/${id}`).then((res) => res.data),
  // Admin endpoints
  getMe: () => api.get('/admin/me').then((res) => res.data),
  getAccessibleTenants: () => api.get('/admin/tenants').then((res) => res.data),
  getTenantUsers: (tenantId: string) => api.get(`/admin/tenants/${tenantId}/users`).then((res) => res.data),
  getTenantRoles: (tenantId: string) => api.get(`/admin/tenants/${tenantId}/roles`).then((res) => res.data),
  assignUserToTenantWithRole: (userId: string, tenantId: string, roleId: string) =>
    api.post(`/admin/users/${userId}/tenants/${tenantId}/roles/${roleId}`).then((res) => res.data),
  // User endpoints
  createUser: (data: any, tenantId?: string) => {
    const url = tenantId ? `/users?tenantId=${tenantId}` : '/users';
    return api.post(url, data).then((res) => res.data);
  },
  getAllUsers: () => api.get('/users').then((res) => res.data),
};

export default api;
