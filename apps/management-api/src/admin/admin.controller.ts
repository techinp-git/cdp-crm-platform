import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  Headers,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { CurrentUser } from '../common/decorators/tenant.decorator';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, TenantGuard)
@UseInterceptors(TenantContextInterceptor)
export class AdminController {
  constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current admin user info with memberships' })
  async getMe(@CurrentUser() user: any) {
    return this.adminService.getAdminInfo(user.id);
  }

  @Get('tenants')
  @ApiOperation({ summary: 'Get tenants accessible to current user' })
  async getTenants(@CurrentUser() user: any) {
    return this.adminService.getAccessibleTenants(user.id, user.isSuperAdmin);
  }

  @Get('tenants/:tenantId/users')
  @ApiOperation({ summary: 'Get users in a specific tenant' })
  async getTenantUsers(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.getTenantUsers(tenantId, user.id, user.isSuperAdmin);
  }

  @Get('tenants/:tenantId/roles')
  @ApiOperation({ summary: 'Get roles in a specific tenant' })
  async getTenantRoles(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.getTenantRoles(tenantId, user.id, user.isSuperAdmin);
  }

  @Post('users/:userId/tenants/:tenantId/roles/:roleId')
  @ApiOperation({ summary: 'Assign user to tenant with role' })
  async assignUserToTenantWithRole(
    @Param('userId') userId: string,
    @Param('tenantId') tenantId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.assignUserToTenantWithRole(
      userId,
      tenantId,
      roleId,
      user.id,
      user.isSuperAdmin,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  async getAdminStats(@CurrentUser() user: any) {
    // Only super admin can access admin stats
    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Only Super Admin can access admin stats');
    }
    return this.adminService.getAdminStats();
  }
}
