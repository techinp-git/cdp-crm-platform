import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatAutoMessagerService } from '../chat-auto-messager/chat-auto-messager.service';

interface CreateLineEventDto {
  eventType: string;
  sourceType?: string;
  sourceId?: string;
  userId?: string;
  groupId?: string;
  roomId?: string;
  timestamp: string | Date;
  mode?: string;
  replyToken?: string;
  messageType?: string;
  messageText?: string;
  messageId?: string;
  postbackData?: string;
  postbackParams?: any;
  beaconHwid?: string;
  beaconType?: string;
  accountLinkResult?: string;
  rawPayload?: any;
}

@Injectable()
export class LineEventService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(ChatAutoMessagerService) private chatAuto: ChatAutoMessagerService,
  ) {}

  async create(tenantId: string, createLineEventDto: CreateLineEventDto) {
    // Convert timestamp from milliseconds to Date if needed
    let timestamp: Date;
    if (typeof createLineEventDto.timestamp === 'string') {
      const ts = parseInt(createLineEventDto.timestamp);
      timestamp = isNaN(ts) ? new Date(createLineEventDto.timestamp) : new Date(ts);
    } else {
      timestamp = createLineEventDto.timestamp;
    }

    // Try to find customer by LINE User ID
    let customerId: string | null = null;
    if (createLineEventDto.userId) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          tenantId,
          identifiers: {
            path: ['lineUserId'],
            equals: createLineEventDto.userId,
          },
        },
      });
      if (customer) {
        customerId = customer.id;
      }
    }

    return this.prisma.lineEvent.create({
      data: {
        tenantId,
        ...createLineEventDto,
        timestamp,
        customerId,
        status: 'RECEIVED',
      },
    });
  }

  async findAll(tenantId: string, filters?: { eventType?: string; status?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) {
    const where: any = { tenantId };
    if (filters?.eventType) {
      where.eventType = filters.eventType;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.timestamp.lte = new Date(filters.endDate);
      }
    }
    // Filter for group/room events only (used by /data/sources/line-bot)
    const anyFilters = filters as any;
    if (anyFilters?.groupOnly) {
      where.OR = [{ groupId: { not: null } }, { roomId: { not: null } }];
    }
    if (anyFilters?.groupOrRoomId) {
      const id = String(anyFilters.groupOrRoomId);
      // Ensure we match selected groupId or roomId
      where.AND = (where.AND || []).concat([{ OR: [{ groupId: id }, { roomId: id }] }]);
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.lineEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lineEvent.count({ where }),
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
    const event = await this.prisma.lineEvent.findFirst({
      where: { id, tenantId },
    });
    if (!event) {
      throw new NotFoundException('Line event not found');
    }
    return event;
  }

  async getStats(tenantId: string, period: 'today' | 'week' | 'month' = 'today') {
    const now = new Date();
    let startDate: Date;
    
    if (period === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (period === 'week') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else {
      startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    const where = {
      tenantId,
      timestamp: { gte: startDate },
    };

    const [total, byType, byStatus] = await Promise.all([
      this.prisma.lineEvent.count({ where }),
      this.prisma.lineEvent.groupBy({
        by: ['eventType'],
        where,
        _count: true,
      }),
      this.prisma.lineEvent.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
    ]);

    // Get unique users
    const uniqueUsers = await this.prisma.lineEvent.findMany({
      where,
      select: { userId: true },
      distinct: ['userId'],
    });

    return {
      total,
      uniqueUsers: uniqueUsers.filter(u => u.userId).length,
      byType: byType.map(item => ({
        eventType: item.eventType,
        count: item._count,
      })),
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: item._count,
      })),
    };
  }

  async processWebhook(
    tenantId: string,
    webhookData: any,
    channelAccountId?: string,
  ): Promise<{ processed: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;

    if (!webhookData.events || !Array.isArray(webhookData.events)) {
      throw new BadRequestException('Invalid webhook format: events array is required');
    }

    for (const event of webhookData.events) {
      try {
        const rawPayload = channelAccountId
          ? { ...(event || {}), __channelAccountId: channelAccountId }
          : event;
        const eventData: CreateLineEventDto = {
          eventType: event.type || 'unknown',
          timestamp: event.timestamp ? new Date(parseInt(event.timestamp)) : new Date(),
          mode: event.mode,
          replyToken: event.replyToken,
          rawPayload,
        };

        // Extract source information
        if (event.source) {
          eventData.sourceType = event.source.type;
          eventData.sourceId = event.source.userId || event.source.groupId || event.source.roomId || event.source.id;
          eventData.userId = event.source.userId;
          eventData.groupId = event.source.groupId;
          eventData.roomId = event.source.roomId;
        }

        // Extract message data
        if (event.message) {
          eventData.messageType = event.message.type;
          eventData.messageId = event.message.id;
          if (event.message.type === 'text') {
            eventData.messageText = event.message.text;
          }
        }

        // Extract postback data
        if (event.postback) {
          eventData.postbackData = event.postback.data;
          eventData.postbackParams = event.postback.params;
        }

        // Extract beacon data
        if (event.beacon) {
          eventData.beaconHwid = event.beacon.hwid;
          eventData.beaconType = event.beacon.type;
        }

        // Extract account link data
        if (event.link) {
          eventData.accountLinkResult = event.link.result;
        }

        await this.create(tenantId, eventData);
        // Auto-matching for LINE text messages (creates log + outbox)
        if (eventData.messageType === 'text' && eventData.messageText) {
          await this.chatAuto.handleInbound(
            tenantId,
            'LINE',
            eventData.messageText,
            eventData.userId,
            { sourceType: eventData.sourceType, messageId: eventData.messageId, channelAccountId },
          );
        }
        processed++;
      } catch (error) {
        errors.push(`Event ${event.type || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
      }
    }

    return { processed, failed, errors: errors.slice(0, 10) };
  }

  async updateStatus(tenantId: string, id: string, status: string, errorMessage?: string) {
    await this.findOne(tenantId, id);

    return this.prisma.lineEvent.update({
      where: { id },
      data: {
        status,
        processedAt: status === 'PROCESSED' ? new Date() : null,
        errorMessage: errorMessage || null,
      },
    });
  }
}
