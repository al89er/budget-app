'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line 
} from 'recharts';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import useSWR from 'swr';
import { getMonthlySummary, getRecentTrends, getBudgetVsActual, getCategoryReportData } from '@/actions/summary';
import { getAccounts } from '@/actions/account';
import { getCategories } from '@/actions/category';

export default function ReportsClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMonth = searchParams.get('month') || format(new Date(), 'yyyy-MM');

  const { data: summary } = useSWR(mounted ? ['monthly-summary', currentMonth] : null, () => getMonthlySummary(currentMonth));
  const { data: trends } = useSWR(mounted ? 'recent-trends' : null, () => getRecentTrends(6));
  const { data: budgetVsActual } = useSWR(mounted ? ['budgetVsActual', currentMonth] : null, () => getBudgetVsActual(currentMonth));
  const { data: accounts } = useSWR(mounted ? 'accounts' : null, () => getAccounts());
  const { data: categories } = useSWR(mounted ? 'categories' : null, () => getCategories());
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [spotlightMonth, setSpotlightMonth] = useState(currentMonth);

  const { data: categoryReport } = useSWR(
    mounted && selectedCategoryId ? ['category-report', selectedCategoryId, spotlightMonth] : null, 
    () => getCategoryReportData(selectedCategoryId!, spotlightMonth)
  );

  useEffect(() => {
    setSpotlightMonth(currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    if (categories && categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  if (!mounted || !summary || !trends || !budgetVsActual || !accounts || !categories) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-surface-500 animate-pulse">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-brand-500" />
        <p>Crunching report data...</p>
      </div>
    );
  }

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
      {/* Grid 3: CC Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Credit Card: Spending vs. Repayment Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${v}`} width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} />
                <Legend />
                <Bar dataKey="ccSpending" name="CC Spending" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ccRepayment" name="CC Repayment" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-surface-50 rounded-lg border border-surface-200">
            <p className="text-sm text-surface-600 italic">
              Tip: Ensure your <strong>CC Repayment</strong> is consistently higher than or equal to <strong>CC Spending</strong> to reduce your debt and avoid interest charges.
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Category Monthly Report Section */}
      <div className="space-y-4 pt-6 mt-6 border-t border-surface-200">
        <h3 className="text-xl font-semibold text-surface-800">Category Monthly Spotlight</h3>
        
        {/* Category Selector Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.filter(c => c.isActive).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategoryId === cat.id 
                  ? 'bg-brand-600 text-white shadow-md' 
                  : 'bg-white text-surface-600 border border-surface-200 hover:border-brand-300 hover:bg-brand-50'
              }`}
            >
              {cat.icon && <span className="mr-2">{cat.icon}</span>}
              {cat.name}
            </button>
          ))}
        </div>

        {selectedCategoryId && categoryReport ? (
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-lg">
                    History: {categories.find(c => c.id === selectedCategoryId)?.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-surface-500 uppercase tracking-wider font-semibold">View Month:</span>
                    <input 
                      type="month" 
                      value={spotlightMonth}
                      onChange={(e) => setSpotlightMonth(e.target.value)}
                      className="text-xs border-surface-200 rounded px-2 py-1 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-surface-400 font-bold">Total In</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(categoryReport.totalIn)}</p>
                  </div>
                  <div className="text-center border-l border-surface-100 pl-4">
                    <p className="text-[10px] uppercase tracking-wider text-surface-400 font-bold">Total Out</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(categoryReport.totalOut)}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-surface-500 uppercase bg-surface-50 border-b border-surface-200">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryReport.transactions.length > 0 ? (
                      categoryReport.transactions.map((tx: any) => (
                        <tr key={tx.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                          <td className="px-4 py-4 text-surface-500 whitespace-nowrap">
                            {format(new Date(tx.date), 'MMM dd')}
                          </td>
                          <td className="px-4 py-4 font-medium text-surface-900">
                            {tx.description}
                          </td>
                          <td className="px-4 py-4 text-surface-600 lowercase text-xs">
                             {tx.type === 'INCOME' ? tx.destinationAccount?.name : tx.sourceAccount?.name}
                             {tx.type === 'TRANSFER' && ` -> ${tx.destinationAccount?.name}`}
                          </td>
                          <td className={`px-4 py-4 text-right font-semibold ${
                            tx.type === 'INCOME' ? 'text-green-600' : 
                            tx.type === 'EXPENSE' ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                            {formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-surface-400 italic">
                          No transactions found for this category in {spotlightMonth}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="h-48 flex items-center justify-center bg-surface-50 border border-dashed border-surface-300 rounded-xl text-surface-500">
             {selectedCategoryId ? 'Loading category data...' : 'Please select a category above'}
          </div>
        )}
      </div>

    </div>
  );
}
