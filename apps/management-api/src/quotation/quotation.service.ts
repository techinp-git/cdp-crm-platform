import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateQuotationDto {
  quotationNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  amount: number;
  currency?: string;
  status?: string;
  issueDate: string;
  validUntil?: string;
  description?: string;
}

interface UpdateQuotationDto extends Partial<CreateQuotationDto> {}

@Injectable()
export class QuotationService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(tenantId: string, createQuotationDto: CreateQuotationDto) {
    // Check if quotation number already exists
    const existing = await this.prisma.quotation.findUnique({
      where: { quotationNumber: createQuotationDto.quotationNumber },
    });
    if (existing) {
      throw new BadRequestException('Quotation number already exists');
    }

    return this.prisma.quotation.create({
      data: {
        tenantId,
        ...createQuotationDto,
        amount: createQuotationDto.amount,
        issueDate: new Date(createQuotationDto.issueDate),
        validUntil: createQuotationDto.validUntil ? new Date(createQuotationDto.validUntil) : null,
      },
    });
  }

  async findAll(tenantId: string, filters?: { status?: string; page?: number; limit?: number }) {
    const where: any = { tenantId };
    if (filters?.status) {
      where.status = filters.status;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(tenantId: string, id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId },
    });
    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }
    return quotation;
  }

  async update(tenantId: string, id: string, data: UpdateQuotationDto) {
    await this.findOne(tenantId, id); // Ensure quotation belongs to tenant

    const updateData: any = { ...data };
    if (data.issueDate) {
      updateData.issueDate = new Date(data.issueDate);
    }
    if (data.validUntil !== undefined) {
      updateData.validUntil = data.validUntil ? new Date(data.validUntil) : null;
    }

    return this.prisma.quotation.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id); // Ensure quotation belongs to tenant
    await this.prisma.quotation.delete({
      where: { id },
    });
  }

  async importFromFile(tenantId: string, file: Express.Multer.File): Promise<{ success: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    let rows: any[] = [];

    // Parse CSV file
    try {
      const fileContent = file.buffer.toString('utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());

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
    } catch (error) {
      throw new BadRequestException(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const quotationNumber = row.quotationNumber || row['quotationNumber'] || '';
        const customerName = row.customerName || row['customerName'] || '';
        const amount = parseFloat(row.amount || row['amount'] || '0');
        const status = row.status || row['status'] || 'PENDING';
        const issueDate = row.issueDate || row['issueDate'] || '';

        if (!quotationNumber || !customerName || !issueDate) {
          errors.push(`Row ${i + 2}: Missing required fields (quotationNumber, customerName, issueDate)`);
          failed++;
          continue;
        }

        // Check if quotation already exists
        const existing = await this.prisma.quotation.findUnique({
          where: { quotationNumber },
        });

        if (existing) {
          // Update existing quotation
          await this.prisma.quotation.update({
            where: { id: existing.id },
            data: {
              customerName: row.customerName || existing.customerName,
              customerEmail: row.customerEmail || existing.customerEmail || null,
              customerPhone: row.customerPhone || existing.customerPhone || null,
              amount: amount || existing.amount,
              currency: row.currency || existing.currency || 'THB',
              status: status || existing.status,
              issueDate: issueDate ? new Date(issueDate) : existing.issueDate,
              validUntil: row.validUntil ? new Date(row.validUntil) : existing.validUntil,
              description: row.description || existing.description || null,
            },
          });
        } else {
          // Create new quotation
          await this.prisma.quotation.create({
            data: {
              tenantId,
              quotationNumber,
              customerName,
              customerEmail: row.customerEmail || null,
              customerPhone: row.customerPhone || null,
              amount: amount,
              currency: row.currency || 'THB',
              status: status,
              issueDate: new Date(issueDate),
              validUntil: row.validUntil ? new Date(row.validUntil) : null,
              description: row.description || null,
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
    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    try {
      const response = await fetch(config.apiUrl, {
        headers: {
          'X-API-Key': config.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const externalQuotations = await response.json();

      if (!Array.isArray(externalQuotations)) {
        throw new BadRequestException('API response must be an array of quotations');
      }

      for (const quotationData of externalQuotations) {
        try {
          const quotationNumber = quotationData.quotationNumber || quotationData.quotation_number || '';
          const customerName = quotationData.customerName || quotationData.customer_name || '';
          const amount = parseFloat(quotationData.amount || '0');
          const status = quotationData.status || 'PENDING';
          const issueDate = quotationData.issueDate || quotationData.issue_date || '';

          if (!quotationNumber || !customerName || !issueDate) {
            errors.push(`Quotation missing required fields: ${JSON.stringify(quotationData)}`);
            failed++;
            continue;
          }

          const existing = await this.prisma.quotation.findUnique({
            where: { quotationNumber },
          });

          if (existing) {
            await this.prisma.quotation.update({
              where: { id: existing.id },
              data: {
                customerName: quotationData.customerName || existing.customerName,
                customerEmail: quotationData.customerEmail || existing.customerEmail || null,
                customerPhone: quotationData.customerPhone || existing.customerPhone || null,
                amount: amount || existing.amount,
                currency: quotationData.currency || existing.currency || 'THB',
                status: status || existing.status,
                issueDate: issueDate ? new Date(issueDate) : existing.issueDate,
                validUntil: quotationData.validUntil ? new Date(quotationData.validUntil) : existing.validUntil,
                description: quotationData.description || existing.description || null,
              },
            });
          } else {
            await this.prisma.quotation.create({
              data: {
                tenantId,
                quotationNumber,
                customerName,
                customerEmail: quotationData.customerEmail || null,
                customerPhone: quotationData.customerPhone || null,
                amount: amount,
                currency: quotationData.currency || 'THB',
                status: status,
                issueDate: new Date(issueDate),
                validUntil: quotationData.validUntil ? new Date(quotationData.validUntil) : null,
                description: quotationData.description || null,
              },
            });
          }
          success++;
        } catch (error) {
          errors.push(`Processing quotation ${quotationData.quotationNumber || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failed++;
        }
      }
    } catch (error) {
      errors.push(`API sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed = externalQuotations?.length || 0;
    }

    return { success, failed, errors: errors.slice(0, 10) };
  }
}
