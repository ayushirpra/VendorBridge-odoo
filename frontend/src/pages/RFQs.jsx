import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  FilePlus,
  Search,
  CalendarDays,
  Users,
  ArrowRight,
  Package,
  Loader2,
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: '',          label: 'All' },
  { key: 'draft',     label: 'Draft' },
  { key: 'published', label: 'Published' },
  { key: 'closed',    label: 'Closed' },
];

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

const STATUS_CONFIG = {
  draft:     { bg: 'bg-gray-100',   text: 'text-gray-600',  dot: 'bg-gray-400',  label: 'Draft',     border: '#9ca3af' },
  published: { bg: 'bg-green-50',   text: 'text-green-700', dot: 'bg-green-500', label: 'Published', border: '#16a34a' },
  closed:    { bg: 'bg-gray-100',   text: 'text-gray-500',  dot: 'bg-gray-500',  label: 'Closed',    border: '#6b7280' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDeadline(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getCategoryStyle(cat) {
  return CATEGORY_COLORS[cat] || { bg: 'bg-gray-100', text: 'text-gray-600' };
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-5 w-20 bg-gray-100 rounded-full" />
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-gray-100 rounded mb-2" />
      <div className="h-4 w-full bg-gray-100 rounded mb-1" />
      <div className="h-4 w-2/3 bg-gray-100 rounded mb-4" />
      <div className="h-px bg-gray-100 mb-4" />
      <div className="flex justify-between">
        <div className="h-4 w-32 bg-gray-100 rounded" />
        <div className="h-8 w-28 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}

// ─── RFQ Card ─────────────────────────────────────────────────────────────────

function RfqCard({ rfq, onView }) {
  const status  = STATUS_CONFIG[rfq.status] || STATUS_CONFIG.draft;
  const catStyle = getCategoryStyle(rfq.category);
  const isClosed = rfq.status === 'closed';

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3
        hover:shadow-md transition-shadow duration-200 ${isClosed ? 'opacity-70' : ''}`}
      style={{ borderLeft: `3px solid ${status.border}` }}
    >
      {/* Top row: category + status */}
      <div className="flex items-center justify-between gap-2">
        {rfq.category ? (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${catStyle.bg} ${catStyle.text}`}>
            {rfq.category}
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            Uncategorized
          </span>
        )}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-1">
        {rfq.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed flex-1">
        {rfq.description || 'No description provided.'}
      </p>

      {/* Divider */}
      <div className="h-px bg-gray-100" />

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2">
        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <CalendarDays size={13} className="text-gray-400" />
            {formatDeadline(rfq.deadline)}
          </span>
          <span className="flex items-center gap-1">
            <Users size={13} className="text-gray-400" />
            {rfq.vendor_count ?? 0} vendor{rfq.vendor_count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* View button */}
        <button
          onClick={() => onView(rfq.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#16a34a] border border-[#16a34a] rounded-lg
            hover:bg-[#f0fdf4] transition-all duration-150 whitespace-nowrap"
        >
          View Details
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isFiltered, onCreateNew }) {
  return (
    <div className="col-span-3 py-20 flex flex-col items-center gap-4 text-gray-400">
      <ClipboardList size={52} strokeWidth={1.2} />
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-600 mb-1">
          {isFiltered ? 'No RFQs match your filters' : 'No RFQs yet'}
        </p>
        <p className="text-xs text-gray-400">
          {isFiltered
            ? 'Try adjusting your search or status filter'
            : 'Create your first Request for Quotation to get started'}
        </p>
      </div>
      {!isFiltered && (
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm mt-1"
        >
          <FilePlus size={15} />
          Create RFQ
        </button>
      )}
    </div>
  );
}

// ─── Main RFQs Page ───────────────────────────────────────────────────────────

export default function RFQs() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab,   setActiveTab]   = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search 300ms
  const debounceRef = useRef(null);
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(val), 300);
  }, []);

  // Reset search when tab changes
  useEffect(() => { setSearchQuery(searchInput); }, [activeTab]);

  // ── Fetch all RFQs (for tab counts) ──
  const { data: allData } = useQuery({
    queryKey: ['rfqs-all-counts'],
    queryFn:  () => api.get('/rfqs?limit=200&offset=0').then((r) => r.data),
    staleTime: 30_000,
  });

  // Compute tab counts from allData
  const counts = {
    '':          allData?.total          ?? 0,
    draft:       allData?.rfqs?.filter((r) => r.status === 'draft').length     ?? 0,
    published:   allData?.rfqs?.filter((r) => r.status === 'published').length ?? 0,
    closed:      allData?.rfqs?.filter((r) => r.status === 'closed').length    ?? 0,
  };

  // ── Fetch filtered RFQs ──
  const queryParams = new URLSearchParams();
  if (activeTab)   queryParams.set('status', activeTab);
  queryParams.set('limit', '100');
  queryParams.set('offset', '0');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rfqs', activeTab, searchQuery],
    queryFn:  () => api.get(`/rfqs?${queryParams}`).then((r) => r.data),
    staleTime: 30_000,
  });

  // Filter client-side by search
  const allRfqs = data?.rfqs ?? [];
  const rfqs = searchQuery
    ? allRfqs.filter((r) =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allRfqs;

  const isFiltered = !!(activeTab || searchQuery);
  const canCreate  = user?.role === 'procurement_officer' || user?.role === 'admin';

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <ClipboardList size={22} className="text-[#16a34a]" />
            <h1 className="text-2xl font-bold text-[#111827]">RFQ's</h1>
          </div>
          <p className="text-sm text-[#6b7280] mt-1">Request for Quotations</p>
        </div>

        {canCreate && (
          <button
            onClick={() => navigate('/rfqs/new')}
            className="flex items-center gap-2 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm"
          >
            <FilePlus size={16} />
            + Create RFQ
          </button>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search RFQs..."
              className="w-64 h-9 pl-9 pr-4 text-sm border border-[#e5e7eb] rounded-lg outline-none
                focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-150"
            />
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150
                  ${activeTab === tab.key
                    ? 'bg-[#16a34a] text-white shadow-sm'
                    : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-gray-200'}`}
              >
                {tab.label}
                {allData && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs leading-none
                    ${activeTab === tab.key
                      ? 'bg-white/25 text-white'
                      : 'bg-gray-300 text-gray-600'}`}
                  >
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── RFQ Cards Grid ── */}
      {isError ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-sm text-red-500">Failed to load RFQs. Please try again.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : rfqs.length === 0
            ? <EmptyState isFiltered={isFiltered} onCreateNew={() => navigate('/rfqs/new')} />
            : rfqs.map((rfq) => (
                <RfqCard
                  key={rfq.id}
                  rfq={rfq}
                  onView={(id) => navigate(`/rfqs/${id}`)}
                />
              ))
          }
        </div>
      )}
    </div>
  );
}
