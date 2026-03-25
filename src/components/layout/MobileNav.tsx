'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowRightLeft, 
  Repeat,
  Target,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Trans', href: '/transactions', icon: ArrowRightLeft },
  { name: 'Accounts', href: '/accounts', icon: Wallet },
  { name: 'Recurring', href: '/recurring', icon: Repeat },
  { name: 'Reports', href: '/reports', icon: TrendingUp },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-6 left-4 right-4 h-20 bg-background/80 backdrop-blur-xl rounded-[32px] nm-flat z-50 flex items-center justify-around px-2 border-none">
      {navigation.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        const Icon = item.icon;
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
               "flex flex-col items-center justify-center flex-1 h-full min-w-0 transition-all duration-300",
               isActive ? "text-brand-500" : "text-surface-400"
            )}
          >
            <div className={cn(
              "p-3 rounded-2xl transition-all duration-500 mb-1",
              isActive ? "nm-inset scale-105" : "hover:nm-button-hover"
            )}>
              <Icon 
                className={cn("h-5 w-5 transition-transform duration-300")} 
                strokeWidth={isActive ? 3 : 2}
              />
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest truncate w-full text-center transition-all duration-300",
              isActive ? "opacity-100 mt-1" : "opacity-40"
            )}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
