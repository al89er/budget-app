import { getMonthlySummary, getRecentTrends, getBudgetVsActual } from '@/actions/summary';
import { getAccounts } from '@/actions/account';
import { getCategories } from '@/actions/category';
import ReportsClient from './ReportsClient';
import { format } from 'date-fns';

export default async function ReportsPage(props: { searchParams: Promise<{ month?: string; }> }) {
  const searchParams = await props.searchParams;
  const currentMonth = searchParams.month || format(new Date(), 'yyyy-MM');

  const [summary, trends, budgetVsActual, accounts, categories] = await Promise.all([
    getMonthlySummary(currentMonth),
    getRecentTrends(6),
    getBudgetVsActual(currentMonth),
    getAccounts(),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Reports</h1>
        <p className="text-surface-500">Deep dive into your financial analytics.</p>
      </div>

      <ReportsClient 
        currentMonth={currentMonth}
        summary={summary}
        trends={trends}
        budgetVsActual={budgetVsActual}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}
