// Seed sample Import Logs (AuditLog entity=import_job) for demo
import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log('🌱 Seeding import logs...');
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });

  for (const t of tenants) {
    const existing = await prisma.auditLog.count({ where: { tenantId: t.id, entity: 'import_job' } });
    if (existing > 0) {
      console.log(`↩️  ${t.slug}: skip (already has ${existing} import logs)`);
      continue;
    }

    await prisma.auditLog.createMany({
      data: [
        {
          tenantId: t.id,
          action: 'IMPORT',
          entity: 'import_job',
          entityId: 'quotation',
          createdAt: daysAgo(2),
          payload: {
            module: 'quotation',
            endpoint: '/quotations/import',
            fileName: 'quotation-sample.csv',
            fileSize: 10240,
            durationMs: 842,
            result: { success: 12, failed: 0, errors: [] },
          },
        },
        {
          tenantId: t.id,
          action: 'IMPORT',
          entity: 'import_job',
          entityId: 'billing',
          createdAt: daysAgo(1),
          payload: {
            module: 'billing',
            endpoint: '/billings/import',
            fileName: 'billing-sample.csv',
            fileSize: 20480,
            durationMs: 1092,
            result: { success: 8, failed: 2, errors: ['Row 5: invalid date', 'Row 9: missing amount'] },
          },
        },
        {
          tenantId: t.id,
          action: 'IMPORT',
          entity: 'import_job',
          entityId: 'csat-data',
          createdAt: daysAgo(0),
          payload: {
            module: 'csat',
            endpoint: '/csat-data/import',
            fileName: 'csat-sample.csv',
            fileSize: 5120,
            durationMs: 420,
            errorMessage: 'CSV parse error: missing required fields',
          },
        },
      ],
      skipDuplicates: false,
    });

    console.log(`✅ ${t.slug}: created 3 import logs`);
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

