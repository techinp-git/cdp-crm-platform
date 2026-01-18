-- Sample B2B Company Customers Data
-- This script creates sample B2B company customers with detailed company information

DO $$
DECLARE
  tenant_id UUID;
  companies JSONB[] := ARRAY[
    jsonb_build_object(
      'companyName', 'บริษัท เทคโนโลยี จำกัด',
      'companyTaxId', '0105537012345',
      'email', 'info@techthai.co.th',
      'phone', '+66-2-123-4567',
      'industry', 'Technology',
      'companySize', '50-200',
      'address', '123 ถนนสุขุมวิท แขวงคลองตัน',
      'city', 'กรุงเทพมหานคร',
      'country', 'Thailand',
      'postalCode', '10110',
      'contactPerson', 'สมชาย ใจดี',
      'contactEmail', 'somchai@techthai.co.th',
      'contactPhone', '+66-81-111-1111'
    ),
    jsonb_build_object(
      'companyName', 'บริษัท การค้า และบริการ จำกัด',
      'companyTaxId', '0105537012346',
      'email', 'contact@tradeservice.co.th',
      'phone', '+66-2-234-5678',
      'industry', 'Trading & Services',
      'companySize', '20-50',
      'address', '456 ถนนสีลม แขวงสีลม',
      'city', 'กรุงเทพมหานคร',
      'country', 'Thailand',
      'postalCode', '10500',
      'contactPerson', 'สมหญิง รักงาน',
      'contactEmail', 'somying@tradeservice.co.th',
      'contactPhone', '+66-82-222-2222'
    ),
    jsonb_build_object(
      'companyName', 'บริษัท ผลิตภัณฑ์อุตสาหกรรม จำกัด',
      'companyTaxId', '0105537012347',
      'email', 'sales@industrial.co.th',
      'phone', '+66-2-345-6789',
      'industry', 'Manufacturing',
      'companySize', '200-500',
      'address', '789 ถนนวิภาวดีรังสิต แขวงจตุจักร',
      'city', 'กรุงเทพมหานคร',
      'country', 'Thailand',
      'postalCode', '10900',
      'contactPerson', 'วิชัย มั่งคั่ง',
      'contactEmail', 'wichai@industrial.co.th',
      'contactPhone', '+66-83-333-3333'
    ),
    jsonb_build_object(
      'companyName', 'บริษัท อสังหาริมทรัพย์ จำกัด',
      'companyTaxId', '0105537012348',
      'email', 'info@realestate.co.th',
      'phone', '+66-2-456-7890',
      'industry', 'Real Estate',
      'companySize', '100-200',
      'address', '321 ถนนเพชรบุรีตัดใหม่ แขวงบางกะปิ',
      'city', 'กรุงเทพมหานคร',
      'country', 'Thailand',
      'postalCode', '10400',
      'contactPerson', 'วิไล สวยงาม',
      'contactEmail', 'wilai@realestate.co.th',
      'contactPhone', '+66-84-444-4444'
    ),
    jsonb_build_object(
      'companyName', 'บริษัท โลจิสติกส์ และขนส่ง จำกัด',
      'companyTaxId', '0105537012349',
      'email', 'operations@logistics.co.th',
      'phone', '+66-2-567-8901',
      'industry', 'Logistics & Transportation',
      'companySize', '50-100',
      'address', '654 ถนนบางนา-ตราด แขวงบางนา',
      'city', 'กรุงเทพมหานคร',
      'country', 'Thailand',
      'postalCode', '10260',
      'contactPerson', 'ประเสริฐ ดีเลิศ',
      'contactEmail', 'prasert@logistics.co.th',
      'contactPhone', '+66-85-555-5555'
    ),
    jsonb_build_object(
      'companyName', 'บริษัท การเงิน และประกันภัย จำกัด',
      'companyTaxId', '0105537012350',
      'email', 'service@finance.co.th',
      'phone', '+66-2-678-9012',
      'industry', 'Finance & Insurance',
      'companySize', '200-500',
      'address', '987 ถนนพระราม 4 แขวงลุมพินี',
      'city', 'กรุงเทพมหานคร',
      'country', 'Thailand',
      'postalCode', '10330',
      'contactPerson', 'กัลยา ใจดี',
      'contactEmail', 'kanya@finance.co.th',
      'contactPhone', '+66-86-666-6666'
    ),
    jsonb_build_object(
      'companyName', 'บริษัท อาหารและเครื่องดื่ม จำกัด',
      'companyTaxId', '0105537012351',
      'email', 'sales@foodbeverage.co.th',
      'phone', '+66-2-789-0123',
      'industry', 'Food & Beverage',
      'companySize', '100-200',
      'address', '147 ถนนพหลโยธิน แขวงพญาไท',
      'city', 'กรุงเทพมหานคร',
      'country', 'Thailand',
      'postalCode', '10400',
      'contactPerson', 'ธนา ร่ำรวย',
      'contactEmail', 'thana@foodbeverage.co.th',
      'contactPhone', '+66-87-777-7777'
    ),
    jsonb_build_object(
      'companyName', 'บริษัท การตลาด และโฆษณา จำกัด',
      'companyTaxId', '0105537012352',
      'email', 'contact@marketing.co.th',
      'phone', '+66-2-890-1234',
      'industry', 'Marketing & Advertising',
      'companySize', '20-50',
      'address', '258 ถนนราชดำริ แขวงลุมพินี',
      'city', 'กรุงเทพมหานคร',
      'country', 'Thailand',
      'postalCode', '10330',
      'contactPerson', 'อรทัย สวยใส',
      'contactEmail', 'orathai@marketing.co.th',
      'contactPhone', '+66-88-888-8888'
    ),
    jsonb_build_object(
      'companyName', 'บริษัท พลังงาน และสาธารณูปโภค จำกัด',
      'companyTaxId', '0105537012353',
      'email', 'info@energy.co.th',
      'phone', '+66-2-901-2345',
      'industry', 'Energy & Utilities',
      'companySize', '500-1000',
      'address', '369 ถนนถนนเพชรเกษม แขวงบางแค',
      'city', 'กรุงเทพมหานคร',
      'country', 'Thailand',
      'postalCode', '10160',
      'contactPerson', 'สุรชัย กล้าหาญ',
      'contactEmail', 'surachai@energy.co.th',
      'contactPhone', '+66-89-999-9999'
    ),
    jsonb_build_object(
      'companyName', 'บริษัท การแพทย์ และสุขภาพ จำกัด',
      'companyTaxId', '0105537012354',
      'email', 'admin@medical.co.th',
      'phone', '+66-2-012-3456',
      'industry', 'Healthcare & Medical',
      'companySize', '100-200',
      'address', '741 ถนนสุขุมวิท แขวงคลองตัน',
      'city', 'กรุงเทพมหานคร',
      'country', 'Thailand',
      'postalCode', '10110',
      'contactPerson', 'รัตนา สวยงาม',
      'contactEmail', 'rattana@medical.co.th',
      'contactPhone', '+66-90-000-0000'
    )
  ];
  i INT;
  company_data JSONB;
  identifiers JSONB;
  profile JSONB;
  metadata JSONB;
  created_at TIMESTAMP;
BEGIN
  -- Get tenant ID for acme-corp
  SELECT id INTO tenant_id FROM tenants WHERE slug = 'acme-corp' LIMIT 1;

  IF tenant_id IS NULL THEN
    RAISE NOTICE 'Tenant not found';
    RETURN;
  END IF;

  -- Create 10 B2B company customers
  FOR i IN 1..10 LOOP
    company_data := companies[((i - 1) % array_length(companies, 1)) + 1];
    created_at := NOW() - (10 - i) * INTERVAL '7 days';

    identifiers := jsonb_build_object(
      'email', company_data->>'email',
      'phone', company_data->>'phone',
      'company', company_data->>'companyName',
      'companyTaxId', company_data->>'companyTaxId',
      'contactEmail', company_data->>'contactEmail',
      'contactPhone', company_data->>'contactPhone'
    );

    profile := jsonb_build_object(
      'companyName', company_data->>'companyName',
      'industry', company_data->>'industry',
      'companySize', company_data->>'companySize',
      'address', company_data->>'address',
      'city', company_data->>'city',
      'country', company_data->>'country',
      'postalCode', company_data->>'postalCode',
      'contactPerson', company_data->>'contactPerson'
    );

    metadata := jsonb_build_object(
      'source', 'ERP_IMPORT',
      'importType', 'B2B_COMPANY',
      'importedAt', created_at::text,
      'industry', company_data->>'industry',
      'companySize', company_data->>'companySize'
    );

    INSERT INTO customers (
      id,
      "tenantId",
      type,
      identifiers,
      profile,
      metadata,
      "createdAt",
      "updatedAt"
    )
    VALUES (
      gen_random_uuid(),
      tenant_id,
      'COMPANY',
      identifiers,
      profile,
      metadata,
      created_at,
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Created 10 B2B company customers for tenant %', tenant_id;
END $$;
