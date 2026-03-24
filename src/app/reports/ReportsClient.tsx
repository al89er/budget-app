'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line 
} from 'recharts';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getMonthlySummary, getRecentTrends, getBudgetVsActual } from '@/actions/summary';
import { getAccounts } from '@/actions/account';
import { getCategories } from '@/actions/category';

export default function ReportsClient({ 
  currentMonth,
  summary: initialSummary, 
  trends: initialTrends,
  budgetVsActual: initialBudgetVsActual,
  accounts: initialAccounts,
  categories: initialCategories
}: { 
  currentMonth: string,
  summary: any, 
  trends: any[],
  budgetVsActual: any[],
  accounts: any[],
  categories: any[]
}) {
  const router = useRouter();

  const { data: summary } = useSWR(['monthly-summary', currentMonth], () => getMonthlySummary(currentMonth), { fallbackData: initialSummary });
  const { data: trends } = useSWR('recent-trends', () => getRecentTrends(6), { fallbackData: initialTrends });
  const { data: budgetVsActual } = useSWR(['budgetVsActual', currentMonth], () => getBudgetVsActual(currentMonth), { fallbackData: initialBudgetVsActual });
  const { data: accounts } = useSWR('accounts', () => getAccounts(), { fallbackData: initialAccounts });
  const { data: categories } = useSWR('categories', () => getCategories(), { fallbackData: initialCategories });

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex bg-white p-4 rounded-xl shadow-sm border border-surface-200">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-surface-700">Report Month:</label>
          <input 
            type="month" 
            value={currentMonth}
            onChange={(e) => {
              if (e.target.value) {
                router.push(`/reports?month=${e.target.value}`);
              }
            }}
            className="rounded-lg border-surface-300 px-3 py-1.5 text-sm focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Grid 1: Basic Stats & Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending Breakdown ({currentMonth})</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.spendingByCategoryData.length > 0 ? (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.spendingByCategoryData}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={2}
                      >
                        {summary.spendingByCategoryData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-surface-400">
                  No expense data for this month.
                </div>
            )}
          </CardContent>
        </Card>

        {/* Six Month Trend */}
        <Card>
          <CardHeader>
            <CardTitle>6-Month Income vs Expense Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${v}`} width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} />
                <Legend />
                <Line type="monotone" dataKey="income" name="Income" stroke="#22c55e" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Grid 2: Budgets */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Budget vs Actual ({currentMonth})</CardTitle>
        </CardHeader>
        <CardContent>
          {budgetVsActual.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-surface-500 uppercase bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3 text-right">Budget</th>
                    <th className="px-6 py-3 text-right">Actual</th>
                    <th className="px-6 py-3">Usage</th>
                    <th className="px-6 py-3 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetVsActual.map((b) => (
                    <tr key={b.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-surface-900">{b.categoryName}</td>
                      <td className="px-6 py-4 text-right">{formatCurrency(b.budgeted)}</td>
                      <td className="px-6 py-4 text-right text-red-600 font-semibold">{formatCurrency(b.spent)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-surface-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${b.percentUsed > 100 ? 'bg-red-500' : 'bg-brand-500'}`} 
                              style={{ width: `${Math.min(b.percentUsed, 100)}%` }} 
                            />
                          </div>
                          <span className={`text-xs ${b.percentUsed > 100 ? 'text-red-500 font-bold' : 'text-surface-500'}`}>
                            {b.percentUsed.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${b.difference < 0 ? 'text-red-600' : 'text-surface-600'}`}>
                        {formatCurrency(b.difference)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-surface-500 bg-surface-50 rounded-lg">
              No budgets set for {currentMonth}. Go to the Budgets tab to plan your spending.
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
