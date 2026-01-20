import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from '../audit-log/audit-log.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { CurrentUser, TenantId } from '../common/decorators/tenant.decorator';
import { CsatDataService } from './csat-data.service';

@ApiTags('CSAT Data')
@ApiBearerAuth()
@Controller('csat-data')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class CsatDataController {
  constructor(
    @Inject(CsatDataService) private readonly service: CsatDataService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @RequirePermissions('csat:read')
  @ApiOperation({ summary: 'List CSAT responses' })
  list(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('project') project?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('minScore') minScore?: string,
    @Query('maxScore') maxScore?: string,
    @Query('channel') channel?: string,
    @Query('feedbackCategory') feedbackCategory?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.list(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      q: search,
      project,
      dateFrom,
      dateTo,
      minScore,
      maxScore,
      channel,
      feedbackCategory,
    });
  }

  @Get('projects')
  @RequirePermissions('csat:read')
  @ApiOperation({ summary: 'Project summary' })
  projects(
    @TenantId() tenantId: string,
    @Query('search') search?: string,
    @Query('project') project?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('minScore') minScore?: string,
    @Query('maxScore') maxScore?: string,
    @Query('channel') channel?: string,
    @Query('feedbackCategory') feedbackCategory?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.projectSummary(tenantId, { q: search, project, dateFrom, dateTo, minScore, maxScore, channel, feedbackCategory });
  }

  @Get('customer-project')
  @RequirePermissions('csat:read')
  @ApiOperation({ summary: 'Customer scores per project' })
  customerProject(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('project') project?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('minScore') minScore?: string,
    @Query('maxScore') maxScore?: string,
    @Query('channel') channel?: string,
    @Query('feedbackCategory') feedbackCategory?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.customerProjectSummary(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      q: search,
      project,
      dateFrom,
      dateTo,
      minScore,
      maxScore,
      channel,
      feedbackCategory,
    });
  }

  @Post('import')
  @RequirePermissions('csat:write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import CSAT data from CSV' })
  async import(@TenantId() tenantId: string, @CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    if (!file) throw new BadRequestException('file is required');
    const startedAt = Date.now();
    try {
      const result = await this.service.importCsv(tenantId, file);
      await this.auditLog.create({
        tenantId,
        actorUserId: user?.id,
        action: 'IMPORT',
        entity: 'import_job',
        entityId: 'csat-data',
        payload: {
          module: 'csat',
          endpoint: '/csat-data/import',
          fileName: file.originalname,
          fileSize: file.size,
          durationMs: Date.now() - startedAt,
          result,
        },
      });
      return result;
    } catch (e: any) {
      await this.auditLog.create({
        tenantId,
        actorUserId: user?.id,
        action: 'IMPORT',
        entity: 'import_job',
        entityId: 'csat-data',
        payload: {
          module: 'csat',
          endpoint: '/csat-data/import',
          fileName: file.originalname,
          fileSize: file.size,
          durationMs: Date.now() - startedAt,
          errorMessage: e?.message || 'Import failed',
        },
      });
      throw e;
    }
  }

  @Post('sync')
  @RequirePermissions('csat:write')
  @ApiOperation({ summary: 'Sync CSAT data (placeholder)' })
  async sync(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return { success: 0, failed: 0, errors: [], message: 'Not implemented yet' };
  }
}

