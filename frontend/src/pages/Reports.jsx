import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';
import {
  BarChart2,
  Download,
  CalendarDays,
  IndianRupee,
  Users,
  Target,
  AlertTriangle,
  PieChart,
  TrendingUp,
  TrendingDown,
  Trophy,
  HeartPulse,
  Building2,
  CheckCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function Reports() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Generate month options (last 6 months)
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };
  });

  const { data: kpis } = useQuery({
    queryKey: ['kpis', selectedMonth],
    queryFn: async () => {
      const response = await axios.get(`/reports/kpis?month=${selectedMonth}`);
      return response.data.data;
    }
  });

  const { data: categoryData } = useQuery({
    queryKey: ['spend-by-category', selectedMonth],
    queryFn: async () => {
      const response = await axios.get(`/reports/spend-by-category?month=${selectedMonth}`);
      return response.data.data;
    }
  });

  const { data: trendData } = useQuery({
    queryKey: ['monthly-trend'],
    queryFn: async () => {
      const response = await axios.get('/reports/monthly-trend');
      return response.data.data;
    }
  });

  const { data: topVendors } = useQuery({
    queryKey: ['top-vendors', selectedMonth],
    queryFn: async () => {
      const response = await axios.get(`/reports/top-vendors?month=${selectedMonth}&limit=5`);
      return response.data.data;
    }
  });

  const { data: healthMetrics } = useQuery({
    queryKey: ['health-metrics'],
    queryFn: async () => {
      const response = await axios.get('/reports/health-metrics');
      return response.data.data;
    }
  });

  const handleExport = async () => {
    try {
      const response = await axios.get(`/reports/export?month=${selectedMonth}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `procurement-report-${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatCurrency = (value) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    return `₹${(value / 1000).toFixed(1)}K`;
  };

  const categoryColors = {
    'IT Hardware': '#2563eb',
    'Furniture': '#16a34a',
    'Stationery': '#d97706',
    'Logistics': '#ef4444',
    'Uncategorized': '#6b7280'
  };

  const medalColors = ['#fbbf24', '#d1d5db', '#cd7f32'];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <BarChart2 className="w-6 h-6 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          </div>
          <p className="text-sm text-gray-600">Procurement insights and spending trends</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="p-2 bg-blue-50 rounded-full">
                  <IndianRupee className="w-5 h-5 text-blue-600" />
                </div>
                <span>Total Spend</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(kpis?.totalSpend || 0)}
              </p>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span>+{kpis?.spendChange || 0}% vs last month</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="p-2 bg-green-50 rounded-full">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <span>Active Vendors</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpis?.activeVendors || 0}</p>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Building2 className="w-3 h-3" />
                <span>{kpis?.newVendors || 0} new this month</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="p-2 bg-orange-50 rounded-full">
                  <Target className="w-5 h-5 text-orange-600" />
                </div>
                <span>PO Fulfillment</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpis?.fulfillmentRate || 0}%</p>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                <span>On track</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="p-2 bg-red-50 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <span>Overdue Invoices</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpis?.overdueInvoices || 0}</p>
              <p className="text-xs text-red-600">Requires attention</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Spend by Category */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Spend by Category</h2>
            </div>
            <span className="text-sm text-gray-500">
              {monthOptions.find(m => m.value === selectedMonth)?.label}
            </span>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="category" type="category" width={100} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="totalSpend" radius={[0, 8, 8, 0]}>
                {categoryData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={categoryColors[entry.category] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Monthly Procurement Trend</h2>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthName" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="totalSpend" radius={[8, 8, 0, 0]}>
                {trendData?.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.month === currentMonth ? '#15803d' : '#86efac'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Vendors */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Top Vendors</h2>
          </div>

          <div className="space-y-3">
            {topVendors?.map((vendor, index) => (
              <div key={vendor.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: medalColors[index] || '#6b7280' }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{vendor.vendorName}</p>
                      <p className="text-xs text-gray-500">{vendor.poCount} POs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(vendor.totalSpend)}
                    </span>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${(vendor.totalSpend / topVendors[0].totalSpend) * 100}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Procurement Health */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <HeartPulse className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Procurement Health</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">On-time Deliveries</span>
                <span className="font-semibold text-gray-900">
                  {healthMetrics?.onTimeDeliveries || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${healthMetrics?.onTimeDeliveries || 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Quotation Response Rate</span>
                <span className="font-semibold text-gray-900">
                  {healthMetrics?.quotationResponseRate || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${healthMetrics?.quotationResponseRate || 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Approval SLA Met</span>
                <span className="font-semibold text-gray-900">
                  {healthMetrics?.approvalSLAMet || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${healthMetrics?.approvalSLAMet || 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Invoice Processing</span>
                <span className="font-semibold text-gray-900">
                  {healthMetrics?.invoiceProcessing || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    (healthMetrics?.invoiceProcessing || 0) < 70 ? 'bg-amber-500' : 'bg-green-600'
                  }`}
                  style={{ width: `${healthMetrics?.invoiceProcessing || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
