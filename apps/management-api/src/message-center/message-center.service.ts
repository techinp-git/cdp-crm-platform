import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Channel = 'LINE' | 'MESSENGER' | 'EMAIL' | 'SMS';

type TemplateKind = 'LINE_CONTENT' | 'MESSENGER_CONTENT' | 'EMAIL_CONTENT' | 'SMS_CONTENT' | 'RAW';

export type AudienceMode = 'MANUAL' | 'FILTER';

export interface AudienceDto {
  mode: AudienceMode;
  // MANUAL
  destinations?: string[];
  // FILTER
  customerType?: 'INDIVIDUAL' | 'COMPANY';
  tagIds?: string[];
}

export interface SendImmediateDto {
  channel: Channel;
  channelAccountId?: string;
  templateKind: TemplateKind;
  templateId?: string;
  name?: string;
  immediateId?: string;
  // Either provide destinations directly OR provide audience (FILTER/MANUAL)
  destinations?: string[]; // email/phone/lineUserId/psid/conversationId
  audience?: AudienceDto;
  payload?: any; // used when templateKind = RAW
  metadata?: any;
}

export interface UpsertImmediateDto {
  name: string;
  status?: string; // DRAFT, SENT, ARCHIVED
  channel: Channel;
  channelAccountId?: string;
  audience: AudienceDto;
  templateKind: TemplateKind;
  templateId?: string;
  payload?: any;
  metadata?: any;
}

function uniqDestinations(arr: any): string[] {
  const items = Array.isArray(arr) ? arr : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of items) {
    const s = String(v || '').trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function destinationKeyForChannel(channel: Channel): 'email' | 'phone' | 'lineUserId' | 'psid' {
  if (channel === 'EMAIL') return 'email';
  if (channel === 'SMS') return 'phone';
  if (channel === 'MESSENGER') return 'psid';
  return 'lineUserId';
}

@Injectable()
export class MessageCenterService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  private get immediate() {
    const d = (this.prisma as any).messageImmediate;
    if (!d) throw new InternalServerErrorException('MessageImmediate model not ready. Run prisma generate/db push then restart API.');
    return d;
  }
  private get broadcast() {
    const d = (this.prisma as any).messageBroadcast;
    if (!d) throw new InternalServerErrorException('MessageBroadcast model not ready. Run prisma generate/db push then restart API.');
    return d;
  }
  private get delivery() {
    const d = (this.prisma as any).messageDelivery;
    if (!d) throw new InternalServerErrorException('MessageDelivery model not ready. Run prisma generate/db push then restart API.');
    return d;
  }
  private get lineContent() {
    return (this.prisma as any).lineContent;
  }
  private get messengerContent() {
    return (this.prisma as any).messengerContent;
  }
  private get emailContent() {
    return (this.prisma as any).emailContent;
  }
  private get smsContent() {
    return (this.prisma as any).smsContent;
  }

  private async resolveAudienceDestinations(tenantId: string, channel: Channel, audience?: AudienceDto): Promise<string[]> {
    if (!audience) return [];
    const mode = String(audience.mode || '').toUpperCase() as AudienceMode;
    if (mode === 'MANUAL') {
      return uniqDestinations(audience.destinations);
    }
    if (mode !== 'FILTER') {
      throw new BadRequestException('Invalid audience mode');
    }

    const where: any = { tenantId };
    if (audience.customerType) where.type = audience.customerType;
    if (Array.isArray(audience.tagIds) && audience.tagIds.length > 0) {
      where.tags = { some: { tagId: { in: audience.tagIds } } };
    }

    const destKey = destinationKeyForChannel(channel);

    const rows = await this.prisma.customer.findMany({
      where,
      select: { identifiers: true },
      take: 20000,
      orderBy: { createdAt: 'desc' },
    });

    const dests: string[] = [];
    for (const r of rows) {
      const identifiers = (r.identifiers as any) || {};
      const v = identifiers?.[destKey];
      if (typeof v === 'string' && v.trim()) dests.push(v.trim());
    }
    return uniqDestinations(dests);
  }

  async estimateAudience(tenantId: string, channel: Channel, audience?: AudienceDto) {
    const destinations = await this.resolveAudienceDestinations(tenantId, channel, audience);
    return { count: destinations.length };
  }

  async sendImmediate(tenantId: string, dto: SendImmediateDto) {
    const channel = String(dto?.channel || '').toUpperCase() as Channel;
    if (!channel) throw new BadRequestException('channel is required');

    const templateKind = String(dto?.templateKind || '').toUpperCase() as TemplateKind;
    if (!templateKind) throw new BadRequestException('templateKind is required');

    const destinations =
      uniqDestinations(dto?.destinations).length > 0
        ? uniqDestinations(dto?.destinations)
        : await this.resolveAudienceDestinations(tenantId, channel, dto?.audience);
    if (destinations.length === 0) throw new BadRequestException('No destinations resolved');
    if (destinations.length > 20000) throw new BadRequestException('Too many destinations (max 20000)');

    let payload: any = null;
    let templateId: string | null = dto?.templateId ? String(dto.templateId) : null;

    if (templateKind === 'RAW') {
      payload = dto?.payload;
      if (!payload) throw new BadRequestException('payload is required for RAW');
      templateId = null;
    } else {
      if (!templateId) throw new BadRequestException('templateId is required');
      if (templateKind === 'LINE_CONTENT') {
        const c = await this.lineContent?.findFirst?.({ where: { id: templateId, tenantId } });
        if (!c) throw new NotFoundException('LINE content not found');
        payload = c.content;
      } else if (templateKind === 'MESSENGER_CONTENT') {
        const c = await this.messengerContent?.findFirst?.({ where: { id: templateId, tenantId } });
        if (!c) throw new NotFoundException('Messenger content not found');
        payload = c.content;
      } else if (templateKind === 'EMAIL_CONTENT') {
        const c = await this.emailContent?.findFirst?.({ where: { id: templateId, tenantId } });
        if (!c) throw new NotFoundException('Email content not found');
        payload = c.content;
      } else if (templateKind === 'SMS_CONTENT') {
        const c = await this.smsContent?.findFirst?.({ where: { id: templateId, tenantId } });
        if (!c) throw new NotFoundException('SMS content not found');
        payload = c.content;
      } else {
        throw new BadRequestException('Invalid templateKind');
      }
    }

    const broadcast = await this.broadcast.create({
      data: {
        tenantId,
        immediateId: dto?.immediateId || null,
        channel,
        channelAccountId: dto?.channelAccountId || null,
        templateKind,
        templateId,
        name: dto?.name || null,
        payload,
        stats: { total: destinations.length, queued: destinations.length, sent: 0, failed: 0 },
        metadata: dto?.metadata || null,
      },
    });

    await this.delivery.createMany({
      data: destinations.map((destination) => ({
        tenantId,
        broadcastId: broadcast.id,
        destination,
        status: 'QUEUED',
      })),
      skipDuplicates: false,
    });

    return {
      broadcastId: broadcast.id,
      queued: destinations.length,
      status: 'QUEUED',
    };
  }

  async listImmediates(
    tenantId: string,
    filters?: { channel?: string; status?: string; q?: string; page?: number; limit?: number },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (filters?.channel) where.channel = String(filters.channel).toUpperCase();
    if (filters?.status) where.status = String(filters.status).toUpperCase();
    if (filters?.q) where.name = { contains: filters.q, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.immediate.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
      this.immediate.count({ where }),
    ]);

    const ids = data.map((x: any) => x.id);
    const stats = ids.length
      ? await this.broadcast.groupBy({
          by: ['immediateId'],
          where: { tenantId, immediateId: { in: ids } },
          _count: { _all: true },
          _max: { createdAt: true },
        })
      : [];
    const map = new Map<string, { count: number; lastSentAt: string | null }>();
    for (const s of stats) {
      if (!s.immediateId) continue;
      map.set(String(s.immediateId), {
        count: Number((s as any)._count?._all || 0),
        lastSentAt: (s as any)._max?.createdAt ? new Date((s as any)._max.createdAt).toISOString() : null,
      });
    }

    const enriched = data.map((x: any) => ({
      ...x,
      historyCount: map.get(x.id)?.count || 0,
      lastSentAt: map.get(x.id)?.lastSentAt || null,
    }));

    return { data: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createImmediate(tenantId: string, dto: UpsertImmediateDto) {
    const name = String(dto?.name || '').trim();
    if (!name) throw new BadRequestException('name is required');
    const channel = String(dto?.channel || '').toUpperCase() as Channel;
    if (!channel) throw new BadRequestException('channel is required');
    const templateKind = String(dto?.templateKind || '').toUpperCase() as TemplateKind;
    if (!templateKind) throw new BadRequestException('templateKind is required');
    if (templateKind !== 'RAW' && !dto?.templateId) throw new BadRequestException('templateId is required');
    if (templateKind === 'RAW' && !dto?.payload) throw new BadRequestException('payload is required for RAW');

    return this.immediate.create({
      data: {
        tenantId,
        name,
        status: String(dto?.status || 'DRAFT').toUpperCase(),
        channel,
        channelAccountId: dto?.channelAccountId || null,
        audience: dto.audience,
        templateKind,
        templateId: dto?.templateId || null,
        payload: templateKind === 'RAW' ? dto.payload : null,
        metadata: dto?.metadata || null,
      },
    });
  }

  async getImmediate(tenantId: string, id: string) {
    const item = await this.immediate.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Immediate message not found');
    return item;
  }

  async updateImmediate(tenantId: string, id: string, dto: Partial<UpsertImmediateDto>) {
    await this.getImmediate(tenantId, id);
    const patch: any = {};
    if (dto.name !== undefined) patch.name = String(dto.name || '').trim();
    if (dto.status !== undefined) patch.status = String(dto.status || '').toUpperCase();
    if (dto.channel !== undefined) patch.channel = String(dto.channel || '').toUpperCase();
    if (dto.channelAccountId !== undefined) patch.channelAccountId = dto.channelAccountId || null;
    if (dto.audience !== undefined) patch.audience = dto.audience;
    if (dto.templateKind !== undefined) patch.templateKind = String(dto.templateKind || '').toUpperCase();
    if (dto.templateId !== undefined) patch.templateId = dto.templateId || null;
    if (dto.payload !== undefined) patch.payload = dto.payload || null;
    if (dto.metadata !== undefined) patch.metadata = dto.metadata || null;
    return this.immediate.update({ where: { id }, data: patch });
  }

  async sendFromImmediate(tenantId: string, id: string) {
    const item = await this.getImmediate(tenantId, id);
    const dto: SendImmediateDto = {
      immediateId: id,
      channel: String(item.channel).toUpperCase() as Channel,
      channelAccountId: item.channelAccountId || undefined,
      templateKind: String(item.templateKind).toUpperCase() as TemplateKind,
      templateId: item.templateId || undefined,
      name: item.name,
      audience: item.audience as any,
      payload: item.payload as any,
      metadata: { ...(item.metadata as any), source: 'IMMEDIATE' },
    };
    const result = await this.sendImmediate(tenantId, dto);
    await this.immediate.update({ where: { id }, data: { status: 'SENT' } });
    return result;
  }

  async listHistoryForImmediate(tenantId: string, immediateId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId, immediateId };
    const [data, total] = await Promise.all([
      this.broadcast.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.broadcast.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listBroadcasts(
    tenantId: string,
    filters?: { channel?: string; status?: string; q?: string; page?: number; limit?: number },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (filters?.channel) where.channel = String(filters.channel).toUpperCase();
    if (filters?.q) where.name = { contains: filters.q, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.broadcast.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.broadcast.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listDeliveries(tenantId: string, broadcastId: string, filters?: { status?: string; page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;
    const where: any = { tenantId, broadcastId };
    if (filters?.status) where.status = String(filters.status).toUpperCase();

    const [data, total] = await Promise.all([
      this.delivery.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.delivery.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

