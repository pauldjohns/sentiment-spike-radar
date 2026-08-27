
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, LayoutDashboard, Settings, Bell, CircleUserRound, BarChart3 } from 'lucide-react';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  
  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Signals', href: '/signals', icon: Bell },
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Profile', href: '/profile', icon: CircleUserRound },
    { name: 'Monitoring', href: '/monitoring', icon: BarChart3 },
    { name: 'System Health', href: '/system-health', icon: Activity }
  ];

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-slate-800">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-lg font-semibold">Sentiment Spike Radar</h1>
            </div>
            <div className="mt-5 flex-1 flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActivePath(item.href)
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1">
          {/* Top bar */}
          <div className="bg-slate-800 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <h2 className="text-lg font-medium text-white">Sentiment Spike Radar</h2>
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
