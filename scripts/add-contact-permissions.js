const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding contact permissions...');
  
  // Check if contact permissions exist
  const existingPerms = await prisma.permission.findMany({
    where: { resource: 'contact' }
  });
  
  if (existingPerms.length === 0) {
    console.log('Creating contact permissions...');
    await prisma.permission.createMany({
      data: [
        { resource: 'contact', action: 'read' },
        { resource: 'contact', action: 'write' },
        { resource: 'contact', action: 'delete' },
      ],
      skipDuplicates: true
    });
    console.log('✅ Contact permissions created!');
  } else {
    console.log('✅ Contact permissions already exist:', existingPerms.length);
  }
  
  // Get all admin roles
  const adminRoles = await prisma.role.findMany({
    where: { slug: 'admin' }
  });
  
  console.log(`Found ${adminRoles.length} admin roles`);
  
  // Get all permissions (including newly created contact permissions)
  const allPerms = await prisma.permission.findMany();
  const contactPerms = allPerms.filter(p => p.resource === 'contact');
  
  console.log(`Found ${contactPerms.length} contact permissions`);
  
  // Assign contact permissions to all admin roles
  for (const role of adminRoles) {
    for (const perm of contactPerms) {
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
  
  console.log('✅ Contact permissions assigned to admin roles!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
