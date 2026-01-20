// Seed multiple channel accounts for Settings > Channel Setup demo
import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding channel accounts...');
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  for (const t of tenants) {
    const count = await (prisma as any).chatChannelAccount.count({ where: { tenantId: t.id } });
    if (count > 0) {
      console.log(`↩️  ${t.slug}: skip (already has ${count} accounts)`);
      continue;
    }

    const data = [
      {
        tenantId: t.id,
        channel: 'LINE',
        name: 'LINE Main',
        status: 'ACTIVE',
        metadata: {
          channelId: '1657xxxxxxx',
          channelSecret: 'line_secret_sample',
          channelAccessToken: 'line_access_token_sample',
        },
      },
      {
        tenantId: t.id,
        channel: 'LINE',
        name: 'LINE Support',
        status: 'DISABLED',
        metadata: {
          channelId: '1658xxxxxxx',
          channelSecret: 'line_secret_sample_2',
          channelAccessToken: 'line_access_token_sample_2',
        },
      },
      {
        tenantId: t.id,
        channel: 'FACEBOOK',
        name: 'FB Page 1',
        status: 'ACTIVE',
        metadata: {
          pageId: '1234567890',
          pageName: 'Demo Page',
          accessToken: 'fb_access_token_sample',
        },
      },
    ];

    await (prisma as any).chatChannelAccount.createMany({ data, skipDuplicates: true });
    console.log(`✅ ${t.slug}: created ${data.length} channel accounts`);
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

