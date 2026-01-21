export interface Customer {
  id: string;
  tenantId: string;
  type: string;
  identifiers: any;
  profile: any;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerEvent {
  id: string;
  tenantId: string;
  customerId: string;
  type: string;
  timestamp: Date;
  payload?: any;
  createdAt: Date;
}

export interface Segment {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  definition: any;
  isDynamic: boolean;
  metadata?: any;
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
  identifiers: any;
  profile: any;
  metadata?: any;
}

export interface CreateCustomerEventDto {
  customerId: string;
  type: string;
  timestamp?: Date;
  payload?: any;
}

export interface CreateSegmentDto {
  name: string;
  description?: string;
  definition: any;
  isDynamic?: boolean;
}
