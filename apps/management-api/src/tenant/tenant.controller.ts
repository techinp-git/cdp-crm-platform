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
  BadRequestException,
} from '@nestjs/common';
import { UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto, UpdateTenantDto } from '@ydm-platform/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class TenantController {
  constructor(@Inject(TenantService) private readonly tenantService: TenantService) {}

  private static readonly tenantLogoDestination = join(process.cwd(), 'uploads', 'tenants');

  @Get('me')
  @ApiOperation({ summary: 'Get current tenant (tenant user self-service)' })
  findMe(@TenantId() tenantId?: string) {
    if (!tenantId) {
      throw new BadRequestException('Tenant not found');
    }
    return this.tenantService.findOne(tenantId);
  }

  @Post()
  @RequirePermissions('tenant:write')
  @ApiOperation({ summary: 'Create tenant (Super Admin only)' })
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: TenantController.tenantLogoDestination,
        filename: (_req, file, cb) => {
          const safeExt = extname(file.originalname || '').toLowerCase();
          cb(null, `${randomUUID()}${safeExt}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    })
  )
  create(@UploadedFile() logo?: Express.Multer.File, @Body() body?: any) {
    const createTenantDto = body as CreateTenantDto & { status?: string; metadata?: Record<string, any> };
    if (logo) {
      createTenantDto.metadata = {
        ...(createTenantDto.metadata || {}),
        logoUrl: `/uploads/tenants/${logo.filename}`,
      };
    }
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  @RequirePermissions('tenant:read')
  @ApiOperation({ summary: 'List all tenants' })
  findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  @RequirePermissions('tenant:read')
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('tenant:write')
  @ApiOperation({ summary: 'Update tenant' })
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: TenantController.tenantLogoDestination,
        filename: (_req, file, cb) => {
          const safeExt = extname(file.originalname || '').toLowerCase();
          cb(null, `${randomUUID()}${safeExt}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    })
  )
  update(@Param('id') id: string, @UploadedFile() logo?: Express.Multer.File, @Body() body?: any) {
    const updateTenantDto = body as UpdateTenantDto & { metadata?: Record<string, any> };
    if (logo) {
      updateTenantDto.metadata = {
        ...(updateTenantDto.metadata || {}),
        logoUrl: `/uploads/tenants/${logo.filename}`,
      };
    }
    return this.tenantService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @RequirePermissions('tenant:delete')
  @ApiOperation({ summary: 'Delete tenant' })
  remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }
}
