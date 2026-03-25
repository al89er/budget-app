import DashboardClient from './DashboardClient';
import { format } from 'date-fns';
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header handled by DashboardClient */}

      <Suspense fallback={<div className="h-64 flex items-center justify-center text-surface-500">Loading dashboard...</div>}>
        <DashboardClient />
      </Suspense>
    </div>
  );
}
