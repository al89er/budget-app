'use client';

import { Card, CardContent, CardHeader, CardTitle, Select } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Wallet, Calendar } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { getSummaryData, getBudgetVsActual } from '@/actions/summary';
import { getAccounts } from '@/actions/account';
import { getTransactions } from '@/actions/transaction';
import { processDueRecurringTransactions } from '@/actions/recurring';
import { useEffect, useState } from 'react';

export default function DashboardClient() { 
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeframe = searchParams.get('timeframe') || 'this_month';
  
  const { data: summary } = useSWR(mounted ? ['summary', timeframe] : null, () => getSummaryData(timeframe));
  const { data: accounts } = useSWR(mounted ? 'accounts' : null, () => getAccounts());
  const { data: recentTransactions } = useSWR(mounted ? 'recentTx' : null, () => getTransactions(1, 10).then(res => res.transactions));
  const { data: budgetVsActual } = useSWR(mounted ? ['budgetVsActual', timeframe] : null, () => {
    const d = new Date();
    return getBudgetVsActual(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  });

  useEffect(() => {
    setMounted(true);
    processDueRecurringTransactions();
  }, []);

  if (!mounted || !summary || !accounts || !recentTransactions || !budgetVsActual) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-surface-500 animate-pulse">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-brand-500" />
        <p>Syncing your financial data...</p>
      </div>
    );
  }
  
  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

  function renderTxIcon(type: string) {
    if (type === 'INCOME') return <div className="p-2 bg-green-100 text-green-600 rounded-lg"><ArrowUpRight size={16} /></div>;
    if (type === 'EXPENSE') return <div className="p-2 bg-red-100 text-red-600 rounded-lg"><ArrowDownRight size={16} /></div>;
    return <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><RefreshCw size={16} /></div>;
  }

  // Calculate Net Worth
  const netWorth = accounts.reduce((acc, account) => acc + account.currentBalance, 0);

  return (
    <div className="space-y-6">
      {/* Timeframe Filter */}
      <div className="flex justify-end mb-4">
        <div className="w-48">
          <Select
            name="timeframe"
            value={timeframe}
            onChange={(e) => router.push(`/?timeframe=${e.target.value}`)}
            options={[
              { value: 'this_month', label: 'This Month' },
              { value: 'last_month', label: 'Last Month' },
              { value: 'ytd', label: 'Year to Date' },
              { value: 'all_time', label: 'All Time' },
            ]}
          />
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-brand-600 to-brand-800 text-white border-transparent overflow-hidden">
          <CardContent className="p-6 h-full flex flex-col justify-between">
            <div>
              <p className="text-brand-100 text-sm font-medium mb-1">Total Net Worth</p>
              <p className="text-xl lg:text-2xl font-bold break-words leading-tight" title={formatCurrency(netWorth)}>
                {formatCurrency(netWorth)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-surface-500 text-sm font-medium mb-1 flex items-center gap-2">
              <ArrowUpRight size={16} className="text-green-500" /> Income
            </p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-surface-500 text-sm font-medium mb-1 flex items-center gap-2">
              <ArrowDownRight size={16} className="text-red-500" /> Expenses
            </p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-surface-500 text-sm font-medium mb-1 flex items-center gap-2 text-orange-600">
              <Wallet size={16} /> CC Debt
            </p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalCreditCardDebt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-surface-500 text-sm font-medium mb-1">Net Cashflow</p>
            <p className={`text-2xl font-bold ${summary.netCashflow >= 0 ? 'text-brand-600' : 'text-red-600'}`}>
              {summary.netCashflow > 0 ? '+' : ''}{formatCurrency(summary.netCashflow)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Spending By Category Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {summary.spendingByCategoryData.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.spendingByCategoryData}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        fill="#8884d8"
                        paddingAngle={2}
                      >
                        {summary.spendingByCategoryData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(value as number)} 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-surface-400 text-sm">
                  No expense data for this month.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget vs Actual */}
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {budgetVsActual.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetVsActual} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                      <YAxis dataKey="categoryName" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar dataKey="budgeted" name="Budget" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="spent" name="Actual" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-surface-400 text-sm">
                  No budgets set for this month.
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Account Balances */}
          <Card>
            <CardHeader>
              <CardTitle>Account Balances</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-surface-100">
                {accounts.filter(a => a.isActive).map((account) => (
                  <li key={account.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-surface-400">
                        <Wallet size={18} />
                      </div>
                      <span className="font-medium text-surface-900">{account.name}</span>
                    </div>
                    <span className={`font-semibold ${account.currentBalance < 0 ? 'text-red-500' : 'text-surface-900'}`}>
                      {formatCurrency(account.currentBalance)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-surface-100">
                {recentTransactions.map((tx) => (
                  <li key={tx.id} className="p-4 flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="mt-1">
                        {renderTxIcon(tx.type)}
                      </div>
                      <div>
                        <p className="font-medium text-surface-900 text-sm">{tx.description}</p>
                        <p className="text-xs text-surface-500">{formatDate(tx.date)} &middot; {tx.category?.name || 'Uncategorized'}</p>
                      </div>
                    </div>
                    <div className={`font-semibold text-sm ${
                      tx.type === 'INCOME' ? 'text-green-600' : 
                      tx.type === 'EXPENSE' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                      {formatCurrency(tx.amount)}
                    </div>
                  </li>
                ))}
                {recentTransactions.length === 0 && (
                  <li className="p-6 text-center text-sm text-surface-500">
                    No recent transactions.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
