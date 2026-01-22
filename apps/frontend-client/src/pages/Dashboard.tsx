import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { analyticsApi, customerApi, segmentApi, quotationApi, billingApi, csatApi, lineFollowerApi, chatCenterApi } from '../services/api';
import { KPICard } from '../components/KPICard';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';

// Mock announcements data (will be replaced with real API later)
const mockAnnouncements = [
  {
    id: '1',
    title: 'ระบบ CDP อัปเดตใหม่',
    message: 'เพิ่มฟีเจอร์ Customer 360 View และ Segment Builder ที่ใช้งานง่ายขึ้น',
    type: 'info',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    title: 'การบำรุงรักษาระบบ',
    message: 'ระบบจะปิดปรับปรุงในวันที่ 25 มกราคม 2569 เวลา 02:00-04:00 น.',
    type: 'warning',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    title: 'คู่มือการใช้งานใหม่',
    message: 'อัปเดตคู่มือการใช้งาน CDP Platform เวอร์ชัน 2.0 พร้อมใช้งานแล้ว',
    type: 'success',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
];

export function Dashboard() {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { data: kpis, isLoading: kpisLoading } = useQuery('dashboard-kpis', analyticsApi.getDashboardKPIs);
  const { data: customerGrowth, isLoading: growthLoading } = useQuery(
    'customer-growth-30d',
    () => analyticsApi.getCustomerGrowth(30)
  );
  const { data: segments, isLoading: segmentsLoading } = useQuery('segments', segmentApi.list);
  const { data: recentCustomers, isLoading: customersLoading } = useQuery('recent-customers', async () => {
    const data = await customerApi.list({ limit: 5 });
    return Array.isArray(data) ? data : data?.data || [];
  });
  
  // Data Sources
  const { data: quotationsData, isLoading: quotationsLoading } = useQuery('quotations-dashboard', async () => {
    const data = await quotationApi.list({ limit: 1000 });
    return Array.isArray(data) ? data : data?.data || [];
  });
  
  const { data: billingsData, isLoading: billingsLoading } = useQuery('billings-dashboard', async () => {
    const data = await billingApi.list({ limit: 1000 });
    return Array.isArray(data) ? data : data?.data || [];
  });
  
  const { data: csatData, isLoading: csatLoading } = useQuery('csat-dashboard', async () => {
    const data = await csatApi.list({ limit: 100 });
    return Array.isArray(data) ? data : data?.data || [];
  });

  // LINE OA Add Friend (for Segments)
  const { data: lineFollowersData, isLoading: lineFollowersLoading } = useQuery('line-followers-dashboard', async () => {
    const data = await lineFollowerApi.list({ status: 'FOLLOW', limit: 10000 });
    return Array.isArray(data) ? data : data?.data || [];
  });

  // Unique Messenger conversations (for Quotations)
  const { data: messengerConversations, isLoading: messengerLoading } = useQuery('messenger-conversations-dashboard', async () => {
    const data = await chatCenterApi.getConversations({ channel: 'MESSENGER', limit: 10000 });
    return Array.isArray(data) ? data : [];
  });

  // Today's chat conversations (LINE + Messenger) (for Billings)
  const { data: todayChatConversations, isLoading: todayChatLoading } = useQuery('today-chat-conversations-dashboard', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    
    // Get all conversations
    const allConversations = await chatCenterApi.getConversations({ limit: 10000 });
    const conversations = Array.isArray(allConversations) ? allConversations : [];
    
    // Filter conversations that have messages today
    const todayConversations = conversations.filter((conv: any) => {
      if (!conv.lastAt) return false;
      const lastAt = new Date(conv.lastAt);
      return lastAt >= today;
    });
    
    return todayConversations;
  });

  const isLoading = kpisLoading || growthLoading || segmentsLoading || customersLoading || quotationsLoading || billingsLoading || csatLoading || lineFollowersLoading || messengerLoading || todayChatLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-secondary-text">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  const isB2B = activeTenant?.type === 'B2B' || activeTenant?.type === 'HYBRID';
  const isB2C = activeTenant?.type === 'B2C' || activeTenant?.type === 'HYBRID';
  
  // Calculate data from Data Sources
  const quotations = Array.isArray(quotationsData) ? quotationsData : [];
  const billings = Array.isArray(billingsData) ? billingsData : [];
  const csats = Array.isArray(csatData) ? csatData : [];
  
  // Calculate pipeline value from Quotations (pending/active) and Billings (unpaid)
  const pendingQuotations = quotations.filter((q: any) => q.status === 'PENDING' || q.status === 'DRAFT');
  const unpaidBillings = billings.filter((b: any) => b.status === 'UNPAID' || b.status === 'PENDING');
  const totalPipelineValue = 
    pendingQuotations.reduce((sum: number, q: any) => sum + (Number(q.totalAmount) || 0), 0) +
    unpaidBillings.reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0);
  
  // Calculate paid billings value
  const paidBillings = billings.filter((b: any) => b.status === 'PAID');
  const totalPaidValue = paidBillings.reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0);

  // Calculate customer growth percentage
  const growthData = customerGrowth || [];
  const currentCustomers = kpis?.customers || 0;
  const previousCustomers = growthData.length > 1 ? currentCustomers - (growthData[growthData.length - 1]?.count || 0) : currentCustomers;
  const growthPercentage = previousCustomers > 0 ? ((currentCustomers - previousCustomers) / previousCustomers * 100).toFixed(1) : '0.0';

  // Get user display name
  const userDisplayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || 'ผู้ใช้';

  return (
    <div className="space-y-6">
      {/* Welcome Header with User Info */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6 border border-primary/20">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              สวัสดี, {userDisplayName} 👋
            </h1>
            <p className="text-gray-600">
              {activeTenant?.name || 'Dashboard'} - {activeTenant?.type || 'Platform'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">วันที่</div>
            <div className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleDateString('th-TH', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Announcements Section */}
      {mockAnnouncements.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h2 className="text-lg font-semibold text-gray-900">📢 ข่าวสารจากระบบ</h2>
          </div>
          <div className="space-y-3">
            {mockAnnouncements.slice(0, 3).map((announcement) => (
              <div
                key={announcement.id}
                className={`p-4 rounded-lg border-l-4 ${
                  announcement.type === 'info'
                    ? 'bg-blue-50 border-blue-400'
                    : announcement.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-400'
                    : 'bg-green-50 border-green-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{announcement.title}</h3>
                    <p className="text-sm text-gray-600">{announcement.message}</p>
                  </div>
                  <span className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                    {new Date(announcement.createdAt).toLocaleDateString('th-TH')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CDP Core KPIs */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-primary rounded-full"></div>
          <h2 className="text-xl font-bold text-gray-900">📊 ข้อมูล CDP หลัก</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
            title="ลูกค้าทั้งหมด" 
            value={kpis?.customers || 0}
            subtitle={`เพิ่มขึ้น ${growthPercentage}% จากเดือนที่แล้ว`}
          />
          <KPICard 
            title="LINE OA Add Friend" 
            value={Array.isArray(lineFollowersData) ? lineFollowersData.length : 0}
            subtitle="ผู้ติดตาม LINE Official Account"
          />
          {isB2B && (
            <>
              <KPICard 
                title="Unique Messenger" 
                value={Array.isArray(messengerConversations) ? messengerConversations.length : 0}
                subtitle="การสนทนา Messenger ที่ไม่ซ้ำ"
              />
              <KPICard 
                title="Today Chat (LINE+Messenger)" 
                value={Array.isArray(todayChatConversations) ? todayChatConversations.length : 0}
                subtitle="การสนทนาวันนี้"
              />
            </>
          )}
          {isB2C && (
            <>
              <KPICard title="ผู้ใช้งานที่ใช้งาน" value={kpis?.customers || 0} />
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-600 mb-2">อัตราการมีส่วนร่วม</h3>
                <p className="text-3xl font-bold text-primary">68.5%</p>
                <p className="text-xs text-gray-500 mt-1">+2.3% จากเดือนที่แล้ว</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">การเติบโตของลูกค้า (30 วัน)</h2>
            <Link to="/cdp/customers" className="text-primary font-medium text-sm hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>
          {growthData.length > 0 ? (
            <div className="h-64 flex items-end justify-between gap-2">
              {growthData.slice(-14).map((item: any, idx: number) => {
                const maxCount = Math.max(...growthData.map((d: any) => d.count || 0));
                const height = maxCount > 0 ? ((item.count || 0) / maxCount) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-primary rounded-t transition-all hover:bg-yellow-500"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                      title={`${item.count || 0} ลูกค้า`}
                    />
                    <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                      {new Date(item.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p>ยังไม่มีข้อมูลการเติบโต</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">⚡ การดำเนินการด่วน</h2>
          <div className="space-y-3">
            <Link
              to="/cdp/customers"
              className="block p-3 bg-gray-50 rounded-lg hover:bg-primary/10 transition border border-gray-200"
            >
              <div className="font-medium text-gray-900">👥 ดูลูกค้าทั้งหมด</div>
              <div className="text-sm text-gray-600">จัดการข้อมูลลูกค้า</div>
            </Link>
            <Link
              to="/cdp/segments"
              className="block p-3 bg-gray-50 rounded-lg hover:bg-primary/10 transition border border-gray-200"
            >
              <div className="font-medium text-gray-900">🎯 สร้าง Segment</div>
              <div className="text-sm text-gray-600">สร้างกลุ่มลูกค้าใหม่</div>
            </Link>
            {isB2B && (
              <Link
                to="/crm/deals"
                className="block p-3 bg-gray-50 rounded-lg hover:bg-primary/10 transition border border-gray-200"
              >
                <div className="font-medium text-gray-900">💼 จัดการ Deals</div>
                <div className="text-sm text-gray-600">ดูและจัดการ Deals</div>
              </Link>
            )}
            {isB2C && (
              <Link
                to="/messages/campaign"
                className="block p-3 bg-gray-50 rounded-lg hover:bg-primary/10 transition border border-gray-200"
              >
                <div className="font-medium text-gray-900">📢 สร้างแคมเปญ</div>
                <div className="text-sm text-gray-600">สร้างแคมเปญการตลาด</div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Recent Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers */}
        {recentCustomers && recentCustomers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">ลูกค้าล่าสุด</h2>
              <Link to="/cdp/customers" className="text-primary font-medium text-sm hover:underline">
                ดูทั้งหมด →
              </Link>
            </div>
            <div className="space-y-3">
              {recentCustomers.slice(0, 5).map((customer: any) => {
                const isCompany = customer.type === 'COMPANY' || customer.type === 'company';
                const displayName = isCompany
                  ? (customer.profile?.companyName || customer.identifiers?.company || '-')
                  : `${customer.profile?.firstName || ''} ${customer.profile?.lastName || ''}`.trim() || '-';
                return (
                  <Link
                    key={customer.id}
                    to={`/cdp/customers/${customer.id}`}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{displayName}</div>
                      <div className="text-sm text-gray-600">
                        {customer.identifiers?.email || 'ไม่มีอีเมล'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('th-TH') : 'N/A'}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Quotations (B2B) or Segments (B2C) */}
        {isB2B && quotations.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Quotations ล่าสุด</h2>
              <Link to="/data/sources/quotation" className="text-primary font-medium text-sm hover:underline">
                ดูทั้งหมด →
              </Link>
            </div>
            <div className="space-y-3">
              {quotations.slice(0, 5).map((quotation: any) => (
                <Link
                  key={quotation.id}
                  to={`/data/sources/quotation`}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{quotation.quotationNumber || `QT-${quotation.id.substring(0, 8)}`}</div>
                    <div className="text-sm text-gray-600">
                      {quotation.customerName || 'ไม่มีชื่อลูกค้า'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {new Intl.NumberFormat('th-TH', { 
                        style: 'currency', 
                        currency: quotation.currency || 'THB', 
                        maximumFractionDigits: 0 
                      }).format(Number(quotation.totalAmount) || 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {quotation.status || 'N/A'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : segments && Array.isArray(segments) && segments.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Segments ล่าสุด</h2>
              <Link to="/cdp/segments" className="text-primary font-medium text-sm hover:underline">
                ดูทั้งหมด →
              </Link>
            </div>
            <div className="space-y-3">
              {segments.slice(0, 5).map((segment: any) => (
                <Link
                  key={segment.id}
                  to={`/cdp/segments/${segment.id}`}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{segment.name}</div>
                    <div className="text-sm text-gray-600">
                      {segment.description || 'ไม่มีคำอธิบาย'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs ${
                      segment.isDynamic 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {segment.isDynamic ? 'Dynamic' : 'Static'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
