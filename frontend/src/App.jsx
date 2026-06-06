import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { queryClient } from './lib/queryClient';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Vendors from './pages/Vendors';
import VendorDetail from './pages/VendorDetail';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import RFQs from './pages/RFQs';
import CreateRFQ from './pages/CreateRFQ';
import Quotations from './pages/Quotations';
import SubmitQuotation from './pages/SubmitQuotation';
import QuotationCompare from './pages/QuotationCompare';
import Approvals from './pages/Approvals';
import ApprovalDetail from './pages/ApprovalDetail';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import ActivityLogs from './pages/ActivityLogs';
import Reports from './pages/Reports';
import './App.css';

// ── Placeholder pages for nav routes not yet built ──────────────────────────
const PlaceholderPage = ({ title }) => (
  <div>
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
      <p className="text-[#6b7280] text-sm">
        <span className="font-semibold text-[#111827]">{title}</span> page is coming soon.
      </p>
    </div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-right" />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login"          element={<Login />} />
            <Route path="/register"       element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected layout routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"      element={<Dashboard />} />
              <Route path="vendors"        element={<Vendors />} />
              <Route path="vendors/:id"    element={<VendorDetail />} />
              <Route path="rfqs"           element={<RFQs />} />
              <Route path="rfqs/new"       element={<CreateRFQ />} />
              <Route path="rfqs/:id/compare" element={<QuotationCompare />} />
              <Route path="quotations"     element={<Quotations />} />
              <Route path="quotations/submit/:rfqId" element={<SubmitQuotation />} />
              <Route path="approvals"      element={<Approvals />} />
              <Route path="approvals/:id"  element={<ApprovalDetail />} />
              <Route path="purchase-orders" element={<PurchaseOrders />} />
              <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
              <Route path="invoices"       element={<PlaceholderPage title="Invoices" />} />
              <Route path="analytics"      element={<Analytics />} />
              <Route path="activity"       element={<ActivityLogs />} />
              <Route path="reports"        element={<Reports />} />
              <Route path="settings"       element={<Settings />} />
              <Route path="profile"        element={<PlaceholderPage title="My Profile" />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
