// Backfill product categories for demo
import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

const categories = ['Electronics', 'Accessories', 'Software', 'Service', 'Subscription'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🌱 Backfilling product categories...');
  const products = await prisma.product.findMany({
    select: { id: true, tenantId: true, sku: true, category: true },
    take: 5000,
  });

  let updated = 0;
  for (const p of products) {
    if (p.category && String(p.category).trim()) continue;
    await prisma.product.update({
      where: { id: p.id },
      data: { category: pick(categories) },
    });
    updated++;
  }

  console.log(`✅ Done. Updated categories: ${updated} / ${products.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

