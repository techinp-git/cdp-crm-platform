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
import { TagService } from './tag.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('CDP - Tags')
@ApiBearerAuth()
@Controller('tags')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class TagController {
  constructor(@Inject(TagService) private readonly tagService: TagService) {}

  @Post()
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Create tag' })
  create(@Body() body: { name: string; color?: string; description?: string }, @TenantId() tenantId: string) {
    return this.tagService.create(tenantId, body);
  }

  @Get()
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'List tags' })
  findAll(@TenantId() tenantId: string) {
    return this.tagService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get tag by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tagService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Update tag' })
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; color?: string; description?: string },
    @TenantId() tenantId: string
  ) {
    return this.tagService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('customer:delete')
  @ApiOperation({ summary: 'Delete tag' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tagService.remove(tenantId, id);
  }

  @Post('customers/:customerId/tags/:tagId')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Assign tag to customer' })
  assignTag(@Param('customerId') customerId: string, @Param('tagId') tagId: string, @TenantId() tenantId: string) {
    return this.tagService.assignTagToCustomer(tenantId, customerId, tagId);
  }

  @Delete('customers/:customerId/tags/:tagId')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Remove tag from customer' })
  removeTag(@Param('customerId') customerId: string, @Param('tagId') tagId: string, @TenantId() tenantId: string) {
    return this.tagService.removeTagFromCustomer(tenantId, customerId, tagId);
  }
}
