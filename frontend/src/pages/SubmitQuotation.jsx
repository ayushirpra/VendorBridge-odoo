import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  Info,
  CalendarDays,
  Package,
  DollarSign,
  Percent,
  MessageSquare,
  Calculator,
  Save,
  Send,
  Loader2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import api from '../lib/axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDeadline(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - Date.now()) / 86_400_000);
}

const CATEGORY_COLORS = {
  'Electronics':    { bg: 'bg-blue-50',    text: 'text-blue-700'    },
  'Office Supplies':{ bg: 'bg-purple-50',  text: 'text-purple-700'  },
  'Stationery':     { bg: 'bg-yellow-50',  text: 'text-yellow-700'  },
  'Manufacturing':  { bg: 'bg-orange-50',  text: 'text-orange-700'  },
  'Logistics':      { bg: 'bg-red-50',     text: 'text-red-700'     },
  'Raw Materials':  { bg: 'bg-amber-50',   text: 'text-amber-700'   },
  'Energy':         { bg: 'bg-cyan-50',    text: 'text-cyan-700'    },
  'Furniture':      { bg: 'bg-teal-50',    text: 'text-teal-700'    },
  'IT':             { bg: 'bg-indigo-50',  text: 'text-indigo-700'  },
};
function getCategoryStyle(cat) {
  return CATEGORY_COLORS[cat] || { bg: 'bg-gray-100', text: 'text-gray-600' };
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-amber-500" />
          </div>
          <h3 className="text-base font-bold text-[#111827]">Submit Quotation?</h3>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Once submitted, edits require vendor approval. Continue?
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-[#e5e7eb] rounded-lg hover:bg-gray-50 transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#16a34a] hover:bg-[#15803d] rounded-lg transition-all duration-200"
          >
            <Send size={14} />
            Yes, Submit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SubmitQuotation() {
  const { rfqId } = useParams();
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  // ── Fetch RFQ detail ──
  const { data: rfqData, isLoading: rfqLoading, isError: rfqError } = useQuery({
    queryKey: ['rfq-detail', rfqId],
    queryFn:  () => api.get(`/rfqs/${rfqId}`).then((r) => r.data.rfq),
    enabled:  !!rfqId,
  });

  // ── Fetch existing quotation (if vendor already has a draft) ──
  const { data: existingQuotation } = useQuery({
    queryKey: ['my-quotation', rfqId],
    queryFn:  async () => {
      // The GET /quotations?rfq_id=X endpoint is for officers.
      // Vendor uses GET /rfqs/:id/quotations which returns their own.
      const r = await api.get(`/rfqs/${rfqId}/quotations`);
      return r.data.quotations?.[0] ?? null;
    },
    enabled: !!rfqId,
  });

  // ── Row state ──
  const [rows, setRows] = useState([]);

  // ── Tax & notes ──
  const [taxPercent, setTaxPercent] = useState('18');
  const [notes,      setNotes]      = useState('');

  // ── UI state ──
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError,    setApiError]    = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // ── Pre-fill rows from RFQ line items once loaded ──
  useEffect(() => {
    if (!rfqData?.line_items) return;
    // If vendor already has a draft, pre-fill from that
    if (existingQuotation?.line_items?.length) {
      setRows(existingQuotation.line_items.map((li) => ({
        item_name:    li.item_name,
        qty:          parseFloat(li.quantity),
        unit_price:   parseFloat(li.unit_price),
        delivery_days: li.delivery_days ?? '',
      })));
      setTaxPercent(String(existingQuotation.tax_percent ?? 18));
      setNotes(existingQuotation.notes ?? '');
    } else {
      setRows(rfqData.line_items.map((li) => ({
        item_name:    li.item_name,
        qty:          parseFloat(li.quantity),
        unit_price:   '',
        delivery_days: '',
      })));
    }
  }, [rfqData, existingQuotation]);

  // ── Computed financials ──
  const subtotal  = rows.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.unit_price) || 0), 0);
  const taxPct    = parseFloat(taxPercent) || 0;
  const gstAmount = (subtotal * taxPct) / 100;
  const grandTotal = subtotal + gstAmount;

  // ── Row updater ──
  const updateRow = (idx, field, val) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };

  // ── Build payload ──
  const buildPayload = () => ({
    rfq_id:      parseInt(rfqId, 10),
    tax_percent: parseFloat(taxPercent) || 0,
    notes:       notes.trim() || undefined,
    line_items:  rows.map((r) => ({
      item_name:     r.item_name,
      qty:           parseFloat(r.qty) || 0,
      unit_price:    parseFloat(r.unit_price) || 0,
      delivery_days: r.delivery_days !== '' ? parseInt(r.delivery_days, 10) : undefined,
    })),
  });

  // ── Save draft mutation ──
  const saveDraft = useMutation({
    mutationFn: async () => {
      if (existingQuotation?.id) {
        return api.put(`/quotations/${existingQuotation.id}`, buildPayload());
      }
      return api.post('/quotations', buildPayload());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-quotation', rfqId] });
      qc.invalidateQueries({ queryKey: ['quotations'] });
      setSaveSuccess('Draft saved successfully!');
      setApiError('');
      setTimeout(() => setSaveSuccess(''), 3000);
    },
    onError: (err) => {
      setApiError(err.response?.data?.message || 'Failed to save draft');
      setSaveSuccess('');
    },
  });

  // ── Submit mutation ──
  const submitQuotation = useMutation({
    mutationFn: async () => {
      // First save/update, then submit
      let qId = existingQuotation?.id;
      if (qId) {
        await api.put(`/quotations/${qId}`, buildPayload());
      } else {
        const r = await api.post('/quotations', buildPayload());
        qId = r.data.quotation.id;
      }
      return api.patch(`/quotations/${qId}/submit`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.invalidateQueries({ queryKey: ['my-quotation', rfqId] });
      navigate('/quotations');
    },
    onError: (err) => {
      setApiError(err.response?.data?.message || 'Failed to submit quotation');
    },
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  if (rfqLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-[#16a34a]" />
      </div>
    );
  }

  if (rfqError || !rfqData) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
        <p className="text-red-500 text-sm">Failed to load RFQ. It may not exist or you may not have access.</p>
        <button onClick={() => navigate('/rfqs')} className="mt-4 text-sm text-[#16a34a] underline">
          Back to RFQs
        </button>
      </div>
    );
  }

  const rfq      = rfqData;
  const days     = daysUntil(rfq.deadline);
  const urgentDl = days !== null && days < 3;
  const catStyle = getCategoryStyle(rfq.category);
  const isAlreadySubmitted = existingQuotation?.status === 'submitted';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-all duration-150"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2.5">
          <FileText size={22} className="text-[#16a34a]" />
          <h1 className="text-2xl font-bold text-[#111827]">Submit Quotation</h1>
        </div>
      </div>

      {/* Already submitted banner */}
      {isAlreadySubmitted && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
          <Info size={18} className="flex-shrink-0" />
          <span>You have already submitted a quotation for this RFQ. Editing requires resubmission.</span>
        </div>
      )}

      {/* ── RFQ Summary Card ── */}
      <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-[#16a34a]" />
          <span className="text-sm font-semibold text-[#15803d]">RFQ Summary</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <h2 className="font-bold text-[#111827] text-lg">{rfq.title}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {rfq.category && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${catStyle.bg} ${catStyle.text}`}>
                {rfq.category}
              </span>
            )}
            <span className={`flex items-center gap-1 text-xs font-medium ${urgentDl ? 'text-red-600' : 'text-gray-600'}`}>
              <CalendarDays size={13} />
              {formatDeadline(rfq.deadline)}
              {urgentDl && <span className="ml-1 text-red-500 font-semibold">({days}d left)</span>}
            </span>
          </div>
        </div>

        {/* Line items */}
        <div className="space-y-1.5">
          {rfq.line_items?.map((li) => (
            <div key={li.id} className="flex items-center gap-2 text-sm text-[#374151]">
              <Package size={13} className="text-[#16a34a] flex-shrink-0" />
              <span>
                <span className="font-medium">{li.item_name}</span>
                {' × '}
                <span className="text-gray-600">{li.quantity} {li.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Your Quotation Card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <DollarSign size={20} className="text-[#16a34a]" />
          <h2 className="text-lg font-bold text-[#111827]">Your Quotation</h2>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-[#e5e7eb]">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e5e7eb]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Qty</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Unit Price (₹)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Total</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Delivery (days)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {rows.map((row, idx) => {
                const total         = (parseFloat(row.qty) || 0) * (parseFloat(row.unit_price) || 0);
                const longDelivery  = row.delivery_days !== '' && parseInt(row.delivery_days, 10) > 14;

                return (
                  <tr
                    key={idx}
                    className={`transition-colors duration-150 ${
                      longDelivery
                        ? 'border-l-2 border-l-amber-400 bg-amber-50/30'
                        : 'hover:bg-[#fafafa]'
                    }`}
                  >
                    {/* Item name — read-only from RFQ */}
                    <td className="px-4 py-3 font-medium text-[#111827]">{row.item_name}</td>

                    {/* Qty — read-only */}
                    <td className="px-4 py-3">
                      <div className="bg-gray-50 border border-[#e5e7eb] rounded-lg px-3 py-2 text-right text-gray-500 font-medium">
                        {row.qty}
                      </div>
                    </td>

                    {/* Unit price — editable */}
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unit_price}
                        onChange={(e) => updateRow(idx, 'unit_price', e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-right text-sm
                          outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150"
                      />
                    </td>

                    {/* Total — auto-calculated, read-only */}
                    <td className="px-4 py-3">
                      <div className="bg-gray-50 border border-[#e5e7eb] rounded-lg px-3 py-2 text-right font-semibold text-[#111827]">
                        ₹{fmt(total)}
                      </div>
                    </td>

                    {/* Delivery days — editable */}
                    <td className="px-4 py-3">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.delivery_days}
                          onChange={(e) => updateRow(idx, 'delivery_days', e.target.value)}
                          placeholder="—"
                          className={`w-full border rounded-lg px-3 py-2 text-right text-sm
                            outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150
                            ${longDelivery ? 'border-amber-400 bg-amber-50' : 'border-[#e5e7eb]'}`}
                        />
                        {longDelivery && (
                          <div className="absolute -top-7 right-0 bg-amber-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                            <Clock size={10} className="inline mr-1" />
                            Long delivery time
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Row: Tax/Notes + Price Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Tax & Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          {/* Tax */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[#111827] mb-2">
              <Percent size={15} className="text-[#16a34a]" />
              Tax / GST %
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                className="w-full border border-[#e5e7eb] rounded-lg pl-4 pr-10 py-2.5 text-sm
                  outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[#111827] mb-2">
              <MessageSquare size={15} className="text-[#16a34a]" />
              Notes / Payment Terms
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add payment terms, delivery conditions, warranty details..."
              className="w-full border border-[#e5e7eb] rounded-lg px-4 py-2.5 text-sm resize-none
                outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150"
            />
          </div>
        </div>

        {/* Price Summary */}
        <div className="bg-[#f8fafc] rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-5">
            <Calculator size={18} className="text-[#16a34a]" />
            <h3 className="font-bold text-[#111827]">Price Summary</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-[#111827]">₹{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">GST Amount ({taxPct}%)</span>
              <span className="font-medium text-[#111827]">₹{fmt(gstAmount)}</span>
            </div>

            <div className="h-px bg-gray-200 my-1" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Grand Total</span>
              <span className="text-2xl font-bold text-[#15803d]">₹{fmt(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Error / Success banners ── */}
      {apiError && (
        <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {apiError}
        </div>
      )}
      {saveSuccess && (
        <div className="flex items-center gap-2.5 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <Save size={16} className="flex-shrink-0" />
          {saveSuccess}
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="flex items-center justify-end gap-3 pb-6 flex-wrap">
        <button
          onClick={() => saveDraft.mutate()}
          disabled={saveDraft.isPending || submitQuotation.isPending}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 border border-[#e5e7eb]
            rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
        >
          {saveDraft.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Draft
        </button>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={saveDraft.isPending || submitQuotation.isPending}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#16a34a]
            hover:bg-[#15803d] rounded-lg shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
        >
          {submitQuotation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Submit Quotation
        </button>
      </div>

      {/* ── Confirm Modal ── */}
      {showConfirm && (
        <ConfirmModal
          onConfirm={() => { setShowConfirm(false); submitQuotation.mutate(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
