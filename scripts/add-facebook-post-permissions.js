const { PrismaClient } = require('../node_modules/.prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding facebook-post permissions...');

  const existingPerms = await prisma.permission.findMany({
    where: { resource: 'facebook-post' },
  });

  if (existingPerms.length === 0) {
    console.log('Creating facebook-post permissions...');
    await prisma.permission.createMany({
      data: [
        { resource: 'facebook-post', action: 'read' },
        { resource: 'facebook-post', action: 'write' },
        { resource: 'facebook-post', action: 'publish' },
        { resource: 'facebook-post', action: 'delete' },
      ],
      skipDuplicates: true,
    });
    console.log('✅ Facebook-post permissions created!');
  } else {
    console.log('✅ Facebook-post permissions already exist:', existingPerms.length);
  }

  const adminRoles = await prisma.role.findMany({
    where: { slug: 'admin' },
  });
  console.log(`Found ${adminRoles.length} admin roles`);

  const allPerms = await prisma.permission.findMany();
  const perms = allPerms.filter((p) => p.resource === 'facebook-post');
  console.log(`Found ${perms.length} facebook-post permissions`);

  for (const role of adminRoles) {
    for (const perm of perms) {
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

  console.log('✅ Facebook-post permissions assigned to admin roles!');
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

