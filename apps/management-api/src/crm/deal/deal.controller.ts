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
import { DealService } from './deal.service';
import { CreateDealDto, UpdateDealDto } from '@ydm-platform/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('CRM - Deals')
@ApiBearerAuth()
@Controller('deals')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class DealController {
  constructor(@Inject(DealService) private readonly dealService: DealService) {}

  @Post()
  @RequirePermissions('deal:write')
  @ApiOperation({ summary: 'Create deal' })
  create(@Body() createDealDto: CreateDealDto, @TenantId() tenantId: string) {
    return this.dealService.create(tenantId, createDealDto);
  }

  @Get()
  @RequirePermissions('deal:read')
  @ApiOperation({ summary: 'List deals (kanban data)' })
  findAll(
    @TenantId() tenantId: string,
    @Query('stageId') stageId?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string
  ) {
    return this.dealService.findAll(tenantId, { stageId, status, customerId });
  }

  @Get(':id')
  @RequirePermissions('deal:read')
  @ApiOperation({ summary: 'Get deal by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.dealService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('deal:write')
  @ApiOperation({ summary: 'Update deal' })
  update(@Param('id') id: string, @Body() updateDealDto: UpdateDealDto, @TenantId() tenantId: string) {
    return this.dealService.update(tenantId, id, updateDealDto);
  }

  @Delete(':id')
  @RequirePermissions('deal:delete')
  @ApiOperation({ summary: 'Delete deal' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.dealService.remove(tenantId, id);
  }
}
