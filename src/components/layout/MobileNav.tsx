'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowRightLeft, 
  Plus, 
  Repeat,
  Target
} from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
  { name: 'Accounts', href: '/accounts', icon: Wallet },
  { name: 'Recurring', href: '/recurring', icon: Repeat },
  { name: 'Budgets', href: '/budgets', icon: Target },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 z-50 flex items-center justify-around px-2 pb-safe-offset-2 pt-2 h-16 shadow-lg">
      {navigation.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        const Icon = item.icon;
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`
              flex flex-col items-center justify-center flex-1 min-w-0 transition-colors
              ${isActive ? 'text-brand-600' : 'text-surface-400 hover:text-surface-600'}
            `}
          >
            <Icon 
              className={`h-5 w-5 mb-1 transition-transform ${isActive ? 'scale-110' : ''}`} 
              aria-hidden="true" 
            />
            <span className="text-[10px] font-medium truncate w-full text-center">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
