import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto, UpdateTenantDto } from '@ydm-platform/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class TenantController {
  constructor(@Inject(TenantService) private readonly tenantService: TenantService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current tenant (tenant user self-service)' })
  findMe(@TenantId() tenantId?: string) {
    if (!tenantId) {
      throw new BadRequestException('Tenant not found');
    }
    return this.tenantService.findOne(tenantId);
  }

  @Post()
  @RequirePermissions('tenant:write')
  @ApiOperation({ summary: 'Create tenant (Super Admin only)' })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  @RequirePermissions('tenant:read')
  @ApiOperation({ summary: 'List all tenants' })
  findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  @RequirePermissions('tenant:read')
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('tenant:write')
  @ApiOperation({ summary: 'Update tenant' })
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @RequirePermissions('tenant:delete')
  @ApiOperation({ summary: 'Delete tenant' })
  remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }
}
