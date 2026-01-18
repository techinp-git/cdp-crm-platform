import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Contact } from '@ydm-platform/types';

@Injectable()
export class ContactService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(tenantId: string, data: Partial<Contact>): Promise<Contact> {
    return this.prisma.contact.create({
      data: {
        tenantId,
        firstName: data.firstName!,
        lastName: data.lastName!,
        email: data.email,
        phone: data.phone,
        title: data.title,
        department: data.department,
        customerId: data.customerId,
        metadata: data.metadata,
      },
    });
  }

  async findAll(
    tenantId: string,
    filters?: { customerId?: string; accountId?: string; search?: string; page?: number; limit?: number }
  ): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    
    if (filters?.accountId) {
      where.accountContacts = {
        some: {
          accountId: filters.accountId,
        },
      };
    }
    
    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        include: {
          customer: true,
          accountContacts: {
            include: {
              account: true,
            },
          },
        },
        orderBy: { lastName: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(tenantId: string, id: string): Promise<Contact> {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        accountContacts: {
          include: {
            account: true,
          },
        },
      },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    return contact;
  }

  async update(tenantId: string, id: string, data: Partial<Contact>): Promise<Contact> {
    await this.findOne(tenantId, id);
    return this.prisma.contact.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.contact.delete({
      where: { id },
    });
  }

  async importFromFile(tenantId: string, accountId: string, file: Express.Multer.File): Promise<{ success: number; failed: number; errors: string[] }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!accountId) {
      throw new BadRequestException('Account ID is required');
    }

    // Verify account exists
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, tenantId },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    let rows: any[] = [];

    try {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        const content = file.buffer.toString('utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
          throw new BadRequestException('CSV file is empty');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

        rows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
      } else {
        throw new BadRequestException('Currently only CSV files are supported.');
      }
    } catch (error) {
      throw new BadRequestException(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const firstName = row.firstName || row.first_name || row['First Name'] || '';
        const lastName = row.lastName || row.last_name || row['Last Name'] || '';
        const email = row.email || row.Email || '';
        const phone = row.phone || row.Phone || '';
        const title = row.title || row.Title || row['Job Title'] || '';
        const department = row.department || row.Department || '';

        if (!firstName || !lastName) {
          errors.push(`Row ${i + 2}: Missing firstName or lastName`);
          failed++;
          continue;
        }

        // Check if contact already exists (by email or phone)
        let existing = null;
        if (email) {
          existing = await this.prisma.contact.findFirst({
            where: {
              tenantId,
              email,
            },
          });
        }
        if (!existing && phone) {
          existing = await this.prisma.contact.findFirst({
            where: {
              tenantId,
              phone,
            },
          });
        }

        if (existing) {
          // Update existing contact and link to account
          await this.prisma.contact.update({
            where: { id: existing.id },
            data: {
              firstName,
              lastName,
              email: email || existing.email,
              phone: phone || existing.phone,
              title: title || existing.title,
              department: department || existing.department,
            },
          });

          // Link to account if not already linked
          const accountContact = await this.prisma.accountContact.findUnique({
            where: {
              accountId_contactId: {
                accountId,
                contactId: existing.id,
              },
            },
          });

          if (!accountContact) {
            await this.prisma.accountContact.create({
              data: {
                accountId,
                contactId: existing.id,
                role: 'PRIMARY',
              },
            });
          }
        } else {
          // Create new contact
          const contact = await this.prisma.contact.create({
            data: {
              tenantId,
              firstName,
              lastName,
              email: email || null,
              phone: phone || null,
              title: title || null,
              department: department || null,
              metadata: {
                source: 'IMPORT_FILE',
                importedAt: new Date().toISOString(),
              },
            },
          });

          // Link to account
          await this.prisma.accountContact.create({
            data: {
              accountId,
              contactId: contact.id,
              role: 'PRIMARY',
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

  async syncFromApi(tenantId: string, accountId: string, config: { apiUrl: string; apiKey: string; syncFrequency?: string }): Promise<{ success: number; failed: number; errors: string[] }> {
    if (!config.apiUrl || !config.apiKey) {
      throw new BadRequestException('API URL and API Key are required');
    }
    if (!accountId) {
      throw new BadRequestException('Account ID is required');
    }

    // Verify account exists
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, tenantId },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

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
      const contacts = Array.isArray(responseData) ? responseData : (responseData.contacts || responseData.data || []);

      if (!Array.isArray(contacts)) {
        throw new BadRequestException('Invalid API response format. Expected array of contacts.');
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < contacts.length; i++) {
        const contactData = contacts[i];
        try {
          const firstName = contactData.firstName || contactData.first_name || '';
          const lastName = contactData.lastName || contactData.last_name || '';
          const email = contactData.email || '';
          const phone = contactData.phone || '';
          const title = contactData.title || contactData.jobTitle || '';
          const department = contactData.department || '';

          if (!firstName || !lastName) {
            errors.push(`Contact ${i + 1}: Missing firstName or lastName`);
            failed++;
            continue;
          }

          // Check if contact already exists
          let existing = null;
          if (email) {
            existing = await this.prisma.contact.findFirst({
              where: {
                tenantId,
                email,
              },
            });
          }
          if (!existing && phone) {
            existing = await this.prisma.contact.findFirst({
              where: {
                tenantId,
                phone,
              },
            });
          }

          if (existing) {
            // Update existing contact
            await this.prisma.contact.update({
              where: { id: existing.id },
              data: {
                firstName,
                lastName,
                email: email || existing.email,
                phone: phone || existing.phone,
                title: title || existing.title,
                department: department || existing.department,
              },
            });

            // Link to account if not already linked
            const accountContact = await this.prisma.accountContact.findUnique({
              where: {
                accountId_contactId: {
                  accountId,
                  contactId: existing.id,
                },
              },
            });

            if (!accountContact) {
              await this.prisma.accountContact.create({
                data: {
                  accountId,
                  contactId: existing.id,
                  role: 'PRIMARY',
                },
              });
            }
          } else {
            // Create new contact
            const contact = await this.prisma.contact.create({
              data: {
                tenantId,
                firstName,
                lastName,
                email: email || null,
                phone: phone || null,
                title: title || null,
                department: department || null,
                metadata: {
                  source: 'API_SYNC',
                  syncedAt: new Date().toISOString(),
                },
              },
            });

            // Link to account
            await this.prisma.accountContact.create({
              data: {
                accountId,
                contactId: contact.id,
                role: 'PRIMARY',
              },
            });
          }
          success++;
        } catch (error) {
          errors.push(`Contact ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
