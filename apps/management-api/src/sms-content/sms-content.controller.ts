import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';
import { SmsContentService } from './sms-content.service';

@ApiTags('SMS Content')
@ApiBearerAuth()
@Controller('sms-contents')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class SmsContentController {
  constructor(@Inject(SmsContentService) private readonly smsContentService: SmsContentService) {}

  @Post()
  @RequirePermissions('sms-content:write')
  @ApiOperation({ summary: 'Create SMS content' })
  create(@Body() dto: any, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.smsContentService.create(tenantId, dto);
  }

  @Get()
  @RequirePermissions('sms-content:read')
  @ApiOperation({ summary: 'List SMS contents' })
  findAll(
    @TenantId() tenantId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.smsContentService.findAll(tenantId, { type, status, q, page: pageNum, limit: limitNum });
  }

  @Get(':id')
  @RequirePermissions('sms-content:read')
  @ApiOperation({ summary: 'Get SMS content by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.smsContentService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('sms-content:write')
  @ApiOperation({ summary: 'Update SMS content' })
  update(@Param('id') id: string, @Body() dto: any, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.smsContentService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('sms-content:delete')
  @ApiOperation({ summary: 'Delete SMS content' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.smsContentService.remove(tenantId, id);
  }
}

