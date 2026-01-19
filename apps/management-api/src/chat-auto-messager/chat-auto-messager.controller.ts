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
import { ChatAutoMessagerService } from './chat-auto-messager.service';

@ApiTags('Chat Auto Messager')
@ApiBearerAuth()
@Controller('chat-auto-messager')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class ChatAutoMessagerController {
  constructor(@Inject(ChatAutoMessagerService) private readonly service: ChatAutoMessagerService) {}

  @Get('channels')
  @RequirePermissions('chat-auto-messager:read')
  @ApiOperation({ summary: 'List supported channels' })
  channels() {
    return [
      { key: 'LINE', label: 'LINE' },
      { key: 'MESSENGER', label: 'Messenger' },
    ];
  }

  @Get('rules')
  @RequirePermissions('chat-auto-messager:read')
  @ApiOperation({ summary: 'List rules' })
  listRules(
    @TenantId() tenantId: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listRules(tenantId, { channel, status, q });
  }

  @Post('rules')
  @RequirePermissions('chat-auto-messager:write')
  @ApiOperation({ summary: 'Create rule' })
  createRule(@TenantId() tenantId: string, @Body() body: any) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.createRule(tenantId, body);
  }

  @Patch('rules/:id')
  @RequirePermissions('chat-auto-messager:write')
  @ApiOperation({ summary: 'Update rule' })
  updateRule(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.updateRule(tenantId, id, body);
  }

  @Delete('rules/:id')
  @RequirePermissions('chat-auto-messager:delete')
  @ApiOperation({ summary: 'Delete rule' })
  deleteRule(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.deleteRule(tenantId, id);
  }

  @Post('test-match')
  @RequirePermissions('chat-auto-messager:read')
  @ApiOperation({ summary: 'Test keyword matching' })
  testMatch(@TenantId() tenantId: string, @Body() body: { channel: string; text: string }) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.testMatch(tenantId, body.channel, body.text);
  }

  @Get('logs')
  @RequirePermissions('chat-auto-messager:read')
  @ApiOperation({ summary: 'List recent logs' })
  logs(@TenantId() tenantId: string, @Query('channel') channel?: string, @Query('limit') limit?: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listLogs(tenantId, { channel, limit: limit ? parseInt(limit, 10) : 50 });
  }

  @Get('outbox')
  @RequirePermissions('chat-auto-messager:read')
  @ApiOperation({ summary: 'List outbox' })
  outbox(@TenantId() tenantId: string, @Query('channel') channel?: string, @Query('status') status?: string, @Query('limit') limit?: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listOutbox(tenantId, { channel, status, limit: limit ? parseInt(limit, 10) : 50 });
  }
}

