const { PrismaClient } = require('../node_modules/.prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding email-content permissions...');

  const existingPerms = await prisma.permission.findMany({
    where: { resource: 'email-content' },
  });

  if (existingPerms.length === 0) {
    console.log('Creating email-content permissions...');
    await prisma.permission.createMany({
      data: [
        { resource: 'email-content', action: 'read' },
        { resource: 'email-content', action: 'write' },
        { resource: 'email-content', action: 'delete' },
      ],
      skipDuplicates: true,
    });
    console.log('✅ Email-content permissions created!');
  } else {
    console.log('✅ Email-content permissions already exist:', existingPerms.length);
  }

  const adminRoles = await prisma.role.findMany({
    where: { slug: 'admin' },
  });

  console.log(`Found ${adminRoles.length} admin roles`);

  const allPerms = await prisma.permission.findMany();
  const emailPerms = allPerms.filter((p) => p.resource === 'email-content');

  console.log(`Found ${emailPerms.length} email-content permissions`);

  for (const role of adminRoles) {
    for (const perm of emailPerms) {
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

  console.log('✅ Email-content permissions assigned to admin roles!');
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

