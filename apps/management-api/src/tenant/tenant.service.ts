import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto, UpdateTenantDto, Tenant } from '@ydm-platform/types';
import { RoleService } from '../role/role.service';

@Injectable()
export class TenantService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(forwardRef(() => RoleService)) private roleService: RoleService,
  ) {}

  async create(createTenantDto: CreateTenantDto & { status?: string; metadata?: Record<string, any> }): Promise<Tenant> {
    // Check if slug exists
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: createTenantDto.slug },
    });
    if (existing) {
      throw new BadRequestException('Tenant slug already exists');
    }

    // Create tenant
    const tenant = await this.prisma.tenant.create({
      data: createTenantDto as any,
    });

    // Create default roles for the new tenant
    await this.createDefaultRoles(tenant.id);

    return tenant;
  }

  private async createDefaultRoles(tenantId: string): Promise<void> {
    // Create Administrator role
    await this.roleService.createRole(tenantId, {
      name: 'Administrator',
      slug: 'admin',
      description: 'Full access to all features',
    }).catch(() => {
      // Ignore if already exists
    });

    // Create User role
    await this.roleService.createRole(tenantId, {
      name: 'User',
      slug: 'user',
      description: 'Standard user access',
    }).catch(() => {
      // Ignore if already exists
    });
  }

  async findAll(): Promise<Tenant[]> {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const existing = await this.findOne(id);
    const existingMetadata =
      existing && typeof (existing as any).metadata === 'object' && (existing as any).metadata !== null
        ? ((existing as any).metadata as Record<string, any>)
        : {};
    const incomingMetadata =
      updateTenantDto && typeof (updateTenantDto as any).metadata === 'object' && (updateTenantDto as any).metadata !== null
        ? ((updateTenantDto as any).metadata as Record<string, any>)
        : undefined;

    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(updateTenantDto as any),
        ...(incomingMetadata ? { metadata: { ...existingMetadata, ...incomingMetadata } } : {}),
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.tenant.delete({
      where: { id },
    });
  }
}
