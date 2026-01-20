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

  async insights(tenantId: string) {
    const lines = await this.prisma.quotationLine.findMany({
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

    return {
      categories,
      topProducts,
      totalLines: lines.length,
    };
  }

  async listLines(tenantId: string, quotationId: string) {
    // Ensure quotation belongs to tenant
    await this.findOne(tenantId, quotationId);
    return this.prisma.quotationLine.findMany({
      where: { tenantId, quotationId },
      orderBy: { lineNo: 'asc' },
      include: { product: true },
    });
  }

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

    const normalized = rows.map((r) => {
      const recordTypeRaw = String(r.recordType || r.type || r.record_type || '').trim();
      const recordType = recordTypeRaw ? recordTypeRaw.toUpperCase() : '';
      const quotationNumber = String(r.quotationNumber || r.quotation_number || '').trim();
      return { ...r, recordType, quotationNumber };
    });

    // Group by quotationNumber
    const byQuotation = new Map<string, Array<{ row: any; idx: number }>>();
    for (let i = 0; i < normalized.length; i++) {
      const quotationNumber = normalized[i].quotationNumber;
      if (!quotationNumber) {
        errors.push(`Row ${i + 2}: Missing quotationNumber`);
        failed++;
        continue;
      }
      const arr = byQuotation.get(quotationNumber) || [];
      arr.push({ row: normalized[i], idx: i });
      byQuotation.set(quotationNumber, arr);
    }

    for (const [quotationNumber, group] of byQuotation.entries()) {
      try {
        const headerEntry =
          group.find((g) => g.row.recordType === 'HEADER') ||
          // backward compatible: treat non-typed row as header
          group.find((g) => !g.row.recordType || g.row.recordType === 'H');

        const details = group.filter((g) => g.row.recordType === 'DETAIL' || g.row.recordType === 'D');
        const footerEntry = group.find((g) => g.row.recordType === 'FOOTER' || g.row.recordType === 'F');

        if (!headerEntry) {
          errors.push(`Quotation ${quotationNumber}: Missing HEADER row`);
          failed++;
          continue;
        }

        const h = headerEntry.row;
        const customerName = String(h.customerName || h.customer_name || '').trim();
        const issueDate = String(h.issueDate || h.issue_date || '').trim();
        if (!customerName || !issueDate) {
          errors.push(`Quotation ${quotationNumber}: Missing required header fields (customerName, issueDate)`);
          failed++;
          continue;
        }

        const currency = String(h.currency || 'THB').trim() || 'THB';
        const status = String(h.status || 'PENDING').trim() || 'PENDING';

        // Parse details & upsert products
        const linesToCreate: any[] = [];
        for (let j = 0; j < details.length; j++) {
          const d = details[j].row;
          const lineNo = parseInt(String(d.lineNo || d.line_no || j + 1), 10) || j + 1;
          const productSku = String(d.productSku || d.sku || d.product_sku || '').trim();
          const productName = String(d.productName || d.name || d.product_name || d.itemName || '').trim();
          const qty = parseFloat(String(d.quantity || d.qty || d.q || '0')) || 0;
          const unitPrice = parseFloat(String(d.unitPrice || d.price || d.unit_price || '0')) || 0;
          const lineAmount =
            d.lineAmount !== undefined && String(d.lineAmount).trim() !== ''
              ? parseFloat(String(d.lineAmount))
              : qty * unitPrice;

          if (!productSku && !productName) {
            errors.push(`Quotation ${quotationNumber}: Detail row missing productSku/productName (row ${details[j].idx + 2})`);
            continue;
          }

          let productId: string | null = null;
          if (productSku) {
            const p = await this.prisma.product.upsert({
              where: { tenantId_sku: { tenantId, sku: productSku } },
              update: {
                name: productName || undefined,
                category: String(d.productCategory || d.category || '').trim() || undefined,
                currency,
                price: unitPrice ? unitPrice : undefined,
              },
              create: {
                tenantId,
                sku: productSku,
                name: productName || productSku,
                category: String(d.productCategory || d.category || '').trim() || null,
                currency,
                price: unitPrice || null,
              },
              select: { id: true },
            });
            productId = p.id;
          }

          linesToCreate.push({
            tenantId,
            lineNo,
            productId,
            productSku: productSku || null,
            productName: productName || null,
            quantity: qty,
            unitPrice,
            currency,
            lineAmount,
            metadata: { sourceRow: details[j].idx + 2 },
          });
        }

        const computedAmount = linesToCreate.reduce((sum, l) => sum + (parseFloat(String(l.lineAmount || 0)) || 0), 0);
        const headerAmount = h.amount !== undefined && String(h.amount).trim() !== '' ? parseFloat(String(h.amount)) : null;
        const amount = headerAmount !== null ? headerAmount : computedAmount;

        const footerMeta = footerEntry?.row
          ? {
              subtotal: footerEntry.row.subtotal ? parseFloat(String(footerEntry.row.subtotal)) : undefined,
              discountTotal: footerEntry.row.discountTotal ? parseFloat(String(footerEntry.row.discountTotal)) : undefined,
              taxTotal: footerEntry.row.taxTotal ? parseFloat(String(footerEntry.row.taxTotal)) : undefined,
              grandTotal: footerEntry.row.grandTotal ? parseFloat(String(footerEntry.row.grandTotal)) : undefined,
              note: footerEntry.row.note || footerEntry.row.footerNote || undefined,
            }
          : undefined;

        // Upsert quotation
        const existing = await this.prisma.quotation.findUnique({ where: { quotationNumber } });
        const quotation = existing
          ? await this.prisma.quotation.update({
              where: { id: existing.id },
              data: {
                tenantId,
                quotationNumber,
                customerName,
                customerEmail: h.customerEmail || h.customer_email || existing.customerEmail || null,
                customerPhone: h.customerPhone || h.customer_phone || existing.customerPhone || null,
                amount: amount || existing.amount,
                currency: currency || existing.currency || 'THB',
                status: status || existing.status,
                issueDate: issueDate ? new Date(issueDate) : existing.issueDate,
                validUntil: h.validUntil ? new Date(h.validUntil) : existing.validUntil,
                description: h.description || existing.description || null,
                metadata: { ...(existing.metadata as any), footer: footerMeta },
              },
            })
          : await this.prisma.quotation.create({
              data: {
                tenantId,
                quotationNumber,
                customerName,
                customerEmail: h.customerEmail || h.customer_email || null,
                customerPhone: h.customerPhone || h.customer_phone || null,
                amount,
                currency,
                status,
                issueDate: new Date(issueDate),
                validUntil: h.validUntil ? new Date(h.validUntil) : null,
                description: h.description || null,
                metadata: footerMeta ? { footer: footerMeta } : undefined,
              },
            });

        // Replace lines
        await this.prisma.quotationLine.deleteMany({ where: { tenantId, quotationId: quotation.id } });
        if (linesToCreate.length > 0) {
          await this.prisma.quotationLine.createMany({
            data: linesToCreate.map((l) => ({ ...l, quotationId: quotation.id })),
            skipDuplicates: false,
          });
        }

        success++;
      } catch (error) {
        errors.push(`Quotation ${quotationNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
