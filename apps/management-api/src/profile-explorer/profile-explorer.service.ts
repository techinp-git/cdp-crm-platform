import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function normalize(s: string) {
  return String(s || '').trim();
}

function lower(s: string) {
  return normalize(s).toLowerCase();
}

function safeName(customer: any): string {
  const p = customer?.profile || {};
  const ids = customer?.identifiers || {};
  return (
    p?.name ||
    p?.companyName ||
    `${p?.firstName || ''} ${p?.lastName || ''}`.trim() ||
    ids?.email ||
    ids?.phone ||
    customer?.id ||
    '-'
  );
}

@Injectable()
export class ProfileExplorerService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async listProfiles(
    tenantId: string,
    filters?: { q?: string; page?: number; limit?: number },
  ) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 25, 100);
    const skip = (page - 1) * limit;
    const q = normalize(filters?.q || '');

    // Use a lightweight list then apply search in-memory (safe + simple for now)
    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          profile: true,
          identifiers: true,
        },
      }),
      this.prisma.customer.count({ where: { tenantId } }),
    ]);

    let data: any[] = rows as any[];
    if (q) {
      const qq = lower(q);
      data = data.filter((c) => {
        const p = c.profile || {};
        const ids = c.identifiers || {};
        const hay = [
          c.id,
          p.name,
          p.companyName,
          p.company,
          p.firstName,
          p.lastName,
          ids.email,
          ids.phone,
          ids.name,
        ]
          .filter(Boolean)
          .map((x) => String(x).toLowerCase());
        return hay.some((x) => x.includes(qq));
      });
    }

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private async findBillingForCustomer(tenantId: string, customer: any) {
    const ids = customer?.identifiers || {};
    const email = typeof ids?.email === 'string' ? ids.email.trim() : '';
    const phone = typeof ids?.phone === 'string' ? ids.phone.trim() : '';

    const where: any = {
      tenantId,
      OR: [
        { customerId: customer.id },
        ...(email ? [{ customerId: null, customerEmail: email }] : []),
        ...(phone ? [{ customerId: null, customerPhone: phone }] : []),
      ],
    };

    const lastBilling = await this.prisma.billing.findFirst({
      where,
      orderBy: [{ paidDate: 'desc' }, { issueDate: 'desc' }, { createdAt: 'desc' }],
    });

    const paidAgg = await this.prisma.billing.aggregate({
      where: { ...where, status: 'PAID' },
      _sum: { amount: true },
      _count: { _all: true },
      _max: { paidDate: true },
    });

    return {
      lastBilling,
      paidCount: Number((paidAgg as any)?._count?._all || 0),
      paidAmount: Number((paidAgg as any)?._sum?.amount || 0),
      lastPaidDate: (paidAgg as any)?._max?.paidDate || null,
    };
  }

  private async findTrackingSummary(tenantId: string, customerId: string) {
    const firstEvent = await this.prisma.customerEvent.findFirst({
      where: { tenantId, customerId },
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    });
    const lastEvent = await this.prisma.customerEvent.findFirst({
      where: { tenantId, customerId },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });

    const lastProduct = await this.prisma.customerEvent.findFirst({
      where: {
        tenantId,
        customerId,
        type: { in: ['purchase', 'order_paid', 'product_acquisition', 'billing_paid'] },
      },
      orderBy: { timestamp: 'desc' },
    });

    // FB Ads acquisition:
    // Avoid raw SQL (column naming differs by DB). Use last N events then filter in-app.
    const recent = await this.prisma.customerEvent.findMany({
      where: { tenantId, customerId },
      orderBy: { timestamp: 'desc' },
      take: 500,
    });

    const isFbAds = (e: any) => {
      const t = String(e?.type || '').toLowerCase();
      const p = (e?.payload as any) || {};
      const utmSource = String(p?.utm_source || p?.utmSource || p?.source || '').toLowerCase();
      const utmMedium = String(p?.utm_medium || p?.utmMedium || '').toLowerCase();
      return t.startsWith('fb') || t.startsWith('facebook') || utmSource.startsWith('facebook') || utmMedium.startsWith('cpc');
    };

    const lastFb = recent.find(isFbAds) || null;

    return {
      trackingStartAt: firstEvent?.timestamp || null,
      lastEventAt: lastEvent?.timestamp || null,
      lastProductAcquisition: lastProduct || null,
      lastFbAdsAcquisition: lastFb,
    };
  }

  async getProfileDetail(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, id },
      select: {
        id: true,
        type: true,
        profile: true,
        identifiers: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!customer) throw new BadRequestException('Customer not found');

    const billing = await this.findBillingForCustomer(tenantId, customer);
    const tracking = await this.findTrackingSummary(tenantId, customer.id);

    // Split billing before tracking start (if we have tracking start)
    let beforeTrack: any = null;
    if (tracking.trackingStartAt) {
      const ids = customer.identifiers as any;
      const email = typeof ids?.email === 'string' ? ids.email.trim() : '';
      const phone = typeof ids?.phone === 'string' ? ids.phone.trim() : '';

      const where: any = {
        tenantId,
        issueDate: { lt: tracking.trackingStartAt },
        OR: [
          { customerId: customer.id },
          ...(email ? [{ customerId: null, customerEmail: email }] : []),
          ...(phone ? [{ customerId: null, customerPhone: phone }] : []),
        ],
      };
      const lastBefore = await this.prisma.billing.findFirst({
        where,
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
      });
      const countBefore = await this.prisma.billing.count({ where });
      beforeTrack = { count: countBefore, lastBillingBeforeTracking: lastBefore };
    }

    return {
      customer: { ...customer, displayName: safeName(customer) },
      billing,
      tracked: tracking,
      beforeTrack,
    };
  }
}

