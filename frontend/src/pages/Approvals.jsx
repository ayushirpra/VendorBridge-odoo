import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Package,
  Building2,
  User,
  FileText,
  ChevronRight,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_STYLE = {
  pending: {
    icon: Clock,
    dot: 'bg-[#d97706]',
    bg: 'bg-[#fef3c7]',
    text: 'text-[#d97706]',
    label: 'Pending',
  },
  approved: {
    icon: CheckCircle2,
    dot: 'bg-[#16a34a]',
    bg: 'bg-[#dcfce7]',
    text: 'text-[#15803d]',
    label: 'Approved',
  },
  rejected: {
    icon: XCircle,
    dot: 'bg-[#dc2626]',
    bg: 'bg-[#fee2e2]',
    text: 'text-[#dc2626]',
    label: 'Rejected',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      <Icon size={14} />
      {s.label}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
}

// ─── Skeleton Row ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-gray-100 rounded w-1/4" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
        <div className="h-8 w-24 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ statusFilter }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <Package size={48} strokeWidth={1.2} />
        <div>
          <p className="text-sm font-medium text-[#111827]">No approvals found</p>
          {statusFilter && (
            <p className="text-xs text-gray-500 mt-1">
              Try adjusting your filter
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Approval Card ────────────────────────────────────────────────────────────

function ApprovalCard({ approval, onClick }) {
  const s = STATUS_STYLE[approval.status] || STATUS_STYLE.pending;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-100 rounded-xl p-5 hover:border-[#16a34a] hover:shadow-sm transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left side - Info */}
        <div className="flex-1 min-w-0">
          {/* Status badge & Level */}
          <div className="flex items-center gap-2 mb-3">
            <StatusBadge status={approval.status} />
            <span className="text-xs font-medium text-gray-500">
              Level {approval.level}
            </span>
          </div>

          {/* RFQ Title */}
          <h3 className="text-base font-semibold text-[#111827] mb-1 truncate group-hover:text-[#16a34a] transition-colors">
            {approval.rfq_title}
          </h3>

          {/* Vendor name */}
          {approval.vendor_name && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
              <Building2 size={14} />
              <span className="truncate">{approval.vendor_name}</span>
            </div>
          )}

          {/* Bottom info row */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <User size={13} />
              <span>{approval.approver_name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText size={13} />
              <span>RFQ #{approval.rfq_id}</span>
            </div>
            {approval.actioned_at && (
              <div>
                <span>Actioned: {formatDate(approval.actioned_at)}</span>
              </div>
            )}
          </div>

          {/* Remarks */}
          {approval.remarks && (
            <div className="mt-3 p-2.5 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-700 italic line-clamp-2">
                "{approval.remarks}"
              </p>
            </div>
          )}
        </div>

        {/* Right side - Action button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#f0fdf4] hover:text-[#16a34a] hover:border-[#bbf7d0] transition-all duration-150 flex-shrink-0"
        >
          <Eye size={14} />
          View
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Stats Cards ─────────────────────────────────────────────────────────────

function StatsCard({ label, value, icon: Icon, color = 'green' }) {
  const colors = {
    green: 'text-[#16a34a] bg-[#dcfce7]',
    amber: 'text-[#d97706] bg-[#fef3c7]',
    red: 'text-[#dc2626] bg-[#fee2e2]',
    blue: 'text-[#2563eb] bg-[#eff6ff]',
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold text-[#111827] mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Approvals Page ──────────────────────────────────────────────────────

export default function Approvals() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [statusFilter, setStatusFilter] = useState('');

  // Fetch approvals
  const { data, isLoading, isError } = useQuery({
    queryKey: ['approvals', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const r = await api.get(`/approvals?${params}`);
      return r.data;
    },
    staleTime: 30_000,
  });

  const approvals = data?.approvals ?? [];
  const total = data?.count ?? 0;

  // Calculate stats
  const pendingCount = approvals.filter((a) => a.status === 'pending').length;
  const approvedCount = approvals.filter((a) => a.status === 'approved').length;
  const rejectedCount = approvals.filter((a) => a.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <TrendingUp size={22} className="text-[#16a34a]" />
            <h1 className="text-2xl font-bold text-[#111827]">Approvals</h1>
          </div>
          <p className="text-sm text-[#6b7280] mt-1">
            {user?.role === 'manager'
              ? 'Review and action approvals assigned to you'
              : user?.role === 'procurement_officer'
              ? 'Track approval status for your RFQs'
              : 'Manage all approval workflows'}
          </p>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total" value={total} icon={FileText} color="blue" />
        <StatsCard
          label="Pending"
          value={pendingCount}
          icon={Clock}
          color="amber"
        />
        <StatsCard
          label="Approved"
          value={approvedCount}
          icon={CheckCircle2}
          color="green"
        />
        <StatsCard
          label="Rejected"
          value={rejectedCount}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* ── Filter Tabs ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150
                ${
                  statusFilter === tab.key
                    ? 'bg-[#16a34a] text-white shadow-sm'
                    : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-gray-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Approvals List ── */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : isError ? (
          <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
            <p className="text-sm text-[#dc2626]">
              Failed to load approvals. Please try again.
            </p>
          </div>
        ) : approvals.length === 0 ? (
          <EmptyState statusFilter={statusFilter} />
        ) : (
          approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onClick={() => navigate(`/approvals/${approval.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
