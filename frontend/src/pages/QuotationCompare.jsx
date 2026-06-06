import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  GitCompare,
  TrendingUp,
  Truck,
  Star,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import api from '../lib/axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function deriveVendorSummary(q) {
  const subtotal    = q.subtotal ?? q.line_items?.reduce((s, li) => s + parseFloat(li.total), 0) ?? 0;
  const taxPct      = parseFloat(q.tax_percent) || 0;
  const gstAmount   = q.gst_amount  ?? (subtotal * taxPct) / 100;
  const grandTotal  = q.grand_total ?? subtotal + gstAmount;
  const deliveryDays = q.line_items?.length
    ? Math.max(...q.line_items.map((li) => li.delivery_days ?? 0))
    : null;
  const paymentTerms = q.notes ? q.notes.split('\n')[0].slice(0, 80) : '—';

  return {
    id:            q.id,
    vendor_id:     q.vendor_id,
    vendor_name:   q.vendor_name || `Vendor #${q.vendor_id}`,
    tax_percent:   taxPct,
    subtotal,
    gst_amount:    gstAmount,
    grand_total:   grandTotal,
    delivery_days: deliveryDays,
    payment_terms: paymentTerms,
    status:        q.status,
  };
}

// Deterministic pseudo-rating from vendor_id (no ratings table in schema)
function pseudoRating(vendorId) {
  return ((vendorId * 7) % 3) + 3; // yields 3, 4, or 5
}

// ─── Criteria config (module-level constant, never changes) ──────────────────
const CRITERIA = [
  { key: 'grand_total',   label: 'Grand Total' },
  { key: 'tax_percent',   label: 'GST %' },
  { key: 'delivery_days', label: 'Delivery Days' },
  { key: 'rating',        label: 'Vendor Rating' },
  { key: 'payment_terms', label: 'Payment Terms' },
];

const SORT_OPTIONS = [
  { key: 'price',    label: 'Price',    icon: TrendingUp },
  { key: 'delivery', label: 'Delivery', icon: Truck },
  { key: 'rating',   label: 'Rating',   icon: Star },
];

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ value = 4 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-gray-500">{value}/5</span>
    </div>
  );
}

// ─── Cell renderer (module-level, no hook calls) ─────────────────────────────

function CriteriaCell({ criterionKey, summary, lowestGrandTotal, totalVendors }) {
  const isLowest = summary.grand_total === lowestGrandTotal && totalVendors > 1;

  if (criterionKey === 'grand_total') {
    return (
      <span className={`text-lg font-bold ${isLowest ? 'text-[#15803d]' : 'text-[#111827]'}`}>
        ₹{fmt(summary.grand_total)}
      </span>
    );
  }
  if (criterionKey === 'tax_percent') {
    return <span className="text-sm text-gray-700">{summary.tax_percent}%</span>;
  }
  if (criterionKey === 'delivery_days') {
    const d = summary.delivery_days;
    return (
      <span className={`text-sm font-medium ${d && d > 14 ? 'text-amber-600' : 'text-gray-700'}`}>
        {d != null ? `${d} days` : '—'}
      </span>
    );
  }
  if (criterionKey === 'rating') {
    return <StarRating value={summary.rating} />;
  }
  if (criterionKey === 'payment_terms') {
    return <span className="text-sm text-gray-600 line-clamp-2">{summary.payment_terms}</span>;
  }
  return null;
}

// ─── Confirm Select Modal ─────────────────────────────────────────────────────

function ConfirmSelectModal({ vendorName, onConfirm, onCancel, isLoading }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={20} className="text-[#16a34a]" />
          </div>
          <h3 className="text-base font-bold text-[#111827]">Select Vendor?</h3>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Selecting{' '}
          <span className="font-semibold text-[#111827]">{vendorName}</span>
          {' '}will start the approval workflow and reject all other quotations. Continue?
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-[#e5e7eb] rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#16a34a] hover:bg-[#15803d] rounded-lg disabled:opacity-60 transition-all duration-200"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Confirm &amp; Start Approval
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuotationCompare() {
  const { id: rfqId } = useParams();
  const navigate      = useNavigate();
  const qc            = useQueryClient();

  const [sortBy,        setSortBy]        = useState('price');
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, vendor_name }
  const [apiError,      setApiError]      = useState('');

  // ── Fetch RFQ detail ──
  const { data: rfq } = useQuery({
    queryKey: ['rfq-detail', rfqId],
    queryFn:  () => api.get(`/rfqs/${rfqId}`).then((r) => r.data.rfq),
    enabled:  !!rfqId,
  });

  // ── Fetch submitted quotations ──
  const { data: quotationsData, isLoading, isError } = useQuery({
    queryKey: ['quotations-compare', rfqId],
    queryFn:  () => api.get(`/quotations?rfq_id=${rfqId}`).then((r) => r.data),
    enabled:  !!rfqId,
  });

  // ── Select mutation ──
  const selectMutation = useMutation({
    mutationFn: (qId) => api.patch(`/quotations/${qId}/select`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotations-compare', rfqId] });
      qc.invalidateQueries({ queryKey: ['quotations'] });
      setConfirmTarget(null);
      navigate('/quotations');
    },
    onError: (err) => {
      setApiError(err.response?.data?.message || 'Failed to select quotation');
      setConfirmTarget(null);
    },
  });

  // ── Derive summaries ──
  const rawQuotations = quotationsData?.quotations ?? [];
  const summaries = rawQuotations.map((q) => ({
    ...deriveVendorSummary(q),
    rating: pseudoRating(q.vendor_id),
  }));

  const lowestGrandTotal = summaries.length
    ? Math.min(...summaries.map((s) => s.grand_total))
    : null;

  // ── Sort ──
  const sorted = [...summaries].sort((a, b) => {
    if (sortBy === 'price')    return a.grand_total - b.grand_total;
    if (sortBy === 'delivery') return (a.delivery_days ?? 999) - (b.delivery_days ?? 999);
    if (sortBy === 'rating')   return b.rating - a.rating;
    return 0;
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-start gap-3 flex-wrap">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-all duration-150 mt-0.5"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2.5">
            <GitCompare size={22} className="text-[#16a34a]" />
            <h1 className="text-2xl font-bold text-[#111827]">Quotation Comparison</h1>
          </div>
          {rfq && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">{rfq.title}</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#15803d]">
                {summaries.length} quotation{summaries.length !== 1 ? 's' : ''} received
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Error banner ── */}
      {apiError && (
        <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {apiError}
          <button
            onClick={() => setApiError('')}
            className="ml-auto text-red-400 hover:text-red-600 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Sort Bar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-gray-500">Sort by:</span>
          {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150
                ${sortBy === key
                  ? 'bg-[#16a34a] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Comparison Table ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-[#16a34a]" />
        </div>
      ) : isError ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-red-500 text-sm">Failed to load quotations.</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <GitCompare size={48} strokeWidth={1.2} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">No submitted quotations yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Vendors haven&apos;t submitted their quotes for this RFQ.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: `${200 + sorted.length * 200}px` }}>
            <thead>
              <tr>
                {/* Sticky criteria header */}
                <th className="sticky left-0 z-10 bg-[#f8fafc] border-b border-r border-[#e5e7eb] px-5 py-4 text-left">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Criteria
                  </span>
                </th>

                {/* Vendor column headers */}
                {sorted.map((s) => {
                  const isLowest = s.grand_total === lowestGrandTotal && sorted.length > 1;
                  return (
                    <th
                      key={s.id}
                      className={`border-b border-r border-[#e5e7eb] px-5 py-4 text-center last:border-r-0 min-w-[180px]
                        ${isLowest ? 'bg-[#16a34a]' : 'bg-[#f8fafc]'}`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-semibold text-sm ${isLowest ? 'text-white' : 'text-[#111827]'}`}>
                          {s.vendor_name}
                        </span>
                        {isLowest && (
                          <span className="inline-block bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            Lowest Price
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {CRITERIA.map((criterion, rowIdx) => (
                <tr key={criterion.key} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
                  {/* Criteria label — sticky */}
                  <td className="sticky left-0 z-10 bg-[#f8fafc] border-r border-[#e5e7eb] px-5 py-4">
                    <span className="text-sm font-semibold text-gray-600">{criterion.label}</span>
                  </td>

                  {/* Vendor values */}
                  {sorted.map((s) => {
                    const isLowest = s.grand_total === lowestGrandTotal && sorted.length > 1;
                    return (
                      <td
                        key={s.id}
                        className={`border-r border-[#e5e7eb] px-5 py-4 text-center last:border-r-0
                          ${isLowest ? 'bg-[#f0fdf4]' : ''}`}
                      >
                        <CriteriaCell
                          criterionKey={criterion.key}
                          summary={s}
                          lowestGrandTotal={lowestGrandTotal}
                          totalVendors={sorted.length}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Select buttons row */}
              <tr className="border-t-2 border-[#e5e7eb]">
                <td className="sticky left-0 z-10 bg-[#f8fafc] border-r border-[#e5e7eb] px-5 py-4" />
                {sorted.map((s) => {
                  const isLowest = s.grand_total === lowestGrandTotal && sorted.length > 1;
                  return (
                    <td
                      key={s.id}
                      className={`border-r border-[#e5e7eb] px-5 py-4 text-center last:border-r-0
                        ${isLowest ? 'bg-[#f0fdf4]' : ''}`}
                    >
                      {isLowest ? (
                        <button
                          onClick={() => setConfirmTarget({ id: s.id, vendor_name: s.vendor_name })}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d]
                            text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm"
                        >
                          <CheckCircle size={15} />
                          Select &amp; Approve
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmTarget({ id: s.id, vendor_name: s.vendor_name })}
                          className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#16a34a]
                            text-[#16a34a] text-sm font-semibold rounded-lg hover:bg-[#f0fdf4] transition-all duration-150"
                        >
                          Select
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {confirmTarget && (
        <ConfirmSelectModal
          vendorName={confirmTarget.vendor_name}
          isLoading={selectMutation.isPending}
          onConfirm={() => selectMutation.mutate(confirmTarget.id)}
          onCancel={() => { setConfirmTarget(null); setApiError(''); }}
        />
      )}
    </div>
  );
}
