import AccountsClient from './AccountsClient';
import { Suspense } from 'react';

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Accounts</h1>
        <p className="text-surface-500">Manage your financial accounts and view current balances.</p>
      </div>

      <Suspense fallback={<div className="h-64 flex items-center justify-center text-surface-500">Loading accounts...</div>}>
        <AccountsClient />
      </Suspense>
    </div>
  );
}
