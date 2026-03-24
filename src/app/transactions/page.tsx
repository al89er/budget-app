import TransactionsClient from './TransactionsClient';
import { Suspense } from 'react';

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Transactions</h1>
        <p className="text-surface-500">Record and track your money movements.</p>
      </div>

      <Suspense fallback={<div className="h-64 flex items-center justify-center text-surface-500">Loading transactions...</div>}>
        <TransactionsClient />
      </Suspense>
    </div>
  );
}
