import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';
import { ChatCenterService } from './chat-center.service';

@ApiTags('Chat Center')
@ApiBearerAuth()
@Controller('chat-center')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class ChatCenterController {
  constructor(@Inject(ChatCenterService) private readonly service: ChatCenterService) {}

  // Channel accounts (LINE 1, LINE 2, FB 1, IG 1, ...)
  @Get('channel-accounts')
  @RequirePermissions('chat-center:read')
  @ApiOperation({ summary: 'List channel accounts' })
  listAccounts(@TenantId() tenantId: string, @Query('channel') channel?: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listChannelAccounts(tenantId, channel);
  }

  @Post('channel-accounts')
  @RequirePermissions('chat-center:write')
  @ApiOperation({ summary: 'Create channel account' })
  createAccount(@TenantId() tenantId: string, @Body() body: any) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.createChannelAccount(tenantId, body);
  }

  @Patch('channel-accounts/:id')
  @RequirePermissions('chat-center:write')
  @ApiOperation({ summary: 'Update channel account' })
  updateAccount(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.updateChannelAccount(tenantId, id, body);
  }

  @Delete('channel-accounts/:id')
  @RequirePermissions('chat-center:delete')
  @ApiOperation({ summary: 'Delete channel account' })
  deleteAccount(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.deleteChannelAccount(tenantId, id);
  }

  // Conversations (derived from existing LINE events + FB sync)
  @Get('conversations')
  @RequirePermissions('chat-center:read')
  @ApiOperation({ summary: 'List conversations (derived)' })
  listConversations(
    @TenantId() tenantId: string,
    @Query('channel') channel?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listConversations(tenantId, { channel, q, limit: limit ? parseInt(limit, 10) : 50 });
  }

  @Get('conversations/:channel/:externalId/messages')
  @RequirePermissions('chat-center:read')
  @ApiOperation({ summary: 'Get messages for a conversation (derived)' })
  getMessages(
    @TenantId() tenantId: string,
    @Param('channel') channel: string,
    @Param('externalId') externalId: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.getConversationMessages(tenantId, channel, externalId, limit ? parseInt(limit, 10) : 100);
  }

  // Unify user
  @Get('unified/by-identity')
  @RequirePermissions('chat-center:read')
  @ApiOperation({ summary: 'Get unified user by identity' })
  byIdentity(
    @TenantId() tenantId: string,
    @Query('channel') channel: string,
    @Query('externalId') externalId: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.getUnifiedByIdentity(tenantId, channel, externalId);
  }

  @Post('unified/link')
  @RequirePermissions('chat-center:write')
  @ApiOperation({ summary: 'Link identity to unified user (or create)' })
  link(
    @TenantId() tenantId: string,
    @Body()
    body: {
      channel: string;
      externalId: string;
      unifiedUserId?: string;
      displayName?: string;
      profile?: any;
      channelAccountId?: string;
      externalProfile?: any;
    },
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.linkIdentity(tenantId, body);
  }

  @Post('unified/unlink')
  @RequirePermissions('chat-center:write')
  @ApiOperation({ summary: 'Unlink identity' })
  unlink(@TenantId() tenantId: string, @Body() body: { identityId: string }) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.unlinkIdentity(tenantId, body.identityId);
  }
}

