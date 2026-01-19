const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding line-content permissions...');

  // Check if line-content permissions exist
  const existingPerms = await prisma.permission.findMany({
    where: { resource: 'line-content' },
  });

  if (existingPerms.length === 0) {
    console.log('Creating line-content permissions...');
    await prisma.permission.createMany({
      data: [
        { resource: 'line-content', action: 'read' },
        { resource: 'line-content', action: 'write' },
        { resource: 'line-content', action: 'delete' },
      ],
      skipDuplicates: true,
    });
    console.log('✅ Line-content permissions created!');
  } else {
    console.log('✅ Line-content permissions already exist:', existingPerms.length);
  }

  // Get all admin roles
  const adminRoles = await prisma.role.findMany({
    where: { slug: 'admin' },
  });

  console.log(`Found ${adminRoles.length} admin roles`);

  // Get all permissions (including line-content permissions)
  const allPerms = await prisma.permission.findMany();
  const lineContentPerms = allPerms.filter((p) => p.resource === 'line-content');

  console.log(`Found ${lineContentPerms.length} line-content permissions`);

  // Assign line-content permissions to all admin roles
  for (const role of adminRoles) {
    for (const perm of lineContentPerms) {
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

  console.log('✅ Line-content permissions assigned to admin roles!');
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

