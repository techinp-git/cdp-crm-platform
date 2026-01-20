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
  campaignId?: string;
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

export interface UpsertCampaignDto {
  name: string;
  description?: string;
  status?: string; // DRAFT, ACTIVE, PAUSED, ARCHIVED
  channel: Channel;
  channelAccountId?: string;
  audience: AudienceDto;
  templateKind: TemplateKind;
  templateId?: string;
  payload?: any;
  // New schedule config (preferred)
  schedule?: any;
  // Backward-compatible single run time (ISO)
  scheduleAt?: string; // ISO
  metadata?: any;
}

export interface UpsertAutomationDto {
  name: string;
  description?: string;
  status?: string; // DRAFT, ACTIVE, PAUSED, ARCHIVED
  definition: any;
  metadata?: any;
}

function normalizeScheduleInput(input: any): any | null {
  if (!input || typeof input !== 'object') return null;
  const cadence = String(input.cadence || '').toUpperCase();
  const time = String(input.time || '').trim();
  const startDate = String(input.startDate || '').trim();
  const endDate = input.endDate ? String(input.endDate).trim() : null;
  const always = input.always === undefined ? true : Boolean(input.always);
  const weekdays = Array.isArray(input.weekdays) ? input.weekdays.map((x: any) => Number(x)).filter((n: any) => Number.isFinite(n)) : undefined;
  const dayOfMonth = input.dayOfMonth !== undefined ? Number(input.dayOfMonth) : undefined;
  if (!cadence) return null;
  if (!time) return null;
  if (!startDate) return null;
  return { cadence, time, startDate, endDate: always ? null : endDate, always, weekdays, dayOfMonth };
}

function scheduleAtFromSchedule(schedule: any): Date | null {
  if (!schedule) return null;
  const cadence = String(schedule.cadence || '').toUpperCase();
  if (cadence !== 'ONCE') return null;
  const startDate = String(schedule.startDate || '').trim(); // YYYY-MM-DD
  const time = String(schedule.time || '').trim(); // HH:mm
  if (!startDate || !time) return null;
  const iso = `${startDate}T${time}:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
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

  private get automation() {
    const d = (this.prisma as any).messageAutomation;
    if (!d) throw new InternalServerErrorException('MessageAutomation model not ready. Run prisma generate/db push then restart API.');
    return d;
  }
  private get campaign() {
    const d = (this.prisma as any).messageCampaign;
    if (!d) throw new InternalServerErrorException('MessageCampaign model not ready. Run prisma generate/db push then restart API.');
    return d;
  }
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
        campaignId: dto?.campaignId || null,
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

  async listCampaigns(
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
      this.campaign.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
      this.campaign.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createCampaign(tenantId: string, dto: UpsertCampaignDto) {
    const name = String(dto?.name || '').trim();
    if (!name) throw new BadRequestException('name is required');
    const channel = String(dto?.channel || '').toUpperCase() as Channel;
    if (!channel) throw new BadRequestException('channel is required');
    const templateKind = String(dto?.templateKind || '').toUpperCase() as TemplateKind;
    if (!templateKind) throw new BadRequestException('templateKind is required');
    if (templateKind !== 'RAW' && !dto?.templateId) throw new BadRequestException('templateId is required');
    if (templateKind === 'RAW' && !dto?.payload) throw new BadRequestException('payload is required for RAW');
    if (!dto?.audience) throw new BadRequestException('audience is required');

    const schedule = normalizeScheduleInput(dto?.schedule) || null;
    const scheduleAt = scheduleAtFromSchedule(schedule) || (dto?.scheduleAt ? new Date(dto.scheduleAt) : null);

    return this.campaign.create({
      data: {
        tenantId,
        name,
        description: dto?.description || null,
        status: String(dto?.status || 'DRAFT').toUpperCase(),
        channel,
        channelAccountId: dto?.channelAccountId || null,
        audience: dto.audience,
        templateKind,
        templateId: dto?.templateId || null,
        payload: templateKind === 'RAW' ? dto.payload : null,
        schedule,
        scheduleAt,
        metadata: dto?.metadata || null,
      },
    });
  }

  async getCampaign(tenantId: string, id: string) {
    const item = await this.campaign.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Campaign not found');
    return item;
  }

  async updateCampaign(tenantId: string, id: string, dto: Partial<UpsertCampaignDto>) {
    await this.getCampaign(tenantId, id);
    const patch: any = {};
    if (dto.name !== undefined) patch.name = String(dto.name || '').trim();
    if (dto.description !== undefined) patch.description = dto.description || null;
    if (dto.status !== undefined) patch.status = String(dto.status || '').toUpperCase();
    if (dto.channel !== undefined) patch.channel = String(dto.channel || '').toUpperCase();
    if (dto.channelAccountId !== undefined) patch.channelAccountId = dto.channelAccountId || null;
    if (dto.audience !== undefined) patch.audience = dto.audience;
    if (dto.templateKind !== undefined) patch.templateKind = String(dto.templateKind || '').toUpperCase();
    if (dto.templateId !== undefined) patch.templateId = dto.templateId || null;
    if (dto.payload !== undefined) patch.payload = dto.payload || null;
    if (dto.schedule !== undefined) patch.schedule = normalizeScheduleInput(dto.schedule);
    if (dto.scheduleAt !== undefined) patch.scheduleAt = dto.scheduleAt ? new Date(dto.scheduleAt) : null;
    // keep scheduleAt in sync when cadence=ONCE
    if (dto.schedule !== undefined) patch.scheduleAt = scheduleAtFromSchedule(patch.schedule);
    if (dto.metadata !== undefined) patch.metadata = dto.metadata || null;
    return this.campaign.update({ where: { id }, data: patch });
  }

  async runCampaignNow(tenantId: string, id: string) {
    const item = await this.getCampaign(tenantId, id);
    const status = String(item.status || '').toUpperCase();
    if (status === 'ARCHIVED') throw new BadRequestException('Campaign is archived');
    if (status === 'PAUSED') throw new BadRequestException('Campaign is paused');

    const dto: SendImmediateDto = {
      campaignId: id,
      channel: String(item.channel).toUpperCase() as Channel,
      channelAccountId: item.channelAccountId || undefined,
      templateKind: String(item.templateKind).toUpperCase() as TemplateKind,
      templateId: item.templateId || undefined,
      name: item.name,
      audience: item.audience as any,
      payload: item.payload as any,
      metadata: { ...(item.metadata as any), source: 'CAMPAIGN', scheduleAt: item.scheduleAt || null },
    };

    const result = await this.sendImmediate(tenantId, dto);
    await this.campaign.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        runsCount: { increment: 1 },
        status: status === 'DRAFT' ? 'ACTIVE' : undefined,
      },
    });
    return result;
  }

  async listHistoryForCampaign(tenantId: string, campaignId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId, campaignId };
    const [data, total] = await Promise.all([
      this.broadcast.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.broadcast.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listAutomations(
    tenantId: string,
    filters?: { status?: string; q?: string; page?: number; limit?: number },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (filters?.status) where.status = String(filters.status).toUpperCase();
    if (filters?.q) where.name = { contains: filters.q, mode: 'insensitive' };
    const [data, total] = await Promise.all([
      this.automation.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
      this.automation.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createAutomation(tenantId: string, dto: UpsertAutomationDto) {
    const name = String(dto?.name || '').trim();
    if (!name) throw new BadRequestException('name is required');
    if (!dto?.definition) throw new BadRequestException('definition is required');
    return this.automation.create({
      data: {
        tenantId,
        name,
        description: dto?.description || null,
        status: String(dto?.status || 'DRAFT').toUpperCase(),
        definition: dto.definition,
        metadata: dto?.metadata || null,
      },
    });
  }

  async getAutomation(tenantId: string, id: string) {
    const item = await this.automation.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Automation not found');
    return item;
  }

  async updateAutomation(tenantId: string, id: string, dto: Partial<UpsertAutomationDto>) {
    await this.getAutomation(tenantId, id);
    const patch: any = {};
    if (dto.name !== undefined) patch.name = String(dto.name || '').trim();
    if (dto.description !== undefined) patch.description = dto.description || null;
    if (dto.status !== undefined) patch.status = String(dto.status || '').toUpperCase();
    if (dto.definition !== undefined) patch.definition = dto.definition;
    if (dto.metadata !== undefined) patch.metadata = dto.metadata || null;
    return this.automation.update({ where: { id }, data: patch });
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

  async deliveryStats(tenantId: string, broadcastId: string) {
    const where: any = { tenantId, broadcastId };
    const [total, grouped] = await Promise.all([
      this.delivery.count({ where }),
      this.delivery.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const g of grouped as any[]) {
      byStatus[String(g.status)] = Number(g._count?._all || 0);
    }
    return {
      broadcastId,
      total,
      byStatus,
    };
  }
}

