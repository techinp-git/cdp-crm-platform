import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeadDto, Lead } from '@ydm-platform/types';

@Injectable()
export class LeadService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(tenantId: string, createLeadDto: CreateLeadDto): Promise<Lead> {
    return this.prisma.lead.create({
      data: {
        tenantId,
        ...createLeadDto,
        status: createLeadDto.status || 'NEW',
      },
    });
  }

  async findAll(
    tenantId: string, 
    filters?: { status?: string; source?: string; q?: string; page?: number; limit?: number }
  ): Promise<Lead[] | { data: Lead[]; total: number; page: number; limit: number; totalPages: number }> {
    const where: any = { tenantId };
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.source) {
      where.source = filters.source;
    }
    if (filters?.q) {
      const q = String(filters.q).trim();
      if (q) {
        where.OR = [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { company: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
        ];
      }
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    // If pagination is requested, return paginated response
    if (filters?.page || filters?.limit) {
      const [data, total] = await Promise.all([
        this.prisma.lead.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.lead.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Otherwise return array (backward compatibility)
    return this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(tenantId: string, id: string): Promise<Lead> {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    return lead;
  }

  async update(tenantId: string, id: string, data: Partial<CreateLeadDto> & { metadata?: any }): Promise<Lead> {
    await this.findOne(tenantId, id);
    return this.prisma.lead.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.lead.delete({
      where: { id },
    });
  }

  async importFromFile(tenantId: string, file: Express.Multer.File): Promise<{ success: number; failed: number; errors: string[] }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    let rows: any[] = [];

    try {
      // Parse CSV (simple parser)
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        const content = file.buffer.toString('utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          throw new BadRequestException('CSV file is empty');
        }

        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        // Parse rows
        rows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
      } else {
        throw new BadRequestException('Currently only CSV files are supported. Please convert Excel files to CSV.');
      }
    } catch (error) {
      throw new BadRequestException(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const firstName = row.firstName || row.first_name || row['First Name'] || '';
        const lastName = row.lastName || row.last_name || row['Last Name'] || '';
        const email = row.email || row.Email || '';
        const phone = row.phone || row.Phone || '';
        const company = row.company || row.Company || '';

        if (!email && !phone) {
          errors.push(`Row ${i + 2}: Missing email or phone`);
          failed++;
          continue;
        }

        // Determine source based on import type (default to IMPORT_FILE)
        const source = 'IMPORT_FILE';

        // Check if lead already exists (by email or phone)
        const existing = await this.prisma.lead.findFirst({
          where: {
            tenantId,
            OR: [
              email ? { email } : {},
              phone ? { phone } : {},
            ].filter(condition => Object.keys(condition).length > 0),
          },
        });

        if (existing) {
          // Update existing lead
          await this.prisma.lead.update({
            where: { id: existing.id },
            data: {
              firstName: firstName || existing.firstName,
              lastName: lastName || existing.lastName,
              email: email || existing.email,
              phone: phone || existing.phone,
              company: company || existing.company,
              source,
            },
          });
        } else {
          // Create new lead
          await this.prisma.lead.create({
            data: {
              tenantId,
              firstName,
              lastName,
              email: email || null,
              phone: phone || null,
              company: company || null,
              source,
              status: 'NEW',
            },
          });
        }
        success++;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
      }
    }

    return { success, failed, errors: errors.slice(0, 10) };
  }

  async syncFromApi(tenantId: string, config: { apiUrl: string; apiKey: string; syncFrequency?: string }): Promise<{ success: number; failed: number; errors: string[] }> {
    if (!config.apiUrl || !config.apiKey) {
      throw new BadRequestException('API URL and API Key are required');
    }

    try {
      // Fetch data from external API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

      const response = await fetch(config.apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      const leads = Array.isArray(responseData) ? responseData : (responseData.leads || responseData.data || []);

      if (!Array.isArray(leads)) {
        throw new BadRequestException('Invalid API response format. Expected array of leads.');
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process each lead
      for (let i = 0; i < leads.length; i++) {
        const leadData = leads[i];
        try {
          const firstName = leadData.firstName || leadData.first_name || '';
          const lastName = leadData.lastName || leadData.last_name || '';
          const email = leadData.email || leadData.Email || '';
          const phone = leadData.phone || leadData.Phone || '';
          const company = leadData.company || leadData.Company || '';

          if (!email && !phone) {
            errors.push(`Lead ${i + 1}: Missing email or phone`);
            failed++;
            continue;
          }

          const source = 'SYNC_API';

          // Check if lead already exists
          const existing = await this.prisma.lead.findFirst({
            where: {
              tenantId,
              OR: [
                email ? { email } : {},
                phone ? { phone } : {},
              ].filter(condition => Object.keys(condition).length > 0),
            },
          });

          if (existing) {
            // Update existing lead
            await this.prisma.lead.update({
              where: { id: existing.id },
              data: {
                firstName: firstName || existing.firstName,
                lastName: lastName || existing.lastName,
                email: email || existing.email,
                phone: phone || existing.phone,
                company: company || existing.company,
                source,
              },
            });
          } else {
            // Create new lead
            await this.prisma.lead.create({
              data: {
                tenantId,
                firstName,
                lastName,
                email: email || null,
                phone: phone || null,
                company: company || null,
                source,
                status: 'NEW',
              },
            });
          }
          success++;
        } catch (error) {
          errors.push(`Lead ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failed++;
        }
      }

      return { success, failed, errors: errors.slice(0, 10) };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadRequestException('API request timeout. Please try again.');
      }
      throw new BadRequestException(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
