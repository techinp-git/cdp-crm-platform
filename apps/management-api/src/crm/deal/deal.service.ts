import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDealDto, UpdateDealDto, Deal } from '@ydm-platform/types';

@Injectable()
export class DealService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(tenantId: string, createDealDto: CreateDealDto): Promise<Deal> {
    // Verify stage belongs to tenant
    const stage = await this.prisma.dealStage.findFirst({
      where: { id: createDealDto.stageId, tenantId },
    });
    if (!stage) {
      throw new NotFoundException('Deal stage not found');
    }

    return this.prisma.deal.create({
      data: {
        tenantId,
        ...createDealDto,
        amount: createDealDto.amount ? createDealDto.amount : null,
      },
      include: {
        stage: true,
        customer: true,
      },
    });
  }

  async findAll(tenantId: string, filters?: { stageId?: string; status?: string; customerId?: string }): Promise<Deal[]> {
    const where: any = { tenantId };
    if (filters?.stageId) {
      where.stageId = filters.stageId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    return this.prisma.deal.findMany({
      where,
      include: {
        stage: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(tenantId: string, id: string): Promise<Deal> {
    const deal = await this.prisma.deal.findFirst({
      where: { id, tenantId },
      include: {
        stage: true,
        customer: true,
        activities: true,
      },
    });
    if (!deal) {
      throw new NotFoundException('Deal not found');
    }
    return deal;
  }

  async update(tenantId: string, id: string, updateDealDto: UpdateDealDto): Promise<Deal> {
    await this.findOne(tenantId, id);
    
    if (updateDealDto.stageId) {
      const stage = await this.prisma.dealStage.findFirst({
        where: { id: updateDealDto.stageId, tenantId },
      });
      if (!stage) {
        throw new NotFoundException('Deal stage not found');
      }
    }

    return this.prisma.deal.update({
      where: { id },
      data: updateDealDto,
      include: {
        stage: true,
        customer: true,
      },
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.deal.delete({
      where: { id },
    });
  }
}
