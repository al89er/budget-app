import AccountsClient from './AccountsClient';
import { Suspense } from 'react';

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      {/* Header handled by AccountsClient */}

      <Suspense fallback={<div className="h-64 flex items-center justify-center text-surface-500">Loading accounts...</div>}>
        <AccountsClient />
      </Suspense>
    </div>
  );
}
