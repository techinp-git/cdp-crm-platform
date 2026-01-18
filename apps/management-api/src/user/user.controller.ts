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
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from '@ydm-platform/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class UserController {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Post()
  @RequirePermissions('user:write')
  @ApiOperation({ summary: 'Create user' })
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: any, @Query('tenantId') tenantId?: string) {
    const targetTenantId = user.isSuperAdmin ? tenantId : user.tenantId;
    return this.userService.create(createUserDto, targetTenantId);
  }

  @Get()
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'List users' })
  findAll(@CurrentUser() user: any, @Query('tenantId') tenantId?: string) {
    const targetTenantId = user.isSuperAdmin ? tenantId : user.tenantId;
    return this.userService.findAll(targetTenantId);
  }

  @Get(':id')
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('user:write')
  @ApiOperation({ summary: 'Update user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @RequirePermissions('user:delete')
  @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Post(':id/tenants/:tenantId')
  @RequirePermissions('user:write')
  @ApiOperation({ summary: 'Add user to tenant' })
  addToTenant(@Param('id') id: string, @Param('tenantId') tenantId: string) {
    return this.userService.addToTenant(id, tenantId);
  }

  @Delete(':id/tenants/:tenantId')
  @RequirePermissions('user:write')
  @ApiOperation({ summary: 'Remove user from tenant' })
  removeFromTenant(@Param('id') id: string, @Param('tenantId') tenantId: string) {
    return this.userService.removeFromTenant(id, tenantId);
  }
}
