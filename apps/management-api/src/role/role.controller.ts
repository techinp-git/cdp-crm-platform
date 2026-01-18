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
  Req,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { CurrentUser, TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Roles & Permissions')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class RoleController {
  constructor(@Inject(RoleService) private readonly roleService: RoleService) {}

  @Post()
  @RequirePermissions('role:write')
  @ApiOperation({ summary: 'Create role' })
  create(
    @Body() body: { name: string; slug: string; description?: string },
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    // Use tenantId from context (set by TenantContextInterceptor via x-tenant-id header)
    // For super admin creating roles for specific tenant
    const targetTenantId = tenantId || user.tenantId;
    if (!targetTenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.roleService.createRole(targetTenantId, body);
  }

  @Get()
  @RequirePermissions('role:read')
  @ApiOperation({ summary: 'List roles' })
  findAll(@CurrentUser() user: any, @TenantId() tenantId: string) {
    const targetTenantId = tenantId || user.tenantId;
    if (!targetTenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.roleService.findAllRoles(targetTenantId);
  }

  @Get('permissions')
  @RequirePermissions('role:read')
  @ApiOperation({ summary: 'List all permissions' })
  findAllPermissions() {
    return this.roleService.findAllPermissions();
  }

  @Get(':id')
  @RequirePermissions('role:read')
  @ApiOperation({ summary: 'Get role by ID' })
  findOne(@Param('id') id: string) {
    return this.roleService.findRoleById(id);
  }

  @Patch(':id')
  @RequirePermissions('role:write')
  @ApiOperation({ summary: 'Update role' })
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.roleService.updateRole(id, body);
  }

  @Delete(':id')
  @RequirePermissions('role:delete')
  @ApiOperation({ summary: 'Delete role' })
  remove(@Param('id') id: string) {
    return this.roleService.deleteRole(id);
  }

  @Post(':id/permissions/:permissionId')
  @RequirePermissions('role:write')
  @ApiOperation({ summary: 'Assign permission to role' })
  assignPermission(@Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.roleService.assignPermissionToRole(id, permissionId);
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermissions('role:write')
  @ApiOperation({ summary: 'Remove permission from role' })
  removePermission(@Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.roleService.removePermissionFromRole(id, permissionId);
  }

  @Post('users/:tenantUserId/roles/:roleId')
  @RequirePermissions('user:write')
  @ApiOperation({ summary: 'Assign role to user' })
  assignRoleToUser(@Param('tenantUserId') tenantUserId: string, @Param('roleId') roleId: string) {
    return this.roleService.assignRoleToUser(tenantUserId, roleId);
  }

  @Delete('users/:tenantUserId/roles/:roleId')
  @RequirePermissions('user:write')
  @ApiOperation({ summary: 'Remove role from user' })
  removeRoleFromUser(@Param('tenantUserId') tenantUserId: string, @Param('roleId') roleId: string) {
    return this.roleService.removeRoleFromUser(tenantUserId, roleId);
  }
}
