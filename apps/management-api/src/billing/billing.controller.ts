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
import { BillingService } from './billing.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { CurrentUser, TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Billings')
@ApiBearerAuth()
@Controller('billings')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class BillingController {
  constructor(
    @Inject(BillingService) private readonly billingService: BillingService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService,
  ) {}

  @Get('insights/summary')
  @RequirePermissions('billing:read')
  @ApiOperation({ summary: 'Billing product insights (category summary & top products)' })
  insights(@TenantId() tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.billingService.insights(tenantId);
  }

  @Post()
  @RequirePermissions('billing:write')
  @ApiOperation({ summary: 'Create billing' })
  create(@Body() createBillingDto: any, @TenantId() tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.billingService.create(tenantId, createBillingDto);
  }

  @Get()
  @RequirePermissions('billing:read')
  @ApiOperation({ summary: 'List billings' })
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.billingService.findAll(tenantId, { 
      status, 
      page: pageNum, 
      limit: limitNum 
    });
  }

  @Get(':id')
  @RequirePermissions('billing:read')
  @ApiOperation({ summary: 'Get billing by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.billingService.findOne(tenantId, id);
  }

  @Get(':id/lines')
  @RequirePermissions('billing:read')
  @ApiOperation({ summary: 'List billing lines (details)' })
  listLines(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.billingService.listLines(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('billing:write')
  @ApiOperation({ summary: 'Update billing' })
  update(@Param('id') id: string, @Body() data: any, @TenantId() tenantId: string) {
    return this.billingService.update(tenantId, id, data);
  }

  @Delete(':id')
  @RequirePermissions('billing:delete')
  @ApiOperation({ summary: 'Delete billing' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.billingService.remove(tenantId, id);
  }

  @Post('import')
  @RequirePermissions('billing:write')
  @UseNestInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import billing data from CSV/Excel file' })
  async importFromFile(@UploadedFile() file: Express.Multer.File, @TenantId() tenantId: string, @CurrentUser() user: any) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    const startedAt = Date.now();
    try {
      const result = await this.billingService.importFromFile(tenantId, file);
      await this.auditLog.create({
        tenantId,
        actorUserId: user?.id,
        action: 'IMPORT',
        entity: 'import_job',
        entityId: 'billing',
        payload: {
          module: 'billing',
          endpoint: '/billings/import',
          fileName: file?.originalname,
          fileSize: file?.size,
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
        entityId: 'billing',
        payload: {
          module: 'billing',
          endpoint: '/billings/import',
          fileName: file?.originalname,
          fileSize: file?.size,
          durationMs: Date.now() - startedAt,
          errorMessage: e?.message || 'Import failed',
        },
      });
      throw e;
    }
  }

  @Post('sync')
  @RequirePermissions('billing:write')
  @ApiOperation({ summary: 'Sync billing data from external API' })
  async syncFromApi(
    @Body() syncConfig: { apiUrl: string; apiKey: string; syncFrequency?: string },
    @TenantId() tenantId: string
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.billingService.syncFromApi(tenantId, syncConfig);
  }
}
