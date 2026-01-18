-- Sample Lead Import Data (source = IMPORT_FILE)
-- This script creates sample leads imported from files for testing

DO $$
DECLARE
  tenant_id UUID;
  lead_names TEXT[] := ARRAY[
    'ประเสริฐ นำสิน',
    'สมศักดิ์ ใจดี',
    'วิมล สวยใส',
    'สมเกียรติ เก่งกาจ',
    'อรพิน รักงาน',
    'วิทยา กล้าหาญ',
    'สุรชัย มีทรัพย์',
    'นภัสวรรณ สวยงาม',
    'อภิชาต ดีเลิศ',
    'ภัทรียา ใจกว้าง'
  ];
  lead_emails TEXT[] := ARRAY[
    'prasert@example.com',
    'somsak@example.com',
    'wimon@example.com',
    'somkiat@example.com',
    'orapin@example.com',
    'wittaya@example.com',
    'surachai@example.com',
    'napasawan@example.com',
    'aphichat@example.com',
    'pattareeya@example.com'
  ];
  lead_phones TEXT[] := ARRAY[
    '+66-81-111-1111',
    '+66-82-222-2222',
    '+66-83-333-3333',
    '+66-84-444-4444',
    '+66-85-555-5555',
    '+66-86-666-6666',
    '+66-87-777-7777',
    '+66-88-888-8888',
    '+66-89-999-9999',
    '+66-90-000-0000'
  ];
  companies TEXT[] := ARRAY[
    'บริษัท เทคโนโลยี จำกัด',
    'ห้างหุ้นส่วน จำกัด',
    'บริษัท ค้าขาย จำกัด',
    'บริษัท บริการ จำกัด',
    'ห้างหุ้นส่วน จำกัด',
    'บริษัท ผลิตภัณฑ์ จำกัด',
    'บริษัท การตลาด จำกัด',
    'ห้างหุ้นส่วน จำกัด',
    'บริษัท วิจัย จำกัด',
    'บริษัท พัฒนา จำกัด'
  ];
  statuses TEXT[] := ARRAY['NEW', 'CONTACTED', 'QUALIFIED', 'CONTACTED', 'NEW'];
  i INT;
  first_name TEXT;
  last_name TEXT;
  email TEXT;
  phone TEXT;
  company TEXT;
  status TEXT;
  created_at TIMESTAMP;
BEGIN
  -- Get tenant ID for acme-corp
  SELECT id INTO tenant_id FROM tenants WHERE slug = 'acme-corp' LIMIT 1;

  IF tenant_id IS NULL THEN
    RAISE NOTICE 'Tenant not found';
    RETURN;
  END IF;

  -- Create 20 imported leads
  FOR i IN 1..20 LOOP
    -- Split name
    first_name := split_part(lead_names[((i - 1) % array_length(lead_names, 1)) + 1], ' ', 1);
    last_name := split_part(lead_names[((i - 1) % array_length(lead_names, 1)) + 1], ' ', 2);
    email := lead_emails[((i - 1) % array_length(lead_emails, 1)) + 1] || LPAD(i::TEXT, 2, '0');
    phone := lead_phones[((i - 1) % array_length(lead_phones, 1)) + 1];
    company := companies[((i - 1) % array_length(companies, 1)) + 1];
    status := statuses[((i - 1) % array_length(statuses, 1)) + 1];
    created_at := NOW() - (20 - i) * INTERVAL '2 days';

    INSERT INTO leads (
      id,
      "tenantId",
      "firstName",
      "lastName",
      email,
      phone,
      company,
      source,
      status,
      score,
      "createdAt",
      "updatedAt"
    )
    VALUES (
      gen_random_uuid(),
      tenant_id,
      first_name,
      last_name,
      email,
      phone,
      company,
      'IMPORT_FILE',
      status,
      (50 + (i % 50)), -- Score between 50-99
      created_at,
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Created 20 sample imported leads for tenant %', tenant_id;
END $$;
