import { BadRequestException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function normalize(s: string) {
  return String(s || '').trim().toLowerCase();
}

function ensureKeywords(value: any): string[] {
  const arr = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return arr.map((x) => String(x).trim()).filter(Boolean);
}

function ensureIds(value: any): string[] {
  const arr = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return arr.map((x) => String(x).trim()).filter(Boolean);
}

@Injectable()
export class ChatAutoMessagerService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  private get rule() {
    const delegate = (this.prisma as any).chatAutoRule;
    if (!delegate) throw new BadRequestException('ChatAutoRule model not ready. Run prisma generate/db push then restart API.');
    return delegate;
  }
  private get log() {
    const delegate = (this.prisma as any).chatAutoLog;
    if (!delegate) throw new BadRequestException('ChatAutoLog model not ready. Run prisma generate/db push then restart API.');
    return delegate;
  }
  private get outbox() {
    const delegate = (this.prisma as any).chatAutoOutbox;
    if (!delegate) throw new BadRequestException('ChatAutoOutbox model not ready. Run prisma generate/db push then restart API.');
    return delegate;
  }
  private get lineContent() {
    return (this.prisma as any).lineContent;
  }
  private get messengerContent() {
    return (this.prisma as any).messengerContent;
  }

  async listRules(tenantId: string, filters?: { channel?: string; status?: string; q?: string; kind?: string }) {
    const where: any = { tenantId };
    if (filters?.channel) where.channel = filters.channel;
    if (filters?.status) where.status = filters.status;
    if (filters?.q) where.name = { contains: filters.q, mode: 'insensitive' };
    if (filters?.kind) {
      // metadata.kind === filters.kind
      where.metadata = { path: ['kind'], equals: String(filters.kind) };
    }
    return this.rule.findMany({ where, orderBy: { updatedAt: 'desc' }, include: { lineContent: true, messengerContent: true } });
  }

  async createRule(tenantId: string, body: any) {
    const channel = String(body?.channel || '').toUpperCase();
    if (!channel) throw new BadRequestException('channel is required');
    const name = String(body?.name || '').trim();
    if (!name) throw new BadRequestException('name is required');
    const keywords = ensureKeywords(body?.keywords);
    if (keywords.length === 0) throw new BadRequestException('keywords is required');

    const status = (body?.status || 'ACTIVE').toUpperCase();
    const matchType = (body?.matchType || 'CONTAINS').toUpperCase();
    const responseKind = (body?.responseKind || '').toUpperCase();
    const tagIds = ensureIds(body?.tagIds);

    const data: any = {
      tenantId,
      channel,
      name,
      status,
      matchType,
      keywords,
      tagIds: tagIds.length ? tagIds : null,
      responseKind: responseKind || 'RAW',
      lineContentId: body?.lineContentId || null,
      messengerContentId: body?.messengerContentId || null,
      responsePayload: body?.responsePayload || null,
      metadata: body?.metadata || null,
    };

    // Ensure metadata.kind can be set safely (used by Label Keywords rules)
    if (body?.kind) {
      data.metadata = { ...(data.metadata || {}), kind: String(body.kind) };
    }

    // If referencing content, snapshot payload
    if (data.responseKind === 'LINE_CONTENT' && data.lineContentId) {
      const c = await this.lineContent?.findFirst?.({ where: { id: data.lineContentId, tenantId } });
      if (!c) throw new BadRequestException('Invalid lineContentId');
      data.responsePayload = c.content;
    }
    if (data.responseKind === 'MESSENGER_CONTENT' && data.messengerContentId) {
      const c = await this.messengerContent?.findFirst?.({ where: { id: data.messengerContentId, tenantId } });
      if (!c) throw new BadRequestException('Invalid messengerContentId');
      data.responsePayload = c.content;
    }

    try {
      return await this.rule.create({ data });
    } catch (e: any) {
      if (String(e?.code) === 'P2002') throw new BadRequestException('Rule name already exists for this channel');
      throw e;
    }
  }

  async updateRule(tenantId: string, id: string, body: any) {
    const existing = await this.rule.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Rule not found');

    const patch: any = {};
    if (body?.name !== undefined) patch.name = String(body.name || '').trim();
    if (body?.status !== undefined) patch.status = String(body.status || '').toUpperCase();
    if (body?.matchType !== undefined) patch.matchType = String(body.matchType || '').toUpperCase();
    if (body?.keywords !== undefined) patch.keywords = ensureKeywords(body.keywords);
    if (body?.tagIds !== undefined) {
      const tagIds = ensureIds(body.tagIds);
      patch.tagIds = tagIds.length ? tagIds : null;
    }
    if (body?.responseKind !== undefined) patch.responseKind = String(body.responseKind || '').toUpperCase();
    if (body?.lineContentId !== undefined) patch.lineContentId = body.lineContentId || null;
    if (body?.messengerContentId !== undefined) patch.messengerContentId = body.messengerContentId || null;
    if (body?.metadata !== undefined) patch.metadata = body.metadata || null;
    if (body?.kind !== undefined) {
      patch.metadata = { ...(patch.metadata || existing.metadata || {}), kind: String(body.kind) };
    }

    // snapshot again
    if (patch.responseKind === 'LINE_CONTENT' && patch.lineContentId) {
      const c = await this.lineContent?.findFirst?.({ where: { id: patch.lineContentId, tenantId } });
      if (!c) throw new BadRequestException('Invalid lineContentId');
      patch.responsePayload = c.content;
      patch.messengerContentId = null;
    } else if (patch.responseKind === 'MESSENGER_CONTENT' && patch.messengerContentId) {
      const c = await this.messengerContent?.findFirst?.({ where: { id: patch.messengerContentId, tenantId } });
      if (!c) throw new BadRequestException('Invalid messengerContentId');
      patch.responsePayload = c.content;
      patch.lineContentId = null;
    } else if (patch.responseKind === 'RAW' && body?.responsePayload !== undefined) {
      patch.responsePayload = body.responsePayload || null;
      patch.lineContentId = null;
      patch.messengerContentId = null;
    }

    try {
      return await this.rule.update({ where: { id }, data: patch });
    } catch (e: any) {
      if (String(e?.code) === 'P2002') throw new BadRequestException('Rule name already exists for this channel');
      throw e;
    }
  }

  async deleteRule(tenantId: string, id: string) {
    const existing = await this.rule.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Rule not found');
    await this.rule.delete({ where: { id } });
    return { ok: true };
  }

  private matchKeywords(matchType: string, text: string, keywords: string[]) {
    const t = normalize(text);
    const hits: string[] = [];
    for (const kw of keywords) {
      const k = normalize(kw);
      if (!k) continue;
      if (matchType === 'EQUALS') {
        if (t === k) hits.push(kw);
      } else {
        if (t.includes(k)) hits.push(kw);
      }
    }
    return hits;
  }

  async testMatch(tenantId: string, channel: string | undefined, text: string, kind?: string) {
    const ch = String(channel || '').toUpperCase();
    const where: any = { tenantId, status: 'ACTIVE' };
    if (kind) {
      where.metadata = { path: ['kind'], equals: String(kind) };
      // For LABEL_KEYWORDS, allow global match without specifying channel
      if (String(kind) === 'LABEL_KEYWORDS') {
        if (ch) where.channel = ch;
      } else {
        if (!ch) throw new BadRequestException('channel is required');
        where.channel = ch;
      }
    } else {
      // default behavior (legacy)
      if (!ch) throw new BadRequestException('channel is required');
      where.channel = ch;
    }
    const rules = await this.rule.findMany({ where, orderBy: { updatedAt: 'desc' } });
    for (const r of rules) {
      const keywords = Array.isArray(r.keywords) ? (r.keywords as any) : [];
      const hits = this.matchKeywords(String(r.matchType || 'CONTAINS'), text, keywords);
      if (hits.length > 0) {
        return { matched: true, rule: r, matchedKeywords: hits, responsePayload: r.responsePayload };
      }
    }
    return { matched: false };
  }

  async handleInbound(tenantId: string, channel: string, text: string, destination?: string, inboundMeta?: any) {
    const ch = String(channel || '').toUpperCase();
    const rules = await this.rule.findMany({
      where: { tenantId, channel: ch, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
    });
    // Global label-keywords rules apply for every channel
    const labelRules = await this.rule.findMany({
      where: { tenantId, channel: 'ALL', status: 'ACTIVE', metadata: { path: ['kind'], equals: 'LABEL_KEYWORDS' } },
      orderBy: { updatedAt: 'desc' },
    });
    let matchedResponse: any = null;
    let matchedResponseKeywords: string[] = [];
    const matchedLabelRules: Array<{ rule: any; matchedKeywords: string[] }> = [];

    for (const r of rules) {
      const keywords = Array.isArray(r.keywords) ? (r.keywords as any) : [];
      const hits = this.matchKeywords(String(r.matchType || 'CONTAINS'), text, keywords);
      if (hits.length > 0) {
        const kind = (r.metadata as any)?.kind ? String((r.metadata as any).kind) : '';
        const isLabelKeywords = kind === 'LABEL_KEYWORDS';
        if (isLabelKeywords) {
          matchedLabelRules.push({ rule: r, matchedKeywords: hits });
          continue; // do NOT block response rule matching
        }
        // Choose first response-capable rule
        if (!matchedResponse) {
          matchedResponse = r;
          matchedResponseKeywords = hits;
        }
      }
    }
    // Apply global label rules too (ALL channel)
    for (const r of labelRules) {
      const keywords = Array.isArray(r.keywords) ? (r.keywords as any) : [];
      const hits = this.matchKeywords(String(r.matchType || 'CONTAINS'), text, keywords);
      if (hits.length > 0) matchedLabelRules.push({ rule: r, matchedKeywords: hits });
    }

    const log = await this.log.create({
      data: {
        tenantId,
        channel: ch,
        inboundText: text || null,
        inboundMeta: inboundMeta || null,
        matchedRuleId: matchedResponse?.id || null,
        matchedKeywords: matchedResponse ? matchedResponseKeywords : null,
      },
    });

    if (matchedResponse?.responsePayload) {
      await this.outbox.create({
        data: {
          tenantId,
          channel: ch,
          destination: destination || null,
          payload: matchedResponse.responsePayload,
          status: 'PENDING',
          ruleId: matchedResponse.id,
        },
      });
    }

    // Tag by keywords: assign tags to customer if we can resolve by destination identifier.
    // Apply BOTH:
    // - response rule tagIds (optional)
    // - all label-keywords rules tagIds (multiple)
    const allTagIds: string[] = [];
    const pushTagIds = (rule: any) => {
      const tagIds: string[] = Array.isArray(rule?.tagIds) ? (rule.tagIds as any) : [];
      for (const id of tagIds) allTagIds.push(String(id));
    };
    if (matchedResponse) pushTagIds(matchedResponse);
    for (const x of matchedLabelRules) pushTagIds(x.rule);
    const dedupTagIds = Array.from(new Set(allTagIds)).filter(Boolean);

    if (dedupTagIds.length > 0 && destination) {
      const dest = String(destination).trim();
      const key = ch === 'LINE' ? 'lineUserId' : ch === 'MESSENGER' ? 'psid' : '';
      if (key) {
        const customer = await this.prisma.customer.findFirst({
          where: {
            tenantId,
            identifiers: { path: [key], equals: dest },
          } as any,
          select: { id: true },
        });
        if (customer?.id) {
          for (const tagId of dedupTagIds) {
            try {
              await this.prisma.customerTag.create({
                data: { tenantId, customerId: customer.id, tagId },
              });
            } catch (e: any) {
              // ignore duplicates / constraint errors
              if (String(e?.code) !== 'P2002') {
                // swallow other errors to not break inbound flow
              }
            }
          }
        }
      }
    }

    return {
      logId: log.id,
      matched: !!matchedResponse,
      labelMatchedCount: matchedLabelRules.length,
      assignedTagIds: dedupTagIds,
    };
  }

  async listLogs(tenantId: string, filters?: { channel?: string; limit?: number }) {
    const where: any = { tenantId };
    if (filters?.channel) where.channel = String(filters.channel).toUpperCase();
    return this.log.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(filters?.limit || 50, 200),
    });
  }

  async listOutbox(tenantId: string, filters?: { channel?: string; status?: string; limit?: number }) {
    const where: any = { tenantId };
    if (filters?.channel) where.channel = String(filters.channel).toUpperCase();
    if (filters?.status) where.status = String(filters.status).toUpperCase();
    if ((filters as any)?.ruleId) where.ruleId = String((filters as any).ruleId);
    return this.outbox.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(filters?.limit || 50, 200),
    });
  }
}

