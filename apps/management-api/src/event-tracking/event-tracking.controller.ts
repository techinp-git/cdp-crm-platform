import { BadRequestException, Body, Controller, Get, Inject, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';
import { EventTrackingService } from './event-tracking.service';

@ApiTags('Event Tracking')
@ApiBearerAuth()
@Controller('events')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class EventTrackingController {
  constructor(@Inject(EventTrackingService) private readonly service: EventTrackingService) {}

  @Get()
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'List customer events (Event Tracking)' })
  list(
    @TenantId() tenantId: string,
    @Query('type') type?: string,
    @Query('q') q?: string,
    @Query('customerId') customerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listEvents(tenantId, {
      type: type || undefined,
      q: q || undefined,
      customerId: customerId || undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('types')
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'List event types with counts' })
  types(@TenantId() tenantId: string, @Query('from') from?: string, @Query('to') to?: string, @Query('limit') limit?: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listEventTypes(tenantId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post()
  @RequirePermissions('analytics:write')
  @ApiOperation({ summary: 'Create customer event (manual)' })
  create(@TenantId() tenantId: string, @Body() body: { customerId: string; type: string; timestamp?: string; payload?: any }) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.createEvent(tenantId, body);
  }
}

