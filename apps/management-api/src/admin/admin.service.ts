import { Injectable, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async getAdminInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantUsers: {
          where: { status: 'ACTIVE' },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                status: true,
              },
            },
            roles: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const memberships = user.tenantUsers.map((tu) => ({
      tenantId: tu.tenant.id,
      tenantName: tu.tenant.name,
      tenantSlug: tu.tenant.slug,
      tenantType: tu.tenant.type,
      tenantStatus: tu.tenant.status,
      roles: tu.roles.map((tur) => ({
        id: tur.role.id,
        name: tur.role.name,
        slug: tur.role.slug,
      })),
      status: tu.status,
    }));

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isSuperAdmin: user.isSuperAdmin,
      status: user.status,
      memberships,
      allowedTenants: memberships.map((m) => m.tenantId),
    };
  }

  async getAccessibleTenants(userId: string, isSuperAdmin: boolean) {
    if (isSuperAdmin) {
      // Super admin can access all tenants
      const tenants = await this.prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          status: true,
          plan: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return tenants;
    }

    // Non-super admin can only access tenants they belong to
    const tenantUsers = await this.prisma.tenantUser.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            status: true,
            plan: true,
            createdAt: true,
          },
        },
      },
    });

    return tenantUsers.map((tu) => tu.tenant);
  }

  async getTenantUsers(tenantId: string, userId: string, isSuperAdmin: boolean) {
    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check access (unless super admin)
    if (!isSuperAdmin) {
      const tenantUser = await this.prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId,
          },
        },
      });

      if (!tenantUser || tenantUser.status !== 'ACTIVE') {
        throw new ForbiddenException('Access denied to this tenant');
      }
    }

    // Get all users in this tenant
    const tenantUsers = await this.prisma.tenantUser.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            isSuperAdmin: true,
          },
        },
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    return tenantUsers.map((tu) => ({
      id: tu.user.id,
      email: tu.user.email,
      firstName: tu.user.firstName,
      lastName: tu.user.lastName,
      status: tu.user.status,
      isSuperAdmin: tu.user.isSuperAdmin,
      tenantMembership: {
        id: tu.id,
        status: tu.status,
        roles: tu.roles.map((tur) => ({
          id: tur.role.id,
          name: tur.role.name,
          slug: tur.role.slug,
        })),
      },
    }));
  }

  async getTenantRoles(tenantId: string, userId: string, isSuperAdmin: boolean) {
    // Verify tenant exists and user has access
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!isSuperAdmin) {
      const tenantUser = await this.prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId,
          },
        },
      });

      if (!tenantUser || tenantUser.status !== 'ACTIVE') {
        throw new ForbiddenException('Access denied to this tenant');
      }
    }

    // Get all roles for this tenant
    const roles = await this.prisma.role.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isSystem: true,
      },
      orderBy: { name: 'asc' },
    });

    return roles;
  }

  async assignUserToTenantWithRole(
    userId: string,
    tenantId: string,
    roleId: string,
    requestingUserId: string,
    isSuperAdmin: boolean,
  ) {
    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify role exists and belongs to tenant
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.tenantId !== tenantId) {
      throw new NotFoundException('Role not found in this tenant');
    }

    // Check access (unless super admin)
    if (!isSuperAdmin) {
      const tenantUser = await this.prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: requestingUserId,
          },
        },
      });

      if (!tenantUser || tenantUser.status !== 'ACTIVE') {
        throw new ForbiddenException('Access denied to this tenant');
      }
    }

    // Get or create TenantUser
    let tenantUser = await this.prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
    });

    if (!tenantUser) {
      tenantUser = await this.prisma.tenantUser.create({
        data: {
          tenantId,
          userId,
        },
      });
    }

    // Assign role to TenantUser
    const existingRoleAssignment = await this.prisma.tenantUserRole.findUnique({
      where: {
        tenantUserId_roleId: {
          tenantUserId: tenantUser.id,
          roleId,
        },
      },
    });

    if (!existingRoleAssignment) {
      await this.prisma.tenantUserRole.create({
        data: {
          tenantUserId: tenantUser.id,
          roleId,
        },
      });
    }

    return {
      tenantUserId: tenantUser.id,
      userId: user.id,
      tenantId: tenant.id,
      roleId: role.id,
      message: 'User assigned to tenant with role',
    };
  }

  async getAdminStats(): Promise<any> {
    const [totalTenants, activeTenants, totalUsers] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count(),
    ]);

    return {
      totalTenants,
      activeTenants,
      totalUsers,
    };
  }
}
