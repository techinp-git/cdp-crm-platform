export enum TenantType {
  B2B = 'B2B',
  B2C = 'B2C',
  HYBRID = 'HYBRID',
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
  CANCELLED = 'CANCELLED',
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  status: TenantStatus;
  plan?: string;
  quota?: Record<string, number>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantDto {
  name: string;
  slug: string;
  type: TenantType;
  plan?: string;
  quota?: Record<string, number>;
}

export interface UpdateTenantDto {
  name?: string;
  status?: TenantStatus;
  plan?: string;
  quota?: Record<string, number>;
  metadata?: Record<string, any>;
}
