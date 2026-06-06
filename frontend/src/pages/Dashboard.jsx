import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  FileText,
  ClipboardCheck,
  ShoppingBag,
  Receipt,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  PieChart,
  Package,
  Plus,
  UserPlus,
  Eye,
  BarChart2,
  Activity,
  Zap,
} from 'lucide-react';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDate(d = new Date()) {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

function formatCurrency(val) {
  if (!val && val !== 0) return '—';
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000)   return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toFixed(0)}`;
}

function formatAmount(val) {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style:    'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Dot colour by entity_type
const ACTIVITY_COLORS = {
  VENDOR:         { dot: 'bg-[#16a34a]',  text: 'text-[#16a34a]' },
  RFQ:            { dot: 'bg-blue-500',    text: 'text-blue-600' },
  APPROVAL:       { dot: 'bg-orange-400',  text: 'text-orange-600' },
  PURCHASE_ORDER: { dot: 'bg-purple-500',  text: 'text-purple-600' },
  QUOTATION:      { dot: 'bg-sky-500',     text: 'text-sky-600' },
};

const PO_STATUS_STYLE = {
  approved:        { bg: 'bg-[#dcfce7]', text: 'text-[#15803d]',  label: 'Approved' },
  pending:         { bg: 'bg-[#fef3c7]', text: 'text-[#d97706]',  label: 'Pending' },
  pending_payment: { bg: 'bg-[#fef3c7]', text: 'text-[#d97706]',  label: 'Pending' },
  draft:           { bg: 'bg-[#f3f4f6]', text: 'text-[#6b7280]',  label: 'Draft' },
  paid:            { bg: 'bg-[#dbeafe]', text: 'text-[#2563eb]',  label: 'Paid' },
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

const StatCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
    <div className="flex items-start justify-between">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
    <Skeleton className="h-9 w-20" />
    <Skeleton className="h-4 w-36" />
  </div>
);

// ─── Stat Card ───────────────────────────────────────────────────────────────

const StatCard = ({ label, value, iconBg, icon: Icon, iconColor, bottom }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
    <div className="flex items-start justify-between">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={iconColor} />
      </div>
    </div>
    <p className="text-3xl font-bold text-[#111827] leading-none">{value}</p>
    <div className="flex items-center gap-1.5">{bottom}</div>
  </div>
);

// ─── Custom Tooltip for Donut ─────────────────────────────────────────────────

const DonutTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-[#111827]">{name}</p>
      <p className="text-gray-500">{formatAmount(value)}</p>
    </div>
  );
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'there';

  // ── Queries ──
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const r = await api.get('/dashboard/stats');
      return r.data.stats;
    },
    staleTime: 60_000,
  });

  const { data: posData, isLoading: posLoading } = useQuery({
    queryKey: ['dashboard-recent-pos'],
    queryFn: async () => {
      const r = await api.get('/dashboard/recent-pos');
      return r.data.pos;
    },
    staleTime: 60_000,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: async () => {
      const r = await api.get('/dashboard/analytics');
      return r.data.analytics;
    },
    staleTime: 60_000,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: async () => {
      const r = await api.get('/dashboard/activity');
      return r.data.activity;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,   // auto-refresh every 30 s
  });

  // ── Quick Actions ──
  const quickActions = [
    { label: 'New RFQ',       icon: Plus,     path: '/rfqs/new',  bg: 'bg-[#f0fdf4]', border: 'border-[#bbf7d0]', iconColor: 'text-[#16a34a]' },
    { label: 'Add Vendor',    icon: UserPlus, path: '/vendors/new', bg: 'bg-[#eff6ff]', border: 'border-[#bfdbfe]', iconColor: 'text-[#2563eb]' },
    { label: 'View Invoices', icon: Eye,      path: '/invoices',  bg: 'bg-[#fff7ed]', border: 'border-[#fed7aa]', iconColor: 'text-[#ea580c]' },
    { label: 'Reports',       icon: BarChart2, path: '/analytics', bg: 'bg-[#fdf4ff]', border: 'border-[#e9d5ff]', iconColor: 'text-[#9333ea]' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Here's what's happening in your procurement today
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5">
          <CalendarDays size={16} className="text-[#16a34a]" />
          <span>{formatDate()}</span>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Active RFQs"
              value={statsData?.activeRfqs ?? 0}
              iconBg="bg-[#dbeafe]"
              icon={FileText}
              iconColor="text-[#2563eb]"
              bottom={
                <>
                  <TrendingUp size={14} className="text-[#16a34a]" />
                  <span className="text-xs text-green-600">+2 from last week</span>
                </>
              }
            />
            <StatCard
              label="Pending Approvals"
              value={statsData?.pendingApprovals ?? 0}
              iconBg="bg-[#fef3c7]"
              icon={ClipboardCheck}
              iconColor="text-[#d97706]"
              bottom={
                <>
                  <AlertCircle size={14} className="text-orange-400" />
                  <span className="text-xs text-amber-600">Requires attention</span>
                </>
              }
            />
            <StatCard
              label="POs This Month"
              value={statsData?.posThisMonth ?? 0}
              iconBg="bg-[#dcfce7]"
              icon={ShoppingBag}
              iconColor="text-[#16a34a]"
              bottom={
                <>
                  <TrendingUp size={14} className="text-[#16a34a]" />
                  <span className="text-xs text-green-600">
                    {formatCurrency(statsData?.posTotalValue ?? 0)} total value
                  </span>
                </>
              }
            />
            <StatCard
              label="Overdue Invoices"
              value={statsData?.overdueInvoices ?? 0}
              iconBg="bg-[#fee2e2]"
              icon={Receipt}
              iconColor="text-[#dc2626]"
              bottom={
                <>
                  <AlertTriangle size={14} className="text-red-500" />
                  <span className="text-xs text-red-600">Needs immediate action</span>
                </>
              }
            />
          </>
        )}
      </div>

      {/* ── Middle Row: Recent POs + Donut Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Purchase Orders (col-span-2) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-[#16a34a]" />
              <h2 className="font-semibold text-[#111827]">Recent Purchase Orders</h2>
            </div>
            <button
              onClick={() => navigate('/purchase-orders')}
              className="text-xs font-medium text-[#16a34a] hover:text-[#15803d] transition-colors"
            >
              View All →
            </button>
          </div>

          {posLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : !posData?.length ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-gray-400">
              <Package size={42} strokeWidth={1.2} />
              <p className="text-sm">No purchase orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['PO #', 'Vendor', 'Amount', 'Date', 'Status'].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {posData.map((po) => {
                    const s = PO_STATUS_STYLE[po.status] || PO_STATUS_STYLE.draft;
                    return (
                      <tr
                        key={po.id}
                        className="hover:bg-[#f8fafc] transition-colors duration-100 cursor-pointer"
                        onClick={() => navigate('/purchase-orders')}
                      >
                        <td className="px-3 py-3 font-mono font-medium text-[#16a34a]">
                          {po.po_number}
                        </td>
                        <td className="px-3 py-3 text-[#374151] max-w-[160px] truncate">
                          {po.vendor}
                        </td>
                        <td className="px-3 py-3 font-medium text-[#111827]">
                          {formatAmount(po.amount)}
                        </td>
                        <td className="px-3 py-3 text-[#6b7280] whitespace-nowrap">
                          {new Date(po.date).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
                          >
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Spend by Category – Donut (col-span-1) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={18} className="text-[#16a34a]" />
            <h2 className="font-semibold text-[#111827]">Spend by Category</h2>
          </div>

          {analyticsLoading ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Skeleton className="h-40 w-40 rounded-full" />
              <div className="w-full space-y-2 mt-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ) : !analyticsData?.length ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-gray-400">
              <PieChart size={42} strokeWidth={1.2} />
              <p className="text-sm">No spend data yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPie>
                  <Pie
                    data={analyticsData}
                    dataKey="value"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {analyticsData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </RechartsPie>
              </ResponsiveContainer>

              {/* Legend */}
              <ul className="mt-3 space-y-2">
                {analyticsData.map((item) => (
                  <li key={item.category} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-[#374151] truncate">{item.category}</span>
                    </div>
                    <span className="text-xs font-medium text-[#111827] flex-shrink-0">
                      {formatAmount(item.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Quick Actions + Activity Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-[#16a34a]" />
            <h2 className="font-semibold text-[#111827]">Quick Actions</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`
                  flex flex-col items-center justify-center gap-2.5
                  rounded-xl p-4 border ${action.bg} ${action.border}
                  hover:scale-105 transition-all duration-200 cursor-pointer
                  text-center group
                `}
              >
                <div className={`w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow`}>
                  <action.icon size={18} className={action.iconColor} />
                </div>
                <span className="text-xs font-semibold text-[#374151]">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-[#16a34a]" />
              <h2 className="font-semibold text-[#111827]">Recent Activity</h2>
            </div>
            <button
              onClick={() => navigate('/activity')}
              className="text-xs font-medium text-[#16a34a] hover:text-[#15803d] transition-colors"
            >
              View All →
            </button>
          </div>

          {activityLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : !activityData?.length ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
              <Activity size={38} strokeWidth={1.2} />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <ol className="relative space-y-4">
              {activityData.map((item, idx) => {
                const c = ACTIVITY_COLORS[item.entity_type] || { dot: 'bg-gray-400', text: 'text-gray-600' };
                const actor = [item.first_name, item.last_name].filter(Boolean).join(' ') || 'System';
                return (
                  <li key={item.id} className="flex items-start gap-3">
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 ${c.dot}`} />
                      {idx < activityData.length - 1 && (
                        <span className="w-px flex-1 bg-gray-100 mt-1 min-h-[20px]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pb-1">
                      <p className="text-sm text-[#374151] leading-snug">
                        <span className={`font-semibold ${c.text}`}>{actor}</span>
                        {' — '}
                        <span>{item.description || `${item.action} on ${item.entity_type}`}</span>
                      </p>
                      <span className="text-xs text-gray-400 mt-0.5 block">
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
