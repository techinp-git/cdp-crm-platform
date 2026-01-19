const { PrismaClient } = require('../node_modules/.prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding sms-content permissions...');

  const existingPerms = await prisma.permission.findMany({
    where: { resource: 'sms-content' },
  });

  if (existingPerms.length === 0) {
    console.log('Creating sms-content permissions...');
    await prisma.permission.createMany({
      data: [
        { resource: 'sms-content', action: 'read' },
        { resource: 'sms-content', action: 'write' },
        { resource: 'sms-content', action: 'delete' },
      ],
      skipDuplicates: true,
    });
    console.log('✅ SMS-content permissions created!');
  } else {
    console.log('✅ SMS-content permissions already exist:', existingPerms.length);
  }

  const adminRoles = await prisma.role.findMany({
    where: { slug: 'admin' },
  });
  console.log(`Found ${adminRoles.length} admin roles`);

  const allPerms = await prisma.permission.findMany();
  const smsPerms = allPerms.filter((p) => p.resource === 'sms-content');
  console.log(`Found ${smsPerms.length} sms-content permissions`);

  for (const role of adminRoles) {
    for (const perm of smsPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  }

  console.log('✅ SMS-content permissions assigned to admin roles!');
  console.log('Next: re-login to refresh JWT permissions.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

