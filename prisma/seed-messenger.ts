// Seed Facebook Messenger data (Thai language) for Acme Corporation
import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

// Thai conversation templates
const conversationTemplates = [
  {
    conversationId: 'conv_001',
    senderName: 'สมชาย ใจดี',
    messages: [
      { text: 'สวัสดีครับ สนใจสินค้าครับ', isUser: true },
      { text: 'สวัสดีครับ ยินดีให้บริการครับ มีสินค้าอะไรให้เลือกบ้างครับ?', isUser: false },
      { text: 'อยากดูสินค้าใหม่ครับ', isUser: true },
      { text: 'มีสินค้าใหม่มาถึงแล้วครับ ต้องการดูรุ่นไหนครับ?', isUser: false },
      { text: 'ขอราคาด้วยครับ', isUser: true },
      { text: 'ส่งราคาให้ทาง inbox แล้วครับ กรุณาตรวจสอบ', isUser: false },
    ],
  },
  {
    conversationId: 'conv_002',
    senderName: 'สมหญิง รักงาน',
    messages: [
      { text: 'สวัสดีค่ะ', isUser: true },
      { text: 'สวัสดีครับ ยินดีให้บริการครับ', isUser: false },
      { text: 'อยากสอบถามโปรโมชั่นค่ะ', isUser: true },
      { text: 'มีโปรโมชั่นพิเศษวันนี้ครับ ซื้อ 1 แถม 1', isUser: false },
      { text: 'ดีมากเลยค่ะ สนใจมาก', isUser: true },
      { text: 'ขอบคุณครับ สามารถสั่งซื้อได้เลยครับ', isUser: false },
    ],
  },
  {
    conversationId: 'conv_003',
    senderName: 'วิชัย มั่งคั่ง',
    messages: [
      { text: 'ส่งของเมื่อไหร่ครับ', isUser: true },
      { text: 'ส่งของภายใน 3-5 วันทำการครับ', isUser: false },
      { text: 'ขอเช็คสถานะออเดอร์ครับ', isUser: true },
      { text: 'ให้หมายเลขออเดอร์มาได้ครับ', isUser: false },
      { text: 'ORD-12345', isUser: true },
      { text: 'ออเดอร์ของคุณอยู่ระหว่างการจัดส่งครับ คาดว่าจะถึงภายใน 2 วัน', isUser: false },
    ],
  },
  {
    conversationId: 'conv_004',
    senderName: 'วิไล สวยงาม',
    messages: [
      { text: 'สินค้ามีในสต็อกไหมคะ', isUser: true },
      { text: 'มีครับ พร้อมส่งเลย', isUser: false },
      { text: 'ส่งฟรีไหมคะ', isUser: true },
      { text: 'ซื้อครบ 1000 บาท ส่งฟรีครับ', isUser: false },
      { text: 'ขอคำแนะนำสินค้าด้วยค่ะ', isUser: true },
      { text: 'แนะนำสินค้ารุ่นใหม่ที่ขายดีที่สุดครับ', isUser: false },
    ],
  },
  {
    conversationId: 'conv_005',
    senderName: 'ประเสริฐ ดีเลิศ',
    messages: [
      { text: 'มีส่วนลดไหมครับ', isUser: true },
      { text: 'มีส่วนลด 10% สำหรับสมาชิกครับ', isUser: false },
      { text: 'สมัครสมาชิกได้ยังไงครับ', isUser: true },
      { text: 'กดปุ่มสมัครสมาชิกด้านบนได้เลยครับ', isUser: false },
      { text: 'ขอบคุณครับ', isUser: true },
      { text: 'ยินดีให้บริการครับ', isUser: false },
    ],
  },
  {
    conversationId: 'conv_006',
    senderName: 'นพดล เก่งกาจ',
    messages: [
      { text: 'ต้องการติดตั้งระบบครับ', isUser: true },
      { text: 'ยินดีให้บริการครับ มีทีมงานพร้อมให้คำปรึกษา', isUser: false },
      { text: 'ใช้เวลานานไหมครับ', isUser: true },
      { text: 'ประมาณ 1-2 สัปดาห์ครับ ขึ้นอยู่กับความซับซ้อน', isUser: false },
      { text: 'ราคาเท่าไหร่ครับ', isUser: true },
      { text: 'ส่งใบเสนอราคาให้แล้วครับ กรุณาตรวจสอบ', isUser: false },
    ],
  },
  {
    conversationId: 'conv_007',
    senderName: 'กมลชนก สุขใจ',
    messages: [
      { text: 'มีบริการหลังการขายไหมคะ', isUser: true },
      { text: 'มีครับ มีทีมซัพพอร์ตพร้อมให้บริการ 24/7', isUser: false },
      { text: 'ดีมากเลยค่ะ', isUser: true },
      { text: 'ขอบคุณที่ให้ความไว้วางใจครับ', isUser: false },
    ],
  },
  {
    conversationId: 'conv_008',
    senderName: 'ปิยะ เก่งมาก',
    messages: [
      { text: 'ต้องการข้อมูลเพิ่มเติมครับ', isUser: true },
      { text: 'ส่งเอกสารข้อมูลให้แล้วครับ กรุณาตรวจสอบ', isUser: false },
      { text: 'ขอบคุณครับ', isUser: true },
    ],
  },
];

async function main() {
  console.log('🌱 Seeding Facebook Messenger data (Thai)...');

  // Optional filter:
  // - `--tenantSlug acme-corp`
  // - `TENANT_SLUG=acme-corp`
  const args = process.argv.slice(2);
  const slugFromArgs = (() => {
    const i = args.findIndex((a) => a === '--tenantSlug' || a === '--tenant-slug');
    if (i >= 0 && args[i + 1]) return String(args[i + 1]).trim();
    return '';
  })();
  const tenantSlug = (process.env.TENANT_SLUG || slugFromArgs || 'acme-corp').trim();

  const tenants = await prisma.tenant.findMany({
    where: tenantSlug ? { slug: tenantSlug } : undefined,
    select: { id: true, slug: true, name: true },
  });

  if (tenantSlug && tenants.length === 0) {
    throw new Error(`Tenant not found for slug "${tenantSlug}"`);
  }

  let totalCreated = 0;

  for (const tenant of tenants) {
    console.log(`📦 Processing tenant: ${tenant.name} (${tenant.slug})`);

    const pageId = '1234567890123456';
    const pageName = `${tenant.name} - Facebook Page`;

    for (const template of conversationTemplates) {
      const baseTime = new Date();
      baseTime.setDate(baseTime.getDate() - Math.floor(Math.random() * 7)); // Random time within last 7 days

      for (let i = 0; i < template.messages.length; i++) {
        const msg = template.messages[i];
        const timestamp = new Date(baseTime);
        timestamp.setMinutes(timestamp.getMinutes() + i * 15); // 15 minutes between messages

        const messageId = `msg_${template.conversationId}_${i + 1}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const senderId = msg.isUser
          ? `user_${template.conversationId}`
          : `page_${pageId}`;

        try {
          await prisma.facebookSync.upsert({
            where: {
              tenantId_messageId: {
                tenantId: tenant.id,
                messageId,
              },
            },
            update: {
              messageText: msg.text,
              messageType: 'text',
              timestamp,
              syncedAt: new Date(),
              metadata: {
                source: 'messenger_api',
                syncFrequency: 'realtime',
                isRead: true,
                conversationIndex: i,
              },
            },
            create: {
              tenantId: tenant.id,
              pageId,
              pageName,
              conversationId: template.conversationId,
              messageId,
              senderId,
              senderName: msg.isUser ? template.senderName : pageName,
              messageText: msg.text,
              messageType: 'text',
              timestamp,
              syncedAt: new Date(),
              metadata: {
                source: 'messenger_api',
                syncFrequency: 'realtime',
                isRead: true,
                conversationIndex: i,
              },
            },
          });
          totalCreated++;
        } catch (error) {
          console.error(`Failed to create message ${messageId}:`, error);
        }
      }
    }

    console.log(`✅ Created ${conversationTemplates.length} conversations for ${tenant.name}`);
  }

  console.log(`\n✅ Messenger seeding complete. Total messages created: ${totalCreated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
