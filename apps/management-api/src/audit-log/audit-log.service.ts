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

  async findAll(tenantId?: string, filters?: { entity?: string; action?: string; actorUserId?: string }) {
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

    return this.prisma.auditLog.findMany({
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
      take: 100,
    });
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
