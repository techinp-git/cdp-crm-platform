// Seed sample Leads for /crm/leads
import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding sample leads...');
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });

  for (const t of tenants) {
    const cnt = await prisma.lead.count({ where: { tenantId: t.id } });
    if (cnt > 0) {
      console.log(`↩️  ${t.slug}: skip (already has ${cnt} leads)`);
      continue;
    }

    const leads = [
      {
        firstName: 'Somchai',
        lastName: 'Jaidee',
        email: 'somchai@example.com',
        phone: '0800000001',
        company: 'ACME',
        source: 'WEBSITE_NEWSLETTER',
        status: 'NEW',
      },
      {
        firstName: 'Suda',
        lastName: 'Dee',
        email: 'suda@example.com',
        phone: '0800000002',
        company: 'Techstore',
        source: 'FACEBOOK_LEAD_GEN',
        status: 'CONTACTED',
      },
      {
        firstName: 'Anan',
        lastName: 'K.',
        email: 'anan@example.com',
        phone: '0800000003',
        company: 'Global',
        source: 'IMPORT_FILE',
        status: 'QUALIFIED',
      },
      {
        firstName: 'Nok',
        lastName: 'P.',
        email: 'nok@example.com',
        phone: '0800000004',
        company: 'Example Co',
        source: 'SYNC_API',
        status: 'NEW',
      },
    ];

    for (const l of leads) {
      await prisma.lead.create({ data: { tenantId: t.id, ...l } });
    }
    console.log(`✅ ${t.slug}: seeded ${leads.length} leads`);
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

