import { Suspense } from 'react';
import RecurringClient from './RecurringClient';
import { Card } from '@/components/ui';

export default function RecurringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Recurring Transactions</h1>
        <p className="text-surface-500">Automate your regular income, expenses, and transfers.</p>
      </div>

      <Suspense fallback={<RecurringSkeleton />}>
        <RecurringClient />
      </Suspense>
    </div>
  );
}

function RecurringSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-64 bg-surface-100 rounded-lg"></div>
    </Card>
  );
}
