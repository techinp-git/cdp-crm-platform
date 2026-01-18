-- Simple SQL Seed Script
-- This creates basic users for login testing

-- Create Super Admin User (password: SuperAdmin123!)
-- Note: This is a placeholder hash. In production, use proper bcrypt hash from seed.ts
INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", "isSuperAdmin", status, "createdAt", "updatedAt") 
VALUES (
  gen_random_uuid(),
  'admin@ydm-platform.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- SuperAdmin123!
  'Super',
  'Admin',
  true,
  'ACTIVE',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "isSuperAdmin" = true,
  status = 'ACTIVE';

-- Create Tenant
DO $$
DECLARE
  tenant_id UUID;
  user_id UUID;
  tenant_user_id UUID;
BEGIN
  -- Create or get tenant
  INSERT INTO tenants (id, name, slug, type, status, plan, "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Acme Corporation',
    'acme-corp',
    'B2B',
    'ACTIVE',
    'professional',
    NOW(),
    NOW()
  )
  ON CONFLICT (slug) DO UPDATE SET status = 'ACTIVE'
  RETURNING id INTO tenant_id;

  -- Create tenant admin user (password: Admin123!)
  INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", "isSuperAdmin", status, "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'admin@acme-corp.com',
    '$2a$10$rOzJqZqZqZqZqZqZqZqZqOZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', -- Admin123! (placeholder)
    'John',
    'Doe',
    false,
    'ACTIVE',
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    "passwordHash" = EXCLUDED."passwordHash",
    status = 'ACTIVE'
  RETURNING id INTO user_id;

  -- Link user to tenant
  INSERT INTO tenant_users (id, "tenantId", "userId", status, "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    tenant_id,
    user_id,
    'ACTIVE',
    NOW(),
    NOW()
  )
  ON CONFLICT ("tenantId", "userId") DO UPDATE SET status = 'ACTIVE'
  RETURNING id INTO tenant_user_id;

  RAISE NOTICE 'Tenant created: %', tenant_id;
  RAISE NOTICE 'User created: %', user_id;
END $$;

SELECT 'Database seeded successfully!' as message;
