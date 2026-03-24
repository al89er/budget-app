import { getTransactions } from '@/actions/transaction';
import { getAccounts } from '@/actions/account';
import { getCategories } from '@/actions/category';
import TransactionsClient from './TransactionsClient';

export default async function TransactionsPage(
  props: { searchParams: Promise<{ page?: string; type?: string; categoryId?: string; accountId?: string }> }
) {
  const searchParams = await props.searchParams;
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const { type, categoryId, accountId } = searchParams;

  const [txData, accounts, categories] = await Promise.all([
    getTransactions(page, 50, { type, categoryId, accountId }),
    getAccounts(),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Transactions</h1>
        <p className="text-surface-500">Record and track your money movements.</p>
      </div>

      <TransactionsClient 
        initialData={txData} 
        accounts={accounts} 
        categories={categories} 
      />
    </div>
  );
}
