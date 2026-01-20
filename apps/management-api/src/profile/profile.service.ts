import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProfileDto,
  UpdateProfileDto,
  ProfileFilterDto,
  CreateProfileIdentifierDto,
  SyncFromApiDto,
  ImportProfilesDto,
  ProfileType,
  ProfileStatus,
  SourceType,
} from './profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /**
   * Create a new profile
   */
  async create(tenantId: string, createProfileDto: CreateProfileDto) {
    // Generate display name if not provided
    const displayName = createProfileDto.displayName || this.generateDisplayName(createProfileDto);
    const name = createProfileDto.name || displayName;

    const profile = await this.prisma.profile.create({
      data: {
        tenantId,
        type: createProfileDto.type || ProfileType.INDIVIDUAL,
        status: ProfileStatus.ACTIVE,
        name,
        displayName,
        firstName: createProfileDto.firstName,
        lastName: createProfileDto.lastName,
        companyName: createProfileDto.companyName,
        email: createProfileDto.email,
        phone: createProfileDto.phone,
        emails: createProfileDto.emails,
        phones: createProfileDto.phones,
        address: createProfileDto.address,
        companyTaxId: createProfileDto.companyTaxId,
        industry: createProfileDto.industry,
        companySize: createProfileDto.companySize,
        website: createProfileDto.website,
        tags: createProfileDto.tags,
        segmentIds: createProfileDto.segmentIds,
        attributes: createProfileDto.attributes,
        primarySource: createProfileDto.primarySource || SourceType.MANUAL,
        metadata: createProfileDto.metadata,
      },
    });

    return profile;
  }

  /**
   * Find all profiles with filters and pagination
   */
  async findAll(tenantId: string, filter: ProfileFilterDto) {
    const {
      search,
      type,
      status,
      source,
      tagIds,
      segmentIds,
      industry,
      createdFrom,
      createdTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { tenantId };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (industry) {
      where.industry = {
        equals: industry,
        mode: 'insensitive',
      };
    }

    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) {
        where.createdAt.gte = new Date(createdFrom);
      }
      if (createdTo) {
        where.createdAt.lte = new Date(createdTo);
      }
    }

    // Search by name, email, or phone
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by identifiers (source)
    if (source) {
      where.identifiers = {
        some: {
          source,
          isActive: true,
        },
      };
    }

    // Filter by tags
    if (tagIds && tagIds.length > 0) {
      where.tagsRelations = {
        some: {
          tagId: { in: tagIds },
        },
      };
    }

    // Filter by segments
    if (segmentIds && segmentIds.length > 0) {
      where.segmentIds = {
        hasSome: segmentIds,
      };
    }

    // Count total
    const total = await this.prisma.profile.count({ where });

    // Fetch data
    const data = await this.prisma.profile.findMany({
      where,
      include: {
        identifiers: {
          where: { isActive: true },
          orderBy: { isPrimary: 'desc' },
        },
        tagsRelations: {
          include: { tag: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find profile by ID with full details
   */
  async findOne(tenantId: string, id: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id, tenantId },
      include: {
        identifiers: {
          where: { isActive: true },
          orderBy: { isPrimary: 'desc' },
        },
        events: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
        deals: {
          include: { stage: true },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
        },
        tagsRelations: {
          include: { tag: true },
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
        },
        billings: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return profile;
  }

  /**
   * Find profile by external ID
   */
  async findByExternalId(tenantId: string, source: string, externalId: string, sourceType?: string) {
    const identifier = await this.prisma.profileIdentifier.findFirst({
      where: {
        tenantId,
        source,
        externalId,
        sourceType,
        isActive: true,
      },
      include: {
        profile: true,
      },
    });

    return identifier?.profile || null;
  }

  /**
   * Find profile by email
   */
  async findByEmail(tenantId: string, email: string) {
    return this.prisma.profile.findFirst({
      where: {
        tenantId,
        email: {
          equals: email,
          mode: 'insensitive',
        },
        status: ProfileStatus.ACTIVE,
      },
      include: {
        identifiers: true,
      },
    });
  }

  /**
   * Find profile by phone
   */
  async findByPhone(tenantId: string, phone: string) {
    return this.prisma.profile.findFirst({
      where: {
        tenantId,
        phone: {
          equals: phone,
          mode: 'insensitive',
        },
        status: ProfileStatus.ACTIVE,
      },
      include: {
        identifiers: true,
      },
    });
  }

  /**
   * Update profile
   */
  async update(tenantId: string, id: string, updateProfileDto: UpdateProfileDto) {
    // Check if profile exists
    const existing = await this.prisma.profile.findUnique({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    // Update display name if name changed
    let displayName = updateProfileDto.displayName;
    let name = updateProfileDto.name;
    if (updateProfileDto.name && !displayName) {
      displayName = this.generateDisplayName(updateProfileDto);
    } else if (!name && !displayName) {
      displayName = existing.displayName;
      name = existing.name;
    }

    return this.prisma.profile.update({
      where: { id, tenantId },
      data: {
        type: updateProfileDto.type,
        status: updateProfileDto.status,
        name: name || undefined,
        displayName: displayName || undefined,
        firstName: updateProfileDto.firstName,
        lastName: updateProfileDto.lastName,
        companyName: updateProfileDto.companyName,
        email: updateProfileDto.email,
        phone: updateProfileDto.phone,
        emails: updateProfileDto.emails,
        phones: updateProfileDto.phones,
        address: updateProfileDto.address,
        companyTaxId: updateProfileDto.companyTaxId,
        industry: updateProfileDto.industry,
        companySize: updateProfileDto.companySize,
        website: updateProfileDto.website,
        tags: updateProfileDto.tags,
        segmentIds: updateProfileDto.segmentIds,
        attributes: updateProfileDto.attributes,
        primarySource: updateProfileDto.primarySource,
        lastSyncedAt: new Date(),
        metadata: updateProfileDto.metadata,
      },
    });
  }

  /**
   * Delete profile (soft delete by setting status to INACTIVE)
   */
  async remove(tenantId: string, id: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id, tenantId },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    // Soft delete
    return this.prisma.profile.update({
      where: { id, tenantId },
      data: {
        status: ProfileStatus.INACTIVE,
        name: `[INACTIVE] ${profile.name}`,
        metadata: {
          ...(profile.metadata as any),
          deletedAt: new Date(),
        },
      },
    });
  }

  // ============================================
  // PROFILE IDENTIFIER OPERATIONS
  // ============================================

  /**
   * Add identifier to profile
   */
  async addIdentifier(tenantId: string, profileId: string, identifierDto: CreateProfileIdentifierDto) {
    // Check if profile exists
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId, tenantId },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${profileId} not found`);
    }

    // Check if identifier already exists
    const existing = await this.prisma.profileIdentifier.findFirst({
      where: {
        tenantId,
        source: identifierDto.source,
        externalId: identifierDto.externalId,
        sourceType: identifierDto.sourceType,
      },
    });

    if (existing) {
      if (existing.profileId !== profileId) {
        throw new ConflictException(
          `Identifier for ${identifierDto.source}:${identifierDto.externalId} already exists on another profile`
        );
      }
      return existing;
    }

    // If this is the primary identifier, unset others from same source
    if (identifierDto.isPrimary) {
      await this.prisma.profileIdentifier.updateMany({
        where: {
          tenantId,
          profileId,
          source: identifierDto.source,
        },
        data: { isPrimary: false },
      });
    }

    return this.prisma.profileIdentifier.create({
      data: {
        tenantId,
        profileId,
        source: identifierDto.source,
        sourceType: identifierDto.sourceType,
        externalId: identifierDto.externalId,
        externalRef: identifierDto.externalRef,
        matchQuality: identifierDto.matchQuality,
        isPrimary: identifierDto.isPrimary || false,
        metadata: identifierDto.metadata,
      },
    });
  }

  /**
   * Remove identifier from profile
   */
  async removeIdentifier(tenantId: string, profileId: string, identifierId: string) {
    const identifier = await this.prisma.profileIdentifier.findFirst({
      where: {
        id: identifierId,
        profileId,
        tenantId,
      },
    });

    if (!identifier) {
      throw new NotFoundException(`Identifier not found`);
    }

    return this.prisma.profileIdentifier.update({
      where: { id: identifierId },
      data: { isActive: false },
    });
  }

  // ============================================
  // IMPORT & SYNC OPERATIONS
  // ============================================

  /**
   * Import profiles from data array
   */
  async importProfiles(tenantId: string, importDto: ImportProfilesDto) {
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const profileData of importDto.profiles) {
      try {
        // Check for existing profile by identifier or email/phone
        let profile = null;

        // Check by identifiers if external ID provided
        if ((profileData.metadata as any)?.externalId) {
          profile = await this.findByExternalId(
            tenantId,
            importDto.source,
            (profileData.metadata as any).externalId,
            importDto.sourceType
          );
        }

        // Check by email if not found
        if (!profile && profileData.email) {
          profile = await this.findByEmail(tenantId, profileData.email);
        }

        // Check by phone if still not found
        if (!profile && profileData.phone) {
          profile = await this.findByPhone(tenantId, profileData.phone);
        }

        if (profile) {
          // Update existing profile
          await this.update(tenantId, profile.id, {
            ...profileData,
            primarySource: importDto.source,
          });
          results.skipped++;
        } else {
          // Create new profile
          await this.create(tenantId, {
            ...profileData,
            primarySource: importDto.source,
          });
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Failed to import profile: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return results;
  }

  /**
   * Sync profiles from external API
   */
  async syncFromApi(tenantId: string, syncDto: SyncFromApiDto) {
    const { apiUrl, apiKey, syncFrequency } = syncDto;

    try {
      // Fetch data from external API
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      const profilesData = Array.isArray(responseData) ? responseData : (responseData.data || responseData.customers || []);

      if (!Array.isArray(profilesData)) {
        throw new BadRequestException('Invalid API response format. Expected array of profiles.');
      }

      // Map external data to profile DTOs
      const profilesToImport = profilesData.map((data: any) => this.mapExternalProfile(data));

      // Import profiles
      const result = await this.importProfiles(tenantId, {
        source: SourceType.API,
        sourceType: syncDto.sourceType,
        profiles: profilesToImport,
      });

      return {
        ...result,
        totalFetched: profilesData.length,
        syncFrequency,
        syncedAt: new Date(),
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to sync from API: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Map external profile data to CreateProfileDto
   */
  private mapExternalProfile(data: any): CreateProfileDto {
    // Handle different field name conventions
    const email = data.email || data.Email || data.EMAIL || '';
    const firstName = data.firstName || data.first_name || data['First Name'] || '';
    const lastName = data.lastName || data.last_name || data['Last Name'] || '';
    const phone = data.phone || data.Phone || data.phoneNumber || '';
    const company = data.company || data.Company || data.companyName || data['Company Name'] || '';
    const companyTaxId = data.companyTaxId || data.company_tax_id || data.taxId || data.TaxId || '';
    const industry = data.industry || data.Industry || '';
    const companySize = data.companySize || data.company_size || data.size || '';
    const address = data.address || data.Address || {};
    const website = data.website || data.Website || '';

    return {
      type: data.type || (company ? ProfileType.COMPANY : ProfileType.INDIVIDUAL),
      name: company || `${firstName} ${lastName}`.trim() || email,
      displayName: data.displayName || data.display_name || firstName || company,
      firstName: firstName || '',
      lastName: lastName || '',
      companyName: company || '',
      email: email || '',
      phone: phone || '',
      address: {
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        country: address.country || '',
        postalCode: address.postalCode || address.zip || '',
      },
      companyTaxId,
      industry,
      companySize,
      website,
      metadata: {
        ...data,
        externalId: data.id || data.customerId || data.externalId || '',
      },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Generate display name from profile data
   */
  private generateDisplayName(profile: CreateProfileDto): string {
    if (profile.displayName) return profile.displayName;
    if (profile.companyName) return profile.companyName;
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName} ${profile.lastName}`.trim();
    }
    if (profile.firstName) return profile.firstName;
    if (profile.lastName) return profile.lastName;
    if (profile.email) return profile.email.split('@')[0];
    return 'Unknown';
  }

  /**
   * Calculate profile completion score (0-100)
   */
  async calculateCompletionScore(tenantId: string, profileId: string): Promise<number> {
    const profile = await this.findOne(tenantId, profileId);

    let score = 0;
    let maxScore = 0;

    // Basic fields (30 points)
    maxScore += 30;
    if (profile.name) score += 5;
    if (profile.email) score += 10;
    if (profile.phone) score += 10;
    if (profile.address) score += 5;

    // Profile fields (30 points)
    maxScore += 30;
    if (profile.firstName) score += 5;
    if (profile.lastName) score += 5;
    if (profile.type === ProfileType.INDIVIDUAL) {
      if (profile.firstName && profile.lastName) score += 20;
    } else if (profile.type === ProfileType.COMPANY) {
      if (profile.companyName) score += 10;
      if (profile.industry) score += 5;
      if (profile.companyTaxId) score += 5;
      if (profile.companySize) score += 5;
      if (profile.website) score += 5;
    }

    // Additional info (20 points)
    maxScore += 20;
    if (profile.tags && profile.tags.length > 0) score += 10;
    if (profile.attributes && Object.keys(profile.attributes).length > 0) score += 10;

    // Identifiers (20 points)
    maxScore += 20;
    if (profile.identifiers && profile.identifiers.length > 0) {
      score += 20;
    }

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Get profile statistics
   */
  async getStatistics(tenantId: string) {
    const [
      total,
      individuals,
      companies,
      active,
      inactive,
      recentCreated,
    ] = await Promise.all([
      this.prisma.profile.count({ where: { tenantId } }),
      this.prisma.profile.count({ where: { tenantId, type: ProfileType.INDIVIDUAL } }),
      this.prisma.profile.count({ where: { tenantId, type: ProfileType.COMPANY } }),
      this.prisma.profile.count({ where: { tenantId, status: ProfileStatus.ACTIVE } }),
      this.prisma.profile.count({ where: { tenantId, status: ProfileStatus.INACTIVE } }),
      this.prisma.profile.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      total,
      individuals,
      companies,
      active,
      inactive,
      recentCreated,
    };
  }
}
