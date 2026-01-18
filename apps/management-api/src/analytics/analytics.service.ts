import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async getDashboardKPIs(tenantId: string) {
    const [customersCount, dealsCount, leadsCount, activitiesCount, accountsCount, contactsCount] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.deal.count({ where: { tenantId, status: 'OPEN' } }),
      this.prisma.lead.count({ where: { tenantId, status: { not: 'CONVERTED' } } }),
      this.prisma.activityTask.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.account.count({ where: { tenantId } }),
      this.prisma.contact.count({ where: { tenantId } }),
    ]);

    const totalDealValue = await this.prisma.deal.aggregate({
      where: { tenantId, status: 'OPEN' },
      _sum: { amount: true },
    });

    const wonDealsValue = await this.prisma.deal.aggregate({
      where: { tenantId, status: 'WON' },
      _sum: { amount: true },
    });

    return {
      customers: customersCount,
      openDeals: dealsCount,
      activeLeads: leadsCount,
      pendingActivities: activitiesCount,
      accounts: accountsCount,
      contacts: contactsCount,
      totalDealValue: totalDealValue._sum.amount || 0,
      wonDealsValue: wonDealsValue._sum.amount || 0,
    };
  }

  async getDealPipeline(tenantId: string) {
    const stages = await this.prisma.dealStage.findMany({
      where: { tenantId },
      orderBy: { order: 'asc' },
      include: {
        deals: {
          where: { status: 'OPEN' },
          include: {
            customer: true,
          },
        },
      },
    });

    return stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      order: stage.order,
      probability: stage.probability,
      deals: stage.deals,
      totalValue: stage.deals.reduce((sum, deal) => sum + (Number(deal.amount) || 0), 0),
    }));
  }

  async getCustomerGrowth(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const growth = customers.reduce((acc, customer) => {
      const date = customer.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(growth).map(([date, count]) => ({ date, count }));
  }
}
