export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: UserStatus;
  isSuperAdmin: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  userId: string;
  status: UserStatus;
  user?: User;
  roles?: Role[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  isSystem: boolean;
  permissions?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  createdAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  status?: UserStatus;
}
