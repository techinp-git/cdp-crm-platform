import { IsString, IsOptional, IsEnum, IsEmail, IsPhoneNumber, IsArray, IsObject, IsDateString, IsBoolean, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Profile Types
 */
export enum ProfileType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
}

export enum ProfileStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MERGED = 'MERGED',
}

/**
 * Profile Source Types
 */
export enum SourceType {
  ERP = 'ERP',
  LINE = 'LINE',
  FACEBOOK = 'FACEBOOK',
  CRM = 'CRM',
  MANUAL = 'MANUAL',
  WEBSITE = 'WEBSITE',
  API = 'API',
}

/**
 * DTOs for Profile Management
 */

export class CreateProfileDto {
  @ApiProperty({ description: 'Profile type', enum: ProfileType, default: ProfileType.INDIVIDUAL })
  @IsEnum(ProfileType)
  @IsOptional()
  type?: ProfileType;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Short display name' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ description: 'First name (for individual)' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name (for individual)' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Company name (for B2B)' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Primary email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Primary phone' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'All emails array', type: [Object] })
  @IsArray()
  @IsOptional()
  emails?: Array<{ email: string; type: string; source: string }>;

  @ApiPropertyOptional({ description: 'All phones array', type: [Object] })
  @IsArray()
  @IsOptional()
  phones?: Array<{ phone: string; type: string; source: string }>;

  @ApiPropertyOptional({ description: 'Address object', type: Object })
  @IsObject()
  @IsOptional()
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };

  @ApiPropertyOptional({ description: 'Company Tax ID / VAT' })
  @IsString()
  @IsOptional()
  companyTaxId?: string;

  @ApiPropertyOptional({ description: 'Industry' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'Company size' })
  @IsString()
  @IsOptional()
  companySize?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'Tags array', type: [Object] })
  @IsArray()
  @IsOptional()
  tags?: Array<{ id: string; name: string; color: string }>;

  @ApiPropertyOptional({ description: 'Segment IDs array' })
  @IsArray()
  @IsOptional()
  segmentIds?: string[];

  @ApiPropertyOptional({ description: 'Custom attributes', type: Object })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Primary source', enum: SourceType })
  @IsEnum(SourceType)
  @IsOptional()
  primarySource?: SourceType;

  @ApiPropertyOptional({ description: 'Additional metadata', type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateProfileDto extends CreateProfileDto {
  @ApiPropertyOptional({ description: 'Profile status', enum: ProfileStatus })
  @IsEnum(ProfileStatus)
  @IsOptional()
  status?: ProfileStatus;
}

export class ProfileFilterDto {
  @ApiPropertyOptional({ description: 'Search by name, email, phone' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by type', enum: ProfileType })
  @IsEnum(ProfileType)
  @IsOptional()
  type?: ProfileType;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ProfileStatus })
  @IsEnum(ProfileStatus)
  @IsOptional()
  status?: ProfileStatus;

  @ApiPropertyOptional({ description: 'Filter by source', enum: SourceType })
  @IsEnum(SourceType)
  @IsOptional()
  source?: SourceType;

  @ApiPropertyOptional({ description: 'Filter by tag IDs' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional({ description: 'Filter by segment IDs' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  segmentIds?: string[];

  @ApiPropertyOptional({ description: 'Filter by industry' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'Filter by created date from' })
  @IsDateString()
  @IsOptional()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by created date to' })
  @IsDateString()
  @IsOptional()
  createdTo?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', default: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * Profile Identifier DTOs
 */

export class CreateProfileIdentifierDto {
  @ApiProperty({ description: 'Source type', enum: SourceType })
  @IsEnum(SourceType)
  source: SourceType;

  @ApiPropertyOptional({ description: 'Source type (CUSTOMER, USER, CONTACT, LEAD)' })
  @IsString()
  @IsOptional()
  sourceType?: string;

  @ApiProperty({ description: 'External ID from source' })
  @IsString()
  externalId: string;

  @ApiPropertyOptional({ description: 'External reference (e.g., ERP:customers.ERP001)' })
  @IsString()
  @IsOptional()
  externalRef?: string;

  @ApiPropertyOptional({ description: 'Match quality score (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  matchQuality?: number;

  @ApiPropertyOptional({ description: 'Is primary ID for this source' })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata', type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Unify Candidate DTOs
 */

export class ConflictFieldDto {
  @ApiProperty({ description: 'Field name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Value from profile 1' })
  @IsString()
  value1: string;

  @ApiProperty({ description: 'Value from profile 2' })
  @IsString()
  value2: string;
}

export class MatchReasonDto {
  @ApiProperty({ description: 'Match reason description' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Score contribution' })
  @IsNumber()
  score: number;
}

export class UnifyCandidateDto {
  @ApiProperty({ description: 'Candidate ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Profile 1 ID' })
  @IsString()
  profileId1: string;

  @ApiProperty({ description: 'Profile 2 ID' })
  @IsString()
  profileId2: string;

  @ApiProperty({ description: 'Match score (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  matchScore: number;

  @ApiProperty({ description: 'Match reasons', type: [String] })
  @IsArray()
  @IsString({ each: true })
  matchReasons: string[];

  @ApiPropertyOptional({ description: 'Conflict fields', type: [ConflictFieldDto] })
  @IsArray()
  @IsOptional()
  conflictFields?: ConflictFieldDto[];
}

/**
 * Merge Profiles DTOs
 */

export enum MergeStrategy {
  PROFILE1_WINS = 'PROFILE1_WINS',
  PROFILE2_WINS = 'PROFILE2_WINS',
  MERGE_BOTH = 'MERGE_BOTH',
  MANUAL = 'MANUAL',
}

export class MergeProfilesDto {
  @ApiProperty({ description: 'Array of candidate IDs to merge' })
  @IsArray()
  @IsString({ each: true })
  candidateIds: string[];

  @ApiPropertyOptional({ description: 'Merge strategy', enum: MergeStrategy, default: MergeStrategy.MERGE_BOTH })
  @IsEnum(MergeStrategy)
  @IsOptional()
  strategy?: MergeStrategy;

  @ApiPropertyOptional({ description: 'Resolved conflicts (field name -> resolved value)' })
  @IsObject()
  @IsOptional()
  resolvedConflicts?: Record<string, string>;
}

/**
 * Import Profiles DTOs
 */

export class ImportProfilesDto {
  @ApiProperty({ description: 'Source of import', enum: SourceType })
  @IsEnum(SourceType)
  source: SourceType;

  @ApiPropertyOptional({ description: 'Source type (CUSTOMER, USER, CONTACT)' })
  @IsString()
  @IsOptional()
  sourceType?: string;

  @ApiProperty({ description: 'Profiles data array' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProfileDto)
  profiles: CreateProfileDto[];
}

/**
 * Sync from External API DTO
 */

export class SyncFromApiDto {
  @ApiProperty({ description: 'External API URL' })
  @IsString()
  apiUrl: string;

  @ApiProperty({ description: 'API Key for authentication' })
  @IsString()
  apiKey: string;

  @ApiPropertyOptional({ description: 'Sync frequency' })
  @IsString()
  @IsOptional()
  syncFrequency?: string;
}
