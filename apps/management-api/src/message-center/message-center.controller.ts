import {
  BadRequestException,
  Body,
  Controller,
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
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';
import { AudienceDto, MessageCenterService, SendImmediateDto, UpsertAutomationDto, UpsertCampaignDto, UpsertImmediateDto } from './message-center.service';

@ApiTags('Message Center')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class MessageCenterController {
  constructor(@Inject(MessageCenterService) private readonly service: MessageCenterService) {}

  @Get('automations')
  @RequirePermissions('message:read')
  @ApiOperation({ summary: 'List message automations (journeys)' })
  listAutomations(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listAutomations(tenantId, {
      status,
      q,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post('automations')
  @RequirePermissions('message:send')
  @ApiOperation({ summary: 'Create message automation (journey)' })
  createAutomation(@TenantId() tenantId: string, @Body() body: UpsertAutomationDto) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.createAutomation(tenantId, body);
  }

  @Get('automations/:id')
  @RequirePermissions('message:read')
  @ApiOperation({ summary: 'Get message automation by ID' })
  getAutomation(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.getAutomation(tenantId, id);
  }

  @Patch('automations/:id')
  @RequirePermissions('message:send')
  @ApiOperation({ summary: 'Update message automation' })
  updateAutomation(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: Partial<UpsertAutomationDto>) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.updateAutomation(tenantId, id, body);
  }

  @Get('campaigns')
  @RequirePermissions('message:read')
  @ApiOperation({ summary: 'List campaigns' })
  listCampaigns(
    @TenantId() tenantId: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listCampaigns(tenantId, {
      channel,
      status,
      q,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post('campaigns')
  @RequirePermissions('message:send')
  @ApiOperation({ summary: 'Create campaign (scheduled)' })
  createCampaign(@TenantId() tenantId: string, @Body() body: UpsertCampaignDto) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.createCampaign(tenantId, body);
  }

  @Get('campaigns/:id')
  @RequirePermissions('message:read')
  @ApiOperation({ summary: 'Get campaign by ID' })
  getCampaign(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.getCampaign(tenantId, id);
  }

  @Patch('campaigns/:id')
  @RequirePermissions('message:send')
  @ApiOperation({ summary: 'Update campaign' })
  updateCampaign(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: Partial<UpsertCampaignDto>) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.updateCampaign(tenantId, id, body);
  }

  @Post('campaigns/:id/run')
  @RequirePermissions('message:send')
  @ApiOperation({ summary: 'Run campaign now (creates history)' })
  runCampaign(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.runCampaignNow(tenantId, id);
  }

  @Get('campaigns/:id/history')
  @RequirePermissions('message:read')
  @ApiOperation({ summary: 'List history for a campaign' })
  historyForCampaign(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listHistoryForCampaign(tenantId, id, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20);
  }

  @Get('immediates')
  @RequirePermissions('message:read')
  @ApiOperation({ summary: 'List immediate messages' })
  listImmediates(
    @TenantId() tenantId: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listImmediates(tenantId, {
      channel,
      status,
      q,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post('immediates')
  @RequirePermissions('message:send')
  @ApiOperation({ summary: 'Create immediate message (draft)' })
  createImmediate(@TenantId() tenantId: string, @Body() body: UpsertImmediateDto) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.createImmediate(tenantId, body);
  }

  @Get('immediates/:id')
  @RequirePermissions('message:read')
  @ApiOperation({ summary: 'Get immediate message by ID' })
  getImmediate(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.getImmediate(tenantId, id);
  }

  @Patch('immediates/:id')
  @RequirePermissions('message:send')
  @ApiOperation({ summary: 'Update immediate message' })
  updateImmediate(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: Partial<UpsertImmediateDto>) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.updateImmediate(tenantId, id, body);
  }

  @Post('immediates/:id/send')
  @RequirePermissions('message:send')
  @ApiOperation({ summary: 'Send from immediate message (creates history)' })
  sendFromImmediate(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.sendFromImmediate(tenantId, id);
  }

  @Get('immediates/:id/history')
  @RequirePermissions('message:read')
  @ApiOperation({ summary: 'List history for an immediate message' })
  historyForImmediate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listHistoryForImmediate(tenantId, id, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20);
  }

  @Post('audience/estimate')
  @RequirePermissions('message:read')
  @ApiOperation({ summary: 'Estimate audience size for a channel' })
  estimate(
    @TenantId() tenantId: string,
    @Body() body: { channel: string; audience?: AudienceDto },
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    const channel = String(body?.channel || '').toUpperCase();
    if (!channel) throw new BadRequestException('channel is required');
    return this.service.estimateAudience(tenantId, channel as any, body?.audience);
  }

  @Post('send')
  @RequirePermissions('message:send')
  @ApiOperation({ summary: 'Send message immediately (queued)' })
  sendImmediate(@TenantId() tenantId: string, @Body() body: SendImmediateDto) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.sendImmediate(tenantId, body);
  }

  @Get('history')
  @RequirePermissions('message:read')
  @ApiOperation({ summary: 'List message broadcasts' })
  history(
    @TenantId() tenantId: string,
    @Query('channel') channel?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.service.listBroadcasts(tenantId, {
      channel,
      q,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('deliveries')
  @RequirePermissions('message:read')
  @ApiOperation({ summary: 'List deliveries for a broadcast' })
  deliveries(
    @TenantId() tenantId: string,
    @Query('broadcastId') broadcastId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    if (!broadcastId) throw new BadRequestException('broadcastId is required');
    return this.service.listDeliveries(tenantId, broadcastId, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('deliveries/stats')
  @RequirePermissions('message:read')
  @ApiOperation({ summary: 'Delivery stats for a broadcast' })
  deliveryStats(@TenantId() tenantId: string, @Query('broadcastId') broadcastId?: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    if (!broadcastId) throw new BadRequestException('broadcastId is required');
    return this.service.deliveryStats(tenantId, broadcastId);
  }
}

