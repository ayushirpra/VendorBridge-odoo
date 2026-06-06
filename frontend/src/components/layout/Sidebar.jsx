import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Vendors', path: '/vendors', icon: '🏢' },
    { name: 'Analytics', path: '/analytics', icon: '📈' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-white shadow-sm h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-primary">VendorBridge</h1>
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-text hover:bg-gray-100'
                  }`
                }
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
