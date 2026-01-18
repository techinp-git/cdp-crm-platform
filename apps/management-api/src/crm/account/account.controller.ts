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
import { AccountService } from './account.service';
import { Account } from '@ydm-platform/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('CRM - Accounts')
@ApiBearerAuth()
@Controller('accounts')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class AccountController {
  constructor(@Inject(AccountService) private readonly accountService: AccountService) {}

  @Post()
  @RequirePermissions('account:write')
  @ApiOperation({ summary: 'Create account' })
  create(@Body() data: Partial<Account>, @TenantId() tenantId: string) {
    return this.accountService.create(tenantId, data);
  }

  @Get()
  @RequirePermissions('account:read')
  @ApiOperation({ summary: 'List accounts' })
  findAll(@TenantId() tenantId: string, @Query('type') type?: string, @Query('search') search?: string) {
    return this.accountService.findAll(tenantId, { type, search });
  }

  @Get(':id')
  @RequirePermissions('account:read')
  @ApiOperation({ summary: 'Get account by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.accountService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('account:write')
  @ApiOperation({ summary: 'Update account' })
  update(@Param('id') id: string, @Body() data: Partial<Account>, @TenantId() tenantId: string) {
    return this.accountService.update(tenantId, id, data);
  }

  @Delete(':id')
  @RequirePermissions('account:delete')
  @ApiOperation({ summary: 'Delete account' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.accountService.remove(tenantId, id);
  }
}
