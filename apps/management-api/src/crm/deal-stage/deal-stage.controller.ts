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
import { DealStageService } from './deal-stage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('CRM - Deal Stages')
@ApiBearerAuth()
@Controller('deal-stages')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class DealStageController {
  constructor(@Inject(DealStageService) private readonly dealStageService: DealStageService) {}

  @Post()
  @RequirePermissions('deal:write')
  @ApiOperation({ summary: 'Create deal stage' })
  create(
    @Body() body: {
      name: string;
      order: number;
      probability?: number;
      isDefault?: boolean;
      isWon?: boolean;
      isLost?: boolean;
    },
    @TenantId() tenantId: string
  ) {
    return this.dealStageService.create(tenantId, body);
  }

  @Get()
  @RequirePermissions('deal:read')
  @ApiOperation({ summary: 'List deal stages' })
  findAll(@TenantId() tenantId: string) {
    return this.dealStageService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('deal:read')
  @ApiOperation({ summary: 'Get deal stage by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.dealStageService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('deal:write')
  @ApiOperation({ summary: 'Update deal stage' })
  update(@Param('id') id: string, @Body() data: any, @TenantId() tenantId: string) {
    return this.dealStageService.update(tenantId, id, data);
  }

  @Delete(':id')
  @RequirePermissions('deal:delete')
  @ApiOperation({ summary: 'Delete deal stage' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.dealStageService.remove(tenantId, id);
  }
}
