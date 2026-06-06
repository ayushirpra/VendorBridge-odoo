import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Hash,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Pencil,
  Loader2,
  Tag,
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Save,
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['IT', 'Electronics', 'Furniture', 'Logistics', 'Stationery',
  'Office Supplies', 'Raw Materials', 'Manufacturing', 'Energy', 'Other'];

const STATUS_OPTIONS = [
  { value: 'active',  label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'blocked', label: 'Blocked' },
];

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ─── Status styling ───────────────────────────────────────────────────────────

const STATUS_STYLE = {
  active:  { dot: 'bg-[#16a34a]', bg: 'bg-[#dcfce7]', text: 'text-[#15803d]',  label: 'Active' },
  pending: { dot: 'bg-[#d97706]', bg: 'bg-[#fef3c7]', text: 'text-[#d97706]',  label: 'Pending' },
  blocked: { dot: 'bg-[#dc2626]', bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]',  label: 'Blocked' },
};

function StatusBadge({ status, large = false }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium
      ${large ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'}
      ${s.bg} ${s.text}`}>
      <span className={`rounded-full flex-shrink-0 ${large ? 'w-2 h-2' : 'w-1.5 h-1.5'} ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─── Activity colour by action type ──────────────────────────────────────────

const ACTION_STYLE = {
  CREATE:       { dot: 'bg-[#16a34a]', icon: CheckCircle2, color: 'text-[#16a34a]' },
  UPDATE:       { dot: 'bg-blue-500',  icon: Pencil,       color: 'text-blue-600' },
  ACTIVATE:     { dot: 'bg-[#16a34a]', icon: CheckCircle2, color: 'text-[#16a34a]' },
  BLOCK:        { dot: 'bg-[#dc2626]', icon: AlertCircle,  color: 'text-[#dc2626]' },
  SET_PENDING:  { dot: 'bg-[#d97706]', icon: Clock,        color: 'text-[#d97706]' },
  STATUS_CHANGE:{ dot: 'bg-[#d97706]', icon: Clock,        color: 'text-[#d97706]' },
  DELETE:       { dot: 'bg-[#dc2626]', icon: AlertCircle,  color: 'text-[#dc2626]' },
};

function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatCurrency(v) {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

// ─── Info field card ──────────────────────────────────────────────────────────

function InfoField({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-[#f8fafc] rounded-xl border border-gray-100">
      <div className="w-8 h-8 rounded-lg bg-[#dcfce7] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-[#16a34a]" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#6b7280] mb-0.5">{label}</p>
        <p className={`text-sm text-[#111827] break-words ${mono ? 'font-mono' : 'font-medium'}`}>
          {value || <span className="text-gray-400 font-normal">—</span>}
        </p>
      </div>
    </div>
  );
}

// ─── Edit field ───────────────────────────────────────────────────────────────

function EditField({ label, icon: Icon, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-[#dc2626]">{error}</p>}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ─── VendorDetail Page ────────────────────────────────────────────────────────

export default function VendorDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const qc         = useQueryClient();

  const isAdmin = user?.role === 'admin' || user?.role === 'procurement_officer';

  // ── UI state ──
  const [editMode,    setEditMode]    = useState(false);
  const [editForm,    setEditForm]    = useState(null);
  const [editErrors,  setEditErrors]  = useState({});
  const [editApiErr,  setEditApiErr]  = useState('');
  const [newStatus,   setNewStatus]   = useState('');
  const [statusReason,setStatusReason]= useState('');
  const [statusMsg,   setStatusMsg]   = useState('');

  // ── Fetch vendor detail ──
  const { data: vendorData, isLoading, isError } = useQuery({
    queryKey: ['vendor', id],
    queryFn:  async () => {
      const r = await api.get(`/vendors/${id}`);
      return r.data.vendor;
    },
    staleTime: 30_000,
    onSuccess: (v) => {
      if (!editForm) {
        setEditForm({
          company_name:  v.company_name  || '',
          category:      v.category      || '',
          gst_number:    v.gst_number    || '',
          contact_name:  v.contact_name  || '',
          contact_email: v.contact_email || '',
          contact_phone: v.contact_phone || '',
          address:       v.address       || '',
        });
        setNewStatus(v.status);
      }
    },
  });

  // ── Fetch activity ──
  const { data: activityData } = useQuery({
    queryKey: ['vendor-activity', id],
    queryFn:  async () => {
      const r = await api.get(`/vendors/${id}/activity?limit=3`);
      return r.data.activity;
    },
    staleTime: 30_000,
  });

  // ── Update mutation ──
  const updateMutation = useMutation({
    mutationFn: (body) => api.put(`/vendors/${id}`, body),
    onSuccess: (res) => {
      qc.setQueryData(['vendor', id], res.data.vendor);
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['vendor-activity', id] });
      setEditMode(false);
      setEditErrors({});
      setEditApiErr('');
    },
    onError: (err) => {
      const ve = err.response?.data?.errors;
      if (ve?.length) {
        const map = {};
        ve.forEach((e) => { map[e.field] = e.message; });
        setEditErrors(map);
      } else {
        setEditApiErr(err.response?.data?.message || 'Update failed');
      }
    },
  });

  // ── Status patch mutation ──
  const statusMutation = useMutation({
    mutationFn: (body) => api.patch(`/vendors/${id}/status`, body),
    onSuccess: (res) => {
      qc.setQueryData(['vendor', id], (prev) =>
        prev ? { ...prev, status: res.data.vendor.status } : prev
      );
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['vendor-activity', id] });
      setStatusMsg(`Status updated to "${res.data.vendor.status}"`);
      setStatusReason('');
      setTimeout(() => setStatusMsg(''), 3000);
    },
    onError: (err) => {
      setStatusMsg(err.response?.data?.message || 'Status update failed');
      setTimeout(() => setStatusMsg(''), 3000);
    },
  });

  // ── When vendor loads, sync edit form ──
  const vendor = vendorData;
  if (vendor && !editForm) {
    setEditForm({
      company_name:  vendor.company_name  || '',
      category:      vendor.category      || '',
      gst_number:    vendor.gst_number    || '',
      contact_name:  vendor.contact_name  || '',
      contact_email: vendor.contact_email || '',
      contact_phone: vendor.contact_phone || '',
      address:       vendor.address       || '',
    });
    setNewStatus(vendor.status);
  }

  // ── Edit form handlers ──
  const setField = (field) => (e) => {
    const val = e.target.value;
    setEditForm((p) => ({ ...p, [field]: val }));
    if (editErrors[field]) setEditErrors((p) => ({ ...p, [field]: '' }));
    setEditApiErr('');
  };

  const validateEdit = () => {
    const e = {};
    if (!editForm.company_name?.trim())  e.company_name  = 'Required';
    if (!editForm.contact_name?.trim())  e.contact_name  = 'Required';
    if (!editForm.contact_email?.trim()) e.contact_email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(editForm.contact_email)) e.contact_email = 'Invalid email';
    if (editForm.gst_number && !GST_REGEX.test(editForm.gst_number.toUpperCase()))
      e.gst_number = 'Invalid GST format (e.g. 29ABCDE1234F1Z5)';
    setEditErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveEdit = () => {
    if (!validateEdit()) return;
    updateMutation.mutate({
      ...editForm,
      gst_number: editForm.gst_number ? editForm.gst_number.toUpperCase() : null,
    });
  };

  const handleCancelEdit = () => {
    if (vendor) {
      setEditForm({
        company_name:  vendor.company_name  || '',
        category:      vendor.category      || '',
        gst_number:    vendor.gst_number    || '',
        contact_name:  vendor.contact_name  || '',
        contact_email: vendor.contact_email || '',
        contact_phone: vendor.contact_phone || '',
        address:       vendor.address       || '',
      });
    }
    setEditErrors({});
    setEditApiErr('');
    setEditMode(false);
  };

  const inputCls = (field) =>
    `w-full h-10 pl-9 pr-3 text-sm border rounded-lg outline-none transition-all duration-150
     focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a]
     ${editErrors[field] ? 'border-red-400 bg-red-50' : 'border-[#e5e7eb] bg-white'}`;

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError || !vendor) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/vendors')}
          className="flex items-center gap-2 text-sm text-[#16a34a] hover:text-[#15803d] font-medium"
        >
          <ArrowLeft size={16} /> Back to Vendors
        </button>
        <div className="bg-white rounded-xl p-10 border border-gray-100 shadow-sm text-center text-[#dc2626]">
          Vendor not found or failed to load.
        </div>
      </div>
    );
  }

  const initials = vendor.company_name
    ? vendor.company_name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '?';

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Back ── */}
      <button
        onClick={() => navigate('/vendors')}
        className="flex items-center gap-2 text-sm text-[#16a34a] hover:text-[#15803d] font-medium transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Vendors
      </button>

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Large avatar */}
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-green-700">{initials}</span>
            </div>

            <div>
              <h1 className="text-xl font-bold text-[#111827]">{vendor.company_name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {vendor.category && (
                  <span className="inline-flex items-center gap-1 bg-[#eff6ff] text-[#2563eb] text-xs font-medium px-2.5 py-0.5 rounded-full">
                    <Tag size={11} />
                    {vendor.category}
                  </span>
                )}
                <StatusBadge status={vendor.status} large />
              </div>
            </div>
          </div>

          {/* Edit / Save / Cancel buttons */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-gray-50 transition-all duration-150"
                  >
                    <X size={15} /> Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-[#16a34a] hover:bg-[#15803d] rounded-lg transition-all duration-150 disabled:opacity-60"
                  >
                    {updateMutation.isPending
                      ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
                      : <><Save size={15} /> Save Changes</>
                    }
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#f0fdf4] hover:text-[#16a34a] hover:border-[#bbf7d0] transition-all duration-150"
                >
                  <Pencil size={15} /> Edit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-[#f3f4f6]">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#111827]">{vendor.active_rfq_count ?? 0}</p>
            <p className="text-xs text-[#6b7280] mt-0.5">Active RFQs</p>
          </div>
          <div className="text-center border-x border-[#f3f4f6]">
            <p className="text-2xl font-bold text-[#111827]">{vendor.total_po_count ?? 0}</p>
            <p className="text-xs text-[#6b7280] mt-0.5">Purchase Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#111827]">
              {vendor.total_spend > 0 ? formatCurrency(vendor.total_spend) : '₹0'}
            </p>
            <p className="text-xs text-[#6b7280] mt-0.5">Total Spend</p>
          </div>
        </div>
      </div>

      {/* ── Info / Edit Grid ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wide mb-4">
          Vendor Information
        </h2>

        {editApiErr && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-[#dc2626]">
            {editApiErr}
          </div>
        )}

        {editMode && editForm ? (
          /* ── Edit mode ── */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EditField label="Company Name *" icon={Building2} error={editErrors.company_name}>
                <input className={inputCls('company_name')} value={editForm.company_name}
                  onChange={setField('company_name')} />
              </EditField>

              <EditField label="Category" icon={Tag} error={editErrors.category}>
                <select className={`${inputCls('category')} appearance-none`}
                  value={editForm.category} onChange={setField('category')}>
                  <option value="">Select...</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </EditField>

              <EditField label="GST Number" icon={Hash} error={editErrors.gst_number}>
                <input className={inputCls('gst_number')} value={editForm.gst_number}
                  onChange={(e) => {
                    setEditForm((p) => ({ ...p, gst_number: e.target.value.toUpperCase() }));
                    if (editErrors.gst_number) setEditErrors((p) => ({ ...p, gst_number: '' }));
                  }}
                  placeholder="29ABCDE1234F1Z5" maxLength={15} />
              </EditField>

              <EditField label="Contact Name *" icon={User} error={editErrors.contact_name}>
                <input className={inputCls('contact_name')} value={editForm.contact_name}
                  onChange={setField('contact_name')} />
              </EditField>

              <EditField label="Contact Email *" icon={Mail} error={editErrors.contact_email}>
                <input type="email" className={inputCls('contact_email')} value={editForm.contact_email}
                  onChange={setField('contact_email')} />
              </EditField>

              <EditField label="Contact Phone" icon={Phone} error={editErrors.contact_phone}>
                <input className={inputCls('contact_phone')} value={editForm.contact_phone}
                  onChange={setField('contact_phone')} />
              </EditField>
            </div>

            <EditField label="Address" icon={MapPin} error={editErrors.address}>
              <textarea
                className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg outline-none transition-all duration-150 resize-none
                  focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a]
                  ${editErrors.address ? 'border-red-400 bg-red-50' : 'border-[#e5e7eb] bg-white'}`}
                rows={3} value={editForm.address} onChange={setField('address')}
              />
            </EditField>
          </div>
        ) : (
          /* ── View mode ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoField icon={Hash}     label="GST Number"    value={vendor.gst_number}    mono />
            <InfoField icon={User}     label="Contact Name"  value={vendor.contact_name} />
            <InfoField icon={Mail}     label="Email"         value={vendor.contact_email} />
            <InfoField icon={Phone}    label="Phone"         value={vendor.contact_phone} />
            <InfoField icon={Calendar} label="Created At"    value={formatDate(vendor.created_at)} />
            <InfoField icon={User}     label="Created By"    value={vendor.created_by_name} />
            <div className="sm:col-span-2">
              <InfoField icon={MapPin} label="Address" value={vendor.address} />
            </div>
          </div>
        )}
      </div>

      {/* ── Status Change (admin/procurement_officer only) ── */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wide mb-4 flex items-center gap-2">
            <ShoppingBag size={15} className="text-[#16a34a]" />
            Change Vendor Status
          </h2>

          {statusMsg && (
            <div className={`mb-4 p-3 rounded-lg text-sm border ${
              statusMsg.includes('updated')
                ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]'
                : 'bg-red-50 border-red-200 text-[#dc2626]'
            }`}>
              {statusMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">New Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-[#e5e7eb] rounded-lg outline-none
                           focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] bg-white"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">
                Reason <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g. Delayed deliveries"
                className="w-full h-10 px-3 text-sm border border-[#e5e7eb] rounded-lg outline-none
                           focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a]"
              />
            </div>

            <button
              onClick={() => statusMutation.mutate({ status: newStatus, reason: statusReason || undefined })}
              disabled={statusMutation.isPending || newStatus === vendor.status}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#16a34a]
                         hover:bg-[#15803d] rounded-lg transition-all duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {statusMutation.isPending
                ? <><Loader2 size={15} className="animate-spin" /> Updating...</>
                : <><TrendingUp size={15} /> Update Status</>
              }
            </button>
          </div>

          <p className="text-xs text-[#6b7280] mt-2">
            Current status:{' '}
            <StatusBadge status={vendor.status} />
          </p>
        </div>
      )}

      {/* ── Recent Activity ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wide mb-4">
          Recent Activity
        </h2>

        {!activityData ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : activityData.length === 0 ? (
          <p className="text-sm text-[#6b7280] text-center py-4">No activity recorded yet.</p>
        ) : (
          <ol className="space-y-4">
            {activityData.map((item, idx) => {
              const style = ACTION_STYLE[item.action] || ACTION_STYLE.UPDATE;
              const actor = [item.first_name, item.last_name].filter(Boolean).join(' ') || 'System';
              return (
                <li key={item.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1 ${style.dot}`} />
                    {idx < activityData.length - 1 && (
                      <span className="w-px flex-1 bg-gray-100 mt-1 min-h-[20px]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-sm text-[#374151] leading-snug">
                      <span className={`font-semibold ${style.color}`}>{actor}</span>
                      {' — '}
                      {item.description || `${item.action} on vendor`}
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
  );
}
