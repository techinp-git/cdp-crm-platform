// Use the workspace-generated Prisma Client (see schema.prisma `output`)
import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

// Thai company names
const thaiCompanyNames = [
  'บริษัท เทคโนโลยีไทย จำกัด',
  'บริษัท ระบบดิจิทัล จำกัด (มหาชน)',
  'บริษัท โซลูชั่นส์ จำกัด',
  'บริษัท นวัตกรรมไทย จำกัด',
  'บริษัท ระบบอัจฉริยะ จำกัด',
  'บริษัท คลาวด์ไทย จำกัด',
  'บริษัท ซอฟต์แวร์ไทย จำกัด',
  'บริษัท ดีไซน์ครีเอทีฟ จำกัด',
  'บริษัท การตลาดดิจิทัล จำกัด',
  'บริษัท คอนซัลติ้ง จำกัด',
];

// Thai first names
const thaiFirstNames = [
  'สมชาย',
  'สมหญิง',
  'ประยุทธ์',
  'สุรชัย',
  'นพดล',
  'กมลชนก',
  'ปิยะ',
  'อภิชัย',
  'วราภรณ์',
  'ธนพล',
  'ศิริพร',
  'วิมล',
  'ชาญชัย',
  'รัตนา',
  'อรรถพล',
];

// Thai last names
const thaiLastNames = [
  'วัฒนา',
  'ศรีสุข',
  'ทองดี',
  'ใจดี',
  'สุขสันต์',
  'รุ่งเรือง',
  'เจริญ',
  'ประเสริฐ',
  'สมบูรณ์',
  'วัฒนะ',
  'ศรีประเสริฐ',
  'ทองคำ',
  'สุขใจ',
  'รุ่งโรจน์',
  'เจริญสุข',
];

function getRandomThaiCompanyName(index: number): string {
  return thaiCompanyNames[index % thaiCompanyNames.length];
}

function getRandomThaiName(index: number): { firstName: string; lastName: string } {
  const firstName = thaiFirstNames[index % thaiFirstNames.length];
  const lastName = thaiLastNames[(index * 2) % thaiLastNames.length];
  return { firstName, lastName };
}

async function main() {
  console.log('🌱 Updating customer names to Thai...');

  const batchSize = 200;
  let cursor: string | undefined;
  let updated = 0;
  let scanned = 0;
  let index = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await prisma.customer.findMany({
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        tenantId: true,
        type: true,
        profile: true,
        identifiers: true,
      },
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      scanned++;
      const profile = (row.profile as any) || {};
      const identifiers = (row.identifiers as any) || {};
      const isCompany = row.type === 'COMPANY' || row.type === 'company';

      if (isCompany) {
        // Update company name to Thai
        const thaiCompanyName = getRandomThaiCompanyName(index);
        const nextProfile = {
          ...profile,
          companyName: thaiCompanyName,
          name: thaiCompanyName,
        };
        const nextIdentifiers = {
          ...identifiers,
          company: thaiCompanyName,
        };

        await prisma.customer.update({
          where: { id: row.id },
          data: {
            profile: nextProfile,
            identifiers: nextIdentifiers,
          },
        });
        updated++;
      } else {
        // Update individual name to Thai
        const { firstName, lastName } = getRandomThaiName(index);
        const fullName = `${firstName} ${lastName}`;
        const nextProfile = {
          ...profile,
          firstName,
          lastName,
          name: fullName,
        };

        await prisma.customer.update({
          where: { id: row.id },
          data: {
            profile: nextProfile,
          },
        });
        updated++;
      }

      index++;
    }

    cursor = rows[rows.length - 1].id;
  }

  console.log(`✅ Update complete. Scanned=${scanned}, Updated=${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
