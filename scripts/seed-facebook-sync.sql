-- Sample Facebook Sync Data
-- This script creates sample Facebook page posts and engagement data

DO $$
DECLARE
  tenant_id UUID;
  page_ids TEXT[] := ARRAY[
    '1234567890123456',
    '2345678901234567',
    '3456789012345678'
  ];
  page_names TEXT[] := ARRAY[
    'My Business Page',
    'Another Page',
    'Brand Official'
  ];
  post_types TEXT[] := ARRAY['status', 'photo', 'video', 'link'];
  messages TEXT[] := ARRAY[
    'สวัสดีครับทุกคน! วันนี้มีโปรโมชั่นพิเศษสำหรับคุณ',
    'แจ้งข่าวสารใหม่: สินค้าใหม่มาถึงแล้ว พร้อมส่วนลดพิเศษ',
    'ขอบคุณลูกค้าทุกท่านที่ให้การสนับสนุนตลอดมา',
    'อัพเดทสินค้าใหม่: มีให้เลือกหลากหลาย พร้อมบริการส่งฟรี',
    'แชร์ประสบการณ์ดีๆ จากลูกค้า กับสินค้าของเรา',
    'โปรโมชั่นสุดพิเศษ! ซื้อ 1 แถม 1 ตั้งแต่วันนี้ - สัปดาห์หน้า',
    'ติดตามข่าวสารและอัพเดทสินค้าใหม่ได้ที่นี่',
    'รีวิวจากลูกค้า: ดีมาก แนะนำให้ทุกคนลอง',
    'สินค้าขายดีประจำสัปดาห์! สั่งซื้อเลย',
    'ขอบคุณที่ติดตาม เพจของเรามีโปรโมชั่นตลอด',
    'สินค้าใหม่มาถึงแล้ว! พร้อมให้บริการตั้งแต่วันนี้',
    'โปรโมชั่นพิเศษสำหรับสมาชิก: สะสมแต้มได้ 2 เท่า',
    'อัพเดทบริการใหม่: จัดส่งฟรีทั่วประเทศ',
    'รีวิวจากลูกค้า: คุณภาพดี ราคาดี ถูกใจมาก',
    'สินค้าแนะนำ: ขายดีที่สุดในเดือนนี้',
    'ข่าวสาร: เปิดตัวสินค้าใหม่พรุ่งนี้ พร้อมโปรโมชั่น',
    'โปรโมชั่นสุดร้อนแรง! ลดสูงสุด 50%',
    'อัพเดท: เพิ่มสินค้าใหม่เข้าสต็อกแล้ว',
    'แชร์ประสบการณ์ดีๆ: ลูกค้าพูดถึงเรา',
    'สินค้าขายดี: มียอดสั่งซื้อมากที่สุดในรอบเดือน'
  ];
  i INT;
  page_id TEXT;
  page_name TEXT;
  post_id TEXT;
  message TEXT;
  post_type TEXT;
  likes INT;
  comments INT;
  shares INT;
  created_at TIMESTAMP;
  synced_at TIMESTAMP;
BEGIN
  -- Get tenant ID for acme-corp
  SELECT id INTO tenant_id FROM tenants WHERE slug = 'acme-corp' LIMIT 1;

  IF tenant_id IS NULL THEN
    RAISE NOTICE 'Tenant not found';
    RETURN;
  END IF;

  -- Create 30 sample Facebook posts
  FOR i IN 1..30 LOOP
    page_id := page_ids[((i - 1) % array_length(page_ids, 1)) + 1];
    page_name := page_names[((i - 1) % array_length(page_names, 1)) + 1];
    post_id := 'post_' || LPAD(i::TEXT, 10, '0') || '_' || MD5(RANDOM()::TEXT);
    message := messages[((i - 1) % array_length(messages, 1)) + 1];
    post_type := post_types[((i - 1) % array_length(post_types, 1)) + 1];
    
    -- Random engagement metrics
    likes := FLOOR(RANDOM() * 500) + 10; -- 10-510 likes
    comments := FLOOR(RANDOM() * 100) + 5; -- 5-105 comments
    shares := FLOOR(RANDOM() * 50) + 1; -- 1-51 shares
    
    -- Random creation time within last 30 days
    created_at := NOW() - (30 - (i % 30)) * INTERVAL '1 day' - (RANDOM() * INTERVAL '12 hours');
    synced_at := created_at + (RANDOM() * INTERVAL '1 hour');

    INSERT INTO facebook_sync (
      id,
      "tenantId",
      "pageId",
      "pageName",
      "postId",
      message,
      "postType",
      likes,
      comments,
      shares,
      "createdAt",
      "syncedAt",
      metadata,
      "updatedAt"
    )
    VALUES (
      gen_random_uuid(),
      tenant_id,
      page_id,
      page_name,
      post_id,
      message,
      post_type,
      likes,
      comments,
      shares,
      created_at,
      synced_at,
      jsonb_build_object(
        'source', 'facebook_graph_api',
        'syncFrequency', 'daily',
        'lastSyncedAt', synced_at::text
      ),
      NOW()
    )
    ON CONFLICT ("tenantId", "postId") DO UPDATE SET
      message = EXCLUDED.message,
      "postType" = EXCLUDED."postType",
      likes = EXCLUDED.likes,
      comments = EXCLUDED.comments,
      shares = EXCLUDED.shares,
      "createdAt" = EXCLUDED."createdAt",
      "syncedAt" = EXCLUDED."syncedAt",
      metadata = EXCLUDED.metadata,
      "updatedAt" = NOW();
  END LOOP;

  RAISE NOTICE 'Created 30 sample Facebook sync posts for tenant %', tenant_id;
END $$;
