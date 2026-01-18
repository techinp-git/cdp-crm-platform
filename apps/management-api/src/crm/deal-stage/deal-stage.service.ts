import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DealStage } from '@ydm-platform/types';

@Injectable()
export class DealStageService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(
    tenantId: string,
    data: {
      name: string;
      order: number;
      probability?: number;
      isDefault?: boolean;
      isWon?: boolean;
      isLost?: boolean;
    }
  ): Promise<DealStage> {
    const existing = await this.prisma.dealStage.findUnique({
      where: {
        tenantId_name: { tenantId, name: data.name },
      },
    });
    if (existing) {
      throw new BadRequestException('Deal stage name already exists');
    }

    return this.prisma.dealStage.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }

  async findAll(tenantId: string): Promise<DealStage[]> {
    return this.prisma.dealStage.findMany({
      where: { tenantId },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<DealStage> {
    const stage = await this.prisma.dealStage.findFirst({
      where: { id, tenantId },
    });
    if (!stage) {
      throw new NotFoundException('Deal stage not found');
    }
    return stage;
  }

  async update(tenantId: string, id: string, data: Partial<DealStage>): Promise<DealStage> {
    await this.findOne(tenantId, id);
    return this.prisma.dealStage.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.dealStage.delete({
      where: { id },
    });
  }
}
