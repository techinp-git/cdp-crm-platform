-- Sample Facebook Messenger Data
-- This script creates sample Facebook Messenger conversations and messages (1 page)

DO $$
DECLARE
  tenant_id UUID;
  page_id TEXT := '1234567890123456'; -- Single page per tenant
  page_name TEXT := 'My Business Page';
  conversation_ids TEXT[] := ARRAY[
    'conv_001',
    'conv_002',
    'conv_003',
    'conv_004',
    'conv_005'
  ];
  sender_names TEXT[] := ARRAY[
    'สมชาย ใจดี',
    'สมหญิง รักงาน',
    'วิชัย มั่งคั่ง',
    'วิไล สวยงาม',
    'ประเสริฐ ดีเลิศ'
  ];
  conversations TEXT[][] := ARRAY[
    ARRAY['สวัสดีครับ สนใจสินค้า', 'สวัสดีครับ ยินดีให้บริการครับ มีสินค้าอะไรให้เลือกบ้างครับ?', 'อยากดูสินค้าใหม่', 'มีสินค้าใหม่มาถึงแล้วครับ ต้องการดูรุ่นไหนครับ?', 'ขอราคาด้วยครับ'],
    ARRAY['สวัสดีค่ะ', 'สวัสดีครับ ยินดีให้บริการครับ', 'อยากสอบถามโปรโมชั่น', 'มีโปรโมชั่นพิเศษวันนี้ครับ ซื้อ 1 แถม 1', 'ดีมากเลยค่ะ'],
    ARRAY['ส่งของเมื่อไหร่', 'ส่งของภายใน 3-5 วันทำการครับ', 'ขอเช็คสถานะออเดอร์', 'ให้หมายเลขออเดอร์มาได้ครับ', 'ORD-12345'],
    ARRAY['สินค้ามีในสต็อกไหม', 'มีครับ พร้อมส่งเลย', 'ส่งฟรีไหม', 'ซื้อครบ 1000 บาท ส่งฟรีครับ', 'ขอคำแนะนำสินค้า'],
    ARRAY['มีส่วนลดไหม', 'มีส่วนลด 10% สำหรับสมาชิกครับ', 'สมัครสมาชิกได้ยังไง', 'กดปุ่มสมัครสมาชิกด้านบนได้เลยครับ', 'ขอบคุณครับ']
  ];
  i INT;
  conv_idx INT;
  conv_id TEXT;
  sender_name TEXT;
  conversation TEXT[];
  message_text TEXT;
  message_type TEXT;
  timestamp TIMESTAMP;
  base_time TIMESTAMP;
  msg_count INT;
BEGIN
  -- Get tenant ID for acme-corp
  SELECT id INTO tenant_id FROM tenants WHERE slug = 'acme-corp' LIMIT 1;

  IF tenant_id IS NULL THEN
    RAISE NOTICE 'Tenant not found';
    RETURN;
  END IF;

  base_time := NOW() - INTERVAL '7 days';

  -- Create 30 sample Messenger messages across 5 conversations
  FOR i IN 1..30 LOOP
    conv_idx := ((i - 1) % array_length(conversation_ids, 1));
    conv_id := conversation_ids[conv_idx + 1];
    sender_name := sender_names[conv_idx + 1];
    conversation := conversations[conv_idx + 1];
    
    -- Alternate between user and bot messages
    msg_count := ((i - 1) / array_length(conversation_ids, 1))::int + 1;
    IF msg_count <= array_length(conversation, 1) THEN
      message_text := conversation[msg_count];
    ELSE
      -- Generate more messages for longer conversations
      IF (i % 2 = 0) THEN
        message_text := 'ขอบคุณครับ';
      ELSE
        message_text := 'ยินดีให้บริการครับ';
      END IF;
    END IF;
    
    -- User messages (odd) vs Bot messages (even)
    message_type := 'text';
    timestamp := base_time + (conv_idx * INTERVAL '1 day') + (msg_count * INTERVAL '30 minutes') + (RANDOM() * INTERVAL '10 minutes');

    INSERT INTO facebook_sync (
      id,
      "tenantId",
      "pageId",
      "pageName",
      "conversationId",
      "messageId",
      "senderId",
      "senderName",
      "messageText",
      "messageType",
      timestamp,
      "syncedAt",
      metadata,
      "updatedAt"
    )
    VALUES (
      gen_random_uuid(),
      tenant_id,
      page_id,
      page_name,
      conv_id,
      'msg_' || LPAD(i::TEXT, 10, '0') || '_' || MD5(RANDOM()::TEXT),
      CASE WHEN i % 2 = 1 THEN 'user_' || LPAD((conv_idx + 1)::TEXT, 10, '0') ELSE 'page_' || page_id END,
      CASE WHEN i % 2 = 1 THEN sender_name ELSE 'My Business Page' END,
      message_text,
      message_type,
      timestamp,
      timestamp + INTERVAL '1 minute',
      jsonb_build_object(
        'source', 'messenger_api',
        'syncFrequency', 'realtime',
        'isRead', true
      ),
      NOW()
    )
    ON CONFLICT ("tenantId", "messageId") DO UPDATE SET
      "messageText" = EXCLUDED."messageText",
      "messageType" = EXCLUDED."messageType",
      timestamp = EXCLUDED.timestamp,
      "syncedAt" = EXCLUDED."syncedAt",
      metadata = EXCLUDED.metadata,
      "updatedAt" = NOW();
  END LOOP;

  RAISE NOTICE 'Created 30 sample Facebook Messenger messages (1 page, 5 conversations) for tenant %', tenant_id;
END $$;
