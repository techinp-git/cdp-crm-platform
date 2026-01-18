import {
  Controller,
  Get,
  Post,
  Body,
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
import { FacebookSyncService } from './facebook-sync.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Facebook Sync')
@ApiBearerAuth()
@Controller('facebook-sync')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class FacebookSyncController {
  constructor(@Inject(FacebookSyncService) private readonly facebookSyncService: FacebookSyncService) {}

  @Get()
  @RequirePermissions('facebook-sync:read')
  @ApiOperation({ summary: 'List Facebook Messenger messages' })
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('conversationId') conversationId?: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.facebookSyncService.findAll(tenantId, pageNum, limitNum, conversationId);
  }

  @Post('import')
  @RequirePermissions('facebook-sync:write')
  @UseNestInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import Facebook Messenger data from CSV/Excel file' })
  async importFromFile(
    @UploadedFile() file: Express.Multer.File,
    @TenantId() tenantId: string,
  ) {
    return this.facebookSyncService.importFromFile(tenantId, file);
  }

  @Post('sync')
  @RequirePermissions('facebook-sync:write')
  @ApiOperation({ summary: 'Sync Facebook Messenger data from API' })
  async syncFromApi(
    @Body() syncConfig: { apiUrl?: string; pageId: string; accessToken: string; syncFrequency?: string },
    @TenantId() tenantId: string,
  ) {
    return this.facebookSyncService.syncFromApi(tenantId, syncConfig);
  }
}
