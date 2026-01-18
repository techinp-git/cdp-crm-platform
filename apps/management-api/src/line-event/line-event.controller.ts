import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Inject,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LineEventService } from './line-event.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('LINE Events')
@Controller('line-events')
export class LineEventController {
  constructor(@Inject(LineEventService) private readonly lineEventService: LineEventService) {}

  // Public webhook endpoint for LINE to send events
  @Post('webhook/:tenantId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'LINE Webhook endpoint (Public)' })
  async webhook(
    @Param('tenantId') tenantId: string,
    @Body() body: any,
    @Headers('x-line-signature') signature?: string,
  ) {
    // TODO: Verify LINE signature using channel secret
    // For now, we'll just accept the webhook
    // In production, you should verify the signature:
    // const channelSecret = process.env.LINE_CHANNEL_SECRET;
    // const hash = crypto.createHmac('sha256', channelSecret).update(JSON.stringify(body)).digest('base64');
    // if (hash !== signature) throw new UnauthorizedException('Invalid signature');

    return this.lineEventService.processWebhook(tenantId, body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @UseInterceptors(TenantContextInterceptor)
  @RequirePermissions('line-event:read')
  @ApiOperation({ summary: 'List LINE events' })
  @ApiBearerAuth()
  findAll(
    @TenantId() tenantId: string,
    @Query('eventType') eventType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.lineEventService.findAll(tenantId, { 
      eventType,
      status,
      startDate,
      endDate,
      page: pageNum, 
      limit: limitNum 
    });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @UseInterceptors(TenantContextInterceptor)
  @RequirePermissions('line-event:read')
  @ApiOperation({ summary: 'Get LINE events statistics' })
  @ApiBearerAuth()
  getStats(
    @TenantId() tenantId: string,
    @Query('period') period?: 'today' | 'week' | 'month',
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.lineEventService.getStats(tenantId, period || 'today');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @UseInterceptors(TenantContextInterceptor)
  @RequirePermissions('line-event:read')
  @ApiOperation({ summary: 'Get LINE event by ID' })
  @ApiBearerAuth()
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.lineEventService.findOne(tenantId, id);
  }

  @Post(':id/process')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @UseInterceptors(TenantContextInterceptor)
  @RequirePermissions('line-event:write')
  @ApiOperation({ summary: 'Update LINE event status' })
  @ApiBearerAuth()
  updateStatus(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() body: { status: string; errorMessage?: string },
  ) {
    return this.lineEventService.updateStatus(tenantId, id, body.status, body.errorMessage);
  }
}
