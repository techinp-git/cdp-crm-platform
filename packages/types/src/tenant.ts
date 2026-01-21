export type TenantType = 'B2B' | 'B2C' | 'HYBRID';

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  status: TenantStatus;
  plan?: string;
  quota?: any;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantDto {
  name: string;
  slug: string;
  type: TenantType;
  status?: TenantStatus;
  plan?: string;
  quota?: any;
  metadata?: any;
}

export interface UpdateTenantDto {
  name?: string;
  status?: TenantStatus;
  plan?: string;
  quota?: any;
  metadata?: any;
}
