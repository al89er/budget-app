import { Suspense } from 'react';
import RecurringClient from './RecurringClient';
import { Card } from '@/components/ui';

export default function RecurringPage() {
  return (
    <div className="space-y-6">
      {/* Header handled by RecurringClient */}

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
