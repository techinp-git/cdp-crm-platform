import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateLineFollowerDto {
  userId: string;
  displayName?: string;
  pictureUrl?: string;
  status?: string;
  isUnblocked?: boolean;
  metadata?: any;
}

@Injectable()
export class LineFollowerService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(tenantId: string, createLineFollowerDto: CreateLineFollowerDto) {
    // Try to find customer by LINE User ID
    let customerId: string | null = null;
    if (createLineFollowerDto.userId) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          tenantId,
          identifiers: {
            path: ['lineUserId'],
            equals: createLineFollowerDto.userId,
          },
        },
      });
      if (customer) {
        customerId = customer.id;
      }
    }

    // Check if follower already exists
    const existing = await this.prisma.lineFollower.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: createLineFollowerDto.userId,
        },
      },
    });

    if (existing) {
      // Update existing follower
      return this.prisma.lineFollower.update({
        where: { id: existing.id },
        data: {
          displayName: createLineFollowerDto.displayName || existing.displayName,
          pictureUrl: createLineFollowerDto.pictureUrl || existing.pictureUrl,
          status: createLineFollowerDto.status || 'FOLLOW',
          isUnblocked: createLineFollowerDto.isUnblocked ?? existing.isUnblocked,
          followedAt: createLineFollowerDto.status === 'FOLLOW' ? new Date() : existing.followedAt,
          unfollowedAt: createLineFollowerDto.status === 'UNFOLLOW' ? new Date() : null,
          customerId,
          metadata: createLineFollowerDto.metadata || existing.metadata,
        },
      });
    }

    // Create new follower
    return this.prisma.lineFollower.create({
      data: {
        tenantId,
        userId: createLineFollowerDto.userId,
        displayName: createLineFollowerDto.displayName,
        pictureUrl: createLineFollowerDto.pictureUrl,
        status: createLineFollowerDto.status || 'FOLLOW',
        isUnblocked: createLineFollowerDto.isUnblocked || false,
        followedAt: new Date(),
        customerId,
        metadata: createLineFollowerDto.metadata,
      },
    });
  }

  async findAll(
    tenantId: string,
    filters?: { status?: string; search?: string; page?: number; limit?: number }
  ): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const where: any = { tenantId };
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.search) {
      where.OR = [
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { userId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.lineFollower.findMany({
        where,
        orderBy: { followedAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              identifiers: true,
              profile: true,
            },
          },
        },
      }),
      this.prisma.lineFollower.count({ where }),
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
    const follower = await this.prisma.lineFollower.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
      },
    });
    if (!follower) {
      throw new NotFoundException('Line follower not found');
    }
    return follower;
  }

  async getStats(tenantId: string) {
    const [total, followCount, unfollowCount, todayCount] = await Promise.all([
      this.prisma.lineFollower.count({ where: { tenantId } }),
      this.prisma.lineFollower.count({ where: { tenantId, status: 'FOLLOW' } }),
      this.prisma.lineFollower.count({ where: { tenantId, status: 'UNFOLLOW' } }),
      this.prisma.lineFollower.count({
        where: {
          tenantId,
          status: 'FOLLOW',
          followedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      total,
      followCount,
      unfollowCount,
      todayCount,
    };
  }

  async handleFollowEvent(tenantId: string, event: any) {
    const userId = event.source?.userId;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const isUnblocked = event.follow?.isUnblocked || false;

    // TODO: Fetch LINE profile if needed
    // const profile = await this.fetchLineProfile(userId);
    // const displayName = profile?.displayName;
    // const pictureUrl = profile?.pictureUrl;

    return this.create(tenantId, {
      userId,
      status: 'FOLLOW',
      isUnblocked,
      metadata: {
        source: 'webhook',
        eventType: 'follow',
        timestamp: event.timestamp,
      },
    });
  }

  async handleUnfollowEvent(tenantId: string, event: any) {
    const userId = event.source?.userId;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const existing = await this.prisma.lineFollower.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
    });

    if (existing) {
      return this.prisma.lineFollower.update({
        where: { id: existing.id },
        data: {
          status: 'UNFOLLOW',
          unfollowedAt: new Date(),
          metadata: {
            ...(existing.metadata as any),
            unfollowTimestamp: event.timestamp,
          },
        },
      });
    }

    // Create unfollow record if not exists
    return this.create(tenantId, {
      userId,
      status: 'UNFOLLOW',
      unfollowedAt: new Date(),
      metadata: {
        source: 'webhook',
        eventType: 'unfollow',
        timestamp: event.timestamp,
      },
    });
  }
}
