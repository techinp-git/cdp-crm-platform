import { BadRequestException, Controller, Get, Inject, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';
import { ProfileExplorerService } from './profile-explorer.service';

@ApiTags('Profile Explorer')
@ApiBearerAuth()
@Controller('profiles')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class ProfileExplorerController {
  constructor(@Inject(ProfileExplorerService) private readonly service: ProfileExplorerService) {}

  @Get()
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'List customer profiles (Profile Explorer)' })
  list(@TenantId() tenantId: string, @Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listProfiles(tenantId, {
      q: q || undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
    });
  }

  @Get(':id')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get profile detail (billing vs tracked)' })
  detail(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.getProfileDetail(tenantId, id);
  }
}

