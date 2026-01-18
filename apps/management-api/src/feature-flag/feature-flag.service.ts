import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeatureFlagService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(tenantId: string, key: string, enabled: boolean = false, metadata?: any) {
    const existing = await this.prisma.featureFlag.findUnique({
      where: {
        tenantId_key: { tenantId, key },
      },
    });
    if (existing) {
      throw new Error('Feature flag already exists');
    }

    return this.prisma.featureFlag.create({
      data: {
        tenantId,
        key,
        enabled,
        metadata,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.featureFlag.findMany({
      where: { tenantId },
      orderBy: { key: 'asc' },
    });
  }

  async findOne(tenantId: string, key: string) {
    const flag = await this.prisma.featureFlag.findUnique({
      where: {
        tenantId_key: { tenantId, key },
      },
    });
    if (!flag) {
      throw new NotFoundException('Feature flag not found');
    }
    return flag;
  }

  async update(tenantId: string, key: string, enabled: boolean, metadata?: any) {
    await this.findOne(tenantId, key);
    return this.prisma.featureFlag.update({
      where: {
        tenantId_key: { tenantId, key },
      },
      data: {
        enabled,
        metadata,
      },
    });
  }

  async remove(tenantId: string, key: string) {
    await this.findOne(tenantId, key);
    await this.prisma.featureFlag.delete({
      where: {
        tenantId_key: { tenantId, key },
      },
    });
  }

  async isEnabled(tenantId: string, key: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: {
        tenantId_key: { tenantId, key },
      },
    });
    return flag?.enabled || false;
  }
}
