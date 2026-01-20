import { BadRequestException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function normalize(s: string) {
  return String(s || '').trim().toLowerCase();
}

@Injectable()
export class ChatCenterService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  private get channelAccount() {
    const d = (this.prisma as any).chatChannelAccount;
    if (!d) throw new BadRequestException('ChatChannelAccount model not ready. Run prisma generate/db push then restart API.');
    return d;
  }
  private get unifiedUser() {
    const d = (this.prisma as any).unifiedUser;
    if (!d) throw new BadRequestException('UnifiedUser model not ready. Run prisma generate/db push then restart API.');
    return d;
  }
  private get unifiedIdentity() {
    const d = (this.prisma as any).unifiedUserIdentity;
    if (!d) throw new BadRequestException('UnifiedUserIdentity model not ready. Run prisma generate/db push then restart API.');
    return d;
  }
  private get outbox() {
    const d = (this.prisma as any).chatAutoOutbox;
    if (!d) throw new BadRequestException('ChatAutoOutbox model not ready. Run prisma generate/db push then restart API.');
    return d;
  }

  private outboxText(payload: any): string | null {
    if (!payload) return null;
    if (typeof payload === 'string') return payload;
    if (typeof payload?.text === 'string') return payload.text;
    if (typeof payload?.message === 'string') return payload.message;
    if (typeof payload?.body === 'string') return payload.body;
    return null;
  }

  async listChannelAccounts(tenantId: string, channel?: string) {
    const where: any = { tenantId };
    if (channel) where.channel = String(channel).toUpperCase();
    return this.channelAccount.findMany({ where, orderBy: [{ channel: 'asc' }, { name: 'asc' }] });
  }

  async createChannelAccount(tenantId: string, body: any) {
    const channel = String(body?.channel || '').toUpperCase();
    const name = String(body?.name || '').trim();
    if (!channel) throw new BadRequestException('channel is required');
    if (!name) throw new BadRequestException('name is required');
    const status = String(body?.status || 'ACTIVE').toUpperCase();
    try {
      return await this.channelAccount.create({
        data: { tenantId, channel, name, status, metadata: body?.metadata || null },
      });
    } catch (e: any) {
      if (String(e?.code) === 'P2002') throw new BadRequestException('Channel account already exists');
      throw e;
    }
  }

  async updateChannelAccount(tenantId: string, id: string, body: any) {
    const existing = await this.channelAccount.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Channel account not found');
    const patch: any = {};
    if (body?.name !== undefined) patch.name = String(body.name || '').trim();
    if (body?.status !== undefined) patch.status = String(body.status || '').toUpperCase();
    if (body?.metadata !== undefined) patch.metadata = body.metadata || null;
    return this.channelAccount.update({ where: { id }, data: patch });
  }

  async deleteChannelAccount(tenantId: string, id: string) {
    const existing = await this.channelAccount.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Channel account not found');
    await this.channelAccount.delete({ where: { id } });
    return { ok: true };
  }

  // Derived inbox
  async listConversations(tenantId: string, filters?: { channel?: string; q?: string; limit?: number }) {
    const channel = filters?.channel ? String(filters.channel).toUpperCase() : 'ALL';
    const q = normalize(filters?.q || '');
    const limit = Math.min(filters?.limit || 50, 200);

    const results: any[] = [];

    if (channel === 'ALL' || channel === 'LINE') {
      // group by userId from line_events
      const raw = await this.prisma.lineEvent.groupBy({
        by: ['userId'],
        where: { tenantId, messageText: { not: null } },
        _max: { timestamp: true },
        orderBy: { _max: { timestamp: 'desc' } },
        take: limit,
      });

      for (const r of raw) {
        const userId = r.userId || 'unknown';
        if (q && !normalize(userId).includes(q)) continue;
        const lastIn = await this.prisma.lineEvent.findFirst({
          where: { tenantId, userId },
          orderBy: { timestamp: 'desc' },
          select: { messageText: true, timestamp: true, messageType: true },
        });
        const lastOut = await this.outbox.findFirst({
          where: { tenantId, channel: 'LINE', destination: userId },
          orderBy: { createdAt: 'desc' },
          select: { payload: true, createdAt: true },
        });

        const inAt = lastIn?.timestamp ? new Date(lastIn.timestamp).getTime() : 0;
        const outAt = lastOut?.createdAt ? new Date(lastOut.createdAt).getTime() : 0;
        const useOut = outAt > inAt;

        const lastMessage = useOut ? this.outboxText(lastOut?.payload) || '' : lastIn?.messageText || '';
        const lastAt = useOut ? lastOut?.createdAt : lastIn?.timestamp || r._max.timestamp;
        results.push({
          id: `LINE:${userId}`,
          channel: 'LINE',
          externalId: userId,
          title: userId,
          lastMessage,
          lastAt,
        });
      }
    }

    if (channel === 'ALL' || channel === 'MESSENGER' || channel === 'FACEBOOK') {
      const raw = await this.prisma.facebookSync.groupBy({
        by: ['conversationId'],
        where: { tenantId },
        _max: { timestamp: true },
        orderBy: { _max: { timestamp: 'desc' } },
        take: limit,
      });
      for (const r of raw) {
        const cid = r.conversationId;
        if (q && !normalize(cid).includes(q)) continue;
        const lastIn = await this.prisma.facebookSync.findFirst({
          where: { tenantId, conversationId: cid },
          orderBy: { timestamp: 'desc' },
          select: { messageText: true, timestamp: true, senderName: true },
        });
        const lastOut = await this.outbox.findFirst({
          where: { tenantId, channel: 'MESSENGER', destination: cid },
          orderBy: { createdAt: 'desc' },
          select: { payload: true, createdAt: true },
        });

        const inAt = lastIn?.timestamp ? new Date(lastIn.timestamp).getTime() : 0;
        const outAt = lastOut?.createdAt ? new Date(lastOut.createdAt).getTime() : 0;
        const useOut = outAt > inAt;

        const lastMessage = useOut ? this.outboxText(lastOut?.payload) || '' : lastIn?.messageText || '';
        const lastAt = useOut ? lastOut?.createdAt : lastIn?.timestamp || r._max.timestamp;
        results.push({
          id: `MESSENGER:${cid}`,
          channel: 'MESSENGER',
          externalId: cid,
          title: lastIn?.senderName ? `${lastIn.senderName}` : cid,
          lastMessage,
          lastAt,
        });
      }
    }

    // sort overall
    results.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    return results.slice(0, limit);
  }

  async getConversationMessages(tenantId: string, channel: string, externalId: string, limit: number = 100) {
    const ch = String(channel).toUpperCase();
    const take = Math.min(limit, 300);

    if (ch === 'LINE') {
      const events = await this.prisma.lineEvent.findMany({
        where: { tenantId, userId: externalId, messageText: { not: null } },
        orderBy: { timestamp: 'asc' },
        take,
      });
      const outs = await this.outbox.findMany({
        where: { tenantId, channel: 'LINE', destination: externalId },
        orderBy: { createdAt: 'asc' },
        take,
      });
      const inMsgs = events.map((e) => ({
        id: e.id,
        channel: 'LINE',
        direction: 'IN',
        text: e.messageText,
        timestamp: e.timestamp,
        meta: { messageId: e.messageId, messageType: e.messageType },
      }));
      const outMsgs = outs.map((o: any) => ({
        id: o.id,
        channel: 'LINE',
        direction: 'OUT' as const,
        text: this.outboxText(o.payload),
        timestamp: o.createdAt,
        meta: { status: o.status, errorMessage: o.errorMessage },
      }));
      const merged = [...inMsgs, ...outMsgs];
      merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return merged.slice(-take);
    }

    // MESSENGER/FACEBOOK
    const msgs = await this.prisma.facebookSync.findMany({
      where: { tenantId, conversationId: externalId },
      orderBy: { timestamp: 'asc' },
      take,
    });
    const outs = await this.outbox.findMany({
      where: { tenantId, channel: 'MESSENGER', destination: externalId },
      orderBy: { createdAt: 'asc' },
      take,
    });
    const inMsgs = msgs.map((m) => ({
      id: m.id,
      channel: 'MESSENGER',
      direction: 'IN',
      text: m.messageText,
      timestamp: m.timestamp,
      meta: { senderId: m.senderId, senderName: m.senderName, messageId: m.messageId, messageType: m.messageType },
    }));
    const outMsgs = outs.map((o: any) => ({
      id: o.id,
      channel: 'MESSENGER',
      direction: 'OUT' as const,
      text: this.outboxText(o.payload),
      timestamp: o.createdAt,
      meta: { status: o.status, errorMessage: o.errorMessage },
    }));
    const merged = [...inMsgs, ...outMsgs];
    merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return merged.slice(-take);
  }

  async reply(tenantId: string, body: { channel: string; externalId: string; text: string }) {
    const ch = String(body?.channel || '').toUpperCase();
    const externalId = String(body?.externalId || '').trim();
    const text = String(body?.text || '').trim();
    if (!ch) throw new BadRequestException('channel is required');
    if (!externalId) throw new BadRequestException('externalId is required');
    if (!text) throw new BadRequestException('text is required');
    if (ch !== 'LINE' && ch !== 'MESSENGER') throw new BadRequestException('Unsupported channel');

    // Persist to outbox (can be processed by a worker/provider later)
    const created = await this.outbox.create({
      data: {
        tenantId,
        channel: ch,
        destination: externalId,
        payload: { text },
        status: 'PENDING',
      },
    });
    return { ok: true, id: created.id, status: created.status };
  }

  // Unify user
  async getUnifiedByIdentity(tenantId: string, channel: string, externalId: string) {
    const ch = String(channel || '').toUpperCase();
    if (!ch) throw new BadRequestException('channel is required');
    if (!externalId) throw new BadRequestException('externalId is required');

    const identity = await this.unifiedIdentity.findFirst({
      where: { tenantId, channel: ch, externalId },
      include: { unifiedUser: { include: { identities: true } } },
    });
    if (!identity) return null;
    return identity.unifiedUser;
  }

  async linkIdentity(
    tenantId: string,
    body: {
      channel: string;
      externalId: string;
      unifiedUserId?: string;
      displayName?: string;
      profile?: any;
      channelAccountId?: string;
      externalProfile?: any;
    },
  ) {
    const ch = String(body?.channel || '').toUpperCase();
    const externalId = String(body?.externalId || '').trim();
    if (!ch) throw new BadRequestException('channel is required');
    if (!externalId) throw new BadRequestException('externalId is required');

    let unifiedUserId = body.unifiedUserId;
    if (unifiedUserId) {
      const u = await this.unifiedUser.findFirst({ where: { id: unifiedUserId, tenantId } });
      if (!u) throw new NotFoundException('Unified user not found');
    } else {
      const created = await this.unifiedUser.create({
        data: {
          tenantId,
          displayName: body.displayName || null,
          profile: body.profile || null,
        },
      });
      unifiedUserId = created.id;
    }

    try {
      const identity = await this.unifiedIdentity.upsert({
        where: {
          tenantId_channel_externalId_channelAccountId: {
            tenantId,
            channel: ch,
            externalId,
            channelAccountId: body.channelAccountId || null,
          },
        },
        update: {
          unifiedUserId,
          externalProfile: body.externalProfile || null,
        },
        create: {
          tenantId,
          unifiedUserId,
          channel: ch,
          channelAccountId: body.channelAccountId || null,
          externalId,
          externalProfile: body.externalProfile || null,
        },
      });
      const u = await this.unifiedUser.findFirst({ where: { id: unifiedUserId, tenantId }, include: { identities: true } });
      return { unifiedUser: u, identity };
    } catch (e: any) {
      if (String(e?.code) === 'P2002') throw new BadRequestException('Identity already linked');
      throw e;
    }
  }

  async unlinkIdentity(tenantId: string, identityId: string) {
    const existing = await this.unifiedIdentity.findFirst({ where: { id: identityId, tenantId } });
    if (!existing) throw new NotFoundException('Identity not found');
    await this.unifiedIdentity.delete({ where: { id: identityId } });
    return { ok: true };
  }
}

