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
import { QuotationService } from './quotation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Quotations')
@ApiBearerAuth()
@Controller('quotations')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class QuotationController {
  constructor(@Inject(QuotationService) private readonly quotationService: QuotationService) {}

  @Post()
  @RequirePermissions('quotation:write')
  @ApiOperation({ summary: 'Create quotation' })
  create(@Body() createQuotationDto: any, @TenantId() tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.quotationService.create(tenantId, createQuotationDto);
  }

  @Get()
  @RequirePermissions('quotation:read')
  @ApiOperation({ summary: 'List quotations' })
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
    return this.quotationService.findAll(tenantId, { 
      status, 
      page: pageNum, 
      limit: limitNum 
    });
  }

  @Get(':id')
  @RequirePermissions('quotation:read')
  @ApiOperation({ summary: 'Get quotation by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.quotationService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('quotation:write')
  @ApiOperation({ summary: 'Update quotation' })
  update(@Param('id') id: string, @Body() data: any, @TenantId() tenantId: string) {
    return this.quotationService.update(tenantId, id, data);
  }

  @Delete(':id')
  @RequirePermissions('quotation:delete')
  @ApiOperation({ summary: 'Delete quotation' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.quotationService.remove(tenantId, id);
  }

  @Post('import')
  @RequirePermissions('quotation:write')
  @UseNestInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import quotation data from CSV/Excel file' })
  async importFromFile(@UploadedFile() file: Express.Multer.File, @TenantId() tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.quotationService.importFromFile(tenantId, file);
  }

  @Post('sync')
  @RequirePermissions('quotation:write')
  @ApiOperation({ summary: 'Sync quotation data from external API' })
  async syncFromApi(
    @Body() syncConfig: { apiUrl: string; apiKey: string; syncFrequency?: string },
    @TenantId() tenantId: string
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.quotationService.syncFromApi(tenantId, syncConfig);
  }
}
