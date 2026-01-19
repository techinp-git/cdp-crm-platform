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
import { ContactService } from './contact.service';
import { Contact } from '@ydm-platform/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('CRM - Contacts')
@ApiBearerAuth()
@Controller('contacts')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class ContactController {
  constructor(@Inject(ContactService) private readonly contactService: ContactService) {}

  @Post()
  @RequirePermissions('contact:write')
  @ApiOperation({ summary: 'Create contact' })
  create(@Body() data: Partial<Contact>, @TenantId() tenantId: string) {
    return this.contactService.create(tenantId, data);
  }

  @Get()
  @RequirePermissions('contact:read')
  @ApiOperation({ summary: 'List contacts' })
  findAll(
    @TenantId() tenantId: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.contactService.findAll(tenantId, { customerId, search, page: pageNum, limit: limitNum });
  }

  @Get(':id')
  @RequirePermissions('contact:read')
  @ApiOperation({ summary: 'Get contact by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.contactService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('contact:write')
  @ApiOperation({ summary: 'Update contact' })
  update(@Param('id') id: string, @Body() data: Partial<Contact>, @TenantId() tenantId: string) {
    return this.contactService.update(tenantId, id, data);
  }

  @Delete(':id')
  @RequirePermissions('contact:delete')
  @ApiOperation({ summary: 'Delete contact' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.contactService.remove(tenantId, id);
  }

  @Post('import')
  @RequirePermissions('contact:write')
  @UseNestInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import contacts from CSV file' })
  async importFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('customerId') customerId: string,
    @TenantId() tenantId: string,
  ) {
    if (!customerId) {
      throw new BadRequestException('Customer ID is required');
    }
    return this.contactService.importFromFile(tenantId, customerId, file);
  }

  @Post('sync')
  @RequirePermissions('contact:write')
  @ApiOperation({ summary: 'Sync contacts from external API' })
  async syncFromApi(
    @Body() syncConfig: { apiUrl: string; apiKey: string; customerId: string; syncFrequency?: string },
    @TenantId() tenantId: string,
  ) {
    if (!syncConfig.customerId) {
      throw new BadRequestException('Customer ID is required');
    }
    return this.contactService.syncFromApi(tenantId, syncConfig.customerId, syncConfig);
  }
}
