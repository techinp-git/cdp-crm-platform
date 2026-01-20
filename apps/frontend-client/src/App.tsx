import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DashboardB2B } from './pages/DashboardB2B';
import { DashboardB2C } from './pages/DashboardB2C';
import { CustomerOrderDcpDashboard } from './pages/dashboard/CustomerOrderDcpDashboard';
import { CdpDashboard } from './pages/dashboard/CdpDashboard';
import { EventSdkDashboard } from './pages/dashboard/EventSdkDashboard';
import { CustomerList } from './pages/cdp/CustomerList';
import { Customer360 } from './pages/cdp/Customer360';
import { SegmentList } from './pages/cdp/SegmentList';
import { CustomerAnalytics } from './pages/cdp/CustomerAnalytics';
import { DataIntegration } from './pages/cdp/DataIntegration';
import { ErpCustomerData } from './pages/data/ErpCustomerData';
import { ContactCompanyData } from './pages/data/ContactCompanyData';
import { QuotationData } from './pages/data/QuotationData';
import { BillingData } from './pages/data/BillingData';
import { EventTrackingPage } from './pages/data/EventTracking';
import { ProfileExplorerPage } from './pages/data/ProfileExplorer';
import { LineEventData } from './pages/data/LineEventData';
import { LineAddFriend } from './pages/data/LineAddFriend';
import { LineBot } from './pages/data/LineBot';
import { FacebookSync } from './pages/data/FacebookSync';
import { FacebookPost } from './pages/data/FacebookPost';
import { CsatsData } from './pages/data/CsatData';
import { PresetAudience } from './pages/audience/PresetAudience';
import { AudienceBuilderPage } from './pages/audience/AudienceBuilder';
import { AudienceBuilderListPage } from './pages/audience/AudienceBuilderList';
import { LeadList } from './pages/crm/LeadList';
import { LeadManagementPage } from './pages/crm/LeadManagement';
import { DealKanban } from './pages/crm/DealKanban';
import { CommunicationHub } from './pages/crm/CommunicationHub';
import { ActivityList } from './pages/crm/ActivityList';
import { AccountList } from './pages/crm/AccountList';
import { ContactList } from './pages/crm/ContactList';
import { MarketingAutomation } from './pages/MarketingAutomation';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Support } from './pages/Support';
import { ApiLogPage } from './pages/data/ApiLog';
import { ImportLogPage } from './pages/data/ImportLog';
import { ErrorLogPage } from './pages/data/ErrorLog';
import { TenantTypeGuard } from './components/TenantTypeGuard';
import { LineContentPage } from './pages/content/LineContent';
import { MessengerContentPage } from './pages/content/MessengerContent';
import { EmailContentPage } from './pages/content/EmailContent';
import { SmsContentPage } from './pages/content/SmsContent';
import { ChatCenter } from './pages/application/ChatCenter';
import { ChatAutoMessager } from './pages/application/ChatAutoMessager';
import { SendMessagePage } from './pages/messages/SendMessage';
import { ImmediateListPage } from './pages/messages/ImmediateList';
import { CampaignListPage } from './pages/messages/CampaignList';
import { CampaignBuilderPage } from './pages/messages/CampaignBuilder';
import { AutomationListPage } from './pages/messages/AutomationList';
import { AutomationBuilderPage } from './pages/messages/AutomationBuilder';
import { MessageHistoryPage } from './pages/messages/MessageHistory';
import { DeliveryReportPage } from './pages/messages/DeliveryReport';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dashboard/overview-b2b" element={<DashboardB2B />} />
            <Route path="dashboard/overview-b2c" element={<DashboardB2C />} />
            <Route path="dashboard/cdp" element={<CdpDashboard />} />
            <Route path="dashboard/event-sdk" element={<EventSdkDashboard />} />
            <Route path="dashboard/customer-order-dcp" element={<CustomerOrderDcpDashboard />} />
            {/* CDP Routes */}
            <Route path="cdp/customers" element={<CustomerList />} />
            <Route path="cdp/customers/:id" element={<Customer360 />} />
            <Route path="cdp/segments" element={<SegmentList />} />
            <Route path="cdp/analytics" element={<CustomerAnalytics />} />
            <Route path="cdp/integration" element={<DataIntegration />} />
            {/* Audience Routes */}
            <Route path="audience/preset-audience" element={<PresetAudience />} />
            <Route path="audience/preset" element={<Navigate to="/audience/preset-audience" replace />} />
            <Route path="audience/builder" element={<AudienceBuilderListPage />} />
            <Route path="audience/builder/new" element={<AudienceBuilderPage />} />
            <Route path="audience/builder/:id" element={<AudienceBuilderPage />} />
            {/* Data Sources Routes */}
            <Route path="data/events" element={<EventTrackingPage />} />
            <Route path="data/profiles" element={<ProfileExplorerPage />} />
            <Route path="data/sources/customer" element={<ErpCustomerData />} />
            <Route
              path="data/sources/contact-company"
              element={
                <TenantTypeGuard allowed={['B2B', 'HYBRID']}>
                  <ContactCompanyData />
                </TenantTypeGuard>
              }
            />
            <Route
              path="data/sources/quotation"
              element={
                <TenantTypeGuard allowed={['B2B', 'HYBRID']}>
                  <QuotationData />
                </TenantTypeGuard>
              }
            />
            <Route path="data/sources/billing" element={<BillingData />} />
            <Route path="data/sources/line-event" element={<LineEventData />} />
            <Route path="data/sources/messenger" element={<FacebookSync />} />
            <Route path="data/sources/messenger/chat-center" element={<Navigate to="/applications/chat-center" replace />} />
            <Route path="data/sources/messenger/chat-auto-messager" element={<Navigate to="/applications/chat-auto-messager" replace />} />
            {/* Redirect old Facebook Sync URL to Messenger */}
            <Route path="data/sources/facebook-sync" element={<Navigate to="/data/sources/messenger" replace />} />
            <Route path="data/sources/facebook-sync/chat-center" element={<Navigate to="/applications/chat-center" replace />} />
            <Route path="data/sources/facebook-sync/chat-auto-messager" element={<Navigate to="/applications/chat-auto-messager" replace />} />
            <Route path="data/sources/facebook-post" element={<FacebookPost />} />
            <Route path="data/sources/line-add-friend" element={<LineAddFriend />} />
            <Route path="data/sources/line-bot" element={<LineBot />} />
            <Route
              path="data/sources/csat"
              element={
                <TenantTypeGuard allowed={['B2B', 'HYBRID']}>
                  <CsatsData />
                </TenantTypeGuard>
              }
            />
            <Route
              path="data/sources/lead-all"
              element={
                <TenantTypeGuard allowed={['B2B', 'HYBRID']}>
                  <LeadList />
                </TenantTypeGuard>
              }
            />
            {/* Data Logs */}
            <Route path="data/logs/api" element={<ApiLogPage />} />
            <Route path="data/logs/import" element={<ImportLogPage />} />
            <Route path="data/logs/error" element={<ErrorLogPage />} />
            {/* CRM Routes */}
            <Route path="crm/leads" element={<LeadManagementPage />} />
            <Route path="crm/deals" element={<DealKanban />} />
            <Route path="crm/communication" element={<CommunicationHub />} />
            <Route path="crm/activities" element={<ActivityList />} />
            <Route path="crm/contacts" element={<ContactList />} />
            <Route path="crm/accounts" element={<Navigate to="/crm/customer-management" replace />} />
            <Route path="crm/customer-management" element={<AccountList />} />
            {/* Marketing */}
            <Route path="marketing" element={<MarketingAutomation />} />
            {/* Message Center */}
            <Route path="messages/send" element={<ImmediateListPage />} />
            <Route path="messages/send/new" element={<SendMessagePage />} />
            <Route path="messages/send/:id" element={<SendMessagePage />} />
            <Route path="messages/campaign" element={<CampaignListPage />} />
            <Route path="messages/campaign/new" element={<CampaignBuilderPage />} />
            <Route path="messages/campaign/:id" element={<CampaignBuilderPage />} />
            <Route path="messages/automation" element={<AutomationListPage />} />
            <Route path="messages/automation/new" element={<AutomationBuilderPage />} />
            <Route path="messages/automation/:id" element={<AutomationBuilderPage />} />
            <Route path="messages/history" element={<MessageHistoryPage />} />
            <Route path="messages/report" element={<DeliveryReportPage />} />
            {/* Content */}
            <Route path="content/line" element={<LineContentPage />} />
            <Route path="content/messenger" element={<MessengerContentPage />} />
            <Route path="content/email" element={<EmailContentPage />} />
            <Route path="content/sms" element={<SmsContentPage />} />
            {/* Applications */}
            <Route path="applications/chat-center" element={<ChatCenter />} />
            <Route path="applications/chat-auto-messager" element={<ChatAutoMessager />} />
            {/* Redirect old application paths */}
            <Route path="application/facebook-sync" element={<Navigate to="/data/sources/messenger" replace />} />
            <Route path="application/facebook-sync/chat-center" element={<Navigate to="/applications/chat-center" replace />} />
            <Route path="application/facebook-sync/chat-auto-messager" element={<Navigate to="/applications/chat-auto-messager" replace />} />
            {/* Reports */}
            <Route path="reports" element={<Reports />} />
            {/* Settings */}
            <Route path="settings/*" element={<Settings />} />
            {/* Support */}
            <Route path="support" element={<Support />} />
          </Route>
        </Routes>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
