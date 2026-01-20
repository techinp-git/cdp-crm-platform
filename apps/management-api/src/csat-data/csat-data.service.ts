import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Filters = {
  q?: string;
  project?: string;
  dateFrom?: string;
  dateTo?: string;
  minScore?: string;
  maxScore?: string;
  channel?: string;
  feedbackCategory?: string;
};

function toIsoDateStart(s?: string) {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function toIsoDateEnd(s?: string) {
  if (!s) return null;
  const d = new Date(`${s}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getMetaStr(meta: any, key: string): string {
  const v = meta?.[key];
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

@Injectable()
export class CsatDataService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  private normalizeFilters(filters?: Filters) {
    const q = (filters?.q || '').trim();
    const project = (filters?.project || '').trim();
    const dateFrom = toIsoDateStart(filters?.dateFrom);
    const dateTo = toIsoDateEnd(filters?.dateTo);
    const minScore = filters?.minScore ? parseInt(filters.minScore, 10) : null;
    const maxScore = filters?.maxScore ? parseInt(filters.maxScore, 10) : null;
    const channel = (filters?.channel || '').trim();
    const feedbackCategory = (filters?.feedbackCategory || '').trim();
    return { q, project, dateFrom, dateTo, minScore, maxScore, channel, feedbackCategory };
  }

  async list(
    tenantId: string,
    filters?: Filters & { page?: number; limit?: number },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;
    const f = this.normalizeFilters(filters);

    const where: any = { tenantId };
    if (f.project) where.project = f.project;
    if (f.minScore != null) where.score = { ...(where.score || {}), gte: f.minScore };
    if (f.maxScore != null) where.score = { ...(where.score || {}), lte: f.maxScore };
    if (f.dateFrom || f.dateTo) {
      where.submittedAt = {};
      if (f.dateFrom) where.submittedAt.gte = f.dateFrom;
      if (f.dateTo) where.submittedAt.lte = f.dateTo;
    }
    if (f.q) {
      where.OR = [
        { project: { contains: f.q, mode: 'insensitive' } },
        { customerName: { contains: f.q, mode: 'insensitive' } },
        { customerEmail: { contains: f.q, mode: 'insensitive' } },
        { comment: { contains: f.q, mode: 'insensitive' } },
        { externalId: { contains: f.q, mode: 'insensitive' } },
      ];
    }

    // We filter channel/feedbackCategory from metadata in-memory for now.
    const raw = await this.prisma.csat.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      take: 20000,
    });

    const filtered = raw.filter((r: any) => {
      const meta = r.metadata || {};
      if (f.channel && getMetaStr(meta, 'channel') !== f.channel) return false;
      if (f.feedbackCategory && getMetaStr(meta, 'feedbackCategory') !== f.feedbackCategory) return false;
      return true;
    });

    const total = filtered.length;
    const data = filtered.slice(skip, skip + limit).map((r: any) => ({
      id: r.id,
      customerId: r.externalId,
      customerName: r.customerName || null,
      customerEmail: r.customerEmail || null,
      customerPhone: r.customerPhone || null,
      project: r.project,
      score: r.score,
      comment: r.comment || null,
      feedbackCategory: getMetaStr(r.metadata, 'feedbackCategory') || null,
      channel: getMetaStr(r.metadata, 'channel') || null,
      source: getMetaStr(r.metadata, 'source') || null,
      surveyDate: r.submittedAt,
      createdAt: r.createdAt,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async projectSummary(tenantId: string, filters?: Filters) {
    const f = this.normalizeFilters(filters);
    const where: any = { tenantId };
    if (f.project) where.project = f.project;
    if (f.minScore != null) where.score = { ...(where.score || {}), gte: f.minScore };
    if (f.maxScore != null) where.score = { ...(where.score || {}), lte: f.maxScore };
    if (f.dateFrom || f.dateTo) {
      where.submittedAt = {};
      if (f.dateFrom) where.submittedAt.gte = f.dateFrom;
      if (f.dateTo) where.submittedAt.lte = f.dateTo;
    }
    if (f.q) {
      where.OR = [
        { project: { contains: f.q, mode: 'insensitive' } },
        { customerName: { contains: f.q, mode: 'insensitive' } },
        { customerEmail: { contains: f.q, mode: 'insensitive' } },
        { comment: { contains: f.q, mode: 'insensitive' } },
      ];
    }

    // Fetch all candidates (needed for metadata filters + unique customer count)
    const raw = await this.prisma.csat.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      take: 20000,
      select: { project: true, score: true, submittedAt: true, customerEmail: true, customerPhone: true, customerName: true, metadata: true },
    });
    const filtered = raw.filter((r: any) => {
      const meta = r.metadata || {};
      if (f.channel && getMetaStr(meta, 'channel') !== f.channel) return false;
      if (f.feedbackCategory && getMetaStr(meta, 'feedbackCategory') !== f.feedbackCategory) return false;
      return true;
    });

    const map = new Map<string, { project: string; responses: number; avgScore: number; lastSubmittedAt: string | null; customers: Set<string> }>();
    for (const r of filtered as any[]) {
      const key = String(r.project || 'Unknown');
      const customerKey = String(r.customerEmail || r.customerPhone || r.customerName || 'unknown');
      const prev =
        map.get(key) || { project: key, responses: 0, avgScore: 0, lastSubmittedAt: null, customers: new Set<string>() };
      prev.responses += 1;
      prev.avgScore += Number(r.score) || 0; // accumulate, normalize later
      prev.customers.add(customerKey);
      const ts = r.submittedAt ? new Date(r.submittedAt).toISOString() : null;
      if (ts && (!prev.lastSubmittedAt || ts > prev.lastSubmittedAt)) prev.lastSubmittedAt = ts;
      map.set(key, prev);
    }

    const projects = Array.from(map.values()).map((p) => ({
      project: p.project,
      responses: p.responses,
      avgScore: p.responses ? Number((p.avgScore / p.responses).toFixed(2)) : 0,
      customers: p.customers.size,
      lastSubmittedAt: p.lastSubmittedAt,
    }));

    projects.sort((a, b) => b.responses - a.responses);
    return { projects };
  }

  async customerProjectSummary(tenantId: string, filters?: Filters & { page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;
    const f = this.normalizeFilters(filters);

    const where: any = { tenantId };
    if (f.project) where.project = f.project;
    if (f.minScore != null) where.score = { ...(where.score || {}), gte: f.minScore };
    if (f.maxScore != null) where.score = { ...(where.score || {}), lte: f.maxScore };
    if (f.dateFrom || f.dateTo) {
      where.submittedAt = {};
      if (f.dateFrom) where.submittedAt.gte = f.dateFrom;
      if (f.dateTo) where.submittedAt.lte = f.dateTo;
    }
    if (f.q) {
      where.OR = [
        { project: { contains: f.q, mode: 'insensitive' } },
        { customerName: { contains: f.q, mode: 'insensitive' } },
        { customerEmail: { contains: f.q, mode: 'insensitive' } },
        { comment: { contains: f.q, mode: 'insensitive' } },
      ];
    }

    const raw = await this.prisma.csat.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      take: 20000,
      select: {
        project: true,
        score: true,
        submittedAt: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        metadata: true,
      },
    });

    const filtered = raw.filter((r: any) => {
      const meta = r.metadata || {};
      if (f.channel && getMetaStr(meta, 'channel') !== f.channel) return false;
      if (f.feedbackCategory && getMetaStr(meta, 'feedbackCategory') !== f.feedbackCategory) return false;
      return true;
    });

    const map = new Map<string, any>();
    for (const r of filtered as any[]) {
      const customerKey = String(r.customerEmail || r.customerPhone || r.customerName || 'unknown');
      const key = `${r.project}::${customerKey}`;
      const prev =
        map.get(key) || {
          project: r.project,
          customerKey,
          customerName: r.customerName || null,
          customerEmail: r.customerEmail || null,
          customerPhone: r.customerPhone || null,
          responses: 0,
          avgScoreAcc: 0,
          lastScore: null as number | null,
          lastSubmittedAt: null as string | null,
        };
      const ts = r.submittedAt ? new Date(r.submittedAt).toISOString() : null;
      prev.responses += 1;
      prev.avgScoreAcc += Number(r.score) || 0;
      if (!prev.lastSubmittedAt || (ts && ts > prev.lastSubmittedAt)) {
        prev.lastSubmittedAt = ts;
        prev.lastScore = Number(r.score) || null;
      }
      map.set(key, prev);
    }

    const all = Array.from(map.values()).map((x) => ({
      project: x.project,
      customerKey: x.customerKey,
      customerName: x.customerName,
      customerEmail: x.customerEmail,
      customerPhone: x.customerPhone,
      responses: x.responses,
      avgScore: x.responses ? Number((x.avgScoreAcc / x.responses).toFixed(2)) : 0,
      lastScore: x.lastScore,
      lastSubmittedAt: x.lastSubmittedAt,
    }));

    all.sort((a, b) => (b.lastSubmittedAt || '').localeCompare(a.lastSubmittedAt || ''));
    const total = all.length;
    const data = all.slice(skip, skip + limit);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async importCsv(tenantId: string, file: Express.Multer.File) {
    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    const fileContent = file.buffer.toString('utf-8');
    const lines = fileContent.split('\n').filter((l) => l.trim());
    if (lines.length < 2) throw new BadRequestException('CSV file is empty');
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const r: any = {};
      headers.forEach((h, i) => (r[h] = values[i] || ''));
      return r;
    });

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const externalId = String(r.externalId || r.customerId || '').trim();
        const project = String(r.project || r.surveyProject || '').trim();
        const score = parseInt(String(r.score || ''), 10);
        const submittedAtRaw = String(r.submittedAt || r.surveyDate || '').trim();
        const submittedAt = submittedAtRaw ? new Date(submittedAtRaw) : null;

        if (!externalId || !project || !Number.isFinite(score) || !submittedAt || Number.isNaN(submittedAt.getTime())) {
          errors.push(`Row ${i + 2}: missing required fields (externalId/customerId, project, score, submittedAt/surveyDate)`);
          failed++;
          continue;
        }

        await this.prisma.csat.upsert({
          where: { tenantId_externalId: { tenantId, externalId } },
          update: {
            project,
            score,
            comment: r.comment || null,
            customerName: r.customerName || null,
            customerEmail: r.customerEmail || null,
            customerPhone: r.customerPhone || null,
            submittedAt,
            metadata: {
              source: r.source || null,
              channel: r.channel || null,
              feedbackCategory: r.feedbackCategory || null,
            },
          },
          create: {
            tenantId,
            externalId,
            project,
            score,
            comment: r.comment || null,
            customerName: r.customerName || null,
            customerEmail: r.customerEmail || null,
            customerPhone: r.customerPhone || null,
            submittedAt,
            metadata: {
              source: r.source || null,
              channel: r.channel || null,
              feedbackCategory: r.feedbackCategory || null,
            },
          },
        });
        success++;
      } catch (e: any) {
        errors.push(`Row ${i + 2}: ${e?.message || 'Unknown error'}`);
        failed++;
      }
    }

    return { success, failed, errors: errors.slice(0, 10) };
  }
}

