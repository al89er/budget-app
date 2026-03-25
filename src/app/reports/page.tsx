import ReportsClient from './ReportsClient';
import { Suspense } from 'react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header handled by ReportsClient */}

      <Suspense fallback={<div className="h-64 flex items-center justify-center text-surface-500">Loading reports...</div>}>
        <ReportsClient />
      </Suspense>
    </div>
  );
}
