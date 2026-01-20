# Profile Module Documentation

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Database Connection](#database-connection)
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [Data Integration](#data-integration)
- [Cron Jobs Setup](#cron-jobs-setup)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The **Profile Module** is the central component of the Customer Data Platform (CDP) that serves as a unified hub for customer data from multiple sources. It provides a single source of truth for customer information, enabling seamless data management, deduplication, and integration across the entire platform.

### Key Objectives

- 🎯 **Unified Customer View**: Aggregate customer data from ERP, CRM, LINE, Facebook, and other sources
- 🔗 **External ID Mapping**: Track and map external identifiers to unified profiles
- 🔄 **Data Synchronization**: Import and sync data from external APIs and CSV files
- 🤖 **Automatic Deduplication**: Detect and merge duplicate profiles intelligently
- 📊 **Rich Profile Data**: Store flexible profile attributes and custom fields
- 🔍 **Advanced Search**: Filter and search profiles across multiple dimensions

---

## Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Frontend   │  │  Mobile App │  │  Third-party │        │
│  │  (React)    │  │  (React Native) │  │  (API)      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            ▲ HTTP/REST
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│                                                               │
│  ┌──────────────────────────────────────────────┐         │
│  │         ProfileController                   │         │
│  │  - List/Get/Create/Update/Delete Profiles  │         │
│  │  - Import/Sync Operations                  │         │
│  │  - Unify/Deduplicate Operations            │         │
│  └──────────────────────────────────────────────┘         │
│                           │                                  │
│  ┌──────────────────────────────────────────────┐         │
│  │         ProfileService                      │         │
│  │  - Business Logic                         │         │
│  │  - Data Transformation                     │         │
│  │  - Validation                            │         │
│  └──────────────────────────────────────────────┘         │
│                           │                                  │
│  ┌──────────────────────────────────────────────┐         │
│  │         UnifyService                        │         │
│  │  - Duplicate Detection                    │         │
│  │  - Match Scoring                          │         │
│  │  - Profile Merging                       │         │
│  └──────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Prisma ORM
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                              │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Profile   │  │ProfileIdentifier│  │ProfileEvent │        │
│  │             │  │               │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │     Deal    │  │  Activity   │  │    Tag     │        │
│  │             │  │  Task       │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ SQL
                            │
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                         │
│                                                               │
│  Tables: profiles, profile_identifiers, customer_events,     │
│          deals, activity_tasks, tags, etc.                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

#### 1. Profile Table (Master Data)

```prisma
model Profile {
  id          String   @id @default(uuid())
  tenantId    String
  
  // ── Core Profile Fields (Merged) ───
  type        String   @default("INDIVIDUAL") // INDIVIDUAL, COMPANY
  status      String   @default("ACTIVE")    // ACTIVE, INACTIVE, MERGED
  
  // Display fields
  name        String?                           // Display name (merged)
  displayName String?                           // Short display name
  firstName   String?                           // Individual's first name
  lastName    String?                           // Individual's last name
  companyName String?                           // Company name (for B2B)
  
  // ── Contact Info (Primary) ───
  email       String?                           // Primary email
  phone       String?                           // Primary phone
  emails      Json?                             // All emails [{email, type, source}]
  phones      Json?                             // All phones [{phone, type, source}]
  
  // ── Address ───
  address     Json?                             // {street, city, state, country, postalCode}
  
  // ── Company Info (B2B) ───
  companyTaxId String?                          // Tax ID / VAT
  industry    String?
  companySize String?
  website     String?
  
  // ── Classification ───
  tags        Json?                             // Array of tag objects
  segmentIds  Json?                             // Array of segment UUIDs
  attributes  Json?                             // Custom attributes (flexible)
  
  // ── Merge & Sync Metadata ───
  primarySource String?                         // Primary source: "ERP", "LINE", "CRM", etc.
  mergedFrom    Json?                           // Array of profile IDs that were merged
  lastSyncedAt  DateTime?
  mergedAt      DateTime?
  metadata      Json?                           // Additional metadata
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // ── Relations (Master to Sources) ───
  tenant               Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  identifiers          ProfileIdentifier[]
  
  // ── Relations (Business Data) ───
  events               CustomerEvent[]
  tagsRelations        CustomerTag[]
  deals                Deal[]
  activities           ActivityTask[]
  quotations           Quotation[]
  billings             Billing[]
  lineEvents           LineEvent[]
  lineFollowers        LineFollower[]
  
  @@index([tenantId])
  @@index([tenantId, type])
  @@index([tenantId, status])
  @@index([tenantId, email])
  @@index([tenantId, phone])
  @@map("profiles")
}
```

**Key Fields Explained:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `type` | String | Profile type (Individual or Company) | `"INDIVIDUAL"`, `"COMPANY"` |
| `status` | String | Profile status for soft delete | `"ACTIVE"`, `"INACTIVE"`, `"MERGED"` |
| `name` | String | Display name (merged from sources) | `"John Doe"`, `"Acme Corp"` |
| `email` | String | Primary email address | `"john@example.com"` |
| `phone` | String | Primary phone number | `"+66123456789"` |
| `emails` | JSON | Array of all emails with source tracking | `[{email: "work@corp.com", type: "WORK", source: "ERP"}]` |
| `phones` | JSON | Array of all phones with source tracking | `[{phone: "+66123456789", type: "MOBILE", source: "LINE"}]` |
| `primarySource` | String | The primary data source | `"ERP"`, `"LINE"`, `"MANUAL"` |
| `mergedFrom` | JSON | List of profile IDs merged into this one | `["uuid-1", "uuid-2"]` |
| `lastSyncedAt` | DateTime | Last time profile was synced from external source | `2024-01-15T10:00:00Z` |

---

#### 2. ProfileIdentifier Table (External ID Mapping)

```prisma
model ProfileIdentifier {
  id            String   @id @default(uuid())
  profileId     String   // ← FK to Profile table
  tenantId      String
  
  // ── Source Information ───
  source        String   // "ERP", "LINE", "FACEBOOK", "CRM", "MANUAL", etc.
  sourceType    String?  // "CUSTOMER", "USER", "CONTACT", "LEAD", etc.
  externalId    String   // ID จาก source (เช่น ERP001, LINE:Uxxxx, CRM:123)
  externalRef   String?  // เช่น "ERP:customers.ERP001", "LINE:users.Uxxxx"
  
  // ── Match Quality ───
  matchQuality  Float?   // 0-100 confidence score
  isPrimary     Boolean  @default(false) // ถ้า true = ID หลักของ source นี้
  isActive      Boolean  @default(true)
  
  // ── Metadata ───
  matchedAt     DateTime @default(now())
  lastVerifiedAt DateTime?
  metadata      Json?    // Additional info from source
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // ── Relations ───
  profile       Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // ── Indexes ───
  @@index([profileId])
  @@index([tenantId])
  @@unique([source, externalId, sourceType]) // Prevent duplicate mappings
  @@index([tenantId, source, externalId]) // Fast lookup by external ID
  @@map("profile_identifiers")
}
```

**How External ID Mapping Works:**

```
Profile Table                          ProfileIdentifier Table
┌─────────────────┐                   ┌──────────────────────┐
│ id: profile-001 │◄──────────────────│ profileId: profile-001│
│ name: John Doe   │                   │ source: ERP           │
│ email: john@...  │                   │ externalId: ERP001   │
└─────────────────┘                   │ sourceType: CUSTOMER  │
                                      │ matchQuality: 100     │
                                      │ isPrimary: true       │
                                      └──────────────────────┘
                                              │
                                              │ Many-to-Many
                                              ▼
                                      ┌──────────────────────┐
                                      │ profileId: profile-001│
                                      │ source: LINE          │
                                      │ externalId: Uxxxxxx   │
                                      │ sourceType: USER      │
                                      │ matchQuality: 95      │
                                      └──────────────────────┘
```

---

#### 3. CustomerEvent Table (Business Events)

```prisma
model CustomerEvent {
  id         String   @id @default(uuid())
  tenantId   String
  profileId  String? // New: Link to Profile
  customerId String? // Legacy: Keep for backward compatibility
  type       String // "page_view", "purchase", "email_opened", etc.
  timestamp  DateTime @default(now())
  payload    Json?
  
  createdAt  DateTime @default(now())
  
  // Relations
  tenant     Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  profile    Profile? @relation(fields: [profileId], references: [id], onDelete: SetNull)
  customer   Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  
  @@index([tenantId])
  @@index([tenantId, profileId])
  @@index([tenantId, customerId])
  @@index([tenantId, type])
  @@index([tenantId, timestamp])
  @@map("customer_events")
}
```

**Note on Backward Compatibility:**

- `profileId` (New) - Links to the new Profile table
- `customerId` (Legacy) - Links to the old Customer table
- Both are nullable for smooth migration

---

## Database Connection

### How Prisma Connects to Database

The Profile Module uses **Prisma ORM** to connect to PostgreSQL. Here's how it works:

#### 1. Prisma Service (`apps/management-api/src/prisma/prisma.service.ts`)

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient 
  implements OnModuleInit, OnModuleDestroy {
  
  async onModuleInit() {
    // Connect to database when module initializes
    await this.$connect();
    console.log('✅ Database connected successfully');
  }

  async onModuleDestroy() {
    // Disconnect when module is destroyed
    await this.$disconnect();
  }

  // Access models
  // this.profile
  // this.profileIdentifier
  // this.customerEvent
  // etc.
}
```

#### 2. Database Connection String

The connection string is stored in `.env` file:

```bash
# .env file in apps/management-api
DATABASE_URL="postgresql://username:password@localhost:5432/crm_db?schema=public"
```

**Connection URL Breakdown:**

| Part | Description | Example |
|------|-------------|---------|
| `postgresql://` | Database protocol | `postgresql://` |
| `username` | Database user | `postgres` |
| `password` | Database password | `password123` |
| `localhost:5432` | Host and port | `localhost:5432` |
| `crm_db` | Database name | `crm_db` |
| `?schema=public` | Schema name (optional) | `public` |

#### 3. Prisma Schema Generation

```bash
# Generate Prisma Client from schema
cd apps/management-api
npx prisma generate

# Output: node_modules/.prisma/client
```

This creates a TypeScript client that you can use to query the database:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Query profiles
const profiles = await prisma.profile.findMany({
  where: {
    tenantId: 'tenant-123',
    status: 'ACTIVE',
  },
});

// Create profile
const profile = await prisma.profile.create({
  data: {
    tenantId: 'tenant-123',
    name: 'John Doe',
    email: 'john@example.com',
    type: 'INDIVIDUAL',
  },
});
```

#### 4. ProfileService Integration

```typescript
// apps/management-api/src/profile/profile.service.ts

@Injectable()
export class ProfileService {
  // Inject PrismaService (which extends PrismaClient)
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createProfileDto: CreateProfileDto) {
    // Use prisma to interact with database
    const profile = await this.prisma.profile.create({
      data: {
        tenantId,
        type: createProfileDto.type || ProfileType.INDIVIDUAL,
        name: createProfileDto.name,
        email: createProfileDto.email,
        // ... other fields
      },
    });

    return profile;
  }

  async findAll(tenantId: string, filter: ProfileFilterDto) {
    // Query with filters
    const profiles = await this.prisma.profile.findMany({
      where: {
        tenantId,
        status: filter.status,
        type: filter.type,
        // ... more filters
      },
      include: {
        identifiers: true, // Eager load relations
        tagsRelations: { include: { tag: true } },
      },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      orderBy: { [filter.sortBy]: filter.sortOrder },
    });

    return profiles;
  }
}
```

---

## Features

### 1. Profile CRUD Operations

#### Create Profile

```typescript
POST /profiles
Content-Type: application/json
x-tenant-id: tenant-123

{
  "type": "INDIVIDUAL",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+66123456789",
  "primarySource": "MANUAL",
  "address": {
    "street": "123 Main St",
    "city": "Bangkok",
    "country": "Thailand",
    "postalCode": "10110"
  },
  "tags": [
    {
      "id": "tag-123",
      "name": "VIP",
      "color": "#FF0000"
    }
  ]
}
```

#### List Profiles with Filters

```typescript
GET /profiles?search=john&type=INDIVIDUAL&status=ACTIVE&page=1&limit=20
x-tenant-id: tenant-123

Response:
{
  "data": [
    {
      "id": "profile-001",
      "name": "John Doe",
      "email": "john@example.com",
      "type": "INDIVIDUAL",
      "status": "ACTIVE",
      "identifiers": [...],
      "tagsRelations": [...]
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

#### Get Profile Details (360° View)

```typescript
GET /profiles/profile-001
x-tenant-id: tenant-123

Response:
{
  "id": "profile-001",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+66123456789",
  "type": "INDIVIDUAL",
  "status": "ACTIVE",
  "identifiers": [
    {
      "id": "ident-001",
      "source": "ERP",
      "externalId": "ERP001",
      "matchQuality": 100,
      "isPrimary": true
    },
    {
      "id": "ident-002",
      "source": "LINE",
      "externalId": "Uxxxxxx",
      "matchQuality": 95,
      "isPrimary": true
    }
  ],
  "events": [...],
  "deals": [...],
  "activities": [...],
  "tagsRelations": [...]
}
```

---

### 2. External ID Management

#### Add External Identifier

```typescript
POST /profiles/profile-001/identifiers
x-tenant-id: tenant-123

{
  "source": "LINE",
  "sourceType": "USER",
  "externalId": "Uxxxxxxxx",
  "externalRef": "LINE:users.Uxxxxxxxx",
  "matchQuality": 95,
  "isPrimary": true
}
```

#### Find Profile by External ID

```typescript
GET /profiles/external/LINE/Uxxxxxxxx?sourceType=USER
x-tenant-id: tenant-123

Response:
{
  "id": "profile-001",
  "name": "John Doe",
  "email": "john@example.com"
}
```

---

### 3. Import & Sync Operations

#### Import from CSV

```typescript
POST /profiles/import
x-tenant-id: tenant-123

{
  "source": "ERP",
  "sourceType": "CUSTOMER",
  "profiles": [
    {
      "type": "INDIVIDUAL",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@erp.com",
      "phone": "+66123456789",
      "metadata": {
        "externalId": "ERP001"
      }
    },
    {
      "type": "COMPANY",
      "companyName": "Acme Corp",
      "email": "info@acme.com",
      "metadata": {
        "externalId": "ERP002"
      }
    }
  ]
}

Response:
{
  "success": 2,
  "failed": 0,
  "skipped": 0,
  "errors": []
}
```

#### Sync from External API

```typescript
POST /profiles/sync
x-tenant-id: tenant-123

{
  "apiUrl": "https://erp.example.com/api/customers",
  "apiKey": "your-api-key-here",
  "syncFrequency": "daily"
}

Response:
{
  "success": 15,
  "failed": 2,
  "skipped": 3,
  "errors": [],
  "totalFetched": 20,
  "syncFrequency": "daily",
  "syncedAt": "2024-01-15T10:30:00Z"
}
```

---

### 4. Profile Unification (Duplicate Detection)

#### Detect Duplicates

```typescript
POST /profiles/detect-duplicates
x-tenant-id: tenant-123

Response:
{
  "candidates": [
    {
      "id": "pair_profile-001_profile-002",
      "profile1": {
        "id": "profile-001",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+66123456789"
      },
      "profile2": {
        "id": "profile-002",
        "name": "John Smith",
        "email": "john@example.com",
        "phone": "+66987654321"
      },
      "matchScore": 85,
      "matchReasons": [
        "Email match",
        "Name partially similar"
      ],
      "conflictFields": [
        {
          "name": "Phone",
          "value1": "+66123456789",
          "value2": "+66987654321"
        },
        {
          "name": "Name",
          "value1": "John Doe",
          "value2": "John Smith"
        }
      ],
      "detectedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Merge Profiles

```typescript
POST /profiles/merge
x-tenant-id: tenant-123

{
  "candidateIds": ["pair_profile-001_profile-002"],
  "strategy": "MERGE_BOTH",
  "resolvedConflicts": {
    "phone": "+66123456789",  // Use phone from profile1
    "name": "John Doe"         // Use name from profile1
  }
}

Response:
{
  "id": "profile-001",
  "name": "John Doe",
  "phone": "+66123456789",
  "mergedFrom": ["profile-002"],
  "mergedAt": "2024-01-15T10:35:00Z"
}
```

---

### 5. Profile Completion Score

```typescript
GET /profiles/completion-score/profile-001
x-tenant-id: tenant-123

Response:
{
  "profileId": "profile-001",
  "completionScore": 85
}
```

**Scoring Logic:**
- Basic fields (30%): name, email, phone, address
- Profile fields (30%): firstName, lastName, companyName, industry, etc.
- Additional info (20%): tags, custom attributes
- Identifiers (20%): external IDs from sources

---

### 6. Bulk Operations

#### Bulk Add Tags

```typescript
POST /profiles/bulk/tags
x-tenant-id: tenant-123

{
  "profileIds": ["profile-001", "profile-002", "profile-003"],
  "tags": [
    { "id": "tag-001", "name": "VIP", "color": "#FF0000" },
    { "id": "tag-002", "name": "High Value", "color": "#00FF00" }
  ]
}

Response:
{
  "updated": 3,
  "failed": 0
}
```

#### Bulk Add to Segments

```typescript
POST /profiles/bulk/segments
x-tenant-id: tenant-123

{
  "profileIds": ["profile-001", "profile-002"],
  "segmentIds": ["segment-001", "segment-002"]
}

Response:
{
  "updated": 2,
  "failed": 0
}
```

#### Bulk Delete (Soft Delete)

```typescript
DELETE /profiles/bulk
x-tenant-id: tenant-123

{
  "profileIds": ["profile-001", "profile-002"]
}

Response: 204 No Content
```

---

### 7. Statistics

```typescript
GET /profiles/statistics
x-tenant-id: tenant-123

Response:
{
  "total": 1500,
  "individuals": 950,
  "companies": 550,
  "active": 1450,
  "inactive": 50,
  "recentCreated": 120
}
```

---

## API Endpoints

### Complete Endpoint List

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/profiles` | List profiles with filters | Required |
| `GET` | `/profiles/statistics` | Get profile statistics | Required |
| `GET` | `/profiles/:id` | Get profile details | Required |
| `GET` | `/profiles/completion-score/:id` | Get completion score | Required |
| `POST` | `/profiles` | Create new profile | Write |
| `PUT` | `/profiles/:id` | Update profile | Write |
| `DELETE` | `/profiles/:id` | Delete profile (soft delete) | Delete |
| `POST` | `/profiles/:profileId/identifiers` | Add external identifier | Write |
| `DELETE` | `/profiles/:profileId/identifiers/:identifierId` | Remove identifier | Write |
| `GET` | `/profiles/external/:source/:externalId` | Find by external ID | Required |
| `POST` | `/profiles/import` | Import profiles | Write |
| `POST` | `/profiles/sync` | Sync from external API | Write |
| `POST` | `/profiles/merge` | Merge profiles | Write |
| `POST` | `/profiles/detect-duplicates` | Detect duplicates | Read |
| `POST` | `/profiles/auto-unify/:profileId` | Auto-detect for profile | Write |
| `POST` | `/profiles/bulk/tags` | Bulk add tags | Write |
| `POST` | `/profiles/bulk/segments` | Bulk add to segments | Write |
| `DELETE` | `/profiles/bulk` | Bulk delete | Delete |

---

## Data Integration

### Data Sources

The Profile Module supports integration with multiple data sources:

| Source | Integration Method | Data Type | External ID Field |
|--------|-------------------|-----------|------------------|
| **ERP** | API Sync / CSV Import | Customer master data | `erpCustomerId` |
| **CRM** | API Sync / Manual | Contacts, leads | `crmContactId` |
| **LINE** | Webhook | User data, messages | `lineUserId` |
| **Facebook** | API Sync | User data, messages | `facebookUserId` |
| **Website** | Manual / API | Form submissions | `websiteUserId` |
| **Manual** | UI Entry | Manual data entry | - |

### Integration Flow

```
┌─────────────┐
│  ERP System │
│  (SAP)      │
└──────┬──────┘
       │ API Call / CSV Export
       ▼
┌─────────────────────────────┐
│   Profile Import Endpoint   │
│   POST /profiles/import    │
└──────────┬────────────────┘
           │
           │ 1. Parse Data
           │ 2. Check for Duplicates
           │ 3. Create/Update Profile
           │ 4. Create Identifier Mapping
           ▼
┌─────────────────────────────┐
│    Profile Table           │
│  - id: profile-001        │
│  - name: John Doe         │
│  - email: john@erp.com    │
└──────────┬────────────────┘
           │
           │ 5. Create Identifier
           ▼
┌─────────────────────────────┐
│  ProfileIdentifier Table   │
│  - profileId: profile-001 │
│  - source: ERP           │
│  - externalId: ERP001    │
│  - matchQuality: 100     │
└─────────────────────────────┘
```

### Import Strategies

#### 1. File Import (CSV)

```typescript
// Frontend uploads CSV
const formData = new FormData();
formData.append('file', csvFile);
formData.append('source', 'ERP');
formData.append('sourceType', 'CUSTOMER');

await fetch('/profiles/import', {
  method: 'POST',
  headers: { 'x-tenant-id': tenantId },
  body: formData,
});
```

**CSV Format:**
```csv
email,firstName,lastName,phone,company,companyTaxId,industry
john@erp.com,John,Doe,+66123456789,Acme Corp,123456789,Technology
jane@erp.com,Jane,Smith,+66987654321,XYZ Corp,987654321,Finance
```

#### 2. API Sync

```typescript
// Backend fetches from external API
const response = await fetch('https://erp.example.com/api/customers', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
});

const customers = await response.json();
// Import to Profile table
```

#### 3. Webhook Integration (LINE)

```typescript
// LINE Platform sends webhook
POST /line-events/webhook/:tenantId/:channelAccountId

// Backend processes:
1. Extract LINE userId
2. Find profile by identifier (source: LINE, externalId: userId)
3. If found, update profile
4. If not found, create new profile with LINE identifier
5. Save LINE event to customer_events table
```

---

## Cron Jobs Setup

### Overview

Cron jobs automate periodic tasks such as:
- 🔍 Duplicate detection
- 🔄 Data synchronization
- 🤖 Auto-merging high-confidence matches

### Installation

```bash
cd apps/management-api
npm install @nestjs/schedule
```

### Scheduler Configuration

```typescript
// apps/management-api/src/profile/profile.scheduler.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ProfileScheduler {
  private readonly logger = new Logger(ProfileScheduler.name);

  /**
   * Run duplicate detection every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleScheduledDuplicateDetection() {
    this.logger.log('Starting scheduled duplicate detection...');
    
    try {
      // Get all tenants
      const tenants = await this.prisma.tenant.findMany();
      
      for (const tenant of tenants) {
        // Detect duplicates
        const candidates = await this.unifyService.detectDuplicates(tenant.id);
        
        // Auto-merge high-confidence matches (>= 90%)
        const highConfidence = candidates.filter(c => c.matchScore >= 90);
        for (const candidate of highConfidence) {
          await this.unifyService.mergeProfiles(tenant.id, candidate, {
            strategy: 'PROFILE1_WINS',
          });
        }
        
        // Create pending candidates for medium-confidence (60-89%)
        const mediumConfidence = candidates.filter(c => c.matchScore >= 60 && c.matchScore < 90);
        // TODO: Send notification to admin
      }
      
      this.logger.log('Scheduled duplicate detection completed');
    } catch (error) {
      this.logger.error('Failed to run scheduled duplicate detection', error);
    }
  }

  /**
   * Run daily deep unification at 2 AM
   */
  @Cron('0 2 * * *')
  async handleDailyDeepUnification() {
    this.logger.log('Starting daily deep unification...');
    
    // Similar logic with more comprehensive matching
  }

  /**
   * Run hourly sync from external APIs
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlySync() {
    this.logger.log('Starting hourly sync from external sources...');
    
    // Sync data from configured APIs
  }
}
```

### Module Registration

```typescript
// apps/management-api/src/profile/profile.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(), // ← Enable cron jobs
  ],
  providers: [
    ProfileService,
    UnifyService,
    ProfileScheduler, // ← Register scheduler
  ],
})
export class ProfileModule {}
```

### Cron Expression Reference

| Expression | Description |
|------------|-------------|
| `* * * * *` | Every minute |
| `0 * * * *` | Every hour |
| `0 */6 * * *` | Every 6 hours |
| `0 2 * * *` | Every day at 2 AM |
| `0 0 * * 0` | Every Sunday at midnight |
| `0 0 1 * *` | Every 1st of month at midnight |

### Timezone Configuration

```typescript
@Cron('0 2 * * *', {
  timeZone: 'Asia/Bangkok',
})
async handleDailyDeepUnification() {
  // Runs at 2 AM Bangkok time
}
```

---

## Best Practices

### 1. Database Performance

#### Use Proper Indexes

```prisma
@@index([tenantId])
@@index([tenantId, type])
@@index([tenantId, status])
@@index([tenantId, email])  // For email searches
@@unique([source, externalId, sourceType])  // For external ID lookups
```

#### Avoid N+1 Queries

```typescript
// ❌ Bad (N+1 queries)
const profiles = await prisma.profile.findMany();
for (const profile of profiles) {
  const identifiers = await prisma.profileIdentifier.findMany({
    where: { profileId: profile.id },
  });
}

// ✅ Good (1 query with eager loading)
const profiles = await prisma.profile.findMany({
  include: {
    identifiers: true,
  },
});
```

#### Pagination

Always use pagination for large datasets:

```typescript
const profiles = await prisma.profile.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' },
});
```

---

### 2. Data Integrity

#### Use Transactions

```typescript
await prisma.$transaction(async (tx) => {
  // Create profile
  const profile = await tx.profile.create({ data: {...} });
  
  // Create identifier
  await tx.profileIdentifier.create({
    data: {
      profileId: profile.id,
      source: 'ERP',
      externalId: 'ERP001',
    },
  });
});
```

#### Soft Delete Instead of Hard Delete

```typescript
// ❌ Hard delete
await prisma.profile.delete({ where: { id } });

// ✅ Soft delete
await prisma.profile.update({
  where: { id },
  data: {
    status: 'INACTIVE',
    name: `[INACTIVE] ${name}`,
  },
});
```

#### Unique Constraints

```prisma
@@unique([source, externalId, sourceType])
```

Prevents duplicate external ID mappings.

---

### 3. Security

#### Multi-Tenant Isolation

Always filter by `tenantId`:

```typescript
// ✅ Good
const profiles = await prisma.profile.findMany({
  where: {
    tenantId: req.headers['x-tenant-id'],
  },
});

// ❌ Bad (cross-tenant data leak)
const profiles = await prisma.profile.findMany();
```

#### Input Validation

Use DTOs with validation:

```typescript
export class CreateProfileDto {
  @IsEmail()
  email: string;

  @IsPhoneNumber()
  phone: string;

  @IsEnum(ProfileType)
  type: ProfileType;
}
```

#### Role-Based Access Control

```typescript
@RequirePermissions('profile:write')
@Post()
async create(@Req() req: Request, @Body() dto: CreateProfileDto) {
  // Only users with 'profile:write' permission can access
}
```

---

### 4. Error Handling

#### Graceful Degradation

```typescript
try {
  const profile = await this.prisma.profile.findUnique({
    where: { id },
  });
  
  if (!profile) {
    throw new NotFoundException('Profile not found');
  }
  
  return profile;
} catch (error) {
  this.logger.error(`Failed to find profile ${id}`, error);
  throw error;
}
```

#### Retry Logic for External API Calls

```typescript
async syncFromApiWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** i));
    }
  }
}
```

---

### 5. Monitoring & Logging

#### Structured Logging

```typescript
this.logger.log({
  message: 'Profile created',
  profileId: profile.id,
  tenantId: profile.tenantId,
  source: profile.primarySource,
});
```

#### Metrics

```typescript
// Track profile creation time
const startTime = Date.now();
const profile = await this.prisma.profile.create({ data });
const duration = Date.now() - startTime;

// Log metric for monitoring
this.logger.log(`Profile created in ${duration}ms`);
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error:**
```
Can't reach database server at `localhost:5432`
```

**Solution:**
1. Check if PostgreSQL is running: `docker ps | grep postgres`
2. Verify `DATABASE_URL` in `.env` file
3. Check if database exists: `\l` in psql

---

#### 2. Prisma Client Not Generated

**Error:**
```
Error: @prisma/client did not initialize yet
```

**Solution:**
```bash
npx prisma generate
npm run build
```

---

#### 3. Cron Jobs Not Running

**Symptoms:**
- No logs from cron jobs
- Tasks not executing

**Solution:**
1. Verify `@nestjs/schedule` is installed
2. Check `ScheduleModule.forRoot()` is registered
3. Verify `ProfileScheduler` is in `providers`
4. Check logs for any errors
5. Test with manual trigger endpoint

---

#### 4. Duplicate Profiles Not Detected

**Symptoms:**
- Profiles with same email not detected as duplicates

**Solution:**
1. Check match scoring logic in `UnifyService`
2. Verify data normalization (email lowercase, phone digits only)
3. Check if `matchScore >= 60` threshold is appropriate
4. Review `matchReasons` for why scores are low

---

#### 5. Performance Issues

**Symptoms:**
- Slow query responses
- High CPU/Memory usage

**Solution:**
1. Check for missing indexes
2. Optimize queries (use pagination, limit eager loading)
3. Use database connection pooling
4. Implement caching for frequently accessed data
5. Monitor with `EXPLAIN ANALYZE` in PostgreSQL

---

### Debug Queries

#### Enable Query Logging

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Enable query logging
  logLevel = "query"
}
```

#### Use Prisma Studio

```bash
npx prisma studio
```

Opens a visual database explorer at `http://localhost:5555`.

---

## Additional Resources

### Documentation

- [Prisma Documentation](https://www.prisma.io/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [NestJS Schedule Documentation](https://docs.nestjs.com/techniques/task-scheduling)

### Related Modules

- `customer.module` - Legacy customer management
- `unify.module` - Profile deduplication and merging
- `tag.module` - Profile tagging
- `segment.module` - Profile segmentation

### API Documentation

- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI Spec: `http://localhost:3000/api-json`

---

## Changelog

### Version 1.0.0 (2024-01-15)

- ✅ Initial release of Profile Module
- ✅ Core CRUD operations
- ✅ External ID mapping
- ✅ Import from CSV
- ✅ Sync from external APIs
- ✅ Basic duplicate detection
- ✅ Profile completion scoring
- ✅ Bulk operations
- ✅ Statistics endpoints
- ✅ Cron job scheduler

### Version 1.1.0 (Planned)

- 🔄 Advanced ML-based duplicate detection
- 🔄 Automatic merge workflows
- 🔄 Profile comparison preview
- 🔄 Merge rollback capability
- 🔄 Data quality score
- 🔄 Enrichment from external sources

---

## Support

For issues or questions:
- 📧 Email: support@ydm-platform.com
- 📚 Documentation: `/docs`
- 💬 Slack: `#cdp-profile-module`

---

**Last Updated:** 2024-01-15  
**Version:** 1.0.0  
**Maintainer:** YDM Platform Team