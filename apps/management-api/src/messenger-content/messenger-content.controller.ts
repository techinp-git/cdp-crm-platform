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
import { MessengerContentService } from './messenger-content.service';

@ApiTags('Messenger Content')
@ApiBearerAuth()
@Controller('messenger-contents')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class MessengerContentController {
  constructor(@Inject(MessengerContentService) private readonly messengerContentService: MessengerContentService) {}

  @Post()
  @RequirePermissions('messenger-content:write')
  @ApiOperation({ summary: 'Create Messenger content' })
  create(@Body() dto: any, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.messengerContentService.create(tenantId, dto);
  }

  @Get()
  @RequirePermissions('messenger-content:read')
  @ApiOperation({ summary: 'List Messenger contents' })
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
    return this.messengerContentService.findAll(tenantId, { type, status, q, page: pageNum, limit: limitNum });
  }

  @Get(':id')
  @RequirePermissions('messenger-content:read')
  @ApiOperation({ summary: 'Get Messenger content by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.messengerContentService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('messenger-content:write')
  @ApiOperation({ summary: 'Update Messenger content' })
  update(@Param('id') id: string, @Body() dto: any, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.messengerContentService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('messenger-content:delete')
  @ApiOperation({ summary: 'Delete Messenger content' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.messengerContentService.remove(tenantId, id);
  }
}

