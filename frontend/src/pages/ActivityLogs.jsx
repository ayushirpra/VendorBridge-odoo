import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';
import {
  Activity,
  Search,
  CalendarDays,
  Download,
  ClipboardList,
  CheckSquare,
  Receipt,
  Building,
  ClipboardX,
  Shield
} from 'lucide-react';

const ENTITY_TYPES = [
  { value: '', label: 'All', icon: Activity, color: 'gray' },
  { value: 'rfq', label: 'RFQ', icon: ClipboardList, color: 'blue' },
  { value: 'approval', label: 'Approvals', icon: CheckSquare, color: 'amber' },
  { value: 'invoice', label: 'Invoices', icon: Receipt, color: 'purple' },
  { value: 'vendor', label: 'Vendors', icon: Building, color: 'green' }
];

const ENTITY_COLORS = {
  vendor: '#16a34a',
  rfq: '#2563eb',
  approval: '#d97706',
  invoice: '#7c3aed',
  purchase_order: '#dc2626'
};

export default function ActivityLogs() {
  const [filters, setFilters] = useState({
    entity_type: '',
    search: '',
    from_date: '',
    to_date: ''
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['activity-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.search) params.append('search', filters.search);
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);
      
      const response = await axios.get(`/activity-logs?${params}`);
      return response.data.data || [];
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);

      const response = await axios.get(`/activity-logs/export?${params}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `activity-logs-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Activity & Logs</h1>
          </div>
          <p className="text-sm text-gray-600">Procurement audit trail — immutable records</p>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500 italic">
          <Shield className="w-4 h-4 text-green-600" />
          <span>Write-only • No edits or deletes</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-3">
        <div className="flex items-center gap-3 flex-wrap">
          {ENTITY_TYPES.map((type) => {
            const Icon = type.icon;
            const isActive = filters.entity_type === type.value;
            
            return (
              <button
                key={type.value}
                onClick={() => setFilters({ ...filters, entity_type: type.value })}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Date Range */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search activity logs..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export Logs</span>
          </button>
        </div>
      </div>

      {/* Live Update Badge */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <div className="relative flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
        <span>Live • updates every 30s</span>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-gray-500">Loading activity logs...</p>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardX className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No activity logs found</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-gray-200" />

            {/* Activity items */}
            <div className="space-y-4">
              {data.map((log) => (
                <div
                  key={log.id}
                  className="relative pl-8 group hover:bg-gray-50 rounded-lg p-3 -ml-3 transition-colors"
                >
                  {/* Dot */}
                  <div
                    className="absolute left-0 top-4 w-6 h-6 rounded-full border-4 border-white shadow-sm"
                    style={{ backgroundColor: ENTITY_COLORS[log.entity_type] || '#6b7280' }}
                  />

                  {/* Content */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">{log.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>
                        by {log.first_name} {log.last_name}
                      </span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <span>•</span>
                      <span className="capitalize">{log.entity_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
