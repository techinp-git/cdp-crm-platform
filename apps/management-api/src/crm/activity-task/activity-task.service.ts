import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityTask } from '@ydm-platform/types';

@Injectable()
export class ActivityTaskService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(
    tenantId: string,
    data: {
      type: string;
      title: string;
      description?: string;
      dueDate?: Date;
      priority?: string;
      customerId?: string;
      dealId?: string;
    }
  ): Promise<ActivityTask> {
    return this.prisma.activityTask.create({
      data: {
        tenantId,
        ...data,
        priority: data.priority || 'MEDIUM',
        status: 'PENDING',
      },
    });
  }

  async findAll(
    tenantId: string,
    filters?: { status?: string; type?: string; customerId?: string; dealId?: string }
  ): Promise<ActivityTask[]> {
    const where: any = { tenantId };
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.dealId) {
      where.dealId = filters.dealId;
    }

    return this.prisma.activityTask.findMany({
      where,
      include: {
        customer: true,
        deal: true,
      },
      orderBy: { dueDate: 'asc' },
      take: 100,
    });
  }

  async findOne(tenantId: string, id: string): Promise<ActivityTask> {
    const activity = await this.prisma.activityTask.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        deal: true,
      },
    });
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }
    return activity;
  }

  async update(tenantId: string, id: string, data: Partial<ActivityTask>): Promise<ActivityTask> {
    await this.findOne(tenantId, id);
    return this.prisma.activityTask.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.activityTask.delete({
      where: { id },
    });
  }

  async complete(tenantId: string, id: string): Promise<ActivityTask> {
    return this.update(tenantId, id, {
      status: 'COMPLETED',
      completedAt: new Date(),
    });
  }
}
