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
import { SegmentService } from './segment.service';
import { CreateSegmentDto } from '@ydm-platform/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('CDP - Segments')
@ApiBearerAuth()
@Controller('segments')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class SegmentController {
  constructor(@Inject(SegmentService) private readonly segmentService: SegmentService) {}

  @Post()
  @RequirePermissions('segment:write')
  @ApiOperation({ summary: 'Create segment' })
  create(@Body() createSegmentDto: CreateSegmentDto, @TenantId() tenantId: string) {
    return this.segmentService.create(tenantId, createSegmentDto);
  }

  @Get()
  @RequirePermissions('segment:read')
  @ApiOperation({ summary: 'List segments' })
  findAll(@TenantId() tenantId: string) {
    return this.segmentService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('segment:read')
  @ApiOperation({ summary: 'Get segment by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.segmentService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('segment:write')
  @ApiOperation({ summary: 'Update segment' })
  update(
    @Param('id') id: string,
    @Body() data: Partial<CreateSegmentDto>,
    @TenantId() tenantId: string
  ) {
    return this.segmentService.update(tenantId, id, data);
  }

  @Delete(':id')
  @RequirePermissions('segment:delete')
  @ApiOperation({ summary: 'Delete segment' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.segmentService.remove(tenantId, id);
  }
}
