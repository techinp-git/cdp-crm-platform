import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSegmentDto, Segment } from '@ydm-platform/types';

@Injectable()
export class SegmentService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(tenantId: string, createSegmentDto: CreateSegmentDto): Promise<Segment> {
    return this.prisma.segment.create({
      data: {
        tenantId,
        ...createSegmentDto,
      },
    });
  }

  async findAll(tenantId: string): Promise<Segment[]> {
    return this.prisma.segment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Segment> {
    const segment = await this.prisma.segment.findFirst({
      where: { id, tenantId },
    });
    if (!segment) {
      throw new NotFoundException('Segment not found');
    }
    return segment;
  }

  async update(tenantId: string, id: string, data: Partial<CreateSegmentDto>): Promise<Segment> {
    await this.findOne(tenantId, id);
    return this.prisma.segment.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.segment.delete({
      where: { id },
    });
  }
}
