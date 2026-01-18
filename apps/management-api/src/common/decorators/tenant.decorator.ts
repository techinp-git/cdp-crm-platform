import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  // Use request.tenantId set by TenantContextInterceptor (from x-tenant-id header for super admin)
  // Fallback to user.tenantId from JWT for regular users
  return request.tenantId || request.user?.tenantId;
});

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
