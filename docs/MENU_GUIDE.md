# YDM Platform – Menu & Usage Guide

This document lists **all sidebar menus** (from `apps/frontend-client/src/config/menu.ts`) and explains how to use each page at a high level.

## Global concepts (applies to all pages)

- **Login**: `http://localhost:3001/login`
- **Tenant (workspace)**: Most data is **multi-tenant**. Make sure you selected the correct tenant in the UI; API calls send `x-tenant-id`.
- **Permissions (RBAC)**: If you see `403`/unauthorized, the logged-in role may be missing a permission.
- **API base URL**: by default `http://localhost:3000` (frontend uses `VITE_API_URL`).

## Dashboard

### Overall Dashboard (`/dashboard`)
- **What it is**: A high-level overview page.
- **How to use**: Use as entry point; drill down to the specific dashboards below.

### CDP Dashboard (`/dashboard/cdp`)
- **What it is**: CDP-focused dashboard for marketing teams (KPIs, segments, trends).
- **How to use**: Monitor customer KPIs; use alongside Audience/Segments and Event Tracking.

### Customer, Order & DCP Dashboard (`/dashboard/customer-order-dcp`)
- **What it is**: Operational dashboard combining customer/order style KPIs with DCP signals.
- **How to use**: Quick pulse for sales/ops; compare trends across periods (mock/seed-driven where applicable).

### Event/SDK Dashboard (`/dashboard/event-sdk`)
- **What it is**: Event/SDK dashboard for marketing/product teams (funnels, top events, SDK health).
- **How to use**: Pair with **Event Tracking** to validate event payloads and volume.

## Data & Tracking

### Event Tracking (`/data/events`)
- **What it is**: Browse customer events (GA4-style event stream).
- **How to use**:
  - Filter/search events, paginate, and open payload details.
  - Use it to verify tracking instrumentation and data quality.

### Profile Explorer (`/data/profiles`)
- **What it is**: Customer list + detail panel.
- **How to use**:
  - Search and open a customer profile.
  - Detail panel separates **Billing (before tracking)** vs **Tracked events** information.
  - Shows last acquisition signals (product + FB Ads) when available.

## Audience

### Preset Audience (`/audience/preset-audience`)
- **What it is**: A set of predefined audiences/segments.
- **How to use**: Choose an existing audience as input for campaigns/broadcasts.

### Audience Builder (`/audience/builder`)
- **What it is**: List of saved “builder” segments.
- **How to use**:
  - Create: `/audience/builder/new`
  - Edit: `/audience/builder/:id`
  - Build segments using a canvas (nodes/joins/filters) and save as a segment definition.

## Content Management

### LINE Content (`/content/line`)
- **What it is**: Manage LINE content templates (text/flex/richmenu payloads).
- **How to use**: Create content once; reuse in Chat Auto Messager and Message Center.

### Messenger Content (`/content/messenger`)
- **What it is**: Manage Messenger payload templates.
- **How to use**: Create payloads for Messenger responses/broadcasts.

### Email Content (`/content/email`)
- **What it is**: Manage email templates/payloads.
- **How to use**: Reuse in immediate/campaign messaging.

### SMS Content (`/content/sms`)
- **What it is**: Manage SMS message templates.
- **How to use**: Reuse in immediate/campaign messaging.

## Message Center

### Send Message (Immediate) (`/messages/send`)
- **What it is**: Draft → save → send immediately. Same draft can be sent multiple times.
- **How to use**:
  - Create new: `/messages/send/new`
  - Open/edit: `/messages/send/:id`
  - Click **Save Draft** to persist.
  - Click **Send Message** to create a broadcast + delivery records.
  - Each send creates **History** entries you can review from list/detail.

### Campaign (Scheduled) (`/messages/campaign`)
- **What it is**: Scheduled broadcast campaigns.
- **How to use**:
  - Create: `/messages/campaign/new`
  - Edit: `/messages/campaign/:id`
  - Configure schedule (Once/Daily/Weekly/Monthly, time, start/end, always).
  - Use **Run now** to generate a broadcast immediately.

### Auto Marketing / Journey (`/messages/automation`)
- **What it is**: Automation/journey builder with a canvas (start/audience/condition/wait/output nodes).
- **How to use**:
  - Create: `/messages/automation/new`
  - Edit: `/messages/automation/:id`
  - Build flows by connecting nodes; configure node details in inspector.

### Message History (`/messages/history`)
- **What it is**: List all broadcasts (immediate + campaign).
- **How to use**: Filter/paginate, open a broadcast to see details + delivery list.

### Delivery Report (`/messages/report`)
- **What it is**: Delivery KPIs and per-delivery records for a selected broadcast.
- **How to use**: Pick a broadcast from the left panel and review totals and delivery statuses.

## Data Sources

### Customer (Company) (`/data/sources/customer`)
- **What it is**: Import/sync company customers.
- **How to use**: Use to populate CDP/CRM company customer data (B2B).

### Contact (Company) (`/data/sources/contact-company`)
- **What it is**: Import/sync contacts under companies.
- **How to use**: Maintain company contact lists for CRM workflows.

### Quotation (`/data/sources/quotation`)
- **What it is**: Import quotation documents + line items.
- **How to use**:
  - Import CSV supports **HEADER / DETAIL / FOOTER** records.
  - Use **View** action to open detail modal showing line items and footer summary.
  - Product insights show **Product Category Summary** and **Top 10 Products** above the list.

### Billing (`/data/sources/billing`)
- **What it is**: Billing documents + line items, similar to Quotation.
- **How to use**:
  - View billing line items in a detail modal.
  - See product insights (category summary + top products).

### CSAT (`/data/sources/csat`)
- **What it is**: Customer satisfaction responses, grouped by **Project**.
- **How to use**:
  - Filter by score/date/channel/category/project.
  - Review **Project Summary** and **Customer × Project** rollups.
  - Import CSV or sync (sync is placeholder unless implemented for a real provider).

### Lead (`/data/sources/lead-all`)
- **What it is**: Lead list sourced from imports/integrations.
- **How to use**: Use as the entry point into the Lead & CRM pipeline.

### LINE OA Add Friend (`/data/sources/line-add-friend`)
- **What it is**: Manage LINE follower/add-friend data.
- **How to use**: Use to monitor follow/unfollow, link to customers if available.

### LINE OA Bot/Group Bot (`/data/sources/line-bot`)
- **What it is**: Group/room bot event viewer.
- **How to use**:
  - View by **Groups** or **Timeline**.
  - Uses server-side filters (`groupOnly=1`) so group/room events appear immediately.

### LINE OA Event (`/data/sources/line-event`)
- **What it is**: Raw LINE webhook event ingestion viewer.
- **How to use**:
  - Use webhook endpoint to ingest events.
  - Filter by eventType/status/date range.

### Messenger (`/data/sources/messenger`)
- **What it is**: Messenger sync / data ingestion (and links to Chat apps).
- **How to use**: Use to verify ingestion and route to Chat Center / Chat Auto Messager.

### Facebook Post (`/data/sources/facebook-post`)
- **What it is**: Manage Facebook posts (sync + draft + publish).
- **How to use**:
  - Connect Facebook Pages (page ID + access token).
  - Create drafts (with image preview) and publish.
  - Sync posts from Graph API to view details.

## Application

### Chat Center (`/applications/chat-center`)
- **What it is**: Unified conversation viewer (inbound + outbound).
- **How to use**:
  - Open a conversation thread and send replies (outbound is queued and shown in thread).
  - Derived from LINE events + FB sync + outbox.

### Chat Auto Messager (`/applications/chat-auto-messager`)
- **What it is**: Keyword rules that auto-respond and can tag customers.
- **How to use**:
  - Create keyword rules for inbound messages.
  - (Optional) attach **tags** to assign when matched.
  - View each rule’s **History** (who was messaged).

## Data Log

### API Log (`/data/logs/api`)
- **What it is**: API request logs (placeholder/implementation dependent).
- **How to use**: Use for troubleshooting integrations and imports.

### Import Log (`/data/logs/import`)
- **What it is**: Import execution log (placeholder/implementation dependent).
- **How to use**: Debug failed imports and file parsing issues.

### Error Log (`/data/logs/error`)
- **What it is**: System errors log (placeholder/implementation dependent).
- **How to use**: Trace runtime errors and background processing issues.

## System Setup

### Channel Setup (`/settings/channels`)
- **What it is**: Configure **multiple channel accounts** per tenant.
- **How to use**:
  - Add multiple **LINE OA** accounts (e.g. Main/Support) and multiple **Facebook** accounts/pages.
  - Each account is stored as `ChatChannelAccount` with credentials in `metadata`.

### API & Webhook (`/settings/api`)
- **What it is**: Webhook endpoints and flexible per-account metadata configuration.
- **How to use**:
  - For **LINE**, use the generated URL per account:  
    `POST /line-events/webhook/:tenantId/:channelAccountId`
  - For other channels, store your receiver URL and validation config in `metadata` (flexible JSON).

### Label Keywords (`/settings/label-keywords`)
- **What it is**: Global keyword → tag rules used **across all channels**.
- **How it works**:
  - When a message is ingested (webhook or API), the system matches keywords and writes `CustomerTag` to the customer profile.
  - These tags become the “Tag data” you can use later for segmentation/campaigns.
- **How to use**:
  - Create rules (keywords → selected tags).
  - Use **Test Match** to validate matching logic.

### Custom Field (`/settings/custom-fields`)
- **What it is**: Manage custom fields (placeholder/implementation dependent).
- **How to use**: Define extra fields to capture on customers/deals/etc.

### User & Role (`/settings/team`)
- **What it is**: Team management and role assignment.
- **How to use**: Add team members, assign roles/permissions (RBAC).

### Company Profile (`/settings/organization`)
- **What it is**: Organization settings (placeholder/implementation dependent).
- **How to use**: Configure company profile, branding, business info.

## B2C extras (only for tenant types B2C/HYBRID where applicable)

### Customer Profile (`/customers/profile`)
### Timeline (`/customers/timeline`)
### Tags/Attributes (`/customers/tags`)
### Consent (`/customers/consent`)
- **What they are**: B2C-centric customer tools (some pages may be placeholder depending on build).

## B2C Insights (B2C only)

### Engagement (`/insights/engagement`)
### Campaign Performance (`/insights/campaign`)
### Funnel (`/insights/funnel`)
- **What they are**: Insight dashboards (placeholder/implementation dependent).

## Lead & CRM (B2B/HYBRID)

### Lead Management (`/crm/leads`)
### Account Management (`/crm/accounts`)
### Contact Management (`/crm/contacts`)
### Deal/Opportunity (`/crm/deals`)
### Activity Log (`/crm/activities`)
- **What they are**: CRM tools for managing pipeline and activities.

## Sales Insight (B2B only)

### Lead Funnel (`/insights/lead-funnel`)
### Deal Stage (`/insights/deal-stage`)
### Win/Lost (`/insights/win-lost`)
- **What they are**: Sales insight dashboards (placeholder/implementation dependent).

## Hybrid extras (HYBRID only)

### Customer (Individual) (`/hybrid/customers`)
### Account (Company) (`/hybrid/accounts`)
### Contact (`/hybrid/contacts`)
### Relationship Mapping (`/hybrid/relationships`)
### Lead Management (`/hybrid/leads`)
### Deal/Opportunity (`/hybrid/deals`)
### Pipeline (`/hybrid/pipeline`)
- **What they are**: Hybrid tenant workflows (placeholder/implementation dependent).

---

## Notes for developers

- Sidebar menus come from `apps/frontend-client/src/config/menu.ts`.
- Main routes are registered in `apps/frontend-client/src/App.tsx` (`/settings/*` routes are nested in `apps/frontend-client/src/pages/Settings.tsx`).
- Multi-channel accounts are stored in `ChatChannelAccount` (`prisma/schema.prisma`), accessed via `/chat-center/channel-accounts`.

