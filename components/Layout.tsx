import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, PlusCircle, History, LineChart } from 'lucide-react';

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/brokers', label: 'Brokers', icon: Wallet },
    { path: '/new-trade', label: 'New Trade', icon: PlusCircle },
    { path: '/history', label: 'History', icon: History },
    { path: '/analysis', label: 'Analysis', icon: LineChart },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-10">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-wider text-green-400">TRADERSYNC</h1>
          <p className="text-xs text-slate-400 mt-1">Multi-Broker Journal</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-green-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 mb-16 md:mb-0">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 px-4 py-2 flex justify-between items-center shadow-lg">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                isActive ? 'text-green-600' : 'text-slate-400'
              }`}
            >
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};