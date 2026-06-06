import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  Printer,
  Mail,
  Building2,
  MapPin,
  Hash,
  CheckCircle,
  AlertTriangle,
  X,
  Send,
  Loader2,
  CalendarX,
  Building,
} from 'lucide-react';
import api from '../lib/axios';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  draft: {
    bg: 'bg-[#f3f4f6]',
    text: 'text-[#6b7280]',
    label: 'Draft',
  },
  approved: {
    bg: 'bg-[#dcfce7]',
    text: 'text-[#15803d]',
    label: 'Approved',
  },
  pending_payment: {
    bg: 'bg-[#fef3c7]',
    text: 'text-[#d97706]',
    label: 'Pending Payment',
  },
  paid: {
    bg: 'bg-[#dcfce7]',
    text: 'text-[#15803d]',
    label: 'Paid',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    minimumFractionDigits: 2,
  }).format(amount);
}

function isOverdue(dueDate, status) {
  if (status === 'paid') return false;
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

// ─── Email Invoice Modal ──────────────────────────────────────────────────────

function EmailInvoiceModal({ po, invoice, onClose }) {
  const [email, setEmail] = useState(invoice?.vendor?.email || '');
  const [subject, setSubject] = useState(
    `Invoice ${po.po_number} — VendorBridge`
  );
  const [message, setMessage] = useState(
    `Dear ${invoice?.vendor?.company_name},\n\nPlease find attached the invoice for Purchase Order ${po.po_number}.\n\nThank you for your business.\n\nBest regards,\nVendorBridge Team`
  );

  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.post(`/purchase-orders/${po.id}/send-invoice`),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['purchase-order', po.id] });
      alert(`✓ ${response.data.message}`);
      onClose();
    },
    onError: (err) => {
      alert(`Failed to send invoice: ${err.response?.data?.message || err.message}`);
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-2">
            <Mail size={20} className="text-[#16a34a]" />
            <h2 className="text-lg font-bold text-[#111827]">
              Send Invoice via Email
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-2">
              To
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg outline-none resize-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e5e7eb]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-gray-50 transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#16a34a] hover:bg-[#15803d] rounded-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} />
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mark as Paid Modal ───────────────────────────────────────────────────────

function MarkAsPaidModal({ poId, poNumber, onClose, onSuccess }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/purchase-orders/${poId}/status`, { status: 'paid' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-order', poId] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      alert(
        `Failed to update status: ${err.response?.data?.message || err.message}`
      );
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={24} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111827]">Mark as Paid</h2>
              <p className="text-sm text-gray-600">
                Purchase Order {poNumber}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-700 mb-6">
            Mark this invoice as paid? This action cannot be undone.
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-gray-50 transition-all duration-150"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#16a34a] hover:bg-[#15803d] rounded-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Confirm
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main PurchaseOrderDetail Page ────────────────────────────────────────────

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPaidModal, setShowPaidModal] = useState(false);

  // Fetch PO detail
  const { data: poData, isLoading: poLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const r = await api.get(`/purchase-orders/${id}`);
      return r.data;
    },
    staleTime: 30_000,
  });

  // Fetch invoice data
  const { data: invoiceData } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const r = await api.get(`/purchase-orders/${id}/invoice`);
      return r.data;
    },
    staleTime: 30_000,
  });

  if (poLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={32} className="animate-spin text-[#16a34a]" />
      </div>
    );
  }

  const po = poData?.purchase_order;
  const invoice = invoiceData?.invoice;

  if (!po) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
        <p className="text-sm text-[#dc2626]">Purchase Order not found.</p>
        <button
          onClick={() => navigate('/purchase-orders')}
          className="mt-4 text-sm text-[#16a34a] hover:underline"
        >
          Back to Purchase Orders
        </button>
      </div>
    );
  }

  const overdue = isOverdue(po.due_date, po.status);
  const s = STATUS_STYLE[po.status] || STATUS_STYLE.draft;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* ── Back Button ── */}
      <button
        onClick={() => navigate('/purchase-orders')}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#16a34a] transition-colors no-print"
      >
        <ArrowLeft size={16} />
        Back to Purchase Orders
      </button>

      {/* ── Top Action Bar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between flex-wrap gap-4 no-print">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[#111827]">{po.po_number}</h1>
          <span
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${s.bg} ${s.text}`}
          >
            {s.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => console.log('Download PDF')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-gray-50 transition-all duration-150"
          >
            <Download size={16} />
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-gray-50 transition-all duration-150"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#16a34a] hover:bg-[#15803d] rounded-lg transition-all duration-150"
          >
            <Mail size={16} />
            Email Invoice
          </button>
        </div>
      </div>

      {/* ── Invoice Card ── */}
      <div
        ref={printRef}
        className="bg-white rounded-xl shadow-md border border-gray-100 p-8 print-area"
      >
        {/* Invoice Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#16a34a] rounded-lg flex items-center justify-center">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#111827]">VendorBridge</h2>
              <p className="text-sm text-gray-500">Tax Invoice</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase">Invoice Number</p>
            <p className="font-mono text-lg font-semibold text-[#111827]">
              {invoice?.invoice_number || po.po_number}
            </p>
            <div className="mt-3 space-y-1">
              <div className="text-xs">
                <span className="text-gray-500">Invoice Date: </span>
                <span className="text-[#111827] font-medium">
                  {formatDate(invoice?.invoice_date || po.po_date)}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Due Date: </span>
                <span
                  className={`font-medium ${
                    overdue ? 'text-[#dc2626]' : 'text-[#111827]'
                  }`}
                >
                  {overdue && <CalendarX size={12} className="inline mr-1" />}
                  {formatDate(invoice?.due_date || po.due_date)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To / Vendor Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Bill To */}
          <div className="bg-[#f8fafc] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building size={16} className="text-[#16a34a]" />
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Bill To
              </p>
            </div>
            <p className="font-semibold text-[#111827] mb-2">
              {invoice?.bill_to?.company_name || 'VendorBridge ERP'}
            </p>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  {invoice?.bill_to?.address ||
                    '123 Business Street, Tech City, TC 12345'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Hash size={14} className="flex-shrink-0" />
                <span>GSTIN: {invoice?.bill_to?.gst_number || '—'}</span>
              </div>
            </div>
          </div>

          {/* Vendor */}
          <div className="bg-[#f8fafc] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={16} className="text-[#16a34a]" />
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Vendor
              </p>
            </div>
            <p className="font-semibold text-[#111827] mb-2">
              {invoice?.vendor?.company_name || po.vendor_name}
            </p>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                <span>{invoice?.vendor?.address || po.vendor_address || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Hash size={14} className="flex-shrink-0" />
                <span>GSTIN: {invoice?.vendor?.gst_number || po.vendor_gst || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead className="bg-[#f8fafc]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice?.line_items || po.line_items || []).map((item, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}
                >
                  <td className="px-4 py-3 text-sm text-gray-600">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm text-[#111827]">
                    {item.item_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-[#111827]">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tax Summary */}
        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-2 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-[#111827]">
                {formatCurrency(
                  invoice?.tax_breakdown?.subtotal || po.subtotal
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">CGST (9%)</span>
              <span className="font-medium text-[#111827]">
                {formatCurrency(invoice?.tax_breakdown?.cgst || po.cgst)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">SGST (9%)</span>
              <span className="font-medium text-[#111827]">
                {formatCurrency(invoice?.tax_breakdown?.sgst || po.sgst)}
              </span>
            </div>
            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-[#111827]">
                  Grand Total
                </span>
                <span className="text-xl font-bold text-[#16a34a]">
                  {formatCurrency(
                    invoice?.tax_breakdown?.grand_total || po.grand_total
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status & Action Section */}
        {po.status === 'pending_payment' && (
          <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between no-print">
            <div>
              <p className="text-sm text-gray-600 mb-2">Current Status</p>
              <span
                className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold ${s.bg} ${s.text}`}
              >
                {s.label}
              </span>
            </div>
            <button
              onClick={() => setShowPaidModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#16a34a] hover:bg-[#15803d] rounded-lg transition-all duration-150"
            >
              <CheckCircle size={16} />
              Mark as Paid
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showEmailModal && (
        <EmailInvoiceModal
          po={po}
          invoice={invoice}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {showPaidModal && (
        <MarkAsPaidModal
          poId={po.id}
          poNumber={po.po_number}
          onClose={() => setShowPaidModal(false)}
          onSuccess={() => {
            alert('✓ Purchase Order marked as paid');
          }}
        />
      )}
    </div>
  );
}
