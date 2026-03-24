import { getRecurringTransactions } from '@/actions/recurring';
import { getAccounts } from '@/actions/account';
import { getCategories } from '@/actions/category';
import RecurringClient from './RecurringClient';

export default async function RecurringPage() {
  const [recurringTxs, accounts, categories] = await Promise.all([
    getRecurringTransactions(),
    getAccounts(),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Recurring Transactions</h1>
        <p className="text-surface-500">Automate your regular income, expenses, and transfers.</p>
      </div>

      <RecurringClient 
        initialRecurring={recurringTxs} 
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}
