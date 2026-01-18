export interface Customer {
  id: string;
  tenantId: string;
  type: string;
  identifiers: Record<string, any>;
  profile: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerEvent {
  id: string;
  tenantId: string;
  customerId: string;
  type: string;
  timestamp: Date;
  payload?: Record<string, any>;
  createdAt: Date;
}

export interface Segment {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  definition: Record<string, any>;
  isDynamic: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  tenantId: string;
  name: string;
  color?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerDto {
  type?: string;
  identifiers: Record<string, any>;
  profile: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface CreateCustomerEventDto {
  customerId: string;
  type: string;
  timestamp?: Date;
  payload?: Record<string, any>;
}

export interface CreateSegmentDto {
  name: string;
  description?: string;
  definition: Record<string, any>;
  isDynamic?: boolean;
}
