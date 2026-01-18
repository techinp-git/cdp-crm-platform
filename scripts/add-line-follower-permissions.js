const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding line-follower permissions...');
  
  // Check if line-follower permissions exist
  const existingPerms = await prisma.permission.findMany({
    where: { resource: 'line-follower' }
  });
  
  if (existingPerms.length === 0) {
    console.log('Creating line-follower permissions...');
    await prisma.permission.createMany({
      data: [
        { resource: 'line-follower', action: 'read' },
        { resource: 'line-follower', action: 'write' },
        { resource: 'line-follower', action: 'delete' },
      ],
      skipDuplicates: true
    });
    console.log('✅ Line-follower permissions created!');
  } else {
    console.log('✅ Line-follower permissions already exist:', existingPerms.length);
  }
  
  // Get all admin roles
  const adminRoles = await prisma.role.findMany({
    where: { slug: 'admin' }
  });
  
  console.log(`Found ${adminRoles.length} admin roles`);
  
  // Get all permissions (including line-follower permissions)
  const allPerms = await prisma.permission.findMany();
  const lineFollowerPerms = allPerms.filter(p => p.resource === 'line-follower');
  
  console.log(`Found ${lineFollowerPerms.length} line-follower permissions`);
  
  // Assign line-follower permissions to all admin roles
  for (const role of adminRoles) {
    for (const perm of lineFollowerPerms) {
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
  
  console.log('✅ Line-follower permissions assigned to admin roles!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
