'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { getSummaryData, getBudgetVsActual, getMonthlySummary, getRecentTrends } from '@/actions/summary';
import { getAccounts } from '@/actions/account';
import { getTransactions } from '@/actions/transaction';
import { getCategories } from '@/actions/category';
import { getRecurringTransactions } from '@/actions/recurring';
import { format } from 'date-fns';

export default function PreloadProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
  useSWR(mounted ? ['transactions-list', 1, undefined, undefined, undefined] : null, () => getTransactions(1, 50));
  useSWR(mounted ? 'recurring' : null, () => getRecurringTransactions());

  return <>{children}</>;
}
