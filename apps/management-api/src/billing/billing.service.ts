import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateBillingDto {
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  amount: number;
  currency?: string;
  status?: string;
  issueDate: string;
  dueDate?: string;
  paidDate?: string;
  description?: string;
}

interface UpdateBillingDto extends Partial<CreateBillingDto> {}

@Injectable()
export class BillingService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async listLines(tenantId: string, billingId: string) {
    await this.findOne(tenantId, billingId);
    return this.prisma.billingLine.findMany({
      where: { tenantId, billingId },
      orderBy: { lineNo: 'asc' },
      include: { product: true },
    });
  }

  async insights(tenantId: string) {
    const lines = await this.prisma.billingLine.findMany({
      where: { tenantId },
      take: 20000,
      orderBy: { createdAt: 'desc' },
      select: {
        quantity: true,
        lineAmount: true,
        currency: true,
        productSku: true,
        productName: true,
        product: { select: { sku: true, name: true, category: true } },
      },
    });

    const byCategory = new Map<string, { category: string; amount: number; qty: number; lines: number }>();
    const byProduct = new Map<
      string,
      { key: string; sku: string; name: string; category: string; amount: number; qty: number; lines: number }
    >();

    for (const l of lines as any[]) {
      const qty = Number(l.quantity) || 0;
      const amount = Number(l.lineAmount) || 0;
      const sku = String(l.product?.sku || l.productSku || '').trim();
      const name = String(l.product?.name || l.productName || sku || '').trim();
      const category = String(l.product?.category || 'Uncategorized').trim() || 'Uncategorized';
      const productKey = sku || name || `${category}::unknown`;

      const c = byCategory.get(category) || { category, amount: 0, qty: 0, lines: 0 };
      c.amount += amount;
      c.qty += qty;
      c.lines += 1;
      byCategory.set(category, c);

      const p = byProduct.get(productKey) || { key: productKey, sku, name, category, amount: 0, qty: 0, lines: 0 };
      p.amount += amount;
      p.qty += qty;
      p.lines += 1;
      byProduct.set(productKey, p);
    }

    const categories = Array.from(byCategory.values()).sort((a, b) => b.amount - a.amount);
    const topProducts = Array.from(byProduct.values()).sort((a, b) => b.amount - a.amount).slice(0, 10);

    return { categories, topProducts, totalLines: lines.length };
  }

  async create(tenantId: string, createBillingDto: CreateBillingDto) {
    // Check if invoice number already exists
    const existing = await this.prisma.billing.findUnique({
      where: { invoiceNumber: createBillingDto.invoiceNumber },
    });
    if (existing) {
      throw new BadRequestException('Invoice number already exists');
    }

    return this.prisma.billing.create({
      data: {
        tenantId,
        ...createBillingDto,
        amount: createBillingDto.amount,
        issueDate: new Date(createBillingDto.issueDate),
        dueDate: createBillingDto.dueDate ? new Date(createBillingDto.dueDate) : null,
        paidDate: createBillingDto.paidDate ? new Date(createBillingDto.paidDate) : null,
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
      this.prisma.billing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.billing.count({ where }),
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
    const billing = await this.prisma.billing.findFirst({
      where: { id, tenantId },
    });
    if (!billing) {
      throw new NotFoundException('Billing not found');
    }
    return billing;
  }

  async update(tenantId: string, id: string, data: UpdateBillingDto) {
    await this.findOne(tenantId, id); // Ensure billing belongs to tenant

    const updateData: any = { ...data };
    if (data.issueDate) {
      updateData.issueDate = new Date(data.issueDate);
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.paidDate !== undefined) {
      updateData.paidDate = data.paidDate ? new Date(data.paidDate) : null;
    }

    return this.prisma.billing.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id); // Ensure billing belongs to tenant
    await this.prisma.billing.delete({
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
        const invoiceNumber = row.invoiceNumber || row['invoiceNumber'] || '';
        const customerName = row.customerName || row['customerName'] || '';
        const amount = parseFloat(row.amount || row['amount'] || '0');
        const status = row.status || row['status'] || 'PENDING';
        const issueDate = row.issueDate || row['issueDate'] || '';

        if (!invoiceNumber || !customerName || !issueDate) {
          errors.push(`Row ${i + 2}: Missing required fields (invoiceNumber, customerName, issueDate)`);
          failed++;
          continue;
        }

        // Check if billing already exists
        const existing = await this.prisma.billing.findUnique({
          where: { invoiceNumber },
        });

        if (existing) {
          // Update existing billing
          await this.prisma.billing.update({
            where: { id: existing.id },
            data: {
              customerName: row.customerName || existing.customerName,
              customerEmail: row.customerEmail || existing.customerEmail || null,
              customerPhone: row.customerPhone || existing.customerPhone || null,
              amount: amount || existing.amount,
              currency: row.currency || existing.currency || 'THB',
              status: status || existing.status,
              issueDate: issueDate ? new Date(issueDate) : existing.issueDate,
              dueDate: row.dueDate ? new Date(row.dueDate) : existing.dueDate,
              paidDate: row.paidDate ? new Date(row.paidDate) : existing.paidDate,
              description: row.description || existing.description || null,
            },
          });
        } else {
          // Create new billing
          await this.prisma.billing.create({
            data: {
              tenantId,
              invoiceNumber,
              customerName,
              customerEmail: row.customerEmail || null,
              customerPhone: row.customerPhone || null,
              amount: amount,
              currency: row.currency || 'THB',
              status: status,
              issueDate: new Date(issueDate),
              dueDate: row.dueDate ? new Date(row.dueDate) : null,
              paidDate: row.paidDate ? new Date(row.paidDate) : null,
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

      const externalBillings = await response.json();

      if (!Array.isArray(externalBillings)) {
        throw new BadRequestException('API response must be an array of billings');
      }

      for (const billingData of externalBillings) {
        try {
          const invoiceNumber = billingData.invoiceNumber || billingData.invoice_number || '';
          const customerName = billingData.customerName || billingData.customer_name || '';
          const amount = parseFloat(billingData.amount || '0');
          const status = billingData.status || 'PENDING';
          const issueDate = billingData.issueDate || billingData.issue_date || '';

          if (!invoiceNumber || !customerName || !issueDate) {
            errors.push(`Billing missing required fields: ${JSON.stringify(billingData)}`);
            failed++;
            continue;
          }

          const existing = await this.prisma.billing.findUnique({
            where: { invoiceNumber },
          });

          if (existing) {
            await this.prisma.billing.update({
              where: { id: existing.id },
              data: {
                customerName: billingData.customerName || existing.customerName,
                customerEmail: billingData.customerEmail || existing.customerEmail || null,
                customerPhone: billingData.customerPhone || existing.customerPhone || null,
                amount: amount || existing.amount,
                currency: billingData.currency || existing.currency || 'THB',
                status: status || existing.status,
                issueDate: issueDate ? new Date(issueDate) : existing.issueDate,
                dueDate: billingData.dueDate ? new Date(billingData.dueDate) : existing.dueDate,
                paidDate: billingData.paidDate ? new Date(billingData.paidDate) : existing.paidDate,
                description: billingData.description || existing.description || null,
              },
            });
          } else {
            await this.prisma.billing.create({
              data: {
                tenantId,
                invoiceNumber,
                customerName,
                customerEmail: billingData.customerEmail || null,
                customerPhone: billingData.customerPhone || null,
                amount: amount,
                currency: billingData.currency || 'THB',
                status: status,
                issueDate: new Date(issueDate),
                dueDate: billingData.dueDate ? new Date(billingData.dueDate) : null,
                paidDate: billingData.paidDate ? new Date(billingData.paidDate) : null,
                description: billingData.description || null,
              },
            });
          }
          success++;
        } catch (error) {
          errors.push(`Processing billing ${billingData.invoiceNumber || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failed++;
        }
      }
    } catch (error) {
      errors.push(`API sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed = externalBillings?.length || 0;
    }

    return { success, failed, errors: errors.slice(0, 10) };
  }
}
