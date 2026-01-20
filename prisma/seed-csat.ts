// Seed sample CSAT responses per project
import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

const projects = ['Website', 'Mobile App', 'Checkout', 'Support', 'Onboarding'];
const channels = ['Email', 'Web', 'LINE', 'Phone'];
const categories = ['Product', 'Support', 'UX', 'Delivery', 'Pricing'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

async function main() {
  console.log('🌱 Seeding CSAT sample data...');
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });

  for (const t of tenants) {
    const customers = await prisma.customer.findMany({
      where: { tenantId: t.id },
      take: 15,
      orderBy: { createdAt: 'desc' },
      select: { id: true, profile: true, identifiers: true },
    });

    let created = 0;
    for (const c of customers) {
      const name = (c.profile as any)?.name || (c.profile as any)?.companyName || `Customer_${c.id.slice(-4)}`;
      const email = (c.identifiers as any)?.email || `customer_${c.id.slice(-4)}@example.com`;
      const phone = (c.identifiers as any)?.phone || null;

      const responses = 1 + Math.floor(Math.random() * 3); // 1-3 responses
      for (let i = 0; i < responses; i++) {
        const project = pick(projects);
        const score = 1 + Math.floor(Math.random() * 5);
        const submittedAt = new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000);
        await prisma.csat.create({
          data: {
            tenantId: t.id,
            externalId: uid('csat'),
            project,
            score,
            comment: score >= 4 ? 'Great experience' : score === 3 ? 'Okay' : 'Needs improvement',
            customerName: name,
            customerEmail: email,
            customerPhone: phone,
            submittedAt,
            metadata: {
              source: 'SEED',
              channel: pick(channels),
              feedbackCategory: pick(categories),
            },
          },
        });
        created++;
      }
    }
    console.log(`✅ ${t.slug}: created ${created} csat responses`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

