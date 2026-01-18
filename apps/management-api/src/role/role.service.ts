import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, Permission } from '@ydm-platform/types';

@Injectable()
export class RoleService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async createRole(tenantId: string, data: { name: string; slug: string; description?: string }): Promise<Role> {
    const existing = await this.prisma.role.findUnique({
      where: {
        tenantId_slug: { tenantId, slug: data.slug },
      },
    });
    if (existing) {
      throw new BadRequestException('Role slug already exists');
    }

    return this.prisma.role.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }

  async findAllRoles(tenantId: string): Promise<Role[]> {
    return this.prisma.role.findMany({
      where: { tenantId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRoleById(id: string): Promise<Role> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async updateRole(id: string, data: { name?: string; description?: string }): Promise<Role> {
    await this.findRoleById(id);
    return this.prisma.role.update({
      where: { id },
      data,
    });
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.findRoleById(id);
    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system role');
    }
    await this.prisma.role.delete({
      where: { id },
    });
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });
    if (existing) {
      return; // Already assigned
    }

    await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });
  }

  async assignRoleToUser(tenantUserId: string, roleId: string): Promise<void> {
    const existing = await this.prisma.tenantUserRole.findUnique({
      where: {
        tenantUserId_roleId: { tenantUserId, roleId },
      },
    });
    if (existing) {
      return; // Already assigned
    }

    await this.prisma.tenantUserRole.create({
      data: {
        tenantUserId,
        roleId,
      },
    });
  }

  async removeRoleFromUser(tenantUserId: string, roleId: string): Promise<void> {
    await this.prisma.tenantUserRole.delete({
      where: {
        tenantUserId_roleId: { tenantUserId, roleId },
      },
    });
  }

  async findAllPermissions(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }
}
