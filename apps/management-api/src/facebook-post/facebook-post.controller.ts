import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { FacebookPostService, CreateFacebookPostDto, UpsertFacebookPageDto } from './facebook-post.service';

@ApiTags('Facebook Post')
@ApiBearerAuth()
@Controller('facebook-post')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class FacebookPostController {
  constructor(@Inject(FacebookPostService) private readonly service: FacebookPostService) {}

  // Pages
  @Get('pages')
  @RequirePermissions('facebook-post:read')
  @ApiOperation({ summary: 'List configured Facebook pages' })
  listPages(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listPages(tenantId);
  }

  @Post('pages')
  @RequirePermissions('facebook-post:write')
  @ApiOperation({ summary: 'Upsert Facebook page config (Page ID + Access Token)' })
  upsertPage(@TenantId() tenantId: string, @Body() body: UpsertFacebookPageDto) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.upsertPage(tenantId, body);
  }

  @Delete('pages/:id')
  @RequirePermissions('facebook-post:delete')
  @ApiOperation({ summary: 'Delete Facebook page config' })
  removePage(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.deletePage(tenantId, id);
  }

  // Posts
  @Get('posts')
  @RequirePermissions('facebook-post:read')
  @ApiOperation({ summary: 'List Facebook posts (draft/synced/published)' })
  listPosts(
    @TenantId() tenantId: string,
    @Query('pageId') pageId?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listPosts(tenantId, {
      pageId,
      status,
      q,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('posts/:id')
  @RequirePermissions('facebook-post:read')
  @ApiOperation({ summary: 'Get Facebook post by ID' })
  getPost(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.findOne(tenantId, id);
  }

  @Post('posts')
  @RequirePermissions('facebook-post:write')
  @ApiOperation({ summary: 'Create Facebook post draft' })
  createPost(@TenantId() tenantId: string, @Body() body: CreateFacebookPostDto) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.createDraft(tenantId, body);
  }

  @Patch('posts/:id')
  @RequirePermissions('facebook-post:write')
  @ApiOperation({ summary: 'Update Facebook post' })
  updatePost(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.update(tenantId, id, body);
  }

  @Post('posts/:id/publish')
  @RequirePermissions('facebook-post:publish')
  @ApiOperation({ summary: 'Publish Facebook post via Graph API' })
  publish(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.publish(tenantId, id);
  }

  @Post('sync')
  @RequirePermissions('facebook-post:write')
  @ApiOperation({ summary: 'Sync recent Facebook posts from Graph API into database' })
  sync(@TenantId() tenantId: string, @Body() body: { pageId: string; limit?: number }) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    if (!body?.pageId) throw new BadRequestException('pageId is required');
    return this.service.syncFromFacebook(tenantId, String(body.pageId), Number(body?.limit || 25));
  }
}

