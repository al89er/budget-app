import ReportsClient from './ReportsClient';
import { Suspense } from 'react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Reports</h1>
        <p className="text-surface-500">Deep dive into your financial analytics.</p>
      </div>

      <Suspense fallback={<div className="h-64 flex items-center justify-center text-surface-500">Loading reports...</div>}>
        <ReportsClient />
      </Suspense>
    </div>
  );
}
