import { Controller, Get, Param, Query, UseGuards, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class AuditLogController {
  constructor(@Inject(AuditLogService) private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermissions('audit_log:read')
  @ApiOperation({ summary: 'List audit logs' })
  findAll(
    @TenantId() tenantId: string | undefined,
    @CurrentUser() user: any,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const targetTenantId = user.isSuperAdmin ? undefined : tenantId;
    return this.auditLogService.findAll(targetTenantId, {
      entity,
      action,
      actorUserId,
      q,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get(':id')
  @RequirePermissions('audit_log:read')
  @ApiOperation({ summary: 'Get audit log by ID' })
  findOne(@Param('id') id: string) {
    return this.auditLogService.findOne(id);
  }
}
