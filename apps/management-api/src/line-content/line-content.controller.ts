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
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';
import { LineContentService } from './line-content.service';

@ApiTags('LINE Content')
@ApiBearerAuth()
@Controller('line-contents')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class LineContentController {
  constructor(@Inject(LineContentService) private readonly lineContentService: LineContentService) {}

  @Post()
  @RequirePermissions('line-content:write')
  @ApiOperation({ summary: 'Create LINE content' })
  create(@Body() dto: any, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.lineContentService.create(tenantId, dto);
  }

  @Get()
  @RequirePermissions('line-content:read')
  @ApiOperation({ summary: 'List LINE contents' })
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
    return this.lineContentService.findAll(tenantId, { type, status, q, page: pageNum, limit: limitNum });
  }

  @Get(':id')
  @RequirePermissions('line-content:read')
  @ApiOperation({ summary: 'Get LINE content by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.lineContentService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('line-content:write')
  @ApiOperation({ summary: 'Update LINE content' })
  update(@Param('id') id: string, @Body() dto: any, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.lineContentService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('line-content:delete')
  @ApiOperation({ summary: 'Delete LINE content' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.lineContentService.remove(tenantId, id);
  }
}

