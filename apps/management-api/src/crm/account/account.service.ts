import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Account } from '@ydm-platform/types';

@Injectable()
export class AccountService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(tenantId: string, data: Partial<Account>): Promise<Account> {
    return this.prisma.account.create({
      data: {
        tenantId,
        name: data.name,
        type: data.type,
        industry: data.industry,
        website: data.website,
        phone: data.phone,
        email: data.email,
        address: data.address,
        metadata: data.metadata,
      },
    });
  }

  async findAll(tenantId: string, filters?: { type?: string; search?: string }): Promise<Account[]> {
    const where: any = { tenantId };
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    return this.prisma.account.findMany({
      where,
      include: {
        accountContacts: {
          include: {
            contact: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }

  async findOne(tenantId: string, id: string): Promise<Account> {
    const account = await this.prisma.account.findFirst({
      where: { id, tenantId },
      include: {
        accountContacts: {
          include: {
            contact: true,
          },
        },
      },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  async update(tenantId: string, id: string, data: Partial<Account>): Promise<Account> {
    await this.findOne(tenantId, id);
    return this.prisma.account.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.account.delete({
      where: { id },
    });
  }
}
