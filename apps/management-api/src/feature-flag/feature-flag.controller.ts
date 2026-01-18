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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeatureFlagService } from './feature-flag.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Feature Flags')
@ApiBearerAuth()
@Controller('feature-flags')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class FeatureFlagController {
  constructor(@Inject(FeatureFlagService) private readonly featureFlagService: FeatureFlagService) {}

  @Post()
  @RequirePermissions('feature_flag:write')
  @ApiOperation({ summary: 'Create feature flag' })
  create(@Body() body: { key: string; enabled?: boolean; metadata?: any }, @TenantId() tenantId: string) {
    return this.featureFlagService.create(tenantId, body.key, body.enabled, body.metadata);
  }

  @Get()
  @RequirePermissions('feature_flag:read')
  @ApiOperation({ summary: 'List feature flags' })
  findAll(@TenantId() tenantId: string) {
    return this.featureFlagService.findAll(tenantId);
  }

  @Get(':key')
  @RequirePermissions('feature_flag:read')
  @ApiOperation({ summary: 'Get feature flag by key' })
  findOne(@Param('key') key: string, @TenantId() tenantId: string) {
    return this.featureFlagService.findOne(tenantId, key);
  }

  @Get(':key/enabled')
  @RequirePermissions('feature_flag:read')
  @ApiOperation({ summary: 'Check if feature flag is enabled' })
  async isEnabled(@Param('key') key: string, @TenantId() tenantId: string) {
    const enabled = await this.featureFlagService.isEnabled(tenantId, key);
    return { enabled };
  }

  @Patch(':key')
  @RequirePermissions('feature_flag:write')
  @ApiOperation({ summary: 'Update feature flag' })
  update(
    @Param('key') key: string,
    @Body() body: { enabled: boolean; metadata?: any },
    @TenantId() tenantId: string
  ) {
    return this.featureFlagService.update(tenantId, key, body.enabled, body.metadata);
  }

  @Delete(':key')
  @RequirePermissions('feature_flag:delete')
  @ApiOperation({ summary: 'Delete feature flag' })
  remove(@Param('key') key: string, @TenantId() tenantId: string) {
    return this.featureFlagService.remove(tenantId, key);
  }
}
