# YDM Platform – คู่มือเมนูและการใช้งาน

เอกสารนี้รวบรวม **เมนูทั้งหมดในแถบด้านข้าง (Sidebar)** (มาจาก `apps/frontend-client/src/config/menu.ts`) และอธิบายวิธีใช้งานแต่ละหน้าในภาพรวมระดับสูง

## แนวคิดพื้นฐาน (ใช้ร่วมกันทุกหน้า)

- **เข้าสู่ระบบ (Login)**: `http://localhost:3001/login`
- **Tenant (Workspace/พื้นที่ทำงาน)**: ข้อมูลส่วนใหญ่เป็นแบบ **Multi-tenant** โปรดตรวจสอบว่าเลือก tenant ถูกต้องใน UI แล้ว เพราะทุก API call จะส่ง header `x-tenant-id`
- **สิทธิ์ (RBAC)**: ถ้าเจอ `403` หรือ unauthorized แปลว่า role ที่ล็อกอินอยู่ **อาจไม่มี permission** ที่หน้านั้นต้องใช้
- **API base URL**: ค่าเริ่มต้นคือ `http://localhost:3000` (frontend จะอ่านจาก `VITE_API_URL`)

## Dashboard

### Dashboard ภาพรวม (`/dashboard`)
- **คืออะไร**: หน้าสรุปภาพรวมระดับสูง
- **วิธีใช้**: ใช้เป็นจุดเริ่มต้น แล้วค่อยเจาะลึกไปยัง dashboard เฉพาะด้านด้านล่าง

### CDP Dashboard (`/dashboard/cdp`)
- **คืออะไร**: Dashboard ฝั่ง CDP สำหรับทีมการตลาด (KPI, Segment, Trend)
- **วิธีใช้**: ติดตาม KPI ลูกค้า และใช้ร่วมกับ **Audience/Segments** และ **Event Tracking**

### Customer, Order & DCP Dashboard (`/dashboard/customer-order-dcp`)
- **คืออะไร**: Dashboard เชิงปฏิบัติการที่รวม KPI แบบลูกค้า/ออเดอร์ พร้อมสัญญาณจาก DCP
- **วิธีใช้**: ดูภาพรวมเร็ว ๆ สำหรับทีมขาย/ปฏิบัติการ และเปรียบเทียบแนวโน้มข้ามช่วงเวลา (บางส่วนอิง mock/seed ตามที่มี)

### Event/SDK Dashboard (`/dashboard/event-sdk`)
- **คืออะไร**: Dashboard สำหรับทีมการตลาด/โปรดักต์ (Funnel, Top events, สถานะสุขภาพ SDK)
- **วิธีใช้**: ใช้คู่กับ **Event Tracking** เพื่อตรวจสอบ payload ของ event และปริมาณ event ที่เข้ามา

## Data & Tracking

### Event Tracking (`/data/events`)
- **คืออะไร**: ดู event ของลูกค้า (ลักษณะคล้าย GA4 event stream)
- **วิธีใช้**:
  - กรอง/ค้นหา event, เปลี่ยนหน้า (paginate) และเปิดดูรายละเอียด payload
  - ใช้ตรวจสอบการติดตั้ง tracking และคุณภาพข้อมูล

### Profile Explorer (`/data/profiles`)
- **คืออะไร**: รายชื่อลูกค้า + แผงรายละเอียด
- **วิธีใช้**:
  - ค้นหาและเปิดโปรไฟล์ลูกค้า
  - แผงรายละเอียดจะแยกข้อมูล **Billing (ก่อนการ tracking)** กับ **Tracked events**
  - แสดงสัญญาณ acquisition ล่าสุด (product + FB Ads) เมื่อมีข้อมูล

## Audience

### Preset Audience (`/audience/preset-audience`)
- **คืออะไร**: กลุ่มผู้ชม/เซกเมนต์ที่เตรียมไว้ล่วงหน้า
- **วิธีใช้**: เลือก audience ที่มีอยู่แล้วเพื่อใช้เป็น input ในการทำ campaign/broadcast

### Audience Builder (`/audience/builder`)
- **คืออะไร**: รายการ “builder segments” ที่บันทึกไว้
- **วิธีใช้**:
  - สร้างใหม่: `/audience/builder/new`
  - แก้ไข: `/audience/builder/:id`
  - สร้าง segment ด้วย canvas (nodes/joins/filters) แล้วบันทึกเป็นนิยามของ segment

## Content Management

### LINE Content (`/content/line`)
- **คืออะไร**: จัดการเทมเพลตคอนเทนต์ LINE (text/flex/richmenu payloads)
- **วิธีใช้**: สร้างคอนเทนต์ครั้งเดียว แล้วนำไป reuse ใน Chat Auto Messager และ Message Center

### Messenger Content (`/content/messenger`)
- **คืออะไร**: จัดการเทมเพลต payload ของ Messenger
- **วิธีใช้**: สร้าง payload สำหรับการตอบกลับ/การ broadcast ใน Messenger

### Email Content (`/content/email`)
- **คืออะไร**: จัดการเทมเพลต/ payload ของอีเมล
- **วิธีใช้**: นำไป reuse ในการส่งแบบ immediate หรือ campaign

### SMS Content (`/content/sms`)
- **คืออะไร**: จัดการเทมเพลตข้อความ SMS
- **วิธีใช้**: นำไป reuse ในการส่งแบบ immediate หรือ campaign

## Message Center

### ส่งข้อความ (Immediate) (`/messages/send`)
- **คืออะไร**: Draft → save → ส่งทันที โดย draft เดิมสามารถส่งซ้ำได้หลายครั้ง
- **วิธีใช้**:
  - สร้างใหม่: `/messages/send/new`
  - เปิด/แก้ไข: `/messages/send/:id`
  - กด **Save Draft** เพื่อบันทึก
  - กด **Send Message** เพื่อสร้าง broadcast + records การส่ง (delivery)
  - ทุกครั้งที่ส่งจะมีรายการ **History** ให้เปิดดูจากหน้า list/detail

### Campaign (ตั้งเวลาส่ง) (`/messages/campaign`)
- **คืออะไร**: แคมเปญ broadcast แบบตั้งเวลา
- **วิธีใช้**:
  - สร้าง: `/messages/campaign/new`
  - แก้ไข: `/messages/campaign/:id`
  - ตั้งค่า schedule (Once/Daily/Weekly/Monthly, เวลา, start/end, always)
  - ใช้ **Run now** เพื่อสร้าง broadcast ทันที

### Auto Marketing / Journey (`/messages/automation`)
- **คืออะไร**: ระบบ automation/journey builder แบบ canvas (start/audience/condition/wait/output nodes)
- **วิธีใช้**:
  - สร้าง: `/messages/automation/new`
  - แก้ไข: `/messages/automation/:id`
  - สร้าง flow โดยเชื่อม node และตั้งค่ารายละเอียดของ node ใน inspector

### ประวัติข้อความ (Message History) (`/messages/history`)
- **คืออะไร**: รายการ broadcast ทั้งหมด (immediate + campaign)
- **วิธีใช้**: กรอง/เปลี่ยนหน้า แล้วเปิด broadcast เพื่อดูรายละเอียด + รายการ delivery

### รายงานการส่ง (Delivery Report) (`/messages/report`)
- **คืออะไร**: KPI การส่ง และ records รายการส่งรายบุคคลสำหรับ broadcast ที่เลือก
- **วิธีใช้**: เลือก broadcast จากแผงซ้าย แล้วดูยอดรวมและสถานะการส่ง

## Data Sources

### Customer (Company) (`/data/sources/customer`)
- **คืออะไร**: นำเข้า/ซิงก์ลูกค้าประเภทบริษัท
- **วิธีใช้**: ใช้เติมข้อมูลลูกค้าบริษัทของ CDP/CRM (B2B)

### Contact (Company) (`/data/sources/contact-company`)
- **คืออะไร**: นำเข้า/ซิงก์รายชื่อผู้ติดต่อภายใต้บริษัท
- **วิธีใช้**: ใช้ดูแลรายชื่อ contact ของบริษัทสำหรับ workflow ฝั่ง CRM

### Quotation (`/data/sources/quotation`)
- **คืออะไร**: นำเข้าเอกสารใบเสนอราคา + รายการสินค้า (line items)
- **วิธีใช้**:
  - การ import CSV รองรับ records แบบ **HEADER / DETAIL / FOOTER**
  - ใช้ action **View** เพื่อเปิด modal รายละเอียด ดู line items และสรุป footer
  - ส่วน Product insights จะแสดง **Product Category Summary** และ **Top 10 Products** เหนือรายการ

### Billing (`/data/sources/billing`)
- **คืออะไร**: เอกสารวางบิล + line items (คล้าย Quotation)
- **วิธีใช้**:
  - เปิดดู line items ใน modal รายละเอียด
  - ดู product insights (สรุปตามหมวดหมู่ + top products)

### CSAT (`/data/sources/csat`)
- **คืออะไร**: ผลตอบแบบประเมินความพึงพอใจลูกค้า โดยจัดกลุ่มตาม **Project**
- **วิธีใช้**:
  - กรองตามคะแนน/วันที่/ช่องทาง/หมวดหมู่/project
  - ดูสรุป **Project Summary** และ rollups แบบ **Customer × Project**
  - import CSV หรือ sync (ปุ่ม sync เป็น placeholder หากยังไม่ผูก provider จริง)

### Lead (`/data/sources/lead-all`)
- **คืออะไร**: รายการ lead ที่มาจากการ import/integration
- **วิธีใช้**: ใช้เป็นจุดเริ่มต้นเข้าสู่กระบวนการ Lead & CRM pipeline

### LINE OA Add Friend (`/data/sources/line-add-friend`)
- **คืออะไร**: จัดการข้อมูลผู้ติดตาม/เพิ่มเพื่อน LINE
- **วิธีใช้**: ใช้ติดตาม follow/unfollow และเชื่อมกับลูกค้า (ถ้ามีข้อมูลเชื่อมได้)

### LINE OA Bot/Group Bot (`/data/sources/line-bot`)
- **คืออะไร**: ตัวดู event ของบอทใน group/room
- **วิธีใช้**:
  - เลือกดูแบบ **Groups** หรือ **Timeline**
  - ใช้ server-side filters (`groupOnly=1`) เพื่อให้เห็น event ของ group/room ทันที

### LINE OA Event (`/data/sources/line-event`)
- **คืออะไร**: ตัวดู event ดิบที่ ingest จาก LINE webhook
- **วิธีใช้**:
  - ยิง webhook endpoint เพื่อ ingest event
  - กรองตาม eventType/status/ช่วงวันที่

### Messenger (`/data/sources/messenger`)
- **คืออะไร**: ซิงก์/ingest ข้อมูล Messenger (และเชื่อมไปยังแอปแชท)
- **วิธีใช้**: ใช้ตรวจสอบการ ingest และเชื่อมไปยัง Chat Center / Chat Auto Messager

### Facebook Post (`/data/sources/facebook-post`)
- **คืออะไร**: จัดการโพสต์ Facebook (sync + draft + publish)
- **วิธีใช้**:
  - เชื่อม Facebook Pages (page ID + access token)
  - สร้าง draft (มี preview รูป) และ publish
  - sync โพสต์จาก Graph API เพื่อดูรายละเอียด

## Application

### Chat Center (`/applications/chat-center`)
- **คืออะไร**: ตัวดูบทสนทนาแบบรวมศูนย์ (inbound + outbound)
- **วิธีใช้**:
  - เปิด thread แล้วตอบกลับ (outbound จะถูก queue และแสดงใน thread)
  - ข้อมูลถูกสร้างจาก LINE events + FB sync + outbox

### Chat Auto Messager (`/applications/chat-auto-messager`)
- **คืออะไร**: กฎ keyword สำหรับตอบกลับอัตโนมัติ และสามารถแท็กลูกค้าได้
- **วิธีใช้**:
  - สร้างกฎ keyword สำหรับข้อความขาเข้า (inbound)
  - (ทางเลือก) ผูก **tags** เพื่อให้ระบบ assign เมื่อ match
  - ดู **History** ของแต่ละกฎ (ส่งถึงใครบ้าง)

## Data Log

### API Log (`/data/logs/api`)
- **คืออะไร**: log การเรียก API (ขึ้นกับการ implement/บางส่วนเป็น placeholder)
- **วิธีใช้**: ใช้ช่วย troubleshoot integration และการ import

### Import Log (`/data/logs/import`)
- **คืออะไร**: log การทำงานของ import (ขึ้นกับการ implement/บางส่วนเป็น placeholder)
- **วิธีใช้**: ใช้ debug import ที่ล้มเหลว และปัญหาการ parse ไฟล์

### Error Log (`/data/logs/error`)
- **คืออะไร**: log error ของระบบ (ขึ้นกับการ implement/บางส่วนเป็น placeholder)
- **วิธีใช้**: ใช้ตามรอย runtime errors และงาน background

## System Setup

### Channel Setup (`/settings/channels`)
- **คืออะไร**: ตั้งค่า **หลาย channel accounts** ต่อ tenant
- **วิธีใช้**:
  - เพิ่มหลายบัญชี **LINE OA** (เช่น Main/Support) และหลายบัญชี/เพจ **Facebook**
  - แต่ละ account จะถูกเก็บเป็น `ChatChannelAccount` และเก็บ credential ไว้ใน `metadata`

### API & Webhook (`/settings/api`)
- **คืออะไร**: จุด webhook และการตั้งค่า metadata ต่อ account แบบยืดหยุ่น
- **วิธีใช้**:
  - สำหรับ **LINE** ให้ใช้ URL ที่ระบบสร้างให้ต่อ account:  
    `POST /line-events/webhook/:tenantId/:channelAccountId`
  - สำหรับช่องทางอื่น ให้เก็บ receiver URL และ config การ validate ไว้ใน `metadata` (JSON ยืดหยุ่น)

### Label Keywords (`/settings/label-keywords`)
- **คืออะไร**: กฎ “keyword → tag” แบบ global ที่ใช้ได้ **ทุกช่องทาง**
- **ทำงานอย่างไร**:
  - เมื่อมีข้อความถูก ingest (จาก webhook หรือ API) ระบบจะ match keyword แล้วเขียน `CustomerTag` ลงในโปรไฟล์ลูกค้า
  - tag เหล่านี้จะกลายเป็น “Tag data” สำหรับการทำ segmentation/campaigns ภายหลัง
- **วิธีใช้**:
  - สร้างกฎ (keywords → เลือก tags)
  - ใช้ **Test Match** เพื่อทดสอบ logic การ match

### Custom Field (`/settings/custom-fields`)
- **คืออะไร**: จัดการ custom fields (ขึ้นกับการ implement/บางส่วนเป็น placeholder)
- **วิธีใช้**: นิยาม field เพิ่มเติมเพื่อเก็บข้อมูลบน customers/deals ฯลฯ

### User & Role (`/settings/team`)
- **คืออะไร**: จัดการทีมและการกำหนด role
- **วิธีใช้**: เพิ่มสมาชิกทีม กำหนด roles/permissions (RBAC)

### Company Profile (`/settings/organization`)
- **คืออะไร**: ตั้งค่าองค์กร (ขึ้นกับการ implement/บางส่วนเป็น placeholder)
- **วิธีใช้**: ตั้งค่าโปรไฟล์บริษัท, branding, ข้อมูลธุรกิจ

## ฟีเจอร์เพิ่มเติมสำหรับ B2C (เฉพาะ tenant type B2C/HYBRID ที่เกี่ยวข้อง)

### Customer Profile (`/customers/profile`)
### Timeline (`/customers/timeline`)
### Tags/Attributes (`/customers/tags`)
### Consent (`/customers/consent`)
- **คืออะไร**: เครื่องมือฝั่งลูกค้าแบบ B2C (บางหน้าอาจเป็น placeholder ขึ้นกับ build)

## B2C Insights (เฉพาะ B2C)

### Engagement (`/insights/engagement`)
### Campaign Performance (`/insights/campaign`)
### Funnel (`/insights/funnel`)
- **คืออะไร**: Dashboard เชิง insight (ขึ้นกับการ implement/บางส่วนเป็น placeholder)

## Lead & CRM (B2B/HYBRID)

### Lead Management (`/crm/leads`)
### Account Management (`/crm/accounts`)
### Contact Management (`/crm/contacts`)
### Deal/Opportunity (`/crm/deals`)
### Activity Log (`/crm/activities`)
- **คืออะไร**: เครื่องมือ CRM สำหรับจัดการ pipeline และกิจกรรมต่าง ๆ

## Sales Insight (เฉพาะ B2B)

### Lead Funnel (`/insights/lead-funnel`)
### Deal Stage (`/insights/deal-stage`)
### Win/Lost (`/insights/win-lost`)
- **คืออะไร**: Dashboard เชิง insight สำหรับฝ่ายขาย (ขึ้นกับการ implement/บางส่วนเป็น placeholder)

## ฟีเจอร์เพิ่มเติมสำหรับ Hybrid (เฉพาะ HYBRID)

### Customer (Individual) (`/hybrid/customers`)
### Account (Company) (`/hybrid/accounts`)
### Contact (`/hybrid/contacts`)
### Relationship Mapping (`/hybrid/relationships`)
### Lead Management (`/hybrid/leads`)
### Deal/Opportunity (`/hybrid/deals`)
### Pipeline (`/hybrid/pipeline`)
- **คืออะไร**: Workflow สำหรับ tenant แบบ Hybrid (ขึ้นกับการ implement/บางส่วนเป็น placeholder)

---

## หมายเหตุสำหรับนักพัฒนา (Developers)

- เมนู sidebar มาจาก `apps/frontend-client/src/config/menu.ts`
- route หลักถูก register ใน `apps/frontend-client/src/App.tsx` (route ภายใต้ `/settings/*` เป็น nested ใน `apps/frontend-client/src/pages/Settings.tsx`)
- multi-channel accounts ถูกเก็บใน `ChatChannelAccount` (`prisma/schema.prisma`) และเรียกผ่าน `/chat-center/channel-accounts`

