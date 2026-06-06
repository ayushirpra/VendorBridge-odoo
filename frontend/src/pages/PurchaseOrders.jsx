import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  Eye,
  Download,
  Search,
  CalendarX,
  Package,
  Loader2,
} from 'lucide-react';
import api from '../lib/axios';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending_payment', label: 'Pending Payment' },
  { key: 'paid', label: 'Paid' },
];

const STATUS_STYLE = {
  draft: {
    bg: 'bg-[#f3f4f6]',
    text: 'text-[#6b7280]',
    dot: 'bg-[#9ca3af]',
    label: 'Draft',
  },
  approved: {
    bg: 'bg-[#dcfce7]',
    text: 'text-[#15803d]',
    dot: 'bg-[#16a34a]',
    label: 'Approved',
  },
  pending_payment: {
    bg: 'bg-[#fef3c7]',
    text: 'text-[#d97706]',
    dot: 'bg-[#f59e0b]',
    label: 'Pending Payment',
  },
  paid: {
    bg: 'bg-[#dcfce7]',
    text: 'text-[#15803d]',
    dot: 'bg-[#16a34a]',
    label: 'Paid',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
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

function isOverdue(dueDate, status) {
  if (status === 'paid') return false;
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

// ─── Skeleton Row ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[#f3f4f6]">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Main PurchaseOrders Page ────────────────────────────────────────────────

export default function PurchaseOrders() {
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch purchase orders
  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const r = await api.get(`/purchase-orders?${params}`);
      return r.data;
    },
    staleTime: 30_000,
  });

  const purchaseOrders = data?.purchase_orders ?? [];

  // Client-side search filter
  const filteredPOs = purchaseOrders.filter((po) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      po.po_number.toLowerCase().includes(query) ||
      po.vendor_name.toLowerCase().includes(query) ||
      po.rfq_title.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={22} className="text-[#16a34a]" />
            <h1 className="text-2xl font-bold text-[#111827]">Purchase Orders</h1>
          </div>
          <p className="text-sm text-[#6b7280] mt-1">
            Manage purchase orders and invoices
          </p>
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PO, vendor, RFQ..."
              className="w-72 h-9 pl-9 pr-4 text-sm border border-[#e5e7eb] rounded-lg outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150"
            />
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
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
      </div>

      {/* ── PO Table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f8fafc] border-b border-[#e5e7eb]">
              <tr>
                {[
                  'PO#',
                  'RFQ Title',
                  'Vendor',
                  'Amount',
                  'PO Date',
                  'Due Date',
                  'Status',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : isError ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-16 text-center text-sm text-[#dc2626]"
                  >
                    Failed to load purchase orders. Please try again.
                  </td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Package size={44} strokeWidth={1.2} />
                      <p className="text-sm font-medium">No purchase orders found</p>
                      {(searchQuery || statusFilter) && (
                        <p className="text-xs">
                          Try adjusting your search or filter
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => {
                  const overdue = isOverdue(po.due_date, po.status);

                  return (
                    <tr
                      key={po.id}
                      className="border-b border-[#f3f4f6] hover:bg-[#f8fafc] transition-colors duration-100"
                    >
                      {/* PO Number */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/purchase-orders/${po.id}`)}
                          className="font-mono text-sm text-[#16a34a] hover:text-[#15803d] hover:underline font-medium"
                        >
                          {po.po_number}
                        </button>
                      </td>

                      {/* RFQ Title */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#111827] truncate max-w-[200px]">
                          {po.rfq_title}
                        </p>
                      </td>

                      {/* Vendor */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#374151]">{po.vendor_name}</p>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-[#111827]">
                          {formatCurrency(po.grand_total)}
                        </p>
                      </td>

                      {/* PO Date */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#6b7280]">
                          {formatDate(po.po_date)}
                        </p>
                      </td>

                      {/* Due Date */}
                      <td className="px-6 py-4">
                        <div
                          className={`flex items-center gap-1.5 ${
                            overdue ? 'text-[#dc2626]' : 'text-[#6b7280]'
                          }`}
                        >
                          {overdue && <CalendarX size={14} />}
                          <span className="text-sm">{formatDate(po.due_date)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <StatusBadge status={po.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/purchase-orders/${po.id}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#f0fdf4] hover:text-[#16a34a] hover:border-[#bbf7d0] transition-all duration-150"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <button
                            onClick={() => {
                              // PDF download logic would go here
                              console.log('Download PDF for PO:', po.id);
                            }}
                            className="p-1.5 text-gray-600 hover:text-[#16a34a] hover:bg-[#f0fdf4] rounded-lg transition-all duration-150"
                            title="Download PDF"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
