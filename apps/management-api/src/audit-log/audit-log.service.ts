import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(data: {
    tenantId?: string;
    actorUserId?: string;
    action: string;
    entity: string;
    entityId?: string;
    payload?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data,
    });
  }

  async findAll(
    tenantId?: string,
    filters?: { entity?: string; action?: string; actorUserId?: string; q?: string; page?: number; limit?: number },
  ) {
    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }
    if (filters?.entity) {
      where.entity = filters.entity;
    }
    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.actorUserId) {
      where.actorUserId = filters.actorUserId;
    }
    if (filters?.q) {
      const q = String(filters.q).trim();
      if (q) {
        where.OR = [
          { entityId: { contains: q, mode: 'insensitive' } },
          { action: { contains: q, mode: 'insensitive' } },
          { entity: { contains: q, mode: 'insensitive' } },
        ];
      }
    }

    const page = Math.max(filters?.page || 1, 1);
    const limit = Math.min(Math.max(filters?.limit || 50, 1), 200);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: true,
        tenant: true,
      },
    });
  }
}
