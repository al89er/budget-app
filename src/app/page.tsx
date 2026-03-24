import DashboardClient from './DashboardClient';
import { format } from 'date-fns';
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
        <p className="text-surface-500">Financial overview for {format(new Date(), 'MMMM yyyy')}</p>
      </div>

      <Suspense fallback={<div className="h-64 flex items-center justify-center text-surface-500">Loading dashboard...</div>}>
        <DashboardClient />
      </Suspense>
    </div>
  );
}
