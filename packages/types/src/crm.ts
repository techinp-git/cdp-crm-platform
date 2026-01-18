export enum DealStatus {
  OPEN = 'OPEN',
  WON = 'WON',
  LOST = 'LOST',
  CANCELLED = 'CANCELLED',
}

export interface Lead {
  id: string;
  tenantId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  source?: string;
  status: string;
  score?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  tenantId: string;
  customerId?: string;
  title: string;
  description?: string;
  amount?: number;
  currency: string;
  stageId: string;
  status: DealStatus;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DealStage {
  id: string;
  tenantId: string;
  name: string;
  order: number;
  probability?: number;
  isDefault: boolean;
  isWon: boolean;
  isLost: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityTask {
  id: string;
  tenantId: string;
  type: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completedAt?: Date;
  priority: string;
  status: string;
  customerId?: string;
  dealId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  tenantId: string;
  name: string;
  type?: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  tenantId: string;
  customerId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeadDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  source?: string;
  status?: string;
  score?: number;
}

export interface CreateDealDto {
  customerId?: string;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  stageId: string;
  expectedCloseDate?: Date;
}

export interface UpdateDealDto {
  title?: string;
  description?: string;
  amount?: number;
  stageId?: string;
  status?: DealStatus;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
}
