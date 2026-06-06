import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  GitCompare,
  ArrowRight,
  CalendarDays,
  Search,
  Package,
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const STATUS_CONFIG = {
  draft:     { bg: 'bg-gray-100',   text: 'text-gray-600',  dot: 'bg-gray-400',  label: 'Draft',     border: '#9ca3af' },
  submitted: { bg: 'bg-blue-50',    text: 'text-blue-700',  dot: 'bg-blue-500',  label: 'Submitted', border: '#3b82f6' },
  selected:  { bg: 'bg-green-50',   text: 'text-green-700', dot: 'bg-green-500', label: 'Selected',  border: '#16a34a' },
  rejected:  { bg: 'bg-red-50',     text: 'text-red-700',   dot: 'bg-red-400',   label: 'Rejected',  border: '#dc2626' },
};

const RFQ_STATUS_CONFIG = {
  draft:     { bg: 'bg-gray-100',   text: 'text-gray-500' },
  published: { bg: 'bg-green-50',   text: 'text-green-700' },
  closed:    { bg: 'bg-gray-100',   text: 'text-gray-500' },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-5 w-40 bg-gray-100 rounded" />
        <div className="h-5 w-20 bg-gray-100 rounded-full" />
      </div>
      <div className="h-4 w-28 bg-gray-100 rounded mb-4" />
      <div className="h-px bg-gray-100 mb-4" />
      <div className="flex justify-between">
        <div className="h-4 w-32 bg-gray-100 rounded" />
        <div className="h-8 w-20 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR VIEW — cards showing their own quotations
// ─────────────────────────────────────────────────────────────────────────────

function VendorQuotationCard({ quotation, onView }) {
  const s = STATUS_CONFIG[quotation.status] || STATUS_CONFIG.draft;

  const subtotal   = quotation.subtotal
    ?? quotation.line_items?.reduce((acc, li) => acc + parseFloat(li.total), 0)
    ?? 0;
  const taxPct     = parseFloat(quotation.tax_percent) || 0;
  const gstAmount  = quotation.gst_amount  ?? (subtotal * taxPct) / 100;
  const grandTotal = quotation.grand_total ?? subtotal + gstAmount;

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3
        hover:shadow-md transition-shadow duration-200"
      style={{ borderLeft: `3px solid ${s.border}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-[#111827] text-base leading-snug line-clamp-2 flex-1">
          {quotation.rfq_title || `RFQ #${quotation.rfq_id}`}
        </h3>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${s.bg} ${s.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-2xl font-bold text-[#15803d]">
        ₹{fmt(grandTotal)}
      </div>

      <div className="h-px bg-gray-100" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <CalendarDays size={13} className="text-gray-400" />
          {quotation.submitted_at
            ? `Submitted ${formatDate(quotation.submitted_at)}`
            : `Created ${formatDate(quotation.created_at)}`}
        </div>
        <button
          onClick={() => onView(quotation.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#16a34a]
            border border-[#16a34a] rounded-lg hover:bg-[#f0fdf4] transition-all duration-150"
        >
          View
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFICER VIEW — grouped by RFQ
// ─────────────────────────────────────────────────────────────────────────────

function RfqQuotationGroup({ rfq, onCompare }) {
  const rfqStatus  = RFQ_STATUS_CONFIG[rfq.status] || RFQ_STATUS_CONFIG.draft;
  const count      = rfq.quotations_count ?? rfq.quotation_count ?? 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Group header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#f3f4f6] bg-[#fafafa]">
        <div className="flex items-center gap-2 min-w-0">
          <Package size={16} className="text-[#16a34a] flex-shrink-0" />
          <span className="font-semibold text-[#111827] truncate">{rfq.title}</span>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${rfqStatus.bg} ${rfqStatus.text}`}>
            {rfq.status}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {count} quotation{count !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => onCompare(rfq.id)}
            disabled={count === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#16a34a]
              border border-[#16a34a] rounded-lg hover:bg-[#f0fdf4]
              disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
          >
            <GitCompare size={13} />
            Compare
          </button>
        </div>
      </div>

      {/* Vendor list */}
      {count === 0 ? (
        <div className="px-5 py-6 text-center text-sm text-gray-400">
          No quotations received yet
        </div>
      ) : (
        <div className="divide-y divide-[#f3f4f6]">
          {rfq.vendors?.map((v) => (
            <div key={v.vendor_id} className="flex items-center justify-between px-5 py-3 hover:bg-[#fafafa] transition-colors duration-100">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#111827] truncate">{v.company_name}</p>
                <p className="text-xs text-gray-400 truncate">{v.contact_email}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium
                ${STATUS_CONFIG[v.quotation_status]?.bg || 'bg-gray-100'}
                ${STATUS_CONFIG[v.quotation_status]?.text || 'text-gray-500'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[v.quotation_status]?.dot || 'bg-gray-400'}`} />
                {STATUS_CONFIG[v.quotation_status]?.label || 'Not submitted'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function Quotations() {
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const isVendor    = user?.role === 'vendor';
  const isOfficer   = user?.role === 'admin' || user?.role === 'procurement_officer';

  const [search, setSearch] = useState('');

  // ── Vendor: fetch their own quotations via GET /rfqs/:id/quotations
  // We don't have a "my quotations" aggregate endpoint, so we use the RFQ list
  // approach: fetch all their RFQs, then for each get their quotation.
  const { data: vendorRfqsData, isLoading: vendorRfqsLoading } = useQuery({
    queryKey: ['vendor-rfqs-for-quotations'],
    queryFn:  () => api.get('/rfqs?limit=100').then((r) => r.data.rfqs ?? []),
    enabled:  isVendor,
  });

  const { data: vendorQuotations, isLoading: vendorQsLoading } = useQuery({
    queryKey: ['vendor-all-quotations'],
    queryFn:  async () => {
      if (!vendorRfqsData?.length) return [];
      const results = await Promise.allSettled(
        vendorRfqsData.map((rfq) =>
          api.get(`/rfqs/${rfq.id}/quotations`).then((r) => r.data.quotations ?? [])
        )
      );
      return results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value)
        .filter(Boolean);
    },
    enabled: isVendor && !!vendorRfqsData,
  });

  // ── Officer: fetch all RFQs with vendor/quotation summary
  const { data: rfqsWithQuotations, isLoading: officerLoading } = useQuery({
    queryKey: ['rfqs-with-quotations'],
    queryFn:  async () => {
      const rfqs = await api.get('/rfqs?limit=100').then((r) => r.data.rfqs ?? []);
      // Enrich each RFQ with its assigned vendors + their quotation status
      const enriched = await Promise.allSettled(
        rfqs.map(async (rfq) => {
          const detail = await api.get(`/rfqs/${rfq.id}`).then((r) => r.data.rfq);
          // Build vendors with quotation_status placeholder
          const vendors = detail.assigned_vendors?.map((v) => ({
            vendor_id:        v.vendor_id,
            company_name:     v.company_name,
            contact_email:    v.contact_email,
            quotation_status: null,
          })) ?? [];
          return { ...rfq, vendors, quotations_count: rfq.quotations_count ?? 0 };
        })
      );
      return enriched
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value);
    },
    enabled: isOfficer,
    staleTime: 30_000,
  });

  // ── Filter ──
  const filteredVendorQuotations = (vendorQuotations ?? []).filter((q) => {
    if (!search) return true;
    return (q.rfq_title || '').toLowerCase().includes(search.toLowerCase());
  });

  const filteredRfqs = (rfqsWithQuotations ?? []).filter((r) => {
    if (!search) return true;
    return r.title.toLowerCase().includes(search.toLowerCase());
  });

  const isLoading = isVendor
    ? vendorRfqsLoading || vendorQsLoading
    : officerLoading;

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <FileText size={22} className="text-[#16a34a]" />
            <h1 className="text-2xl font-bold text-[#111827]">Quotations</h1>
          </div>
          <p className="text-sm text-[#6b7280] mt-1">
            {isVendor ? 'Your submitted quotations' : 'All quotations received per RFQ'}
          </p>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by RFQ name..."
            className="w-full h-9 pl-9 pr-4 text-sm border border-[#e5e7eb] rounded-lg outline-none
              focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150"
          />
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isVendor ? (
        /* ── Vendor: card grid ── */
        filteredVendorQuotations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
            <FileText size={48} strokeWidth={1.2} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">No quotations yet</p>
            <p className="text-xs text-gray-400 mt-1">
              {search
                ? 'No quotations match your search'
                : 'Go to RFQs to submit your first quotation'}
            </p>
            {!search && (
              <button
                onClick={() => navigate('/rfqs')}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm mx-auto"
              >
                Browse RFQs
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredVendorQuotations.map((q) => (
              <VendorQuotationCard
                key={q.id}
                quotation={q}
                onView={(id) => navigate(`/rfqs/${q.rfq_id}/compare`)}
              />
            ))}
          </div>
        )
      ) : (
        /* ── Officer: grouped by RFQ ── */
        filteredRfqs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
            <Package size={48} strokeWidth={1.2} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">No RFQs found</p>
            <p className="text-xs text-gray-400 mt-1">
              {search ? 'No RFQs match your search' : 'Create an RFQ to start collecting quotations'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRfqs.map((rfq) => (
              <RfqQuotationGroup
                key={rfq.id}
                rfq={rfq}
                onCompare={(id) => navigate(`/rfqs/${id}/compare`)}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
