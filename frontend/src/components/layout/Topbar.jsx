import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  UserCircle2,
  User,
  Settings,
  LogOut,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─── Route → page title + breadcrumb map ─────────────────────────────────────
const ROUTE_META = {
  '/dashboard':       { title: 'Dashboard',       crumbs: ['Home', 'Dashboard'] },
  '/vendors':         { title: 'Vendors',          crumbs: ['Home', 'Vendors'] },
  '/rfqs':            { title: "RFQ's",             crumbs: ['Home', "RFQ's"] },
  '/quotations':      { title: 'Quotations',        crumbs: ['Home', 'Procurement', 'Quotations'] },
  '/approvals':       { title: 'Approvals',         crumbs: ['Home', 'Procurement', 'Approvals'] },
  '/purchase-orders': { title: 'Purchase Orders',   crumbs: ['Home', 'Procurement', 'Purchase Orders'] },
  '/purchase-orders/:id': { title: 'Invoice Detail', crumbs: ['Home', 'Procurement', 'Purchase Orders', 'Detail'] },
  '/invoices':        { title: 'Invoices',          crumbs: ['Home', 'Procurement', 'Invoices'] },
  '/analytics':       { title: 'Reports',           crumbs: ['Home', 'Insights', 'Reports'] },
  '/activity':        { title: 'Activity',          crumbs: ['Home', 'Insights', 'Activity'] },
  '/settings':        { title: 'Settings',          crumbs: ['Home', 'Settings'] },
};

// ─── Mock notifications ───────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'vendor',
    icon: CheckCircle2,
    iconColor: 'text-[#16a34a]',
    borderColor: 'border-l-[#16a34a]',
    message: 'New vendor "TechSupplies Inc" registered and pending review.',
    time: '5 min ago',
    read: false,
  },
  {
    id: 2,
    type: 'approval',
    icon: AlertCircle,
    iconColor: 'text-orange-500',
    borderColor: 'border-l-orange-400',
    message: 'PO #1042 is awaiting your approval.',
    time: '1 hr ago',
    read: false,
  },
  {
    id: 3,
    type: 'rfq',
    icon: Clock,
    iconColor: 'text-blue-500',
    borderColor: 'border-l-blue-400',
    message: 'RFQ #205 has received 3 new quotations.',
    time: '3 hr ago',
    read: true,
  },
  {
    id: 4,
    type: 'approval',
    icon: AlertCircle,
    iconColor: 'text-orange-500',
    borderColor: 'border-l-orange-400',
    message: 'Invoice #INV-889 is overdue by 2 days.',
    time: 'Yesterday',
    read: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(user) {
  if (!user) return '?';
  const first = user.first_name || user.name || '';
  const last  = user.last_name  || '';
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first)         return first.slice(0, 2).toUpperCase();
  return '?';
}

// ─── Topbar component ─────────────────────────────────────────────────────────
const Topbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen]       = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const notifRef   = useRef(null);
  const userRef    = useRef(null);
  const searchRef  = useRef(null);

  const meta = ROUTE_META[location.pathname] || (
    location.pathname.startsWith('/vendors/')
      ? { title: 'Vendor Detail', crumbs: ['Home', 'Vendors', 'Detail'] }
      : location.pathname.startsWith('/purchase-orders/')
      ? { title: 'Invoice Detail', crumbs: ['Home', 'Procurement', 'Purchase Orders', 'Detail'] }
      : location.pathname.startsWith('/approvals/')
      ? { title: 'Approval Detail', crumbs: ['Home', 'Procurement', 'Approvals', 'Detail'] }
      : { title: 'VendorBridge', crumbs: ['Home'] }
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))   setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target))    setUserMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || user.email || 'User'
    : 'User';

  return (
    <header className="fixed top-0 left-0 right-0 lg:left-[260px] h-16 bg-white border-b border-[#e5e7eb] shadow-sm z-30 flex items-center justify-between px-6">

      {/* ── Left: hamburger + title + breadcrumb ── */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-[#16a34a] hover:bg-[#f0fdf4] transition-all duration-150 flex-shrink-0"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#111827] truncate leading-tight">
            {meta.title}
          </h1>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 mt-0.5">
            {meta.crumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />}
                <span
                  className={`text-xs ${
                    i === meta.crumbs.length - 1
                      ? 'text-[#6b7280]'
                      : 'text-gray-400'
                  }`}
                >
                  {crumb}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: search + bell + divider + avatar ── */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* ── Search button ── */}
        <div ref={searchRef} className="relative">
          <button
            onClick={() => setSearchOpen((p) => !p)}
            className="p-2 rounded-lg text-gray-500 hover:text-[#16a34a] hover:bg-[#f0fdf4] transition-all duration-150"
            aria-label="Search"
          >
            <Search size={20} />
          </button>

          {/* Search modal */}
          {searchOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-[#e5e7eb] p-4 z-50">
              <div className="flex items-center gap-2 border border-[#e5e7eb] rounded-lg px-3 py-2">
                <Search size={16} className="text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search vendors, orders, RFQs..."
                  className="flex-1 text-sm text-[#374151] outline-none bg-transparent placeholder-gray-400"
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Start typing to search across the platform
              </p>
            </div>
          )}
        </div>

        {/* ── Notification bell ── */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen((p) => !p); setUserMenuOpen(false); }}
            className="relative p-2 rounded-lg text-gray-500 hover:text-[#16a34a] hover:bg-[#f0fdf4] transition-all duration-150"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#dc2626] rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-[#e5e7eb] z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb]">
                <span className="text-sm font-semibold text-[#111827]">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 bg-[#dc2626] text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </span>
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-[#16a34a] hover:text-[#15803d] font-medium transition-colors"
                >
                  Mark all read
                </button>
              </div>

              {/* Notification list */}
              <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-l-4 ${n.borderColor} transition-colors ${
                      n.read ? 'bg-white' : 'bg-[#f0fdf4]'
                    } hover:bg-gray-50 cursor-pointer`}
                  >
                    <n.icon size={18} className={`${n.iconColor} mt-0.5 flex-shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs leading-relaxed ${n.read ? 'text-[#6b7280]' : 'text-[#374151] font-medium'}`}>
                        {n.message}
                      </p>
                      <span className="text-xs text-gray-400 mt-0.5 block">{n.time}</span>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 bg-[#16a34a] rounded-full mt-1.5 flex-shrink-0" />
                    )}
                  </li>
                ))}
              </ul>

              {/* Footer */}
              <div className="border-t border-[#e5e7eb] px-4 py-2.5">
                <button className="text-xs text-[#16a34a] hover:text-[#15803d] font-medium w-full text-center transition-colors">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-[#e5e7eb] mx-1" />

        {/* ── User avatar / menu ── */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => { setUserMenuOpen((p) => !p); setNotifOpen(false); }}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#f0fdf4] transition-all duration-150"
            aria-label="User menu"
          >
            <div className="w-9 h-9 rounded-full bg-[#dcfce7] flex items-center justify-center overflow-hidden">
              {user?.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : user?.first_name || user?.name ? (
                <span className="text-sm font-bold text-[#15803d]">
                  {getInitials(user)}
                </span>
              ) : (
                <UserCircle2 size={20} className="text-[#16a34a]" />
              )}
            </div>
          </button>

          {/* User dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-12 w-52 bg-white rounded-xl shadow-lg border border-[#e5e7eb] z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-[#e5e7eb]">
                <p className="text-sm font-semibold text-[#111827] truncate">{fullName}</p>
                <p className="text-xs text-[#6b7280] truncate mt-0.5">{user?.email}</p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-[#374151] hover:bg-[#f0fdf4] hover:text-[#16a34a] transition-all duration-150"
                >
                  <User size={16} className="text-gray-400" />
                  My Profile
                </button>
                <button
                  onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-[#374151] hover:bg-[#f0fdf4] hover:text-[#16a34a] transition-all duration-150"
                >
                  <Settings size={16} className="text-gray-400" />
                  Settings
                </button>

                <div className="h-px bg-[#e5e7eb] my-1" />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-[#dc2626] hover:bg-[#fef2f2] transition-all duration-150"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
