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
  UploadedFile,
  UseInterceptors as UseNestInterceptors,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { LeadService } from './lead.service';
import { CreateLeadDto } from '@ydm-platform/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('CRM - Leads')
@ApiBearerAuth()
@Controller('leads')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class LeadController {
  constructor(@Inject(LeadService) private readonly leadService: LeadService) {}

  @Post()
  @RequirePermissions('lead:write')
  @ApiOperation({ summary: 'Create lead' })
  create(@Body() createLeadDto: CreateLeadDto, @TenantId() tenantId: string) {
    return this.leadService.create(tenantId, createLeadDto);
  }

  @Get()
  @RequirePermissions('lead:read')
  @ApiOperation({ summary: 'List leads' })
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.leadService.findAll(tenantId, { status, source, q, page: pageNum, limit: limitNum });
  }

  @Get(':id')
  @RequirePermissions('lead:read')
  @ApiOperation({ summary: 'Get lead by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.leadService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('lead:write')
  @ApiOperation({ summary: 'Update lead' })
  update(@Param('id') id: string, @Body() data: any, @TenantId() tenantId: string) {
    return this.leadService.update(tenantId, id, data);
  }

  @Delete(':id')
  @RequirePermissions('lead:delete')
  @ApiOperation({ summary: 'Delete lead' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.leadService.remove(tenantId, id);
  }

  @Post('import')
  @RequirePermissions('lead:write')
  @UseNestInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import lead data from CSV/Excel file' })
  async importFromFile(
    @UploadedFile() file: Express.Multer.File,
    @TenantId() tenantId: string
  ) {
    return this.leadService.importFromFile(tenantId, file);
  }

  @Post('sync')
  @RequirePermissions('lead:write')
  @ApiOperation({ summary: 'Sync lead data from external API' })
  async syncFromApi(
    @Body() syncConfig: { apiUrl: string; apiKey: string; syncFrequency?: string },
    @TenantId() tenantId: string
  ) {
    return this.leadService.syncFromApi(tenantId, syncConfig);
  }
}
