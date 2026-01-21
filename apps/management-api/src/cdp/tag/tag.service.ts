import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Tag } from '@ydm-platform/types';

@Injectable()
export class TagService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(tenantId: string, data: { name: string; color?: string; description?: string }): Promise<Tag> {
    const existing = await this.prisma.tag.findUnique({
      where: {
        tenantId_name: { tenantId, name: data.name },
      },
    });
    if (existing) {
      throw new BadRequestException('Tag name already exists');
    }

    return this.prisma.tag.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }

  async findAll(tenantId: string): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Tag> {
    const tag = await this.prisma.tag.findFirst({
      where: { id, tenantId },
    });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    return tag;
  }

  async update(tenantId: string, id: string, data: { name?: string; color?: string; description?: string }): Promise<Tag> {
    await this.findOne(tenantId, id);
    return this.prisma.tag.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.tag.delete({
      where: { id },
    });
  }

  async assignTagToCustomer(tenantId: string, customerId: string, tagId: string): Promise<void> {
    // Verify both belong to tenant
    await this.prisma.customer.findFirstOrThrow({ where: { id: customerId, tenantId } });
    await this.findOne(tenantId, tagId);

    const existing = await this.prisma.customerTag.findUnique({
      where: {
        customerId_tagId: { customerId, tagId },
      },
    });
    if (existing) {
      return; // Already assigned
    }

    await this.prisma.customerTag.create({
      data: { tenantId, customerId, tagId },
    });
  }

  async removeTagFromCustomer(tenantId: string, customerId: string, tagId: string): Promise<void> {
    await this.prisma.customerTag.delete({
      where: {
        customerId_tagId: { customerId, tagId },
      },
    });
  }
}
