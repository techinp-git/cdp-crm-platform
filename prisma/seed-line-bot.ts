// Seed sample LINE group/room events for /data/sources/line-bot
import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function seedTenant(tenantId: string, tenantSlug: string) {
  const existing = await prisma.lineEvent.count({
    where: {
      tenantId,
      OR: [{ groupId: { not: null } }, { roomId: { not: null } }],
    },
  });
  if (existing > 0) {
    console.log(`↩️  ${tenantSlug}: skip (already has group/room events: ${existing})`);
    return;
  }

  const groupIds = [makeId('Cgroup'), makeId('Cgroup'), makeId('Cgroup')];
  const roomId = makeId('Croom');
  const userIds = [makeId('U'), makeId('U'), makeId('U')];

  const events: Array<{
    tenantId: string;
    eventType: string;
    sourceType?: string;
    sourceId?: string;
    userId?: string;
    groupId?: string | null;
    roomId?: string | null;
    timestamp: Date;
    mode?: string;
    replyToken?: string;
    messageType?: string;
    messageText?: string;
    messageId?: string;
    postbackData?: string;
    postbackParams?: any;
    rawPayload?: any;
    status?: string;
    processedAt?: Date | null;
  }> = [];

  // 3 groups
  for (const gid of groupIds) {
    // join event
    events.push({
      tenantId,
      eventType: 'join',
      sourceType: 'group',
      sourceId: gid,
      groupId: gid,
      timestamp: daysAgo(3),
      rawPayload: { type: 'join', source: { type: 'group', groupId: gid } },
      status: 'PROCESSED',
      processedAt: new Date(),
    });

    // message events (include some today)
    const msgCount = 10 + Math.floor(Math.random() * 10); // 10-19
    for (let i = 0; i < msgCount; i++) {
      const isToday = i < 3; // first 3 messages are today
      const ts = isToday ? new Date(Date.now() - (i + 1) * 60 * 60 * 1000) : new Date(daysAgo(2).getTime() + i * 45 * 60 * 1000);
      const uid = pick(userIds);
      events.push({
        tenantId,
        eventType: 'message',
        sourceType: 'group',
        sourceId: gid,
        userId: uid,
        groupId: gid,
        timestamp: ts,
        messageType: 'text',
        messageText: isToday
          ? pick(['สวัสดีครับ', 'ขอใบเสนอราคา', 'ตามสถานะงานหน่อย', 'มีโปรโมชันไหม', 'ขอรายละเอียดเพิ่ม'])
          : pick(['รับทราบครับ', 'โอเคครับ', 'ขอบคุณครับ', 'ส่งข้อมูลให้ด้วย', 'เดี๋ยวแจ้งทีมให้']),
        messageId: makeId('mid'),
        rawPayload: {
          type: 'message',
          source: { type: 'group', groupId: gid, userId: uid },
          message: { type: 'text', id: makeId('mid'), text: 'seed' },
        },
        status: 'RECEIVED',
      });
    }

    // postback
    events.push({
      tenantId,
      eventType: 'postback',
      sourceType: 'group',
      sourceId: gid,
      userId: pick(userIds),
      groupId: gid,
      timestamp: daysAgo(1),
      postbackData: 'action=VIEW_MENU',
      postbackParams: { datetime: new Date().toISOString() },
      rawPayload: { type: 'postback', data: 'action=VIEW_MENU' },
      status: 'PROCESSED',
      processedAt: new Date(),
    });
  }

  // 1 room conversation
  events.push({
    tenantId,
    eventType: 'join',
    sourceType: 'room',
    sourceId: roomId,
    roomId,
    timestamp: daysAgo(4),
    rawPayload: { type: 'join', source: { type: 'room', roomId } },
    status: 'PROCESSED',
    processedAt: new Date(),
  });
  for (let i = 0; i < 8; i++) {
    const ts = new Date(daysAgo(1).getTime() + i * 30 * 60 * 1000);
    const uid = pick(userIds);
    events.push({
      tenantId,
      eventType: 'message',
      sourceType: 'room',
      sourceId: roomId,
      userId: uid,
      roomId,
      timestamp: ts,
      messageType: 'text',
      messageText: pick(['ห้องนี้คุยเรื่องงาน', 'แนบไฟล์ได้ไหม', 'โอเคครับ', 'ขอแก้ไขนิดนึง', 'ขอบคุณครับ']),
      messageId: makeId('mid'),
      rawPayload: { type: 'message', source: { type: 'room', roomId, userId: uid } },
      status: 'RECEIVED',
    });
  }

  await prisma.lineEvent.createMany({ data: events, skipDuplicates: false });
  console.log(`✅ ${tenantSlug}: created ${events.length} line_events (group/room)`);
}

async function main() {
  console.log('🌱 Seeding LINE Bot sample events...');
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  for (const t of tenants) {
    await seedTenant(t.id, t.slug);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

