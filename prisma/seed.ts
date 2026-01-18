import { PrismaClient, TenantType, TenantStatus, UserStatus, DealStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Super Admin User
  const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@ydm-platform.com' },
    update: {},
    create: {
      email: 'admin@ydm-platform.com',
      passwordHash: superAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      isSuperAdmin: true,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✅ Created super admin:', superAdmin.email);

  // Create Sample Tenants (3 tenants)
  const tenants = [];

  // Tenant 1: Acme Corporation (B2B)
  const tenant1 = await prisma.tenant.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      type: TenantType.B2B,
      status: TenantStatus.ACTIVE,
      plan: 'professional',
      quota: {
        customers: 10000,
        deals: 500,
        users: 50,
        storage: 100, // GB
      },
    },
  });
  tenants.push(tenant1);
  console.log('✅ Created tenant 1:', tenant1.name);

  // Tenant 2: TechStore (B2C)
  const tenant2 = await prisma.tenant.upsert({
    where: { slug: 'techstore' },
    update: {},
    create: {
      name: 'TechStore',
      slug: 'techstore',
      type: TenantType.B2C,
      status: TenantStatus.ACTIVE,
      plan: 'starter',
      quota: {
        customers: 5000,
        deals: 200,
        users: 20,
        storage: 50, // GB
      },
    },
  });
  tenants.push(tenant2);
  console.log('✅ Created tenant 2:', tenant2.name);

  // Tenant 3: Global Solutions (HYBRID)
  const tenant3 = await prisma.tenant.upsert({
    where: { slug: 'global-solutions' },
    update: {},
    create: {
      name: 'Global Solutions',
      slug: 'global-solutions',
      type: TenantType.HYBRID,
      status: TenantStatus.ACTIVE,
      plan: 'enterprise',
      quota: {
        customers: 50000,
        deals: 2000,
        users: 200,
        storage: 500, // GB
      },
    },
  });
  tenants.push(tenant3);
  console.log('✅ Created tenant 3:', tenant3.name);

  // Create Users for each tenant
  const tenantAdminPassword = await bcrypt.hash('Admin123!', 10);
  const tenantUserPassword = await bcrypt.hash('User123!', 10);

  // Tenant 1 Users
  const tenant1Admin = await prisma.user.upsert({
    where: { email: 'admin@acme-corp.com' },
    update: {},
    create: {
      email: 'admin@acme-corp.com',
      passwordHash: tenantAdminPassword,
      firstName: 'John',
      lastName: 'Doe',
      status: UserStatus.ACTIVE,
      isSuperAdmin: false,
    },
  });

  const tenant1AdminMembership = await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant1.id,
        userId: tenant1Admin.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant1.id,
      userId: tenant1Admin.id,
      status: UserStatus.ACTIVE,
    },
  });

  const tenant1User = await prisma.user.upsert({
    where: { email: 'user1@acme-corp.com' },
    update: {},
    create: {
      email: 'user1@acme-corp.com',
      passwordHash: tenantUserPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      status: UserStatus.ACTIVE,
      isSuperAdmin: false,
    },
  });

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant1.id,
        userId: tenant1User.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant1.id,
      userId: tenant1User.id,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✅ Created users for tenant 1');

  // Tenant 2 Users
  const tenant2Admin = await prisma.user.upsert({
    where: { email: 'admin@techstore.com' },
    update: {},
    create: {
      email: 'admin@techstore.com',
      passwordHash: tenantAdminPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      status: UserStatus.ACTIVE,
      isSuperAdmin: false,
    },
  });

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant2.id,
        userId: tenant2Admin.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant2.id,
      userId: tenant2Admin.id,
      status: UserStatus.ACTIVE,
    },
  });

  const tenant2User = await prisma.user.upsert({
    where: { email: 'user1@techstore.com' },
    update: {},
    create: {
      email: 'user1@techstore.com',
      passwordHash: tenantUserPassword,
      firstName: 'Mike',
      lastName: 'Williams',
      status: UserStatus.ACTIVE,
      isSuperAdmin: false,
    },
  });

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant2.id,
        userId: tenant2User.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant2.id,
      userId: tenant2User.id,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✅ Created users for tenant 2');

  // Tenant 3 Users
  const tenant3Admin = await prisma.user.upsert({
    where: { email: 'admin@global-solutions.com' },
    update: {},
    create: {
      email: 'admin@global-solutions.com',
      passwordHash: tenantAdminPassword,
      firstName: 'Robert',
      lastName: 'Brown',
      status: UserStatus.ACTIVE,
      isSuperAdmin: false,
    },
  });

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant3.id,
        userId: tenant3Admin.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant3.id,
      userId: tenant3Admin.id,
      status: UserStatus.ACTIVE,
    },
  });

  const tenant3User = await prisma.user.upsert({
    where: { email: 'user1@global-solutions.com' },
    update: {},
    create: {
      email: 'user1@global-solutions.com',
      passwordHash: tenantUserPassword,
      firstName: 'Emily',
      lastName: 'Davis',
      status: UserStatus.ACTIVE,
      isSuperAdmin: false,
    },
  });

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant3.id,
        userId: tenant3User.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant3.id,
      userId: tenant3User.id,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✅ Created users for tenant 3');

  // Create Multi-Tenant Test User (member of multiple tenants)
  const multiTenantTestPassword = await bcrypt.hash('Test123!', 10);
  const multiTenantUser = await prisma.user.upsert({
    where: { email: 'test-multi-tenant@example.com' },
    update: {},
    create: {
      email: 'test-multi-tenant@example.com',
      passwordHash: multiTenantTestPassword,
      firstName: 'Multi',
      lastName: 'Tenant User',
      status: UserStatus.ACTIVE,
      isSuperAdmin: false,
    },
  });

  // Add user to Tenant 1 (Acme Corporation)
  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant1.id,
        userId: multiTenantUser.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant1.id,
      userId: multiTenantUser.id,
      status: UserStatus.ACTIVE,
    },
  });

  // Add user to Tenant 2 (TechStore)
  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant2.id,
        userId: multiTenantUser.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant2.id,
      userId: multiTenantUser.id,
      status: UserStatus.ACTIVE,
    },
  });

  // Assign admin role in both tenants
  const tenant1AdminRole = await prisma.role.findFirst({
    where: { tenantId: tenant1.id, slug: 'admin' },
  });
  const tenant2AdminRole = await prisma.role.findFirst({
    where: { tenantId: tenant2.id, slug: 'admin' },
  });

  if (tenant1AdminRole) {
    const tenant1Membership = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId: tenant1.id,
          userId: multiTenantUser.id,
        },
      },
    });
    if (tenant1Membership) {
      await prisma.tenantUserRole.upsert({
        where: {
          tenantUserId_roleId: {
            tenantUserId: tenant1Membership.id,
            roleId: tenant1AdminRole.id,
          },
        },
        update: {},
        create: {
          tenantUserId: tenant1Membership.id,
          roleId: tenant1AdminRole.id,
        },
      });
    }
  }

  if (tenant2AdminRole) {
    const tenant2Membership = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId: tenant2.id,
          userId: multiTenantUser.id,
        },
      },
    });
    if (tenant2Membership) {
      await prisma.tenantUserRole.upsert({
        where: {
          tenantUserId_roleId: {
            tenantUserId: tenant2Membership.id,
            roleId: tenant2AdminRole.id,
          },
        },
        update: {},
        create: {
          tenantUserId: tenant2Membership.id,
          roleId: tenant2AdminRole.id,
        },
      });
    }
  }

  console.log('✅ Created multi-tenant test user:', multiTenantUser.email);
  console.log('   - Member of: Acme Corporation (B2B), TechStore (B2C)');

  // Use first tenant for the rest of the seeding (backward compatibility)
  const tenant = tenant1;

  // Create Default Roles for all tenants
  for (const t of tenants) {
    const adminRole = await prisma.role.upsert({
      where: {
        tenantId_slug: {
          tenantId: t.id,
          slug: 'admin',
        },
      },
      update: {},
      create: {
        tenantId: t.id,
      name: 'Administrator',
      slug: 'admin',
      description: 'Full access to all features',
      isSystem: true,
    },
  });

  const userRole = await prisma.role.upsert({
    where: {
      tenantId_slug: {
          tenantId: t.id,
        slug: 'user',
      },
    },
    update: {},
    create: {
        tenantId: t.id,
      name: 'User',
      slug: 'user',
      description: 'Standard user access',
      isSystem: true,
    },
  });

    // Get admin users for this tenant and assign admin role
    const tenantAdminMemberships = await prisma.tenantUser.findMany({
      where: { tenantId: t.id },
      take: 1, // Get first admin user
    });

    if (tenantAdminMemberships.length > 0) {
  await prisma.tenantUserRole.upsert({
    where: {
      tenantUserId_roleId: {
            tenantUserId: tenantAdminMemberships[0].id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
          tenantUserId: tenantAdminMemberships[0].id,
      roleId: adminRole.id,
    },
  });
    }
  }
  
  // Get roles for tenant1 (for backward compatibility)
  const adminRole = await prisma.role.findFirst({
    where: { tenantId: tenant1.id, slug: 'admin' },
  });
  console.log('✅ Created roles for all tenants and assigned admin roles');

  // Create Permissions
  const permissions = [
    { resource: 'customer', action: 'read' },
    { resource: 'customer', action: 'write' },
    { resource: 'customer', action: 'delete' },
    { resource: 'deal', action: 'read' },
    { resource: 'deal', action: 'write' },
    { resource: 'deal', action: 'delete' },
    { resource: 'lead', action: 'read' },
    { resource: 'lead', action: 'write' },
    { resource: 'segment', action: 'read' },
    { resource: 'segment', action: 'write' },
    { resource: 'quotation', action: 'read' },
    { resource: 'quotation', action: 'write' },
    { resource: 'quotation', action: 'delete' },
    { resource: 'billing', action: 'read' },
    { resource: 'billing', action: 'write' },
    { resource: 'billing', action: 'delete' },
    { resource: 'csat', action: 'read' },
    { resource: 'csat', action: 'write' },
    { resource: 'csat', action: 'delete' },
    { resource: 'line-event', action: 'read' },
    { resource: 'line-event', action: 'write' },
    { resource: 'line-event', action: 'delete' },
    { resource: 'line-follower', action: 'read' },
    { resource: 'line-follower', action: 'write' },
    { resource: 'line-follower', action: 'delete' },
    { resource: 'facebook-sync', action: 'read' },
    { resource: 'facebook-sync', action: 'write' },
    { resource: 'facebook-sync', action: 'delete' },
    { resource: 'analytics', action: 'read' },
    { resource: 'analytics', action: 'write' },
    { resource: 'activity', action: 'read' },
    { resource: 'activity', action: 'write' },
    { resource: 'activity', action: 'delete' },
    { resource: 'contact', action: 'read' },
    { resource: 'contact', action: 'write' },
    { resource: 'contact', action: 'delete' },
    { resource: 'account', action: 'read' },
    { resource: 'account', action: 'write' },
    { resource: 'account', action: 'delete' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: perm.resource,
          action: perm.action,
        },
      },
      update: {},
      create: perm,
    });
  }

  // Assign all permissions to admin role
  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }
  console.log('✅ Created permissions');

  // Create Feature Flags
  await prisma.featureFlag.createMany({
    data: [
      { tenantId: tenant.id, key: 'cdp_enabled', enabled: true },
      { tenantId: tenant.id, key: 'crm_enabled', enabled: true },
      { tenantId: tenant.id, key: 'marketing_automation', enabled: false },
      { tenantId: tenant.id, key: 'advanced_analytics', enabled: true },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Created feature flags');

  // Create Deal Stages
  const dealStages = [
    { name: 'Qualification', order: 1, probability: 10, isDefault: true },
    { name: 'Needs Analysis', order: 2, probability: 25 },
    { name: 'Proposal', order: 3, probability: 50 },
    { name: 'Negotiation', order: 4, probability: 75 },
    { name: 'Closed Won', order: 5, probability: 100, isWon: true },
    { name: 'Closed Lost', order: 6, probability: 0, isLost: true },
  ];

  await prisma.dealStage.createMany({
    data: dealStages.map((stage) => ({
        tenantId: tenant.id,
        ...stage,
    })),
    skipDuplicates: true,
    });
  console.log('✅ Created deal stages');

  // Create Sample Customers
  const customers = [];
  for (let i = 1; i <= 10; i++) {
    const customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        type: i % 3 === 0 ? 'COMPANY' : 'INDIVIDUAL',
        identifiers: {
          email: `customer${i}@example.com`,
          phone: `+1-555-000-${String(i).padStart(4, '0')}`,
          externalId: `EXT-${i}`,
        },
        profile: {
          firstName: `Customer${i}`,
          lastName: `Last${i}`,
          company: i % 3 === 0 ? `Company ${i}` : undefined,
        },
      },
    });
    customers.push(customer);
  }
  console.log('✅ Created 10 sample customers');

  // Create Sample Customer Events
  const eventTypes = ['page_view', 'purchase', 'email_opened', 'form_submit', 'download'];
  for (const customer of customers.slice(0, 5)) {
    for (let i = 0; i < 3; i++) {
      await prisma.customerEvent.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          type: eventTypes[i % eventTypes.length],
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          payload: {
            page: `/products/${i + 1}`,
            value: Math.random() * 100,
          },
        },
      });
    }
  }
  console.log('✅ Created sample customer events');

  // Create Tags
  const tagData = [
    { name: 'VIP', color: '#FFD700', description: 'VIP customers' },
    { name: 'High Value', color: '#2ECC71', description: 'High value customers' },
    { name: 'Churned', color: '#E74C3C', description: 'Churned customers' },
  ];

  const tags = [];
  for (const tag of tagData) {
    const created = await prisma.tag.upsert({
      where: {
        tenantId_name: {
        tenantId: tenant.id,
          name: tag.name,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...tag,
      },
    });
    tags.push(created);
  }

  // Assign tags to customers
  await prisma.customerTag.create({
    data: {
      tenantId: tenant.id,
      customerId: customers[0].id,
      tagId: tags[0].id,
    },
  });
  await prisma.customerTag.create({
    data: {
      tenantId: tenant.id,
      customerId: customers[1].id,
      tagId: tags[1].id,
    },
  });
  console.log('✅ Created tags and assigned to customers');

  // Create Segments
  await prisma.segment.create({
    data: {
      tenantId: tenant.id,
      name: 'Active Customers',
      description: 'Customers with activity in last 30 days',
      isDynamic: true,
      definition: {
        filters: [
          {
            field: 'lastEventDate',
            operator: 'gte',
            value: '30 days ago',
          },
        ],
      },
    },
  });
  console.log('✅ Created segments');

  // Create Sample Leads
  for (let i = 1; i <= 5; i++) {
    await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        firstName: `Lead${i}`,
        lastName: `Last${i}`,
        email: `lead${i}@example.com`,
        phone: `+1-555-100-${String(i).padStart(4, '0')}`,
        company: `Lead Company ${i}`,
        source: ['website', 'referral', 'cold_call'][i % 3],
        status: ['NEW', 'CONTACTED', 'QUALIFIED'][i % 3],
        score: Math.floor(Math.random() * 100),
      },
    });
  }
  console.log('✅ Created 5 sample leads');

  // Create Sample Deals
  const stages = await prisma.dealStage.findMany({ where: { tenantId: tenant.id } });
  for (let i = 0; i < 8; i++) {
    const stage = stages[i % stages.length];
    await prisma.deal.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[i % customers.length].id,
        title: `Deal ${i + 1}`,
        description: `Sample deal ${i + 1}`,
        amount: Math.floor(Math.random() * 100000) + 10000,
        currency: 'USD',
        stageId: stage.id,
        status: i === 7 ? DealStatus.WON : DealStatus.OPEN,
        expectedCloseDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log('✅ Created 8 sample deals');

  // Create Sample Activities
  const activityTypes = ['call', 'email', 'meeting', 'note', 'task'];
  const deals = await prisma.deal.findMany({ where: { tenantId: tenant.id }, take: 5 });
  for (let i = 0; i < 10; i++) {
    await prisma.activityTask.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[i % customers.length].id,
        dealId: i < deals.length ? deals[i].id : null,
        type: activityTypes[i % activityTypes.length],
        title: `${activityTypes[i % activityTypes.length].charAt(0).toUpperCase() + activityTypes[i % activityTypes.length].slice(1)} ${i + 1}`,
        description: `Sample ${activityTypes[i % activityTypes.length]}`,
        dueDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        priority: ['LOW', 'MEDIUM', 'HIGH'][i % 3],
        status: i < 5 ? 'COMPLETED' : 'PENDING',
        completedAt: i < 5 ? new Date() : null,
      },
    });
  }
  console.log('✅ Created 10 sample activities');

  // Create Sample Accounts
  const accounts = [];
  for (let i = 1; i <= 3; i++) {
    const account = await prisma.account.create({
      data: {
        tenantId: tenant.id,
        name: `Account ${i}`,
        type: 'CUSTOMER',
        industry: ['Technology', 'Finance', 'Healthcare'][i % 3],
        website: `https://account${i}.com`,
        email: `info@account${i}.com`,
        phone: `+1-555-200-${String(i).padStart(4, '0')}`,
      },
    });
    accounts.push(account);
  }
  console.log('✅ Created 3 sample accounts');

  // Create Sample Contacts
  const contacts = [];
  for (let i = 1; i <= 5; i++) {
    const contact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        customerId: i <= 3 ? customers[i - 1].id : null,
        firstName: `Contact${i}`,
        lastName: `Last${i}`,
        email: `contact${i}@example.com`,
        phone: `+1-555-300-${String(i).padStart(4, '0')}`,
        title: ['CEO', 'CTO', 'CFO', 'Manager', 'Director'][i % 5],
        department: ['Executive', 'Engineering', 'Finance', 'Sales', 'Marketing'][i % 5],
      },
    });
    contacts.push(contact);
  }

  // Link contacts to accounts
  for (let i = 0; i < contacts.length && i < accounts.length; i++) {
    await prisma.accountContact.create({
      data: {
        accountId: accounts[i % accounts.length].id,
        contactId: contacts[i].id,
        role: i === 0 ? 'PRIMARY' : 'DECISION_MAKER',
      },
    });
  }
  console.log('✅ Created 5 sample contacts and linked to accounts');

  // Create Sample Quotations
  const quotationStatuses = ['PENDING', 'ACCEPTED', 'APPROVED', 'REJECTED', 'CANCELLED'];
  const quotationCustomers = [
    { name: 'John Doe', email: 'john.doe@example.com', phone: '+66-123-456-7890' },
    { name: 'Jane Smith', email: 'jane.smith@example.com', phone: '+66-098-765-4321' },
    { name: 'Bob Johnson', email: 'bob.johnson@example.com', phone: '+66-111-222-3333' },
    { name: 'Alice Williams', email: 'alice.williams@example.com', phone: '+66-444-555-6666' },
    { name: 'Charlie Brown', email: 'charlie.brown@example.com', phone: '+66-777-888-9999' },
  ];

  const quotations = [];
  for (let i = 1; i <= 10; i++) {
    const customer = quotationCustomers[(i - 1) % quotationCustomers.length];
    const issueDate = new Date(Date.now() - (i - 1) * 7 * 24 * 60 * 60 * 1000); // Last 10 weeks
    const validUntil = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after issue

    const quotation = await prisma.quotation.create({
      data: {
        tenantId: tenant.id,
        quotationNumber: `QT-2024-${String(i).padStart(3, '0')}`,
        customerId: i <= 5 ? customers[(i - 1) % customers.length].id : null,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        amount: Math.floor(Math.random() * 50000) + 10000, // 10,000 - 60,000
        currency: 'THB',
        status: quotationStatuses[i % quotationStatuses.length],
        issueDate: issueDate,
        validUntil: validUntil,
        description: `Quotation for project/service ${i}. This is a sample quotation data for testing purposes.`,
      },
    });
    quotations.push(quotation);
  }
  console.log('✅ Created 10 sample quotations');

  // Create Sample Billings
  const billingStatuses = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];
  const billingCustomers = [
    { name: 'John Doe', email: 'john.doe@example.com', phone: '+66-123-456-7890' },
    { name: 'Jane Smith', email: 'jane.smith@example.com', phone: '+66-098-765-4321' },
    { name: 'Bob Johnson', email: 'bob.johnson@example.com', phone: '+66-111-222-3333' },
    { name: 'Alice Williams', email: 'alice.williams@example.com', phone: '+66-444-555-6666' },
    { name: 'Charlie Brown', email: 'charlie.brown@example.com', phone: '+66-777-888-9999' },
  ];

  const billings = [];
  for (let i = 1; i <= 10; i++) {
    const customer = billingCustomers[(i - 1) % billingCustomers.length];
    const issueDate = new Date(Date.now() - (i - 1) * 7 * 24 * 60 * 60 * 1000); // Last 10 weeks
    const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after issue
    const status = billingStatuses[i % billingStatuses.length];
    const paidDate = status === 'PAID' ? new Date(issueDate.getTime() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) : null;

    const billing = await prisma.billing.create({
      data: {
        tenantId: tenant.id,
        invoiceNumber: `INV-2024-${String(i).padStart(3, '0')}`,
        customerId: i <= 5 ? customers[(i - 1) % customers.length].id : null,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        amount: Math.floor(Math.random() * 50000) + 10000, // 10,000 - 60,000
        currency: 'THB',
        status: status,
        issueDate: issueDate,
        dueDate: dueDate,
        paidDate: paidDate,
        description: `Invoice for project/service ${i}. This is a sample billing data for testing purposes.`,
      },
    });
    billings.push(billing);
  }
  console.log('✅ Created 10 sample billings');

  // Create Sample LINE Events with Thai conversations
  const lineUserIds = [
    'U1234567890abcdef1234567890abcdef', // User 1
    'U234567890abcdef1234567890abcdef1', // User 2
    'U34567890abcdef1234567890abcdef12', // User 3
  ];

  const thaiConversations = [
    { type: 'follow', message: null },
    { type: 'message', message: 'สวัสดีครับ' },
    { type: 'message', message: 'สอบถามสินค้าครับ' },
    { type: 'message', message: 'ราคาเท่าไหร่ครับ' },
    { type: 'postback', data: 'action=view_products' },
    { type: 'message', message: 'มีโปรโมชั่นไหมครับ' },
    { type: 'message', message: 'ขอบคุณครับ' },
    { type: 'message', message: 'สั่งซื้อได้ยังไงครับ' },
    { type: 'postback', data: 'action=add_to_cart&product_id=123' },
    { type: 'message', message: 'ต้องการข้อมูลเพิ่มเติมครับ' },
    { type: 'message', message: 'มีส่งฟรีไหมครับ' },
    { type: 'message', message: 'ขอบคุณมากครับ' },
    { type: 'message', message: 'อยากดูสินค้าใหม่ครับ' },
    { type: 'message', message: 'มีส่วนลดไหมครับ' },
    { type: 'postback', data: 'action=checkout' },
    { type: 'message', message: 'สินค้าพร้อมส่งเมื่อไหร่ครับ' },
    { type: 'message', message: 'ชำระเงินยังไงครับ' },
    { type: 'message', message: 'มีบัตรเครดิตรับไหมครับ' },
    { type: 'message', message: 'ขอบคุณสำหรับคำแนะนำครับ' },
    { type: 'message', message: 'สั่งซื้อเรียบร้อยแล้วครับ' },
  ];

  for (let i = 0; i < 30; i++) { // Create 30 LINE events
    const userId = lineUserIds[i % lineUserIds.length];
    const conversationIndex = i % thaiConversations.length;
    const conv = thaiConversations[conversationIndex];
    const timestamp = new Date(Date.now() - (30 - i) * 60 * 60 * 1000); // Last 30 hours, 1 hour apart
    
    // Try to link with customer
    let customerId: string | null = null;
    if (customers.length > 0) {
      const customer = customers[i % customers.length];
      customerId = customer.id;
    }

    const eventData: any = {
      tenantId: tenant.id,
      eventType: conv.type,
      sourceType: 'user',
      sourceId: userId,
      userId: userId,
      timestamp: timestamp,
      mode: 'active',
      status: i < 25 ? 'PROCESSED' : 'RECEIVED',
      rawPayload: {
        type: conv.type,
        timestamp: Math.floor(timestamp.getTime()),
        source: {
          type: 'user',
          userId: userId,
        },
        ...(conv.type === 'message' ? {
          message: {
            id: `msg_${i}_${tenant.id.substring(0, 8)}`,
            type: 'text',
            text: conv.message,
          },
          replyToken: `reply_token_${i}_${tenant.id.substring(0, 8)}`,
        } : conv.type === 'postback' ? {
          postback: {
            data: conv.data,
            params: {},
          },
          replyToken: `reply_token_${i}_${tenant.id.substring(0, 8)}`,
        } : conv.type === 'follow' ? {
          replyToken: `reply_token_${i}_${tenant.id.substring(0, 8)}`,
        } : {}),
      },
    };

    if (conv.type === 'message' && conv.message) {
      eventData.messageType = 'text';
      eventData.messageText = conv.message;
      eventData.messageId = `msg_${i}_${tenant.id.substring(0, 8)}`;
      eventData.replyToken = `reply_token_${i}_${tenant.id.substring(0, 8)}`;
    }

    if (conv.type === 'postback') {
      eventData.postbackData = conv.data;
      eventData.postbackParams = {};
      eventData.replyToken = `reply_token_${i}_${tenant.id.substring(0, 8)}`;
    }

    if (conv.type === 'follow') {
      eventData.replyToken = `reply_token_${i}_${tenant.id.substring(0, 8)}`;
    }

    if (customerId) {
      eventData.customerId = customerId;
    }

    if (eventData.status === 'PROCESSED') {
      eventData.processedAt = new Date(timestamp.getTime() + 1000);
    }

    await prisma.lineEvent.create({
      data: eventData,
    });
  }
  console.log('✅ Created 30 sample LINE events with Thai conversations');

  // Create Sample LINE Followers (from follow events)
  const followerNames = [
    { displayName: 'สมชาย ใจดี', userId: 'U1234567890abcdef1234567890abcdef' },
    { displayName: 'สมหญิง รักงาน', userId: 'U234567890abcdef1234567890abcdef1' },
    { displayName: 'วิชัย มั่งคั่ง', userId: 'U34567890abcdef1234567890abcdef12' },
    { displayName: 'วิไล สวยงาม', userId: 'U4567890abcdef1234567890abcdef123' },
    { displayName: 'ประเสริฐ ดีเลิศ', userId: 'U567890abcdef1234567890abcdef1234' },
    { displayName: 'กัลยา ใจดี', userId: 'U67890abcdef1234567890abcdef12345' },
    { displayName: 'ธนา ร่ำรวย', userId: 'U7890abcdef1234567890abcdef123456' },
    { displayName: 'อรทัย สวยใส', userId: 'U890abcdef1234567890abcdef1234567' },
    { displayName: 'สุรชัย กล้าหาญ', userId: 'U90abcdef1234567890abcdef12345678' },
    { displayName: 'รัตนา สวยงาม', userId: 'U0abcdef1234567890abcdef123456789' },
    { displayName: 'นิรันดร์ ยืนนาน', userId: 'Uabcdef1234567890abcdef1234567890' },
    { displayName: 'สุพรรณี ใจกว้าง', userId: 'Ubcdef1234567890abcdef12345678901' },
    { displayName: 'ประยงค์ กล้าหาญ', userId: 'Ucdef1234567890abcdef123456789012' },
    { displayName: 'สมประสงค์ ดีใจ', userId: 'Udef1234567890abcdef1234567890123' },
    { displayName: 'สุดารัตน์ สวยงาม', userId: 'Uef1234567890abcdef12345678901234' },
  ];

  const pictureUrls = [
    'https://via.placeholder.com/150?text=User1',
    'https://via.placeholder.com/150?text=User2',
    'https://via.placeholder.com/150?text=User3',
    'https://via.placeholder.com/150?text=User4',
    'https://via.placeholder.com/150?text=User5',
  ];

  for (let i = 0; i < 25; i++) { // Create 25 LINE followers
    const followerIndex = i % followerNames.length;
    const follower = followerNames[followerIndex];
    const followedAt = new Date(Date.now() - (25 - i) * 24 * 60 * 60 * 1000); // Last 25 days
    
    // Some followers unfollowed
    const isUnfollowed = i >= 20; // Last 5 followers unfollowed
    const unfollowedAt = isUnfollowed ? new Date(followedAt.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000) : null;
    const status = isUnfollowed ? 'UNFOLLOW' : 'FOLLOW';
    const isUnblocked = i % 5 === 0; // Every 5th follower is unblocked

    // Try to link with customer
    let customerId: string | null = null;
    if (customers.length > 0 && !isUnfollowed) {
      const customer = customers[i % customers.length];
      customerId = customer.id;
    }

    await prisma.lineFollower.create({
      data: {
        tenantId: tenant.id,
        userId: follower.userId,
        displayName: follower.displayName,
        pictureUrl: pictureUrls[i % pictureUrls.length],
        status: status,
        isUnblocked: isUnblocked,
        followedAt: followedAt,
        unfollowedAt: unfollowedAt,
        customerId: customerId,
        metadata: {
          source: 'webhook',
          eventType: isUnfollowed ? 'unfollow' : 'follow',
          timestamp: Math.floor(followedAt.getTime()),
        },
      },
    });
  }
  console.log('✅ Created 25 sample LINE followers (20 follow, 5 unfollow)');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
