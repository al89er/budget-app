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
  Repeat,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
  { name: 'Recurring', href: '/recurring', icon: Repeat },
  { name: 'Accounts', href: '/accounts', icon: Wallet },
  { name: 'Categories', href: '/categories', icon: PieChart },
  { name: 'Budgets', href: '/budgets', icon: Target },
  { name: 'Reports', href: '/reports', icon: TrendingUp },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="hidden md:flex fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 border-none opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto">
      <div className="flex flex-col h-full w-full pt-8 pb-10 px-6">
        {/* Logo Area */}
        <div className="mb-14 px-4">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="nm-inset p-3.5 rounded-2xl group-hover:nm-flat transition-all duration-500 text-brand-500">
              <Wallet className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-2xl font-black text-surface-800 tracking-tighter block leading-none font-plus">
                Personal
              </span>
              <span className="text-xs font-extrabold text-brand-500 uppercase tracking-[0.2em] mt-1.5 block">
                Budget
              </span>
            </div>
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-4 overflow-y-auto no-scrollbar py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-400 mb-6 px-4">Menu</p>
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-6 py-4 text-xs font-black uppercase tracking-widest rounded-[24px] transition-all duration-300 gap-4",
                  isActive 
                    ? "nm-inset text-brand-500" 
                    : "text-surface-500 hover:nm-button-hover hover:text-surface-800"
                )}
              >
                <Icon 
                  className={cn(
                    "h-5 w-5 transition-colors duration-300",
                    isActive ? "text-brand-500" : "text-surface-300 group-hover:text-surface-600"
                  )} 
                  strokeWidth={isActive ? 3 : 2}
                />
                <span className="mt-0.5">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="pt-8 border-none mt-auto">
          <Link
            href="/settings"
            className={cn(
              "group flex items-center px-6 py-4 text-xs font-black uppercase tracking-widest rounded-[24px] transition-all duration-300 gap-4",
              pathname === '/settings' 
                ? "nm-inset text-brand-500" 
                : "text-surface-500 hover:nm-button-hover hover:text-surface-800"
            )}
          >
            <Settings className={cn(
              "h-5 w-5 transition-colors",
              pathname === '/settings' ? "text-brand-500" : "text-surface-300 group-hover:text-surface-600"
            )} />
            <span className="mt-0.5">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
