import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto, Customer, CustomerEvent, CreateCustomerEventDto } from '@ydm-platform/types';

@Injectable()
export class CustomerService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(tenantId: string, createCustomerDto: CreateCustomerDto): Promise<Customer> {
    return this.prisma.customer.create({
      data: {
        tenantId,
        ...createCustomerDto,
      },
    });
  }

  async findAll(
    tenantId: string, 
    filters?: { type?: string; search?: string; page?: number; limit?: number }
  ): Promise<Customer[] | { data: Customer[]; total: number; page: number; limit: number; totalPages: number }> {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const where: any = { tenantId };
    if (filters?.type) {
      where.type = filters.type;
    }
    
    // For search in JSON fields, we'll use a simpler approach without complex JSON filtering
    // The search will be done at application level or via raw query if needed
    // For now, we'll just filter by tenantId and type
    
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    // If pagination is requested, return paginated response
    if (filters?.page || filters?.limit) {
      const [data, total] = await Promise.all([
        this.prisma.customer.findMany({
          where,
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.customer.count({ where }),
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
    return this.prisma.customer.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(tenantId: string, id: string): Promise<Customer> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        events: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async update(tenantId: string, id: string, data: Partial<CreateCustomerDto>): Promise<Customer> {
    await this.findOne(tenantId, id);
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.customer.delete({
      where: { id },
    });
  }

  async createEvent(tenantId: string, createEventDto: CreateCustomerEventDto): Promise<CustomerEvent> {
    // Verify customer belongs to tenant
    const customer = await this.prisma.customer.findFirst({
      where: { id: createEventDto.customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.prisma.customerEvent.create({
      data: {
        tenantId,
        ...createEventDto,
        timestamp: createEventDto.timestamp || new Date(),
      },
    });
  }

  async getEvents(tenantId: string, customerId: string): Promise<CustomerEvent[]> {
    return this.prisma.customerEvent.findMany({
      where: { tenantId, customerId },
      orderBy: { timestamp: 'desc' },
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
      }
      // Excel parsing would require xlsx package
      else {
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
        // Map common column names
        const email = row.email || row.Email || row.EMAIL || '';
        const firstName = row.firstName || row.first_name || row['First Name'] || row['First Name'] || '';
        const lastName = row.lastName || row.last_name || row['Last Name'] || row['Last Name'] || '';
        const phone = row.phone || row.Phone || row.PHONE || row['Phone Number'] || '';

        if (!email) {
          errors.push(`Row ${i + 2}: Missing email`);
          failed++;
          continue;
        }

        // Check if customer already exists (by email)
        const existing = await this.prisma.customer.findFirst({
          where: {
            tenantId,
            identifiers: {
              path: ['email'],
              equals: email,
            },
          },
        });

        if (existing) {
          // Update existing customer
          await this.prisma.customer.update({
            where: { id: existing.id },
            data: {
              identifiers: {
                ...(existing.identifiers as any),
                email,
                phone: phone || (existing.identifiers as any).phone,
              },
              profile: {
                ...(existing.profile as any),
                firstName: firstName || (existing.profile as any).firstName,
                lastName: lastName || (existing.profile as any).lastName,
              },
              metadata: {
                ...(existing.metadata as any),
                source: 'ERP_IMPORT',
                lastImportedAt: new Date().toISOString(),
              },
            },
          });
        } else {
          // Determine type: COMPANY if company name exists, otherwise INDIVIDUAL
          const customerType = company ? 'COMPANY' : 'INDIVIDUAL';
          
          // Create new customer
          await this.prisma.customer.create({
            data: {
              tenantId,
              type: customerType,
              identifiers: {
                email: email || null,
                phone: phone || null,
                company: company || null,
                companyTaxId: companyTaxId || null,
              },
              profile: customerType === 'COMPANY' ? {
                companyName: company,
                industry: industry || null,
                companySize: companySize || null,
                address: address || null,
                city: city || null,
                country: country || null,
                postalCode: postalCode || null,
                contactPerson: firstName && lastName ? `${firstName} ${lastName}` : null,
              } : {
                firstName: firstName || null,
                lastName: lastName || null,
              },
              metadata: {
                source: 'ERP_IMPORT',
                importedAt: new Date().toISOString(),
                importType: 'B2B_COMPANY',
              },
            },
          });
        }
        success++;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
      }
    }

    return { success, failed, errors: errors.slice(0, 10) }; // Limit errors to first 10
  }

  async syncFromApi(tenantId: string, config: { apiUrl: string; apiKey: string; syncFrequency?: string }): Promise<{ success: number; failed: number; errors: string[] }> {
    if (!config.apiUrl || !config.apiKey) {
      throw new BadRequestException('API URL and API Key are required');
    }

    try {
      // Fetch data from external API using fetch
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

      const customers = Array.isArray(responseData) ? responseData : (responseData.customers || responseData.data || []);

      if (!Array.isArray(customers)) {
        throw new BadRequestException('Invalid API response format. Expected array of customers.');
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process each customer
      for (let i = 0; i < customers.length; i++) {
        const customerData = customers[i];
        try {
          const email = customerData.email || customerData.Email || '';
          const firstName = customerData.firstName || customerData.first_name || customerData['First Name'] || '';
          const lastName = customerData.lastName || customerData.last_name || customerData['Last Name'] || '';
          const phone = customerData.phone || customerData.Phone || customerData.phoneNumber || '';

          if (!email) {
            errors.push(`Customer ${i + 1}: Missing email`);
            failed++;
            continue;
          }

          // Check if customer already exists
          const existing = await this.prisma.customer.findFirst({
            where: {
              tenantId,
              identifiers: {
                path: ['email'],
                equals: email,
              },
            },
          });

          if (existing) {
            // Update existing customer
            await this.prisma.customer.update({
              where: { id: existing.id },
              data: {
                identifiers: {
                  ...(existing.identifiers as any),
                  email,
                  phone: phone || (existing.identifiers as any).phone,
                },
                profile: {
                  ...(existing.profile as any),
                  firstName: firstName || (existing.profile as any).firstName,
                  lastName: lastName || (existing.profile as any).lastName,
                },
                metadata: {
                  ...(existing.metadata as any),
                  source: 'ERP_API_SYNC',
                  lastSyncedAt: new Date().toISOString(),
                  syncFrequency: config.syncFrequency || 'manual',
                },
              },
            });
                 } else {
                   // Determine type: COMPANY if company name exists, otherwise INDIVIDUAL
                   const customerType = company ? 'COMPANY' : 'INDIVIDUAL';
                   
                   // Create new customer
                   await this.prisma.customer.create({
                     data: {
                       tenantId,
                       type: customerType,
                       identifiers: {
                         email: email || null,
                         phone: phone || null,
                         company: company || null,
                         companyTaxId: companyTaxId || null,
                       },
                       profile: customerType === 'COMPANY' ? {
                         companyName: company,
                         industry: industry || null,
                         companySize: companySize || null,
                         address: address || null,
                         city: city || null,
                         country: country || null,
                         postalCode: postalCode || null,
                         contactPerson: firstName && lastName ? `${firstName} ${lastName}` : null,
                       } : {
                         firstName: firstName || null,
                         lastName: lastName || null,
                       },
                       metadata: {
                         source: 'ERP_API_SYNC',
                         syncedAt: new Date().toISOString(),
                         syncFrequency: config.syncFrequency || 'manual',
                         importType: 'B2B_COMPANY',
                       },
                     },
                   });
                 }
          success++;
        } catch (error) {
          errors.push(`Customer ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
