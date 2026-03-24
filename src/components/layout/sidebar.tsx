'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowRightLeft, 
  PieChart, 
  Target, 
  Settings,
  Menu,
  X,
  Repeat
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
  { name: 'Recurring', href: '/recurring', icon: Repeat },
  { name: 'Accounts', href: '/accounts', icon: Wallet },
  { name: 'Categories', href: '/categories', icon: PieChart },
  { name: 'Budgets', href: '/budgets', icon: Target },
  { name: 'Reports', href: '/reports', icon: PieChart },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-md bg-white text-surface-900 shadow-sm border border-surface-200"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar background overlay for mobile */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-surface-200 shadow-sm transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="h-16 flex items-center px-6 border-b border-surface-100">
            <span className="text-xl font-bold text-brand-600 flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              PB Tracker
            </span>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-brand-50 text-brand-700' 
                      : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                    }
                  `}
                >
                  <Icon 
                    className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                      isActive ? 'text-brand-600' : 'text-surface-400 group-hover:text-surface-600'
                    }`} 
                    aria-hidden="true" 
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section (Settings placeholder) */}
          <div className="p-4 border-t border-surface-100">
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-surface-600 hover:bg-surface-50 hover:text-surface-900 transition-colors"
            >
              <Settings className="mr-3 h-5 w-5 text-surface-400 group-hover:text-surface-600" />
              Settings
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
