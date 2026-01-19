type Preset = {
  id: string;
  title: string;
  description: string;
  members: number;
  accent: 'yellow' | 'green' | 'red' | 'blue' | 'mint' | 'orange';
};

const presets: Preset[] = [
  {
    id: 'vip',
    title: 'ลูกค้า VIP',
    description: 'ลูกค้าที่มียอดซื้อสะสม > 50,000 บาท',
    members: 1247,
    accent: 'yellow',
  },
  {
    id: 'new',
    title: 'ลูกค้าใหม่',
    description: 'ลูกค้าที่สมัครภายใน 30 วันที่ผ่านมา',
    members: 856,
    accent: 'green',
  },
  {
    id: 'inactive',
    title: 'ลูกค้าไม่ใช้งาน',
    description: 'ไม่มีการซื้อมากกว่า 90 วัน',
    members: 2134,
    accent: 'red',
  },
  {
    id: 'promo',
    title: 'กลุ่มที่สนใจโปรโมชั่น',
    description: 'เปิดอีเมลโปรโมชั่น > 3 ครั้ง',
    members: 3567,
    accent: 'blue',
  },
  {
    id: 'line-oa',
    title: 'ลูกค้าจาก LINE OA',
    description: 'มีการติดต่อผ่าน LINE OA',
    members: 4892,
    accent: 'mint',
  },
  {
    id: 'age-25-35',
    title: 'กลุ่มอายุ 25-35',
    description: 'ลูกค้าในช่วงอายุ 25-35 ปี',
    members: 5621,
    accent: 'orange',
  },
];

function accentClasses(accent: Preset['accent']) {
  switch (accent) {
    case 'yellow':
      return 'bg-yellow-100 text-yellow-700';
    case 'green':
      return 'bg-green-100 text-green-700';
    case 'red':
      return 'bg-red-100 text-red-700';
    case 'blue':
      return 'bg-blue-100 text-blue-700';
    case 'mint':
      return 'bg-emerald-100 text-emerald-700';
    case 'orange':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-background text-secondary-text';
  }
}

function iconForPreset(id: string) {
  // simple inline icon (people)
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path
        d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M20 21a8 8 0 1 0-16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PresetAudience() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-base">กลุ่มเป้าหมาย</h1>
        <p className="text-sm text-secondary-text mt-1">สร้างและจัดการกลุ่มลูกค้าเป้าหมาย</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-base">กลุ่มเป้าหมายสำเร็จรูป</h2>
        <div className="text-sm text-secondary-text">{presets.length} กลุ่ม</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {presets.map((p) => (
          <div key={p.id} className="bg-white rounded-xl shadow border border-border overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accentClasses(p.accent)}`}>
                  {iconForPreset(p.id)}
                </div>
                <button
                  type="button"
                  className="text-secondary-text hover:text-base"
                  aria-label="Run audience"
                  title="Run"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                    <path
                      d="M9 18V6l10 6-10 6Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="mt-6">
                <div className="text-lg font-bold text-base">{p.title}</div>
                <div className="text-sm text-secondary-text mt-2">{p.description}</div>
              </div>

              <div className="my-6 border-t border-border" />

              <div className="flex items-center justify-between">
                <div className="text-sm text-secondary-text">จำนวนสมาชิก</div>
                <div className="text-xl font-bold text-base">
                  {p.members.toLocaleString('th-TH')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

