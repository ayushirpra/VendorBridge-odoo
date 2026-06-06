import { NavLink, useNavigate } from 'react-router-dom';
import {
  Building2,
  LayoutDashboard,
  Building,
  ClipboardList,
  FileText,
  CheckSquare,
  ShoppingBag,
  Receipt,
  BarChart2,
  Activity,
  Settings,
  LogOut,
  UserCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─── Role-based nav config ────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: 'MAIN',
    items: [
      { name: 'Dashboard',      path: '/dashboard',       icon: LayoutDashboard, roles: ['admin', 'procurement_officer', 'vendor', 'manager'] },
      { name: 'Vendors',        path: '/vendors',          icon: Building,        roles: ['admin', 'procurement_officer', 'vendor'] },
      { name: "RFQ's",          path: '/rfqs',             icon: ClipboardList,   roles: ['admin', 'procurement_officer', 'vendor'] },
    ],
  },
  {
    label: 'PROCUREMENT',
    items: [
      { name: 'Quotations',     path: '/quotations',       icon: FileText,        roles: ['admin', 'procurement_officer', 'vendor'] },
      { name: 'Approvals',      path: '/approvals',        icon: CheckSquare,     roles: ['admin', 'procurement_officer', 'manager'] },
      { name: 'Purchase Orders',path: '/purchase-orders',  icon: ShoppingBag,     roles: ['admin', 'procurement_officer', 'vendor'] },
      { name: 'Invoices',       path: '/invoices',         icon: Receipt,         roles: ['admin', 'procurement_officer'] },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { name: 'Reports',        path: '/reports',          icon: BarChart2,       roles: ['admin', 'procurement_officer', 'manager'] },
      { name: 'Activity',       path: '/activity',         icon: Activity,        roles: ['admin', 'procurement_officer', 'manager'] },
    ],
  },
];

// ─── Helper: get initials ─────────────────────────────────────────────────────
function getInitials(user) {
  if (!user) return '?';
  const first = user.first_name || user.name || '';
  const last  = user.last_name  || '';
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first)         return first.slice(0, 2).toUpperCase();
  return '?';
}

function getRoleLabel(role) {
  const labels = {
    admin:               'Admin',
    procurement_officer: 'Procurement Officer',
    vendor:              'Vendor',
    manager:             'Manager',
  };
  return labels[role] || role || 'User';
}

// ─── Sidebar component ────────────────────────────────────────────────────────
const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || user.email
    : 'User';

  return (
    <>
      {/* ── Mobile overlay backdrop ── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar panel ── */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-[260px] bg-white z-40
          border-r border-[#e5e7eb] shadow-md
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* ── Logo area ── */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-[#e5e7eb] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Building2 size={28} className="text-[#16a34a] flex-shrink-0" />
            <div>
              <span className="text-xl font-bold text-[#111827]">VendorBridge</span>
              <div className="mt-0.5">
                <span className="inline-block bg-[#dcfce7] text-[#15803d] text-xs font-medium px-2 py-0.5 rounded-full leading-tight">
                  ERP Platform
                </span>
              </div>
            </div>
          </div>

          {/* Close button — mobile only */}
          <button
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !role || item.roles.includes(role)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.label} className="mt-6 first:mt-2">
                {/* Section label */}
                <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {section.label}
                </p>

                {/* Nav items */}
                <ul className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <li key={item.path} className="px-2">
                      <NavLink
                        to={item.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 group relative
                          ${
                            isActive
                              ? 'bg-[#dcfce7] text-[#15803d] font-semibold border-l-[3px] border-[#16a34a] pl-[13px]'
                              : 'text-[#4b5563] hover:bg-[#f0fdf4] hover:text-[#16a34a]'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <item.icon
                              size={18}
                              className={`flex-shrink-0 transition-colors duration-150 ${
                                isActive
                                  ? 'text-[#15803d]'
                                  : 'text-gray-500 group-hover:text-[#16a34a]'
                              }`}
                            />
                            <span className="text-sm truncate">{item.name}</span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* ── Bottom user section ── */}
        <div className="flex-shrink-0 border-t border-[#e5e7eb]">
          {/* User info card */}
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#dcfce7] flex items-center justify-center flex-shrink-0">
              {user?.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={fullName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : user?.first_name || user?.name ? (
                <span className="text-sm font-bold text-[#15803d]">
                  {getInitials(user)}
                </span>
              ) : (
                <UserCircle2 size={22} className="text-[#16a34a]" />
              )}
            </div>

            {/* Name + role */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#111827] truncate">{fullName}</p>
              <span className="inline-block bg-[#f3f4f6] text-gray-500 text-xs px-2 py-0.5 rounded-full mt-0.5">
                {getRoleLabel(role)}
              </span>
            </div>
          </div>

          {/* Settings link */}
          <div className="px-2 pb-1">
            <NavLink
              to="/settings"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 w-full
                ${isActive ? 'bg-[#dcfce7] text-[#15803d]' : 'text-gray-500 hover:bg-[#f0fdf4] hover:text-[#16a34a]'}`
              }
            >
              <Settings size={18} />
              <span className="text-sm">Settings</span>
            </NavLink>
          </div>

          {/* Logout button */}
          <div className="px-2 pb-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg w-full text-[#dc2626] hover:bg-[#fef2f2] transition-all duration-150 cursor-pointer"
            >
              <LogOut size={18} className="flex-shrink-0" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
