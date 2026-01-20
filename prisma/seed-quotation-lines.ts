// Backfill sample quotation lines + products for demo
import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

type ProductSeed = { sku: string; name: string; price: number };

const productCatalog: ProductSeed[] = [
  { sku: 'SKU-001', name: 'Product A', price: 12000 },
  { sku: 'SKU-002', name: 'Product B', price: 26000 },
  { sku: 'SKU-003', name: 'Product C', price: 8900 },
  { sku: 'SVC-001', name: 'Service Package', price: 75000 },
  { sku: 'SVC-002', name: 'Implementation', price: 45000 },
];

const categories = ['Electronics', 'Accessories', 'Software', 'Service', 'Subscription', 'Uncategorized'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🌱 Backfilling sample quotation lines...');

  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  let updated = 0;
  let skipped = 0;

  for (const t of tenants) {
    const quotations = await prisma.quotation.findMany({
      where: { tenantId: t.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, quotationNumber: true, currency: true, amount: true },
    });

    for (const q of quotations) {
      const existingCount = await prisma.quotationLine.count({ where: { tenantId: t.id, quotationId: q.id } });
      if (existingCount > 0) {
        skipped++;
        continue;
      }

      const currency = q.currency || 'THB';
      const linesCount = 2 + Math.floor(Math.random() * 3); // 2-4 lines
      let subtotal = 0;

      const lines: Array<{
        tenantId: string;
        quotationId: string;
        lineNo: number;
        productId: string | null;
        productSku: string | null;
        productName: string | null;
        quantity: number;
        unitPrice: number;
        currency: string;
        lineAmount: number;
        metadata: any;
      }> = [];

      for (let i = 1; i <= linesCount; i++) {
        const p = pick(productCatalog);
        const qty = 1 + Math.floor(Math.random() * 3);
        const unitPrice = p.price;
        const lineAmount = qty * unitPrice;
        subtotal += lineAmount;

        const product = await prisma.product.upsert({
          where: { tenantId_sku: { tenantId: t.id, sku: p.sku } },
          update: { name: p.name, currency, price: unitPrice, category: pick(categories) },
          create: { tenantId: t.id, sku: p.sku, name: p.name, currency, price: unitPrice, category: pick(categories) },
          select: { id: true },
        });

        lines.push({
          tenantId: t.id,
          quotationId: q.id,
          lineNo: i,
          productId: product.id,
          productSku: p.sku,
          productName: p.name,
          quantity: qty,
          unitPrice,
          currency,
          lineAmount,
          metadata: { seed: true },
        });
      }

      await prisma.quotationLine.createMany({ data: lines, skipDuplicates: false });

      const footer = {
        subtotal,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: subtotal,
        note: 'Sample footer (seed)',
      };

      await prisma.quotation.update({
        where: { id: q.id },
        data: {
          amount: subtotal,
          metadata: { footer },
        },
      });

      updated++;
      console.log(`✅ ${t.slug}: ${q.quotationNumber} -> ${linesCount} lines`);
    }
  }

  console.log(`✅ Done. Updated: ${updated}, skipped (already had lines): ${skipped}`);
}

main()
  .catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

