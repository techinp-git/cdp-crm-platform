-- Sample LINE Followers Data
-- This script creates sample LINE followers for testing

DO $$
DECLARE
  tenant_id UUID;
  follower_names TEXT[] := ARRAY[
    'สมชาย ใจดี',
    'สมหญิง รักงาน',
    'วิชัย มั่งคั่ง',
    'วิไล สวยงาม',
    'ประเสริฐ ดีเลิศ',
    'กัลยา ใจดี',
    'ธนา ร่ำรวย',
    'อรทัย สวยใส',
    'สุรชัย กล้าหาญ',
    'รัตนา สวยงาม',
    'นิรันดร์ ยืนนาน',
    'สุพรรณี ใจกว้าง',
    'ประยงค์ กล้าหาญ',
    'สมประสงค์ ดีใจ',
    'สุดารัตน์ สวยงาม'
  ];
  user_ids TEXT[] := ARRAY[
    'U1234567890abcdef1234567890abcdef',
    'U234567890abcdef1234567890abcdef1',
    'U34567890abcdef1234567890abcdef12',
    'U4567890abcdef1234567890abcdef123',
    'U567890abcdef1234567890abcdef1234',
    'U67890abcdef1234567890abcdef12345',
    'U7890abcdef1234567890abcdef123456',
    'U890abcdef1234567890abcdef1234567',
    'U90abcdef1234567890abcdef12345678',
    'U0abcdef1234567890abcdef123456789',
    'Uabcdef1234567890abcdef1234567890',
    'Ubcdef1234567890abcdef12345678901',
    'Ucdef1234567890abcdef123456789012',
    'Udef1234567890abcdef1234567890123',
    'Uef1234567890abcdef12345678901234'
  ];
  i INT;
  display_name TEXT;
  user_id TEXT;
  status TEXT;
  followed_at TIMESTAMP;
  unfollowed_at TIMESTAMP;
BEGIN
  -- Get tenant ID for acme-corp
  SELECT id INTO tenant_id FROM tenants WHERE slug = 'acme-corp' LIMIT 1;

  IF tenant_id IS NULL THEN
    RAISE NOTICE 'Tenant not found';
    RETURN;
  END IF;

  -- Create 25 followers (20 follow, 5 unfollow)
  FOR i IN 1..25 LOOP
    display_name := follower_names[((i - 1) % array_length(follower_names, 1)) + 1];
    user_id := user_ids[((i - 1) % array_length(user_ids, 1)) + 1] || LPAD(i::TEXT, 2, '0');
    followed_at := NOW() - (25 - i) * INTERVAL '1 day';
    
    IF i <= 20 THEN
      status := 'FOLLOW';
      unfollowed_at := NULL;
    ELSE
      status := 'UNFOLLOW';
      unfollowed_at := followed_at + (5 + (i - 21) * 2) * INTERVAL '1 day';
    END IF;

    INSERT INTO line_followers (
      id,
      "tenantId",
      "userId",
      "displayName",
      "pictureUrl",
      status,
      "isUnblocked",
      "followedAt",
      "unfollowedAt",
      metadata,
      "createdAt",
      "updatedAt"
    )
    VALUES (
      gen_random_uuid(),
      tenant_id,
      user_id,
      display_name,
      'https://via.placeholder.com/150?text=User' || i,
      status,
      (i % 5 = 0), -- Every 5th follower is unblocked
      followed_at,
      unfollowed_at,
      jsonb_build_object(
        'source', 'webhook',
        'eventType', CASE WHEN status = 'FOLLOW' THEN 'follow' ELSE 'unfollow' END,
        'timestamp', EXTRACT(EPOCH FROM followed_at)::BIGINT
      ),
      NOW(),
      NOW()
    )
    ON CONFLICT ("tenantId", "userId") DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Created 25 sample LINE followers for tenant %', tenant_id;
END $$;
