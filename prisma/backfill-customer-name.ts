// Use the workspace-generated Prisma Client (see schema.prisma `output`)
import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

function deriveCompanyName(input: { id: string; profile: any; identifiers: any }): string {
  const profile = input.profile || {};
  const identifiers = input.identifiers || {};
  return (
    profile.companyName ||
    profile.company ||
    identifiers.company ||
    profile.name ||
    identifiers.name ||
    identifiers.email ||
    identifiers.phone ||
    `Company ${input.id.slice(0, 8)}`
  );
}

function deriveIndividualName(input: { id: string; profile: any; identifiers: any }): string {
  const profile = input.profile || {};
  const identifiers = input.identifiers || {};
  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
  return fullName || profile.name || identifiers.name || identifiers.email || identifiers.phone || `Customer ${input.id.slice(0, 8)}`;
}

async function main() {
  const batchSize = 200;
  let cursor: string | undefined;
  let updated = 0;
  let scanned = 0;

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
      const isCompany =
        row.type === 'COMPANY' || !!profile.companyName || !!profile.company || !!identifiers.company;

      if (isCompany) {
        const companyName = deriveCompanyName({ id: row.id, profile, identifiers });
        const nextProfile = {
          ...profile,
          companyName: profile.companyName || profile.company || companyName,
          name: profile.name || companyName,
        };

        const changed = nextProfile.companyName !== profile.companyName || nextProfile.name !== profile.name;
        if (changed) {
          await prisma.customer.update({
            where: { id: row.id },
            data: { profile: nextProfile },
          });
          updated++;
        }
      } else {
        const name = deriveIndividualName({ id: row.id, profile, identifiers });
        const nextProfile = { ...profile, name: profile.name || name };
        const changed = nextProfile.name !== profile.name;
        if (changed) {
          await prisma.customer.update({
            where: { id: row.id },
            data: { profile: nextProfile },
          });
          updated++;
        }
      }
    }

    cursor = rows[rows.length - 1].id;
  }

  const remaining = await prisma.$queryRawUnsafe<
    Array<{ missing: bigint }>
  >(`SELECT COUNT(*)::bigint AS missing
     FROM customers
     WHERE (profile->>'name') IS NULL OR TRIM(profile->>'name') = ''`);

  console.log(`Backfill complete. Scanned=${scanned}, Updated=${updated}, RemainingMissingName=${remaining?.[0]?.missing ?? 'unknown'}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

