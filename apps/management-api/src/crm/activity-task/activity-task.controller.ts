import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityTaskService } from './activity-task.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('CRM - Activities & Tasks')
@ApiBearerAuth()
@Controller('activities')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class ActivityTaskController {
  constructor(@Inject(ActivityTaskService) private readonly activityTaskService: ActivityTaskService) {}

  @Post()
  @RequirePermissions('activity:write')
  @ApiOperation({ summary: 'Create activity/task' })
  create(
    @Body() body: {
      type: string;
      title: string;
      description?: string;
      dueDate?: Date;
      priority?: string;
      customerId?: string;
      dealId?: string;
    },
    @TenantId() tenantId: string
  ) {
    return this.activityTaskService.create(tenantId, body);
  }

  @Get()
  @RequirePermissions('activity:read')
  @ApiOperation({ summary: 'List activities/tasks' })
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('customerId') customerId?: string,
    @Query('dealId') dealId?: string
  ) {
    return this.activityTaskService.findAll(tenantId, { status, type, customerId, dealId });
  }

  @Get(':id')
  @RequirePermissions('activity:read')
  @ApiOperation({ summary: 'Get activity by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.activityTaskService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('activity:write')
  @ApiOperation({ summary: 'Update activity' })
  update(@Param('id') id: string, @Body() data: any, @TenantId() tenantId: string) {
    return this.activityTaskService.update(tenantId, id, data);
  }

  @Post(':id/complete')
  @RequirePermissions('activity:write')
  @ApiOperation({ summary: 'Mark activity as completed' })
  complete(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.activityTaskService.complete(tenantId, id);
  }

  @Delete(':id')
  @RequirePermissions('activity:delete')
  @ApiOperation({ summary: 'Delete activity' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.activityTaskService.remove(tenantId, id);
  }
}
