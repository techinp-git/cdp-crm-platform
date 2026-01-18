import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LineFollowerService } from './line-follower.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('LINE Followers')
@ApiBearerAuth()
@Controller('line-followers')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(TenantContextInterceptor)
export class LineFollowerController {
  constructor(@Inject(LineFollowerService) private readonly lineFollowerService: LineFollowerService) {}

  @Get()
  @RequirePermissions('line-follower:read')
  @ApiOperation({ summary: 'List LINE followers' })
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.lineFollowerService.findAll(tenantId, { status, search, page: pageNum, limit: limitNum });
  }

  @Get('stats')
  @RequirePermissions('line-follower:read')
  @ApiOperation({ summary: 'Get LINE followers statistics' })
  getStats(@TenantId() tenantId: string) {
    return this.lineFollowerService.getStats(tenantId);
  }

  @Get(':id')
  @RequirePermissions('line-follower:read')
  @ApiOperation({ summary: 'Get LINE follower by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.lineFollowerService.findOne(tenantId, id);
  }

  @Post('webhook/follow')
  @RequirePermissions('line-follower:write')
  @ApiOperation({ summary: 'Handle LINE follow webhook event' })
  handleFollow(@TenantId() tenantId: string, @Body() event: any) {
    return this.lineFollowerService.handleFollowEvent(tenantId, event);
  }

  @Post('webhook/unfollow')
  @RequirePermissions('line-follower:write')
  @ApiOperation({ summary: 'Handle LINE unfollow webhook event' })
  handleUnfollow(@TenantId() tenantId: string, @Body() event: any) {
    return this.lineFollowerService.handleUnfollowEvent(tenantId, event);
  }
}
