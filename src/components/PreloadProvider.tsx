'use client';

import { useEffect, useState } from 'react';
import useSWR, { SWRConfig } from 'swr';
import { getSummaryData, getBudgetVsActual, getMonthlySummary, getRecentTrends } from '@/actions/summary';
import { getAccounts } from '@/actions/account';
import { getTransactions } from '@/actions/transaction';
import { getCategories } from '@/actions/category';
import { getRecurringTransactions } from '@/actions/recurring';
import { format } from 'date-fns';

// Create a singleton Map to persist the cache for the entire session in memory
let cacheMap: Map<any, any> | null = null;

function getCacheMap() {
  if (cacheMap) return cacheMap;

  // Initialize from localStorage if on the client
  if (typeof window === 'undefined') return new Map();

  try {
    const saved = localStorage.getItem('app-cache');
    cacheMap = new Map(JSON.parse(saved || '[]'));
  } catch (e) {
    console.error('Failed to load SWR cache from localStorage', e);
    cacheMap = new Map();
  }

  // Set up sync listeners once
  const syncCache = () => {
    if (!cacheMap) return;
    const appCache = JSON.stringify(Array.from(cacheMap.entries()));
    try {
      localStorage.setItem('app-cache', appCache);
    } catch (e) {
      console.error('Failed to save SWR cache to localStorage', e);
    }
  };

  window.addEventListener('beforeunload', syncCache);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      syncCache();
    }
  });

  return cacheMap;
}

function localStorageProvider() {
  return getCacheMap();
}

export default function PreloadProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <SWRConfig value={{ provider: localStorageProvider }}>
      <PreloadContent mounted={mounted}>
        {children}
      </PreloadContent>
    </SWRConfig>
  );
}

function PreloadContent({ mounted, children }: { mounted: boolean, children: React.ReactNode }) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  
  // These hooks trigger the background fetching immediately upon app load.
  // We use the same keys used in specific sections to populate the cache.
  useSWR(mounted ? ['summary', 'this_month'] : null, () => getSummaryData('this_month'));
  useSWR(mounted ? 'accounts' : null, () => getAccounts());
  useSWR(mounted ? 'categories' : null, () => getCategories());
  useSWR(mounted ? 'recentTx' : null, () => getTransactions(1, 10).then(res => res.transactions));
  useSWR(mounted ? ['monthly-summary', currentMonth] : null, () => getMonthlySummary(currentMonth));
  useSWR(mounted ? 'recent-trends' : null, () => getRecentTrends(6));
  useSWR(mounted ? ['budgetVsActual', currentMonth] : null, () => getBudgetVsActual(currentMonth));
  // Standard transaction list usually starts at page 1
  useSWR(mounted ? ['transactions-list', 1, undefined, undefined, undefined, null, null] : null, () => getTransactions(1, 50));
  useSWR(mounted ? 'recurring' : null, () => getRecurringTransactions());

  return <>{children}</>;
}
