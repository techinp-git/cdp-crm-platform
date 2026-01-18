-- Sample LINE Group Bot Data
-- This script creates sample LINE group bot events with conversations

DO $$
DECLARE
  tenant_id UUID;
  group_ids TEXT[] := ARRAY[
    'C1234567890abcdef1234567890abcdef',
    'C234567890abcdef1234567890abcdef1',
    'C34567890abcdef1234567890abcdef12',
    'C4567890abcdef1234567890abcdef123',
    'C567890abcdef1234567890abcdef1234'
  ];
  user_ids TEXT[] := ARRAY[
    'U1111111111111111111111111111111',
    'U2222222222222222222222222222222',
    'U3333333333333333333333333333333',
    'U4444444444444444444444444444444',
    'U5555555555555555555555555555555'
  ];
  conversations TEXT[][] := ARRAY[
    ARRAY['สวัสดีครับทุกคน', 'สวัสดีครับ', 'มีอะไรให้ช่วยไหมครับ'],
    ARRAY['ขอบคุณครับ', 'ยินดีครับ', 'ขอโทษครับ'],
    ARRAY['สอบถามสินค้าครับ', 'ราคาเท่าไหร่ครับ', 'มีโปรโมชั่นไหมครับ'],
    ARRAY['สั่งซื้อได้ยังไงครับ', 'ส่งฟรีไหมครับ', 'เมื่อไหร่จะได้ของครับ'],
    ARRAY['มีบัตรเครดิตรับไหมครับ', 'ชำระเงินยังไงครับ', 'ขอบคุณมากครับ'],
    ARRAY['สินค้าพร้อมส่งเมื่อไหร่', 'มีสินค้าในสต็อกไหม', 'สั่งซื้อเรียบร้อยแล้ว'],
    ARRAY['อยากดูสินค้าใหม่', 'มีส่วนลดไหม', 'ขอดูรายละเอียดเพิ่มเติม'],
    ARRAY['ช่วยแนะนำสินค้าให้หน่อย', 'เหมาะสำหรับใคร', 'ใช้งานยังไง'],
    ARRAY['มีคำถามเพิ่มเติม', 'ติดต่อได้ที่ไหน', 'ขอบคุณสำหรับคำแนะนำ'],
    ARRAY['พอใจกับสินค้ามาก', 'จะสั่งเพิ่มอีก', 'แนะนำให้เพื่อน']
  ];
  i INT;
  group_id TEXT;
  user_id TEXT;
  conversation TEXT[];
  event_type TEXT;
  message_text TEXT;
  timestamp TIMESTAMP;
  base_time TIMESTAMP;
BEGIN
  -- Get tenant ID for acme-corp
  SELECT id INTO tenant_id FROM tenants WHERE slug = 'acme-corp' LIMIT 1;

  IF tenant_id IS NULL THEN
    RAISE NOTICE 'Tenant not found';
    RETURN;
  END IF;

  base_time := NOW() - INTERVAL '30 days';

  -- Create group join events first
  FOR i IN 1..array_length(group_ids, 1) LOOP
    group_id := group_ids[i];
    
    -- Bot joins group
    INSERT INTO line_events (
      id,
      "tenantId",
      "eventType",
      "sourceType",
      "sourceId",
      "groupId",
      timestamp,
      mode,
      status,
      "rawPayload",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      gen_random_uuid(),
      tenant_id,
      'join',
      'group',
      group_id,
      group_id,
      base_time + (i * INTERVAL '1 day'),
      'active',
      'PROCESSED',
      jsonb_build_object(
        'type', 'join',
        'timestamp', EXTRACT(EPOCH FROM base_time + (i * INTERVAL '1 day'))::BIGINT * 1000,
        'source', jsonb_build_object('type', 'group', 'groupId', group_id)
      ),
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Create conversation messages in each group
  FOR i IN 1..50 LOOP
    group_id := group_ids[((i - 1) % array_length(group_ids, 1)) + 1];
    user_id := user_ids[((i - 1) % array_length(user_ids, 1)) + 1];
    conversation := conversations[((i - 1) % array_length(conversations, 1)) + 1];
    message_text := conversation[((i - 1) % array_length(conversation, 1)) + 1];
    
    event_type := CASE 
      WHEN i % 20 = 0 THEN 'leave'
      WHEN i % 15 = 0 THEN 'join'
      ELSE 'message'
    END;
    
    timestamp := base_time + (i * INTERVAL '6 hours') + ((i % 3) * INTERVAL '1 hour');

    IF event_type = 'message' THEN
      INSERT INTO line_events (
        id,
        "tenantId",
        "eventType",
        "sourceType",
        "sourceId",
        "userId",
        "groupId",
        timestamp,
        mode,
        "replyToken",
        "messageType",
        "messageText",
        "messageId",
        status,
        "rawPayload",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        tenant_id,
        'message',
        'group',
        group_id,
        user_id,
        group_id,
        timestamp,
        'active',
        'reply_token_' || LPAD(i::TEXT, 5, '0'),
        'text',
        message_text,
        'msg_' || LPAD(i::TEXT, 5, '0'),
        CASE WHEN i % 10 = 0 THEN 'RECEIVED' ELSE 'PROCESSED' END,
        jsonb_build_object(
          'type', 'message',
          'timestamp', EXTRACT(EPOCH FROM timestamp)::BIGINT * 1000,
          'source', jsonb_build_object(
            'type', 'group',
            'groupId', group_id,
            'userId', user_id
          ),
          'message', jsonb_build_object(
            'id', 'msg_' || LPAD(i::TEXT, 5, '0'),
            'type', 'text',
            'text', message_text
          ),
          'replyToken', 'reply_token_' || LPAD(i::TEXT, 5, '0')
        ),
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING;
    ELSIF event_type IN ('join', 'leave') THEN
      INSERT INTO line_events (
        id,
        "tenantId",
        "eventType",
        "sourceType",
        "sourceId",
        "userId",
        "groupId",
        timestamp,
        mode,
        "replyToken",
        status,
        "rawPayload",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        tenant_id,
        event_type,
        'group',
        group_id,
        user_id,
        group_id,
        timestamp,
        'active',
        'reply_token_' || LPAD(i::TEXT, 5, '0'),
        'PROCESSED',
        jsonb_build_object(
          'type', event_type,
          'timestamp', EXTRACT(EPOCH FROM timestamp)::BIGINT * 1000,
          'source', jsonb_build_object(
            'type', 'group',
            'groupId', group_id,
            'userId', user_id
          ),
          'replyToken', 'reply_token_' || LPAD(i::TEXT, 5, '0')
        ),
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RAISE NOTICE 'Created sample LINE Group Bot events with conversations for tenant %', tenant_id;
END $$;
