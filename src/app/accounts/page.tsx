import { getAccounts } from '@/actions/account';
import AccountsClient from './AccountsClient';

export default async function AccountsPage() {
  const accounts = await getAccounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Accounts</h1>
        <p className="text-surface-500">Manage your financial accounts and view current balances.</p>
      </div>

      <AccountsClient initialAccounts={accounts} />
    </div>
  );
}
