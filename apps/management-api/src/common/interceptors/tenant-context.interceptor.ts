import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    // For super admin, allow explicit tenant_id via header, query, or body
    // Header "x-tenant-id" is used for admin portal tenant switcher
    if (user.isSuperAdmin) {
      const tenantId = request.headers['x-tenant-id'] || request.query?.tenantId || request.body?.tenantId;
      if (tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
        });
        if (!tenant) {
          throw new BadRequestException('Invalid tenant_id');
        }
        request.tenantId = tenantId;
      }
      return next.handle();
    }

    // For tenant users, check x-tenant-id header first (if user has multiple tenants)
    // Otherwise use tenant_id from JWT
    const headerTenantId = request.headers['x-tenant-id'] || request.query?.tenantId;
    if (headerTenantId && !user.isSuperAdmin) {
      // Verify user is a member of the requested tenant
      const tenantUser = await this.prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId: headerTenantId,
            userId: user.id,
          },
        },
      });
      if (tenantUser && tenantUser.status === 'ACTIVE') {
        request.tenantId = headerTenantId;
        return next.handle();
      }
    }

    // Fallback to tenant_id from JWT for regular users
    if (user.tenantId) {
      request.tenantId = user.tenantId;
    }

    return next.handle();
  }
}
