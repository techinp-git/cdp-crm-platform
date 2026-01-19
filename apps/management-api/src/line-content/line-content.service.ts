import { BadRequestException, Injectable, Inject, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type LineContentStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
type LineContentType = 'TEXT' | 'FLEX' | 'RICHMENU' | string;

interface CreateLineContentDto {
  name: string;
  description?: string;
  type?: LineContentType;
  status?: LineContentStatus;
  content: any;
  metadata?: any;
}

@Injectable()
export class LineContentService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  private get lineContent() {
    // Prisma Client types are generated from schema.
    // If schema changes haven't been generated yet, keep runtime working via dynamic access.
    const delegate = (this.prisma as any).lineContent;
    if (!delegate) {
      // This happens when Prisma Client hasn't been regenerated after adding the model.
      throw new InternalServerErrorException(
        'Prisma Client is not generated for LineContent. Please run `prisma generate` (and `prisma db push`/migrate) then restart the API.',
      );
    }
    return delegate;
  }

  async create(tenantId: string, dto: CreateLineContentDto) {
    if (!dto?.name) throw new BadRequestException('name is required');
    if (!dto?.content) throw new BadRequestException('content is required');

    try {
      return await this.lineContent.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description || null,
          type: dto.type || 'TEXT',
          status: dto.status || 'DRAFT',
          content: dto.content,
          metadata: dto.metadata || null,
        },
      });
    } catch (e: any) {
      // Unique constraint on (tenantId, name)
      if (String(e?.code) === 'P2002') {
        throw new BadRequestException('Content name already exists');
      }
      throw e;
    }
  }

  async findAll(
    tenantId: string,
    filters?: { type?: string; status?: string; q?: string; page?: number; limit?: number },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    // Lightweight search: name contains (case-insensitive) if supported by Prisma/Postgres
    if (filters?.q) where.name = { contains: filters.q, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.lineContent.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.lineContent.count({ where }),
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
    const item = await this.lineContent.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('LINE content not found');
    return item;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateLineContentDto>) {
    await this.findOne(tenantId, id);

    if (dto.name === '') throw new BadRequestException('name cannot be empty');
    if (dto.content === null) throw new BadRequestException('content cannot be null');

    try {
      return await this.lineContent.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description || null } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.content !== undefined ? { content: dto.content } : {}),
          ...(dto.metadata !== undefined ? { metadata: dto.metadata || null } : {}),
        },
      });
    } catch (e: any) {
      if (String(e?.code) === 'P2002') {
        throw new BadRequestException('Content name already exists');
      }
      throw e;
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.lineContent.delete({ where: { id } });
    return { ok: true };
  }
}

