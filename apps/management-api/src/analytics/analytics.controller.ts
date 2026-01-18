import { Controller, Get, Query, UseGuards, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'Get dashboard KPIs' })
  getDashboardKPIs(@TenantId() tenantId: string) {
    return this.analyticsService.getDashboardKPIs(tenantId);
  }

  @Get('deal-pipeline')
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'Get deal pipeline data' })
  getDealPipeline(@TenantId() tenantId: string) {
    return this.analyticsService.getDealPipeline(tenantId);
  }

  @Get('customer-growth')
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'Get customer growth data' })
  getCustomerGrowth(@TenantId() tenantId: string, @Query('days') days?: string) {
    return this.analyticsService.getCustomerGrowth(tenantId, days ? parseInt(days) : 30);
  }
}
