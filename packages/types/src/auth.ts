export interface LoginDto {
  email: string;
  password: string;
  tenantId?: string; // Optional for super admin
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isSuperAdmin: boolean;
    tenantId?: string;
    roles?: string[];
    permissions?: string[];
  };
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  tenantId?: string;
  isSuperAdmin: boolean;
  roles?: string[];
  iat?: number;
  exp?: number;
}
