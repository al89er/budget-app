import TransactionsClient from './TransactionsClient';
import { Suspense } from 'react';

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      {/* Header handled by TransactionsClient */}

      <Suspense fallback={<div className="h-64 flex items-center justify-center text-surface-500">Loading transactions...</div>}>
        <TransactionsClient />
      </Suspense>
    </div>
  );
}
