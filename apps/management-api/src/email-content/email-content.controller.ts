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
import { EmailContentService } from './email-content.service';

@ApiTags('Email Content')
@ApiBearerAuth()
@Controller('email-contents')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class EmailContentController {
  constructor(@Inject(EmailContentService) private readonly emailContentService: EmailContentService) {}

  @Post()
  @RequirePermissions('email-content:write')
  @ApiOperation({ summary: 'Create Email content' })
  create(@Body() dto: any, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.emailContentService.create(tenantId, dto);
  }

  @Get()
  @RequirePermissions('email-content:read')
  @ApiOperation({ summary: 'List Email contents' })
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
    return this.emailContentService.findAll(tenantId, { type, status, q, page: pageNum, limit: limitNum });
  }

  @Get(':id')
  @RequirePermissions('email-content:read')
  @ApiOperation({ summary: 'Get Email content by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.emailContentService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('email-content:write')
  @ApiOperation({ summary: 'Update Email content' })
  update(@Param('id') id: string, @Body() dto: any, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.emailContentService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('email-content:delete')
  @ApiOperation({ summary: 'Delete Email content' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.emailContentService.remove(tenantId, id);
  }
}

