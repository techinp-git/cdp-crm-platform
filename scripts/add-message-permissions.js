const { PrismaClient } = require('../node_modules/.prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding message permissions...');

  const existingPerms = await prisma.permission.findMany({
    where: { resource: 'message' },
  });

  if (existingPerms.length === 0) {
    console.log('Creating message permissions...');
    await prisma.permission.createMany({
      data: [
        { resource: 'message', action: 'read' },
        { resource: 'message', action: 'send' },
      ],
      skipDuplicates: true,
    });
    console.log('✅ Message permissions created!');
  } else {
    console.log('✅ Message permissions already exist:', existingPerms.length);
  }

  const adminRoles = await prisma.role.findMany({
    where: { slug: 'admin' },
  });
  console.log(`Found ${adminRoles.length} admin roles`);

  const allPerms = await prisma.permission.findMany();
  const messagePerms = allPerms.filter((p) => p.resource === 'message');
  console.log(`Found ${messagePerms.length} message permissions`);

  for (const role of adminRoles) {
    for (const perm of messagePerms) {
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

  console.log('✅ Message permissions assigned to admin roles!');
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

