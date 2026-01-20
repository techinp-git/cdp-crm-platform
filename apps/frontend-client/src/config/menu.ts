import { MenuConfig } from '@ydm-platform/types';

export const menuConfig: MenuConfig = {
  items: [
    // ============================================
    // CORE MENU (ALL TYPES)
    // ============================================
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      children: [
        {
          id: 'overall',
          label: 'Overall Dashboard',
          path: '/dashboard',
        },
        {
          id: 'cdp',
          label: 'CDP Dashboard',
          path: '/dashboard/cdp',
        },
        {
          id: 'customer-order-dcp',
          label: 'Customer, Order & DCP Dashboard',
          path: '/dashboard/customer-order-dcp',
        },
        {
          id: 'event-sdk',
          label: 'Event/SDK Dashboard',
          path: '/dashboard/event-sdk',
        },
      ],
    },
    {
      id: 'data-tracking',
      label: 'Data & Tracking',
      icon: 'chart',
      children: [
        {
          id: 'event-tracking',
          label: 'Event Tracking',
          path: '/data/events',
        },
        {
          id: 'profile-explorer',
          label: 'Profile Explorer',
          path: '/data/profiles',
        },
      ],
    },
    {
      id: 'audience',
      label: 'Audience',
      icon: 'filter',
      children: [
        {
          id: 'preset-audience',
          label: 'Preset Audience',
          path: '/audience/preset-audience',
        },
        {
          id: 'audience-builder',
          label: 'Audience Builder',
          description: 'rules: attribute + behavior',
          path: '/audience/builder',
        },
      ],
    },
    {
      id: 'content',
      label: 'Content Management',
      icon: 'briefcase',
      children: [
        {
          id: 'line-content',
          label: 'LINE Content',
          path: '/content/line',
        },
        {
          id: 'messenger-content',
          label: 'Messenger Content',
          path: '/content/messenger',
        },
        {
          id: 'email-content',
          label: 'Email Content',
          path: '/content/email',
        },
        {
          id: 'sms-content',
          label: 'SMS Content',
          path: '/content/sms',
        },
      ],
    },
    {
      id: 'message-center',
      label: 'Message Center',
      icon: 'message-circle',
      description: 'Push/Delivery unified',
      children: [
        {
          id: 'send-message',
          label: 'Send Message (Immediate)',
          path: '/messages/send',
        },
        {
          id: 'campaign',
          label: 'Campaign (Scheduled)',
          path: '/messages/campaign',
        },
        {
          id: 'auto-marketing',
          label: 'Auto Marketing / Journey',
          description: 'placeholder',
          path: '/messages/automation',
        },
        {
          id: 'message-history',
          label: 'Message History',
          path: '/messages/history',
        },
        {
          id: 'delivery-report',
          label: 'Delivery Report',
          path: '/messages/report',
        },
      ],
    },
    {
      id: 'data-sources',
      label: 'Data Sources',
      icon: 'database',
      children: [
        {
          id: 'erp',
          label: 'Customer',
          path: '/data/sources/customer',
        },
        {
          id: 'contact-company',
          label: 'Contact (Company)',
          path: '/data/sources/contact-company',
          requiresTenantType: ['B2B', 'HYBRID'],
        },
        {
          id: 'quotation',
          label: 'Quotation',
          path: '/data/sources/quotation',
          requiresTenantType: ['B2B', 'HYBRID'],
        },
        {
          id: 'billing',
          label: 'Billing',
          path: '/data/sources/billing',
        },
        {
          id: 'csat',
          label: 'CSAT',
          path: '/data/sources/csat',
          requiresTenantType: ['B2B', 'HYBRID'],
        },
        {
          id: 'lead-all',
          label: 'Lead',
          path: '/data/sources/lead-all',
          requiresTenantType: ['B2B', 'HYBRID'],
        },
        {
          id: 'line-add-friend',
          label: 'LINE OA Add Friend',
          path: '/data/sources/line-add-friend',
        },
        {
          id: 'line-bot',
          label: 'LINE OA Bot/Group Bot',
          path: '/data/sources/line-bot',
        },
        {
          id: 'line-event',
          label: 'LINE OA Event',
          path: '/data/sources/line-event',
        },
        {
          id: 'facebook-sync',
          label: 'Messenger',
          path: '/data/sources/messenger',
        },
        {
          id: 'facebook-post',
          label: 'Facebook Post',
          path: '/data/sources/facebook-post',
        },
      ],
    },
    {
      id: 'application',
      label: 'Application',
      icon: 'plug',
      children: [
        {
          id: 'chat-center',
          label: 'Chat Center',
          path: '/applications/chat-center',
        },
        {
          id: 'chat-auto-messager',
          label: 'Chat Auto Messager',
          path: '/applications/chat-auto-messager',
        },
      ],
    },
    {
      id: 'data-log',
      label: 'Data Log',
      icon: 'file-text',
      children: [
        {
          id: 'api-log',
          label: 'API Log',
          path: '/data/logs/api',
        },
        {
          id: 'import-log',
          label: 'Import Log',
          path: '/data/logs/import',
        },
        {
          id: 'error-log',
          label: 'Error Log',
          path: '/data/logs/error',
        },
      ],
    },
    {
      id: 'system-setup',
      label: 'System Setup',
      icon: 'settings',
      children: [
        {
          id: 'channel-setup',
          label: 'Channel Setup',
          description: 'LINE/FB/Email/SMS',
          path: '/settings/channels',
        },
        {
          id: 'api-webhook',
          label: 'API & Webhook',
          path: '/settings/api',
        },
        {
          id: 'data-mapping',
          label: 'Label Keywords',
          path: '/settings/label-keywords',
        },
        {
          id: 'custom-field',
          label: 'Custom Field',
          path: '/settings/custom-fields',
        },
        {
          id: 'user-role',
          label: 'User & Role',
          path: '/settings/team',
        },
        {
          id: 'company-profile',
          label: 'Company Profile',
          path: '/settings/organization',
        },
      ],
    },

    // ============================================
    // B2C EXTRA (Consumer-centric)
    // ============================================
    {
      id: 'customer-management',
      label: 'Customer Management',
      icon: 'users',
      requiresTenantType: ['B2C', 'HYBRID'],
      children: [
        {
          id: 'customer-profile',
          label: 'Customer Profile',
          description: 'individual',
          path: '/customers/profile',
        },
        {
          id: 'customer-timeline',
          label: 'Timeline',
          path: '/customers/timeline',
        },
        {
          id: 'customer-tags',
          label: 'Tags/Attributes',
          path: '/customers/tags',
        },
        {
          id: 'customer-consent',
          label: 'Consent',
          description: 'placeholder',
          path: '/customers/consent',
        },
      ],
    },
    {
      id: 'b2c-insights',
      label: 'Insights',
      icon: 'chart',
      requiresTenantType: ['B2C'],
      description: 'optional',
      children: [
        {
          id: 'engagement',
          label: 'Engagement',
          path: '/insights/engagement',
        },
        {
          id: 'campaign-performance',
          label: 'Campaign Performance',
          path: '/insights/campaign',
        },
        {
          id: 'funnel',
          label: 'Funnel',
          path: '/insights/funnel',
        },
      ],
    },

    // ============================================
    // B2B EXTRA (Account-centric)
    // ============================================
    {
      id: 'lead-crm',
      label: 'Lead & CRM',
      icon: 'briefcase',
      requiresTenantType: ['B2B', 'HYBRID'],
      children: [
        {
          id: 'lead-management',
          label: 'Lead Management',
          description: 'Kanban',
          path: '/crm/leads',
        },
        {
          id: 'account-management',
          label: 'Customer Management',
          description: 'Company',
          path: '/crm/customer-management',
        },
        {
          id: 'contact-management',
          label: 'Contact Management',
          path: '/crm/contacts',
        },
        {
          id: 'deal-opportunity',
          label: 'Deal/Opportunity',
          path: '/crm/deals',
        },
        {
          id: 'activity-log',
          label: 'Activity Log',
          path: '/crm/activities',
        },
      ],
    },
    {
      id: 'sales-insight',
      label: 'Sales Insight',
      icon: 'chart',
      requiresTenantType: ['B2B'],
      children: [
        {
          id: 'lead-funnel',
          label: 'Lead Funnel',
          path: '/insights/lead-funnel',
        },
        {
          id: 'deal-stage',
          label: 'Deal Stage',
          path: '/insights/deal-stage',
        },
        {
          id: 'win-lost',
          label: 'Win/Lost',
          path: '/insights/win-lost',
        },
      ],
    },

    // ============================================
    // HYBRID EXTRA
    // ============================================
    {
      id: 'customer-account',
      label: 'Customer & Account',
      icon: 'users',
      requiresTenantType: ['HYBRID'],
      children: [
        {
          id: 'customer-individual',
          label: 'Customer (Individual)',
          path: '/hybrid/customers',
        },
        {
          id: 'account-company',
          label: 'Account (Company)',
          path: '/hybrid/accounts',
        },
        {
          id: 'contact',
          label: 'Contact',
          description: 'under Account',
          path: '/hybrid/contacts',
        },
        {
          id: 'relationship-mapping',
          label: 'Relationship Mapping',
          description: 'placeholder',
          path: '/hybrid/relationships',
        },
      ],
    },
    {
      id: 'lead-deal',
      label: 'Lead & Deal',
      icon: 'briefcase',
      requiresTenantType: ['HYBRID'],
      children: [
        {
          id: 'lead-management-hybrid',
          label: 'Lead Management',
          path: '/hybrid/leads',
        },
        {
          id: 'deal-opportunity-hybrid',
          label: 'Deal/Opportunity',
          path: '/hybrid/deals',
        },
        {
          id: 'pipeline-hybrid',
          label: 'Pipeline',
          path: '/hybrid/pipeline',
        },
      ],
    },
    // Note: Marketing & Engagement uses Core modules (Message Center, Content Management)
  ],
};
