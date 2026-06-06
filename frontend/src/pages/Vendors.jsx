import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building,
  UserPlus,
  Search,
  SlidersHorizontal,
  Eye,
  Building2,
  Tag,
  Hash,
  User,
  Mail,
  Phone,
  MapPin,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const CATEGORIES = ['IT', 'Electronics', 'Furniture', 'Logistics', 'Stationery',
  'Office Supplies', 'Raw Materials', 'Manufacturing', 'Energy', 'Other'];

const STATUS_TABS = [
  { key: '',        label: 'All' },
  { key: 'active',  label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'blocked', label: 'Blocked' },
];

const EMPTY_FORM = {
  company_name:  '',
  category:      '',
  gst_number:    '',
  contact_name:  '',
  contact_email: '',
  contact_phone: '',
  address:       '',
};

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase() || '?';
}

const STATUS_STYLE = {
  active:  { dot: 'bg-[#16a34a]', bg: 'bg-[#dcfce7]', text: 'text-[#15803d]',  label: 'Active' },
  pending: { dot: 'bg-[#d97706]', bg: 'bg-[#fef3c7]', text: 'text-[#d97706]',  label: 'Pending' },
  blocked: { dot: 'bg-[#dc2626]', bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]',  label: 'Blocked' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[#f3f4f6]">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Field component used in the modal ───────────────────────────────────────

function Field({ label, icon: Icon, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#111827] mb-1.5">{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-[#dc2626]">{error}</p>}
    </div>
  );
}

// ─── Add Vendor Modal ─────────────────────────────────────────────────────────

function AddVendorModal({ onClose, onSuccess }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [apiErr, setApiErr] = useState('');

  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data) => api.post('/vendors', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to create vendor';
      const ve  = err.response?.data?.errors;
      if (ve?.length) {
        const map = {};
        ve.forEach((e) => { map[e.field] = e.message; });
        setErrors(map);
      } else {
        setApiErr(msg);
      }
    },
  });

  const set = (field) => (e) => {
    const val = e.target.value;
    setForm((p) => ({ ...p, [field]: val }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
    setApiErr('');
  };

  const validate = () => {
    const e = {};
    if (!form.company_name.trim())  e.company_name  = 'Company name is required';
    if (!form.contact_name.trim())  e.contact_name  = 'Contact name is required';
    if (!form.contact_email.trim()) e.contact_email = 'Contact email is required';
    else if (!/\S+@\S+\.\S+/.test(form.contact_email)) e.contact_email = 'Invalid email address';
    if (form.gst_number && !GST_REGEX.test(form.gst_number.toUpperCase()))
      e.gst_number = 'Must be 15 chars: e.g. 29ABCDE1234F1Z5';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const payload = {
      ...form,
      gst_number: form.gst_number ? form.gst_number.toUpperCase() : undefined,
      category:   form.category   || undefined,
      contact_phone: form.contact_phone || undefined,
      address:    form.address    || undefined,
    };
    mutation.mutate(payload);
  };

  // Trap focus inside modal & close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const inputCls = (field) =>
    `w-full h-10 pl-9 pr-3 text-sm border rounded-lg outline-none transition-all duration-150
     focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a]
     ${errors[field] ? 'border-red-400 bg-red-50' : 'border-[#e5e7eb] bg-white'}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-[#16a34a]" />
            <h2 className="text-lg font-bold text-[#111827]">Add New Vendor</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {apiErr && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-[#dc2626]">
              {apiErr}
            </div>
          )}

          <Field label="Company Name *" icon={Building2} error={errors.company_name}>
            <input
              className={inputCls('company_name')}
              value={form.company_name}
              onChange={set('company_name')}
              placeholder="e.g. TechSupplies Inc"
            />
          </Field>

          <Field label="Category" icon={Tag} error={errors.category}>
            <select
              className={`${inputCls('category')} appearance-none`}
              value={form.category}
              onChange={set('category')}
            >
              <option value="">Select category...</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="GST Number" icon={Hash} error={errors.gst_number}>
            <input
              className={inputCls('gst_number')}
              value={form.gst_number}
              onChange={(e) => {
                setForm((p) => ({ ...p, gst_number: e.target.value.toUpperCase() }));
                if (errors.gst_number) setErrors((p) => ({ ...p, gst_number: '' }));
              }}
              placeholder="29ABCDE1234F1Z5"
              maxLength={15}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Name *" icon={User} error={errors.contact_name}>
              <input
                className={inputCls('contact_name')}
                value={form.contact_name}
                onChange={set('contact_name')}
                placeholder="Full name"
              />
            </Field>
            <Field label="Contact Phone" icon={Phone} error={errors.contact_phone}>
              <input
                className={inputCls('contact_phone')}
                value={form.contact_phone}
                onChange={set('contact_phone')}
                placeholder="+91-9876543210"
              />
            </Field>
          </div>

          <Field label="Contact Email *" icon={Mail} error={errors.contact_email}>
            <input
              type="email"
              className={inputCls('contact_email')}
              value={form.contact_email}
              onChange={set('contact_email')}
              placeholder="contact@company.com"
            />
          </Field>

          <Field label="Address" icon={MapPin} error={errors.address}>
            <textarea
              className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg outline-none transition-all duration-150 resize-none
                focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a]
                ${errors.address ? 'border-red-400 bg-red-50' : 'border-[#e5e7eb] bg-white'}`}
              rows={3}
              value={form.address}
              onChange={set('address')}
              placeholder="Street, City, State, PIN"
            />
          </Field>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e5e7eb] flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-gray-50 transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#16a34a] hover:bg-[#15803d] rounded-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Adding...</>
            ) : (
              <><UserPlus size={16} /> Add Vendor</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Vendors Page ────────────────────────────────────────────────────────

export default function Vendors() {
  const navigate   = useNavigate();
  const { user }   = useAuth();

  // ── State ──
  const [statusTab,    setStatusTab]    = useState('');
  const [searchInput,  setSearchInput]  = useState('');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [page,         setPage]         = useState(0);
  const [showModal,    setShowModal]    = useState(false);

  // Debounce search 300 ms
  const debounceRef = useRef(null);
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(val);
      setPage(0);
    }, 300);
  }, []);

  // Reset page when tab/search changes
  useEffect(() => { setPage(0); }, [statusTab, searchQuery]);

  // ── Data fetch ──
  const queryParams = new URLSearchParams();
  if (statusTab)   queryParams.set('status',  statusTab);
  if (searchQuery) queryParams.set('search',  searchQuery);
  queryParams.set('limit',  String(PAGE_SIZE));
  queryParams.set('offset', String(page * PAGE_SIZE));

  const { data, isLoading, isError } = useQuery({
    queryKey: ['vendors', statusTab, searchQuery, page],
    queryFn:  async () => {
      const r = await api.get(`/vendors?${queryParams}`);
      return r.data;
    },
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const vendors    = data?.vendors  ?? [];
  const total      = data?.total    ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const showFrom   = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const showTo     = Math.min((page + 1) * PAGE_SIZE, total);

  // Status tab counts — fetch totals per status
  const { data: allData } = useQuery({
    queryKey: ['vendors-counts'],
    queryFn:  async () => {
      const r = await api.get('/vendors?limit=1&offset=0');
      return r.data.total;
    },
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <Building size={22} className="text-[#16a34a]" />
            <h1 className="text-2xl font-bold text-[#111827]">Vendors</h1>
          </div>
          <p className="text-sm text-[#6b7280] mt-1">
            Manage supplier and vendor registrations
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm"
        >
          <UserPlus size={16} />
          Add Vendor
        </button>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search by name, GST, category..."
              className="w-72 h-9 pl-9 pr-4 text-sm border border-[#e5e7eb] rounded-lg outline-none
                         focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150"
            />
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150
                  ${statusTab === tab.key
                    ? 'bg-[#16a34a] text-white shadow-sm'
                    : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-gray-200'}`}
              >
                {tab.label}
                {tab.key === '' && allData != null && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs
                    ${statusTab === '' ? 'bg-white/25 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    {allData}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Filter button — spacer pushes it right */}
          <div className="sm:ml-auto">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#6b7280] border border-[#e5e7eb] rounded-lg hover:bg-gray-50 transition-all duration-150">
              <SlidersHorizontal size={15} />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* ── Vendors Table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f8fafc] border-b border-[#e5e7eb]">
              <tr>
                {['Vendor Name', 'Category', 'GST Number', 'Contact', 'Status', 'Action'].map((h) => (
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
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-[#dc2626]">
                    Failed to load vendors. Please try again.
                  </td>
                </tr>

              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Package size={44} strokeWidth={1.2} />
                      <p className="text-sm font-medium">No vendors found</p>
                      {(searchQuery || statusTab) && (
                        <p className="text-xs">Try adjusting your search or filter</p>
                      )}
                    </div>
                  </td>
                </tr>

              ) : vendors.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-[#f3f4f6] hover:bg-[#f8fafc] transition-colors duration-100"
                >
                  {/* Vendor Name + email */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-green-700">
                          {getInitials(v.company_name)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#111827] truncate max-w-[200px]">
                          {v.company_name}
                        </p>
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">
                          {v.contact_email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-6 py-4">
                    {v.category ? (
                      <span className="inline-block bg-[#eff6ff] text-[#2563eb] text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {v.category}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* GST */}
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-[#6b7280]">
                      {v.gst_number || <span className="text-gray-400 font-sans">—</span>}
                    </span>
                  </td>

                  {/* Contact phone */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Phone size={13} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-[#374151]">
                        {v.contact_phone || <span className="text-gray-400">—</span>}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <StatusBadge status={v.status} />
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/vendors/${v.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#374151] border border-[#e5e7eb] rounded-lg
                                 hover:bg-[#f0fdf4] hover:text-[#16a34a] hover:border-[#bbf7d0] transition-all duration-150"
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-[#f3f4f6] bg-[#f8fafc]">
            <p className="text-sm text-[#6b7280]">
              Showing <span className="font-medium text-[#111827]">{showFrom}</span> to{' '}
              <span className="font-medium text-[#111827]">{showTo}</span> of{' '}
              <span className="font-medium text-[#111827]">{total}</span> vendors
            </p>

            <div className="flex items-center gap-1.5">
              {/* Prev */}
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-[#e5e7eb] text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-all duration-150
                    ${i === page
                      ? 'bg-[#16a34a] text-white shadow-sm'
                      : 'border border-[#e5e7eb] text-[#374151] hover:bg-white'}`}
                >
                  {i + 1}
                </button>
              ))}

              {/* Next */}
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-[#e5e7eb] text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Vendor Modal ── */}
      {showModal && (
        <AddVendorModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
