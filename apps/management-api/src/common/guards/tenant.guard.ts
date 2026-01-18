import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * TenantGuard ensures that the user has access to the tenant in the request.
 * - Super admin: can access any tenant (or no tenant)
 * - Regular users: can only access tenants they belong to (via TenantUser)
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.tenantId || request.params?.tenantId;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super admin bypasses tenant checks
    if (user.isSuperAdmin) {
      return true;
    }

    // If no tenant specified, allow (for global endpoints)
    if (!tenantId) {
      return true;
    }

    // Check if user is a member of this tenant
    const tenantUser = await this.prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.id,
        },
      },
    });

    if (!tenantUser || tenantUser.status !== 'ACTIVE') {
      throw new ForbiddenException('Access denied to this tenant');
    }

    return true;
  }
}
