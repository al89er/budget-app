import { getSummaryData, getBudgetVsActual } from '@/actions/summary';
import { getAccounts } from '@/actions/account';
import { getTransactions } from '@/actions/transaction';
import { processDueRecurringTransactions } from '@/actions/recurring';
import DashboardClient from './DashboardClient';
import { format } from 'date-fns';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const params = await searchParams;
  const timeframe = (params?.timeframe as string) || 'this_month';

  // Process any due recurring transactions first so they appear in the data
  await processDueRecurringTransactions();

  // Fetch all dashboard data concurrently
  const [summary, accounts, recentTx, budgetVsActual] = await Promise.all([
    getSummaryData(timeframe),
    getAccounts(),
    getTransactions(1, 10), // Show a few more recent transactions

    getBudgetVsActual(currentMonth),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
        <p className="text-surface-500">Financial overview for {format(new Date(), 'MMMM yyyy')}</p>
      </div>

      <DashboardClient 
        timeframe={timeframe}
        summary={summary}
        accounts={accounts}
        recentTransactions={recentTx.transactions}
        budgetVsActual={budgetVsActual}
      />
    </div>
  );
}
