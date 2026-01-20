import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import {
  CreateProfileDto,
  UpdateProfileDto,
  ProfileFilterDto,
  CreateProfileIdentifierDto,
  SyncFromApiDto,
  ImportProfilesDto,
  MergeProfilesDto,
  ProfileType,
  ProfileStatus,
  SourceType,
} from './profile.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Profiles')
@Controller('profiles')
@UseGuards() // Add auth guard here
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Get all profiles with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Profiles retrieved successfully' })
  async findAll(
    @Req() req: Request,
    @Query() filter: ProfileFilterDto,
  ) {
    const tenantId = req.headers['x-tenant-id'] as string;
    return this.profileService.findAll(tenantId, filter);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get profile statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(@Req() req: Request) {
    const tenantId = req.headers['x-tenant-id'] as string;
    return this.profileService.getStatistics(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get profile by ID with full details' })
  @ApiParam({ name: 'id', description: 'Profile ID' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async findOne(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const tenantId = req.headers['x-tenant-id'] as string;
    return this.profileService.findOne(tenantId, id);
  }

  @Get('completion-score/:id')
  @ApiOperation({ summary: 'Get profile completion score (0-100)' })
  @ApiParam({ name: 'id', description: 'Profile ID' })
  @ApiResponse({ status: 200, description: 'Completion score calculated successfully' })
  async getCompletionScore(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const score = await this.profileService.calculateCompletionScore(tenantId, id);
    return { profileId: id, completionScore: score };
  }

  @Post()
  @RequirePermissions('profile:write')
  @ApiOperation({ summary: 'Create a new profile' })
  @ApiBody({ type: CreateProfileDto })
  @ApiResponse({ status: 201, description: 'Profile created successfully' })
  async create(
    @Req() req: Request,
    @Body() createProfileDto: CreateProfileDto,
  ) {
    const tenantId = req.headers['x-tenant-id'] as string;
    return this.profileService.create(tenantId, createProfileDto);
  }

  @Put(':id')
  @RequirePermissions('profile:write')
  @ApiOperation({ summary: 'Update profile' })
  @ApiParam({ name: 'id', description: 'Profile ID' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async update(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const tenantId = req.headers['x-tenant-id'] as string;
    return this.profileService.update(tenantId, id, updateProfileDto);
  }

  @Delete(':id')
  @RequirePermissions('profile:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete profile (soft delete)' })
  @ApiParam({ name: 'id', description: 'Profile ID' })
  @ApiResponse({ status: 204, description: 'Profile deleted successfully' })
  async remove(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const tenantId = req.headers['x-tenant-id'] as string;
    await this.profileService.remove(tenantId, id);
  }

  // ============================================
  // PROFILE IDENTIFIER OPERATIONS
  // ============================================

  @Post(':profileId/identifiers')
  @RequirePermissions('profile:write')
  @ApiOperation({ summary: 'Add identifier to profile' })
  @ApiParam({ name: 'profileId', description: 'Profile ID' })
  @ApiBody({ type: CreateProfileIdentifierDto })
  @ApiResponse({ status: 201, description: 'Identifier added successfully' })
  async addIdentifier(
    @Req() req: Request,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() identifierDto: CreateProfileIdentifierDto,
  ) {
    const tenantId = req.headers['x-tenant-id'] as string;
    return this.profileService.addIdentifier(tenantId, profileId, identifierDto);
  }

  @Delete(':profileId/identifiers/:identifierId')
  @RequirePermissions('profile:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove identifier from profile' })
  @ApiParam({ name: 'profileId', description: 'Profile ID' })
  @ApiParam({ name: 'identifierId', description: 'Identifier ID' })
  @ApiResponse({ status: 204, description: 'Identifier removed successfully' })
  async removeIdentifier(
    @Req() req: Request,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('identifierId', ParseUUIDPipe) identifierId: string,
  ) {
    const tenantId = req.headers['x-tenant-id'] as string;
    await this.profileService.removeIdentifier(tenantId, profileId, identifierId);
  }

  @Get('external/:source/:externalId')
  @ApiOperation({ summary: 'Find profile by external ID' })
  @ApiParam({ name: 'source', description: 'Source type', enum: SourceType })
  @ApiParam({ name: 'externalId', description: 'External ID' })
  @ApiQuery({
    name: 'sourceType',
    required: false,
    description: 'Source type (CUSTOMER, USER, CONTACT, etc.)',
  })
  @ApiResponse({ status: 200, description: 'Profile found successfully' })
  async findByExternalId(
    @Req() req: Request,
    @Param('source') source: string,
    @Param('externalId') externalId: string,
    @Query('sourceType') sourceType?: string,
  ) {
    const tenantId = req.headers['x-tenant-id'] as string;
    return this.profileService.findByExternalId(tenantId, source, externalId, sourceType);
  }

  // ============================================
  // IMPORT & SYNC OPERATIONS
  // ============================================

  @Post('import')
  @RequirePermissions('profile:write')
  @ApiOperation({ summary: 'Import profiles from data array' })
  @ApiBody({ type: ImportProfilesDto })
  @ApiResponse({
    status: 200,
    description: 'Profiles imported successfully',
    schema: {
      example: {
        success: 10,
        failed: 2,
        skipped: 3,
        errors: ['Failed to import profile: Invalid email'],
      },
    },
  })
  async importProfiles(
    @Req() req: Request,
    @Body() importDto: ImportProfilesDto,
  ) {
    const tenantId = req.headers['x-tenant-id'] as string;
    return this.profileService.importProfiles(tenantId, importDto);
  }

  @Post('sync')
  @RequirePermissions('profile:write')
  @ApiOperation({ summary: 'Sync profiles from external API' })
  @ApiBody({ type: SyncFromApiDto })
  @ApiResponse({
    status: 200,
    description: 'Profiles synced successfully',
    schema: {
      example: {
        success: 10,
        failed: 2,
        skipped: 3,
        errors: [],
        totalFetched: 15,
        syncFrequency: 'daily',
        syncedAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  async syncFromApi(
    @Req() req: Request,
    @Body() syncDto: SyncFromApiDto,
  ) {
    const tenantId = req.headers['x-tenant-id'] as string;
    return this.profileService.syncFromApi(tenantId, syncDto);
  }

  // ============================================
  // UNIFY OPERATIONS
  // ============================================

  @Post('merge')
  @RequirePermissions('profile:write')
  @ApiOperation({ summary: 'Merge multiple profiles' })
  @ApiBody({ type: MergeProfilesDto })
  @ApiResponse({ status: 200, description: 'Profiles merged successfully' })
  async mergeProfiles(
    @Req() req: Request,
    @Body() mergeDto: MergeProfilesDto,
  ) {
    const tenantId = req.headers['x-tenant-id'] as string;
    // This will be implemented in the unify service
    return { message: 'Merge operation not yet implemented', tenantId };
  }

  @Post('detect-duplicates')
  @RequirePermissions('profile:read')
  @ApiOperation({ summary: 'Detect duplicate profiles' })
  @ApiResponse({ status: 200, description: 'Duplicates detected successfully' })
  async detectDuplicates(@Req() req: Request) {
    const tenantId = req.headers['x-tenant-id'] as string;
    // This will be implemented in the unify service
    return { message: 'Duplicate detection not yet implemented', tenantId };
  }

  @Post('auto-unify/:profileId')
  @RequirePermissions('profile:write')
  @ApiOperation({ summary: 'Auto-detect and suggest unification for a profile' })
  @ApiParam({ name: 'profileId', description: 'Profile ID to check' })
  @ApiResponse({ status: 200, description: 'Auto-unify suggestions generated' })
  async autoUnify(
    @Req() req: Request,
    @Param('profileId', ParseUUIDPipe) profileId: string,
  ) {
    const tenantId = req.headers['x-tenant-id'] as string;
    // This will be implemented in the unify service
    return { message: 'Auto-unify not yet implemented', tenantId, profileId };
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  @Post('bulk/tags')
  @RequirePermissions('profile:write')
  @ApiOperation({ summary: 'Add tags to multiple profiles' })
  @ApiBody({
    schema: {
      example: {
        profileIds: ['uuid-1', 'uuid-2'],
        tags: [{ id: 'tag-1', name: 'VIP', color: '#FF0000' }],
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Tags added successfully' })
  async bulkAddTags(@Req() req: Request, @Body() body: { profileIds: string[]; tags: any[] }) {
    const tenantId = req.headers['x-tenant-id'] as string;
    // This will be implemented
    return { message: 'Bulk tag operation not yet implemented', tenantId };
  }

  @Post('bulk/segments')
  @RequirePermissions('profile:write')
  @ApiOperation({ summary: 'Add profiles to segments' })
  @ApiBody({
    schema: {
      example: {
        profileIds: ['uuid-1', 'uuid-2'],
        segmentIds: ['segment-1', 'segment-2'],
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profiles added to segments successfully' })
  async bulkAddToSegments(
    @Req() req: Request,
    @Body() body: { profileIds: string[]; segmentIds: string[] },
  ) {
    const tenantId = req.headers['x-tenant-id'] as string;
    // This will be implemented
    return { message: 'Bulk segment operation not yet implemented', tenantId };
  }

  @Delete('bulk')
  @RequirePermissions('profile:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete multiple profiles (soft delete)' })
  @ApiBody({
    schema: {
      example: {
        profileIds: ['uuid-1', 'uuid-2'],
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Profiles deleted successfully' })
  async bulkDelete(
    @Req() req: Request,
    @Body() body: { profileIds: string[] },
  ) {
    const tenantId = req.headers['x-tenant-id'] as string;
    // This will be implemented
    for (const profileId of body.profileIds) {
      await this.profileService.remove(tenantId, profileId);
    }
  }
}
