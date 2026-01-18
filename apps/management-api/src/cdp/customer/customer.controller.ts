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
import { CustomerService } from './customer.service';
import { CreateCustomerDto, CreateCustomerEventDto } from '@ydm-platform/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../../common/interceptors/tenant-context.interceptor';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('CDP - Customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class CustomerController {
  constructor(@Inject(CustomerService) private readonly customerService: CustomerService) {}

  @Post()
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Create customer' })
  create(@Body() createCustomerDto: CreateCustomerDto, @TenantId() tenantId: string) {
    return this.customerService.create(tenantId, createCustomerDto);
  }

  @Get()
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'List customers' })
  findAll(
    @TenantId() tenantId: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.customerService.findAll(tenantId, { type, search, page: pageNum, limit: limitNum });
  }

  @Get(':id')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get customer by ID (360 view)' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.customerService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Update customer' })
  update(
    @Param('id') id: string,
    @Body() data: Partial<CreateCustomerDto>,
    @TenantId() tenantId: string
  ) {
    return this.customerService.update(tenantId, id, data);
  }

  @Delete(':id')
  @RequirePermissions('customer:delete')
  @ApiOperation({ summary: 'Delete customer' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.customerService.remove(tenantId, id);
  }

  @Post(':id/events')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Create customer event' })
  createEvent(
    @Param('id') customerId: string,
    @Body() createEventDto: Omit<CreateCustomerEventDto, 'customerId'>,
    @TenantId() tenantId: string
  ) {
    return this.customerService.createEvent(tenantId, { ...createEventDto, customerId });
  }

  @Get(':id/events')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get customer events' })
  getEvents(@Param('id') customerId: string, @TenantId() tenantId: string) {
    return this.customerService.getEvents(tenantId, customerId);
  }

  @Post('erp/import')
  @RequirePermissions('customer:write')
  @UseNestInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import customer data from CSV/Excel file (ERP)' })
  async importFromFile(
    @UploadedFile() file: Express.Multer.File,
    @TenantId() tenantId: string
  ) {
    return this.customerService.importFromFile(tenantId, file);
  }

  @Post('erp/sync')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Sync customer data from external ERP API' })
  async syncFromApi(
    @Body() syncConfig: { apiUrl: string; apiKey: string; syncFrequency?: string },
    @TenantId() tenantId: string
  ) {
    return this.customerService.syncFromApi(tenantId, syncConfig);
  }
}
