import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  FileText,
  Tag,
  CalendarDays,
  AlignLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Package,
  Users,
  Search,
  Plus,
  Trash2,
  X,
  CheckCircle,
  UploadCloud,
  Save,
  Send,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import api from '../lib/axios';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Electronics', 'Office Supplies', 'Stationery', 'Furniture',
  'Manufacturing', 'Logistics', 'Raw Materials', 'Energy', 'IT', 'Other',
];

const UNITS = ['NOS', 'KG', 'LTR', 'SET', 'MTR', 'BOX', 'PKT', 'PCS'];

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg';

const STEPS = [
  { num: 1, label: 'Basic Info' },
  { num: 2, label: 'Items & Vendors' },
  { num: 3, label: 'Review & Submit' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDeadline(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const CATEGORY_COLORS = {
  'Electronics':    { bg: 'bg-blue-50',   text: 'text-blue-700'   },
  'Office Supplies':{ bg: 'bg-purple-50', text: 'text-purple-700' },
  'Stationery':     { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  'Manufacturing':  { bg: 'bg-orange-50', text: 'text-orange-700' },
  'Logistics':      { bg: 'bg-red-50',    text: 'text-red-700'    },
  'Raw Materials':  { bg: 'bg-amber-50',  text: 'text-amber-700'  },
  'Energy':         { bg: 'bg-cyan-50',   text: 'text-cyan-700'   },
  'Furniture':      { bg: 'bg-teal-50',   text: 'text-teal-700'   },
  'IT':             { bg: 'bg-indigo-50', text: 'text-indigo-700' },
};

function getCategoryStyle(cat) {
  return CATEGORY_COLORS[cat] || { bg: 'bg-gray-100', text: 'text-gray-600' };
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

function StepProgress({ current }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, idx) => {
        const isCompleted = current > step.num;
        const isActive    = current === step.num;
        const isUpcoming  = current < step.num;

        return (
          <div key={step.num} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 font-bold text-sm
                  ${isCompleted ? 'bg-[#16a34a]' : isActive ? 'bg-[#16a34a] shadow-lg shadow-green-200' : 'bg-[#e5e7eb]'}`}
              >
                {isCompleted ? (
                  <CheckCircle size={20} className="text-white" strokeWidth={2.5} />
                ) : (
                  <span className={isActive ? 'text-white' : 'text-gray-400'}>
                    {step.num}
                  </span>
                )}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap transition-colors duration-200
                ${isActive ? 'text-[#16a34a]' : isCompleted ? 'text-[#16a34a]' : 'text-gray-400'}`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line between steps */}
            {idx < STEPS.length - 1 && (
              <div className={`w-24 sm:w-32 h-0.5 mb-5 mx-2 transition-colors duration-300
                ${isCompleted ? 'bg-[#16a34a]' : 'bg-[#e5e7eb]'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Input/Field helpers ──────────────────────────────────────────────────────

function inputCls(hasError) {
  return `w-full h-10 pl-10 pr-3 text-sm border rounded-lg outline-none transition-all duration-150
    focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a]
    ${hasError ? 'border-red-400 bg-red-50' : 'border-[#e5e7eb] bg-white'}`;
}

function FieldIcon({ icon: Icon }) {
  return (
    <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
  );
}

// ─── STEP 1 — Basic Info ──────────────────────────────────────────────────────

function Step1({ data, onChange, errors, onClearError }) {
  const set = (field) => (e) => {
    onChange(field, e.target.value);
    if (errors[field]) onClearError(field);
  };

  // Min date = today + 1 day (ISO string for input[type=datetime-local])
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  })();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
      {/* Section heading */}
      <div className="flex items-center gap-2.5 mb-2">
        <FileText size={20} className="text-[#16a34a]" />
        <h2 className="text-lg font-bold text-[#111827]">Step 1: Basic Information</h2>
      </div>

      {/* RFQ Title */}
      <div>
        <label className="block text-sm font-medium text-[#111827] mb-1.5">
          RFQ Title <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <FieldIcon icon={FileText} />
          <input
            type="text"
            value={data.title}
            onChange={set('title')}
            placeholder="e.g. Office Furniture for Q3 2026"
            className={inputCls(!!errors.title)}
          />
        </div>
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-[#111827] mb-1.5">Category</label>
        <div className="relative">
          <FieldIcon icon={Tag} />
          <select
            value={data.category}
            onChange={set('category')}
            className={`${inputCls(false)} appearance-none`}
          >
            <option value="">Select a category...</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Deadline */}
      <div>
        <label className="block text-sm font-medium text-[#111827] mb-1.5">
          Deadline <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <FieldIcon icon={CalendarDays} />
          <input
            type="datetime-local"
            value={data.deadline}
            onChange={set('deadline')}
            min={minDate}
            className={inputCls(!!errors.deadline)}
          />
        </div>
        {errors.deadline && <p className="mt-1 text-xs text-red-500">{errors.deadline}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[#111827] mb-1.5">Description</label>
        <div className="relative">
          <AlignLeft size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
          <textarea
            value={data.description}
            onChange={set('description')}
            rows={3}
            placeholder="Describe the scope, requirements, or any special instructions..."
            className="w-full pl-10 pr-3 py-2.5 text-sm border border-[#e5e7eb] rounded-lg outline-none resize-none
              focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150 bg-white"
          />
        </div>
      </div>

      {/* Next button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => {
            // validate step 1
            const e = {};
            if (!data.title.trim())   e.title    = 'RFQ title is required';
            if (!data.deadline)       e.deadline  = 'Deadline is required';
            else if (new Date(data.deadline) <= new Date()) e.deadline = 'Deadline must be in the future';
            if (Object.keys(e).length) { onClearError(null, e); return; }
            onChange('__nextStep');
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm"
        >
          Next: Add Items
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── STEP 2 — Line Items & Vendors ───────────────────────────────────────────

function Step2({ lineItems, setLineItems, selectedVendors, setSelectedVendors, errors, onClearError }) {
  const [vendorSearch, setVendorSearch] = useState('');

  // Fetch vendors
  const { data: vendorData } = useQuery({
    queryKey: ['vendors-active'],
    queryFn:  () => api.get('/vendors?status=active&limit=100').then((r) => r.data),
    staleTime: 60_000,
  });

  const allVendors   = vendorData?.vendors ?? [];
  const filteredVendors = vendorSearch
    ? allVendors.filter((v) =>
        v.company_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
        (v.category || '').toLowerCase().includes(vendorSearch.toLowerCase())
      )
    : allVendors;

  // Line item helpers
  const addItem = () => {
    setLineItems((prev) => [...prev, { id: Date.now(), item_name: '', qty: '', unit: 'NOS' }]);
    if (errors.line_items) onClearError('line_items');
  };

  const updateItem = (id, field, value) => {
    setLineItems((prev) => prev.map((it) => it.id === id ? { ...it, [field]: value } : it));
  };

  const removeItem = (id) => {
    setLineItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Vendor selection helpers
  const toggleVendor = (vendor) => {
    if (selectedVendors.find((v) => v.id === vendor.id)) {
      setSelectedVendors((prev) => prev.filter((v) => v.id !== vendor.id));
    } else {
      setSelectedVendors((prev) => [...prev, vendor]);
    }
    if (errors.vendors) onClearError('vendors');
  };

  const removeVendor = (id) => {
    setSelectedVendors((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── LEFT: Line Items ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-[#16a34a]" />
              <h3 className="text-base font-bold text-[#111827]">Line Items</h3>
              <span className="text-xs text-gray-400">({lineItems.length})</span>
            </div>
            <button
              onClick={addItem}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#16a34a] border border-[#16a34a] rounded-lg hover:bg-[#f0fdf4] transition-all duration-150"
            >
              <Plus size={13} />
              Add Item
            </button>
          </div>

          {errors.line_items && (
            <p className="mb-3 text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {errors.line_items}
            </p>
          )}

          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_90px_36px] gap-2 mb-2 px-1">
            <span className="text-xs font-semibold text-gray-400 uppercase">Item Name</span>
            <span className="text-xs font-semibold text-gray-400 uppercase">Qty</span>
            <span className="text-xs font-semibold text-gray-400 uppercase">Unit</span>
            <span />
          </div>

          {/* Items */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {lineItems.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <Package size={28} className="text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-xs text-gray-400">No items added. Click "Add Item" to start.</p>
              </div>
            ) : lineItems.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-[1fr_80px_90px_36px] gap-2 items-center">
                <input
                  type="text"
                  value={item.item_name}
                  onChange={(e) => updateItem(item.id, 'item_name', e.target.value)}
                  placeholder={`Item ${idx + 1}`}
                  className="h-9 px-2.5 text-sm border border-[#e5e7eb] rounded-lg outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150"
                />
                <input
                  type="number"
                  value={item.qty}
                  onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                  placeholder="0"
                  min="0.01"
                  step="0.01"
                  className="h-9 px-2.5 text-sm border border-[#e5e7eb] rounded-lg outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150"
                />
                <select
                  value={item.unit}
                  onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                  className="h-9 px-2 text-sm border border-[#e5e7eb] rounded-lg outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150 appearance-none bg-white"
                >
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={lineItems.length === 1}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Assign Vendors ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-[#16a34a]" />
            <h3 className="text-base font-bold text-[#111827]">Assign Vendors</h3>
          </div>

          {errors.vendors && (
            <p className="mb-3 text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {errors.vendors}
            </p>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              placeholder="Search vendors..."
              className="w-full h-9 pl-9 pr-3 text-sm border border-[#e5e7eb] rounded-lg outline-none
                focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150"
            />
          </div>

          {/* Vendor list */}
          <div className="border border-[#e5e7eb] rounded-lg max-h-52 overflow-y-auto divide-y divide-[#f3f4f6]">
            {filteredVendors.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-gray-400">
                  {allVendors.length === 0 ? 'No active vendors found' : 'No vendors match your search'}
                </p>
              </div>
            ) : filteredVendors.map((vendor) => {
              const isSelected = !!selectedVendors.find((v) => v.id === vendor.id);
              const catStyle   = getCategoryStyle(vendor.category);
              return (
                <label
                  key={vendor.id}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors duration-100
                    ${isSelected ? 'bg-[#f0fdf4]' : 'hover:bg-gray-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleVendor(vendor)}
                    className="w-4 h-4 rounded accent-[#16a34a] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111827] truncate">{vendor.company_name}</p>
                    <p className="text-xs text-gray-400 truncate">{vendor.contact_email}</p>
                  </div>
                  {vendor.category && (
                    <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${catStyle.bg} ${catStyle.text}`}>
                      {vendor.category}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {/* Selected chips */}
          {selectedVendors.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Selected ({selectedVendors.length}):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedVendors.map((v) => (
                  <span
                    key={v.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#dcfce7] text-[#15803d] text-xs font-medium rounded-full"
                  >
                    {v.company_name}
                    <button
                      onClick={() => removeVendor(v.id)}
                      className="ml-0.5 text-green-600 hover:text-green-800 transition-colors duration-100"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── STEP 3 — Attachments & Review ───────────────────────────────────────────

function Step3({ formData, lineItems, selectedVendors, files, setFiles, onSubmit, onDraft, isSubmitting, isDrafting }) {
  const fileInputRef  = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleFiles = useCallback((incoming) => {
    const newFiles = Array.from(incoming).map((f) => ({
      id:   Date.now() + Math.random(),
      file: f,
      name: f.name,
      size: f.size,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, [setFiles]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── LEFT: File Upload ── */}
        <div>
          <h3 className="text-base font-bold text-[#111827] mb-4">Attachments</h3>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200
              ${dragOver
                ? 'border-[#16a34a] bg-[#f0fdf4]'
                : 'border-[#e5e7eb] bg-[#fafafa] hover:border-[#16a34a] hover:bg-[#f0fdf4]'}`}
          >
            <UploadCloud size={40} className={`transition-colors duration-200 ${dragOver ? 'text-[#16a34a]' : 'text-[#9ca3af]'}`} strokeWidth={1.5} />
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">Drag & drop files or click to upload</p>
              <p className="text-xs text-gray-400 mt-1">Accepted: PDF, DOC, XLSX, Images</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Uploaded files list */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-2.5 bg-[#f8fafc] rounded-lg border border-[#e5e7eb]">
                  <FileText size={16} className="text-[#16a34a] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111827] truncate">{f.name}</p>
                    <p className="text-xs text-gray-400">{formatBytes(f.size)}</p>
                  </div>
                  <button
                    onClick={() => removeFile(f.id)}
                    className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Review Summary ── */}
        <div className="bg-[#f8fafc] rounded-xl p-5 border border-[#e5e7eb]">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={18} className="text-[#16a34a]" />
            <h3 className="text-base font-bold text-[#111827]">Review Your RFQ</h3>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Title',       value: formData.title || '—' },
              { label: 'Category',    value: formData.category || 'Not specified' },
              { label: 'Deadline',    value: formatDeadline(formData.deadline) },
              { label: 'Items',       value: `${lineItems.filter((i) => i.item_name.trim()).length} line item${lineItems.filter((i) => i.item_name.trim()).length !== 1 ? 's' : ''}` },
              { label: 'Vendors',     value: `${selectedVendors.length} vendor${selectedVendors.length !== 1 ? 's' : ''} assigned` },
              { label: 'Attachments', value: files.length > 0 ? `${files.length} file${files.length !== 1 ? 's' : ''}` : 'None' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-3 py-2 border-b border-[#e5e7eb] last:border-0">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-shrink-0">{label}</span>
                <span className="text-sm font-medium text-[#111827] text-right break-all">{value}</span>
              </div>
            ))}
          </div>

          {/* Description preview */}
          {formData.description && (
            <div className="mt-3 pt-3 border-t border-[#e5e7eb]">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-gray-600 line-clamp-3">{formData.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#e5e7eb] flex-wrap gap-3">
        <button
          onClick={onDraft}
          disabled={isDrafting || isSubmitting}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 border border-[#e5e7eb] rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
        >
          {isDrafting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save as Draft
        </button>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={isSubmitting || isDrafting}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#16a34a] hover:bg-[#15803d] rounded-lg shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Send to Vendors
        </button>
      </div>

      {/* ── Confirm dialog ── */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-amber-500" />
              </div>
              <h3 className="text-base font-bold text-[#111827]">Publish RFQ?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              This will publish the RFQ and notify{' '}
              <span className="font-semibold text-[#111827]">{selectedVendors.length} vendor{selectedVendors.length !== 1 ? 's' : ''}</span>.
              {' '}Once published, it cannot be edited. Continue?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-[#e5e7eb] rounded-lg hover:bg-gray-50 transition-all duration-150"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowConfirm(false); onSubmit(); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#16a34a] hover:bg-[#15803d] rounded-lg transition-all duration-200"
              >
                <Send size={14} />
                Yes, Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main CreateRFQ Page ──────────────────────────────────────────────────────

export default function CreateRFQ() {
  const navigate   = useNavigate();
  const qc         = useQueryClient();

  const [step, setStep] = useState(1);

  // Step 1 data
  const [formData, setFormData] = useState({
    title: '', category: '', deadline: '', description: '',
  });
  const [step1Errors, setStep1Errors] = useState({});

  // Step 2 data
  const [lineItems,       setLineItems]       = useState([{ id: Date.now(), item_name: '', qty: '', unit: 'NOS' }]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [step2Errors,     setStep2Errors]     = useState({});

  // Step 3 data
  const [files, setFiles] = useState([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting,   setIsDrafting]   = useState(false);
  const [apiError,     setApiError]     = useState('');

  // ── Step 1 handlers ──
  const handleStep1Change = (field, value) => {
    if (field === '__nextStep') {
      setStep(2);
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const clearStep1Error = (field, newErrors) => {
    if (newErrors) { setStep1Errors(newErrors); return; }
    if (field) setStep1Errors((prev) => ({ ...prev, [field]: '' }));
  };

  // ── Step 2 validation ──
  const validateStep2 = () => {
    const e = {};
    const validItems = lineItems.filter((i) => i.item_name.trim() && i.qty);
    if (validItems.length === 0)        e.line_items = 'Add at least one line item with a name and quantity';
    if (selectedVendors.length === 0)   e.vendors    = 'Select at least one vendor';
    setStep2Errors(e);
    return Object.keys(e).length === 0;
  };

  const clearStep2Error = (field) => {
    setStep2Errors((prev) => ({ ...prev, [field]: '' }));
  };

  // ── Build API payload ──
  const buildPayload = () => {
    const validItems = lineItems
      .filter((i) => i.item_name.trim() && i.qty)
      .map((i) => ({ item_name: i.item_name.trim(), qty: parseFloat(i.qty), unit: i.unit }));

    return {
      title:       formData.title.trim(),
      category:    formData.category || undefined,
      deadline:    formData.deadline,
      description: formData.description.trim() || undefined,
      line_items:  validItems,
      vendor_ids:  selectedVendors.map((v) => v.id),
    };
  };

  // ── Create RFQ (draft) ──
  const handleSaveDraft = async () => {
    if (!validateStep2()) return;
    setIsDrafting(true);
    setApiError('');
    try {
      await api.post('/rfqs', buildPayload());
      qc.invalidateQueries({ queryKey: ['rfqs'] });
      qc.invalidateQueries({ queryKey: ['rfqs-all-counts'] });
      navigate('/rfqs');
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to save RFQ. Please try again.');
    } finally {
      setIsDrafting(false);
    }
  };

  // ── Create RFQ then publish ──
  const handlePublish = async () => {
    setIsSubmitting(true);
    setApiError('');
    try {
      const createRes  = await api.post('/rfqs', buildPayload());
      const rfqId      = createRes.data.rfq.id;
      await api.post(`/rfqs/${rfqId}/publish`);
      qc.invalidateQueries({ queryKey: ['rfqs'] });
      qc.invalidateQueries({ queryKey: ['rfqs-all-counts'] });
      navigate('/rfqs');
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to publish RFQ. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Handle step 2 → 3 ──
  const handleStep2Next = () => {
    if (validateStep2()) setStep(3);
  };

  // Scroll to top on step change
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate('/rfqs'))}
          className="p-2 rounded-lg border border-[#e5e7eb] text-gray-500 hover:bg-gray-50 transition-all duration-150"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2.5">
            <ClipboardList size={20} className="text-[#16a34a]" />
            <h1 className="text-2xl font-bold text-[#111827]">Create New RFQ</h1>
          </div>
          <p className="text-sm text-[#6b7280] mt-0.5">Request for Quotations</p>
        </div>
      </div>

      {/* ── Step Progress ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 pt-6 pb-2">
        <StepProgress current={step} />
      </div>

      {/* ── API Error ── */}
      {apiError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{apiError}</span>
          <button onClick={() => setApiError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Step Content ── */}
      {step === 1 && (
        <Step1
          data={formData}
          onChange={handleStep1Change}
          errors={step1Errors}
          onClearError={clearStep1Error}
        />
      )}

      {step === 2 && (
        <>
          <Step2
            lineItems={lineItems}
            setLineItems={setLineItems}
            selectedVendors={selectedVendors}
            setSelectedVendors={setSelectedVendors}
            errors={step2Errors}
            onClearError={clearStep2Error}
          />
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 border border-[#e5e7eb] rounded-lg hover:bg-gray-50 transition-all duration-150"
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <button
              onClick={handleStep2Next}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm"
            >
              Next: Review
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Step3
            formData={formData}
            lineItems={lineItems}
            selectedVendors={selectedVendors}
            files={files}
            setFiles={setFiles}
            onSubmit={handlePublish}
            onDraft={handleSaveDraft}
            isSubmitting={isSubmitting}
            isDrafting={isDrafting}
          />
          {/* Back button */}
          <div>
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 border border-[#e5e7eb] rounded-lg hover:bg-gray-50 transition-all duration-150"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}
