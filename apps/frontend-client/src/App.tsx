import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DashboardB2B } from './pages/DashboardB2B';
import { DashboardB2C } from './pages/DashboardB2C';
import { CustomerList } from './pages/cdp/CustomerList';
import { Customer360 } from './pages/cdp/Customer360';
import { SegmentList } from './pages/cdp/SegmentList';
import { CustomerAnalytics } from './pages/cdp/CustomerAnalytics';
import { DataIntegration } from './pages/cdp/DataIntegration';
import { ErpCustomerData } from './pages/data/ErpCustomerData';
import { ContactCompanyData } from './pages/data/ContactCompanyData';
import { QuotationData } from './pages/data/QuotationData';
import { BillingData } from './pages/data/BillingData';
import { LineEventData } from './pages/data/LineEventData';
import { LineAddFriend } from './pages/data/LineAddFriend';
import { LineBot } from './pages/data/LineBot';
import { FacebookSync } from './pages/data/FacebookSync';
import { CsatsData } from './pages/data/CsatData';
import { PresetAudience } from './pages/audience/PresetAudience';
import { LeadList } from './pages/crm/LeadList';
import { DealKanban } from './pages/crm/DealKanban';
import { CommunicationHub } from './pages/crm/CommunicationHub';
import { ActivityList } from './pages/crm/ActivityList';
import { AccountList } from './pages/crm/AccountList';
import { ContactList } from './pages/crm/ContactList';
import { MarketingAutomation } from './pages/MarketingAutomation';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Support } from './pages/Support';
import { LineContentPage } from './pages/content/LineContent';
import { MessengerContentPage } from './pages/content/MessengerContent';
import { EmailContentPage } from './pages/content/EmailContent';
import { SmsContentPage } from './pages/content/SmsContent';
import { ChatCenter } from './pages/application/ChatCenter';
import { ChatAutoMessager } from './pages/application/ChatAutoMessager';
import { SendMessagePage } from './pages/messages/SendMessage';
import { ImmediateListPage } from './pages/messages/ImmediateList';

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
            {/* CDP Routes */}
            <Route path="cdp/customers" element={<CustomerList />} />
            <Route path="cdp/customers/:id" element={<Customer360 />} />
            <Route path="cdp/segments" element={<SegmentList />} />
            <Route path="cdp/analytics" element={<CustomerAnalytics />} />
            <Route path="cdp/integration" element={<DataIntegration />} />
            {/* Audience Routes */}
            <Route path="audience/preset-audience" element={<PresetAudience />} />
            <Route path="audience/preset" element={<Navigate to="/audience/preset-audience" replace />} />
            {/* Data Sources Routes */}
            <Route path="data/sources/customer" element={<ErpCustomerData />} />
            <Route path="data/sources/contact-company" element={<ContactCompanyData />} />
            <Route path="data/sources/quotation" element={<QuotationData />} />
            <Route path="data/sources/billing" element={<BillingData />} />
            <Route path="data/sources/line-event" element={<LineEventData />} />
            <Route path="data/sources/facebook-sync" element={<FacebookSync />} />
            <Route path="data/sources/facebook-sync/chat-center" element={<Navigate to="/applications/chat-center" replace />} />
            <Route path="data/sources/facebook-sync/chat-auto-messager" element={<Navigate to="/applications/chat-auto-messager" replace />} />
            <Route path="data/sources/line-add-friend" element={<LineAddFriend />} />
            <Route path="data/sources/line-bot" element={<LineBot />} />
            <Route path="data/sources/csat" element={<CsatsData />} />
            <Route path="data/sources/lead-all" element={<LeadList />} />
            {/* CRM Routes */}
            <Route path="crm/deals" element={<DealKanban />} />
            <Route path="crm/communication" element={<CommunicationHub />} />
            <Route path="crm/activities" element={<ActivityList />} />
            <Route path="crm/contacts" element={<ContactList />} />
            <Route path="crm/accounts" element={<AccountList />} />
            {/* Marketing */}
            <Route path="marketing" element={<MarketingAutomation />} />
            {/* Message Center */}
            <Route path="messages/send" element={<ImmediateListPage />} />
            <Route path="messages/send/new" element={<SendMessagePage />} />
            <Route path="messages/send/:id" element={<SendMessagePage />} />
            {/* Content */}
            <Route path="content/line" element={<LineContentPage />} />
            <Route path="content/messenger" element={<MessengerContentPage />} />
            <Route path="content/email" element={<EmailContentPage />} />
            <Route path="content/sms" element={<SmsContentPage />} />
            {/* Applications */}
            <Route path="applications/chat-center" element={<ChatCenter />} />
            <Route path="applications/chat-auto-messager" element={<ChatAutoMessager />} />
            {/* Redirect old application paths */}
            <Route path="application/facebook-sync" element={<Navigate to="/data/sources/facebook-sync" replace />} />
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
