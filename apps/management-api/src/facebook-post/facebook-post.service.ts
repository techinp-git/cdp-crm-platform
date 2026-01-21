import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type FbPostStatus = 'DRAFT' | 'SYNCED' | 'PUBLISHED' | 'FAILED';

export interface UpsertFacebookPageDto {
  pageId: string;
  name?: string;
  accessToken: string;
  metadata?: any;
}

export interface CreateFacebookPostDto {
  pageId: string;
  message?: string;
  link?: string;
  media?: any; // [{ type: 'image', url }]
  status?: FbPostStatus; // default DRAFT
}

@Injectable()
export class FacebookPostService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  private get page() {
    const d = (this.prisma as any).facebookPage;
    if (!d) throw new InternalServerErrorException('FacebookPage model not ready. Run prisma generate/db push then restart API.');
    return d;
  }

  private get post() {
    const d = (this.prisma as any).facebookPost;
    if (!d) throw new InternalServerErrorException('FacebookPost model not ready. Run prisma generate/db push then restart API.');
    return d;
  }

  private graphBase() {
    const version = process.env.FACEBOOK_GRAPH_VERSION || 'v20.0';
    const base = process.env.FACEBOOK_GRAPH_BASE_URL || 'https://graph.facebook.com';
    return `${base}/${version}`;
  }

  async listPages(tenantId: string) {
    return this.page.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } });
  }

  async upsertPage(tenantId: string, dto: UpsertFacebookPageDto) {
    const pageId = String(dto?.pageId || '').trim();
    const accessToken = String(dto?.accessToken || '').trim();
    if (!pageId) throw new BadRequestException('pageId is required');
    if (!accessToken) throw new BadRequestException('accessToken is required');

    const existing = await this.page.findFirst({ where: { tenantId, pageId } });
    if (existing) {
      return this.page.update({
        where: { id: existing.id },
        data: { name: dto?.name || null, accessToken, metadata: dto?.metadata || null },
      });
    }
    return this.page.create({
      data: { tenantId, pageId, name: dto?.name || null, accessToken, metadata: dto?.metadata || null },
    });
  }

  async deletePage(tenantId: string, id: string) {
    const item = await this.page.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Facebook page not found');
    await this.page.delete({ where: { id } });
    return { ok: true };
  }

  async listPosts(
    tenantId: string,
    filters?: { pageId?: string; status?: string; q?: string; page?: number; limit?: number },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (filters?.pageId) where.pageId = String(filters.pageId);
    if (filters?.status) where.status = String(filters.status).toUpperCase();
    if (filters?.q) {
      where.OR = [
        { message: { contains: filters.q, mode: 'insensitive' } },
        { facebookPostId: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.post.findMany({ where, orderBy: [{ fbCreatedAt: 'desc' }, { createdAt: 'desc' }], skip, take: limit }),
      this.post.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.post.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Facebook post not found');
    return item;
  }

  async createDraft(tenantId: string, dto: CreateFacebookPostDto) {
    const pageId = String(dto?.pageId || '').trim();
    if (!pageId) throw new BadRequestException('pageId is required');
    const status = String(dto?.status || 'DRAFT').toUpperCase() as FbPostStatus;
    return this.post.create({
      data: {
        tenantId,
        pageId,
        message: dto?.message || null,
        link: dto?.link || null,
        media: dto?.media || null,
        status,
      },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateFacebookPostDto> & { status?: FbPostStatus }) {
    await this.findOne(tenantId, id);
    const patch: any = {};
    if (dto.pageId !== undefined) patch.pageId = String(dto.pageId || '').trim();
    if (dto.message !== undefined) patch.message = dto.message || null;
    if (dto.link !== undefined) patch.link = dto.link || null;
    if (dto.media !== undefined) patch.media = dto.media || null;
    if (dto.status !== undefined) patch.status = String(dto.status || '').toUpperCase();
    return this.post.update({ where: { id }, data: patch });
  }

  async syncFromFacebook(tenantId: string, pageId: string, limit: number = 25) {
    const page = await this.page.findFirst({ where: { tenantId, pageId } });
    if (!page) throw new NotFoundException('Facebook page config not found. Please save Page ID + Access Token first.');

    const url = new URL(`${this.graphBase()}/${pageId}/posts`);
    url.searchParams.set('access_token', page.accessToken);
    url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100)));
    url.searchParams.set('fields', 'id,message,created_time,permalink_url,full_picture,attachments{media,subattachments}');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(url.toString(), { method: 'GET', headers: { 'Content-Type': 'application/json' }, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new BadRequestException(`Facebook API error: ${err?.error?.message || `HTTP ${res.status}`}`);
    }
    const json: any = await res.json().catch(() => ({}));
    const rows = Array.isArray(json?.data) ? json.data : [];

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const r of rows) {
      try {
        const facebookPostId = String(r?.id || '').trim();
        if (!facebookPostId) continue;
        const message = typeof r?.message === 'string' ? r.message : null;
        const permalinkUrl = typeof r?.permalink_url === 'string' ? r.permalink_url : null;
        const fullPicture = typeof r?.full_picture === 'string' ? r.full_picture : null;
        const fbCreatedAt = r?.created_time ? new Date(r.created_time) : null;

        // derive media array
        const media: any[] = [];
        if (fullPicture) media.push({ type: 'image', url: fullPicture });
        const attachments = r?.attachments?.data;
        if (Array.isArray(attachments)) {
          for (const a of attachments) {
            const img = a?.media?.image?.src;
            if (typeof img === 'string' && img.trim()) media.push({ type: 'image', url: img.trim() });
          }
        }

        await this.post.upsert({
          where: { tenantId_facebookPostId: { tenantId, facebookPostId } } as any,
          update: {
            facebookPageId: page.id,
            pageId,
            message,
            permalinkUrl,
            fullPicture,
            fbCreatedAt: fbCreatedAt || undefined,
            media: media.length ? media : undefined,
            providerMeta: r,
            status: 'SYNCED',
          },
          create: {
            tenantId,
            facebookPageId: page.id,
            pageId,
            facebookPostId,
            message,
            permalinkUrl,
            fullPicture,
            fbCreatedAt: fbCreatedAt || undefined,
            media: media.length ? media : undefined,
            providerMeta: r,
            status: 'SYNCED',
          },
        });
        success++;
      } catch (e: any) {
        failed++;
        errors.push(String(e?.message || e));
      }
    }

    return { success, failed, errors: errors.slice(0, 10) };
  }

  private pickFirstImageUrl(media: any): string | null {
    if (!Array.isArray(media)) return null;
    const first = media.find((x) => x && String(x.type || '').toLowerCase() === 'image' && typeof x.url === 'string' && x.url.trim());
    if (!first) return null;
    return String(first.url).trim();
  }

  async publish(tenantId: string, id: string) {
    const item = await this.findOne(tenantId, id);
    const page = await this.page.findFirst({ where: { tenantId, pageId: item.pageId } });
    if (!page) throw new NotFoundException('Facebook page config not found. Please save Page ID + Access Token first.');
    if (!item.message && !item.link) throw new BadRequestException('message or link is required to publish');

    const imageUrl = this.pickFirstImageUrl(item.media as any);
    if (imageUrl && imageUrl.startsWith('data:')) {
      throw new BadRequestException('Image is a local preview (data URL). Please use an http(s) image URL to publish to Facebook.');
    }

    try {
      let attachedMediaFbid: string | null = null;
      if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
        const photoParams = new URLSearchParams();
        photoParams.set('access_token', page.accessToken);
        photoParams.set('url', imageUrl);
        photoParams.set('published', 'false');
        const photoRes = await fetch(`${this.graphBase()}/${page.pageId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: photoParams.toString(),
        });
        const photoJson: any = await photoRes.json().catch(() => ({}));
        if (!photoRes.ok) throw new Error(photoJson?.error?.message || `Photo upload failed (HTTP ${photoRes.status})`);
        attachedMediaFbid = String(photoJson?.id || '').trim() || null;
      }

      const feedParams = new URLSearchParams();
      feedParams.set('access_token', page.accessToken);
      if (item.message) feedParams.set('message', item.message);
      if (item.link) feedParams.set('link', item.link);
      if (attachedMediaFbid) {
        feedParams.set('attached_media[0]', JSON.stringify({ media_fbid: attachedMediaFbid }));
      }

      const feedRes = await fetch(`${this.graphBase()}/${page.pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: feedParams.toString(),
      });
      const feedJson: any = await feedRes.json().catch(() => ({}));
      if (!feedRes.ok) throw new Error(feedJson?.error?.message || `Publish failed (HTTP ${feedRes.status})`);

      const facebookPostId = String(feedJson?.id || '').trim() || null;
      const updated = await this.post.update({
        where: { id },
        data: {
          facebookPostId: item.facebookPostId || facebookPostId,
          facebookPageId: page.id,
          status: 'PUBLISHED',
          errorMessage: null,
          providerMeta: { ...(item.providerMeta as any), publishResponse: feedJson },
        },
      });
      return { ok: true, id: updated.id, facebookPostId: updated.facebookPostId || facebookPostId, response: feedJson };
    } catch (e: any) {
      await this.post.update({
        where: { id },
        data: { status: 'FAILED', errorMessage: String(e?.message || e) },
      });
      throw new BadRequestException(String(e?.message || e));
    }
  }
}

