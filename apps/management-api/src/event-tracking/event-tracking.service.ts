import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventTrackingService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  private get customerEvent() {
    const d = (this.prisma as any).customerEvent;
    if (!d) throw new InternalServerErrorException('CustomerEvent model not ready. Run prisma generate/db push then restart API.');
    return d;
  }

  async listEvents(
    tenantId: string,
    filters?: { type?: string; q?: string; customerId?: string; from?: Date; to?: Date; page?: number; limit?: number },
  ) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (filters?.type) where.type = String(filters.type);
    if (filters?.customerId) where.customerId = String(filters.customerId);
    if (filters?.from || filters?.to) {
      where.timestamp = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }
    if (filters?.q) {
      const q = String(filters.q).trim();
      if (q) {
        where.OR = [
          { type: { contains: q, mode: 'insensitive' } },
          { customerId: { contains: q, mode: 'insensitive' } },
        ];
      }
    }

    const [data, total] = await Promise.all([
      this.customerEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: {
          customer: {
            select: { id: true, type: true, profile: true, identifiers: true },
          },
        },
      }),
      this.customerEvent.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listEventTypes(tenantId: string, filters?: { from?: Date; to?: Date; limit?: number }) {
    const where: any = { tenantId };
    if (filters?.from || filters?.to) {
      where.timestamp = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    // Prisma groupBy needs delegate; use prisma.customerEvent directly
    const rows = await this.prisma.customerEvent.groupBy({
      by: ['type'],
      where,
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } },
      take: Math.min(filters?.limit || 50, 200),
    });

    return rows.map((r) => ({ type: r.type, count: Number((r as any)._count?.type || 0) }));
  }

  async createEvent(tenantId: string, body: { customerId: string; type: string; timestamp?: string; payload?: any }) {
    const customerId = String(body?.customerId || '').trim();
    const type = String(body?.type || '').trim();
    if (!customerId) throw new BadRequestException('customerId is required');
    if (!type) throw new BadRequestException('type is required');

    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true } });
    if (!customer) throw new BadRequestException('Customer not found');

    const ts = body?.timestamp ? new Date(body.timestamp) : new Date();
    return this.customerEvent.create({
      data: { tenantId, customerId, type, timestamp: ts, payload: body?.payload || null },
    });
  }
}

