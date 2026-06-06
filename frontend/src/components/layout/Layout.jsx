import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

/**
 * Main authenticated layout
 * - Fixed sidebar (260px, left)
 * - Fixed topbar (64px, top; offset by sidebar on lg+)
 * - Scrollable main content area
 */
const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar receives open state + close handler */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Right column: topbar + main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[260px]">
        {/* Topbar receives hamburger handler */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Main scrollable content */}
        <main
          className="flex-1 p-6 mt-16"
          style={{ minHeight: 'calc(100vh - 64px)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
