import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, adminApi } from '../services/api';
import { AuthResponse } from '@ydm-platform/types';

interface AuthContextType {
  user: AuthResponse['user'] | null;
  adminInfo: any | null; // Extended info from /admin/me
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshAdminInfo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [adminInfo, setAdminInfo] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const loadAdminInfo = async () => {
    try {
      const info = await adminApi.getMe();
      setAdminInfo(info);
      // Update user with extended info
      if (info) {
        setUser((prev) => ({ ...prev, ...info, isSuperAdmin: info.isSuperAdmin }));
      }
    } catch (error) {
      console.error('Failed to load admin info:', error);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Load extended admin info
      loadAdminInfo();
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    setToken(response.accessToken);
    setUser(response.user);
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    // Load extended admin info after login
    await loadAdminInfo();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAdminInfo(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('activeTenant');
    localStorage.removeItem('activeTenantId');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        adminInfo,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        refreshAdminInfo: loadAdminInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
