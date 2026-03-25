'use client';

import { Card, CardContent, CardHeader, CardTitle, Select } from '@/components/ui';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Wallet, Calendar } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { getSummaryData, getBudgetVsActual } from '@/actions/summary';
import { getAccounts } from '@/actions/account';
import { getTransactions } from '@/actions/transaction';
import { processDueRecurringTransactions } from '@/actions/recurring';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';

export default function DashboardClient() { 
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeframe = searchParams.get('timeframe') || 'this_month';
  
  const { data: summary, isValidating: isValidatingSummary } = useSWR(mounted ? ['summary', timeframe] : null, () => getSummaryData(timeframe));
  const { data: accounts, isValidating: isValidatingAccounts } = useSWR(mounted ? 'accounts' : null, () => getAccounts());
  const { data: recentTransactions } = useSWR(mounted ? 'recentTx' : null, () => getTransactions(1, 10).then(res => res.transactions));
  const { data: budgetVsActual } = useSWR(mounted ? ['budgetVsActual', timeframe] : null, () => {
    const d = new Date();
    return getBudgetVsActual(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  });
  
  const isSyncing = isValidatingSummary || isValidatingAccounts;

  useEffect(() => {
    setMounted(true);
    processDueRecurringTransactions();
  }, []);

  // Only show full-screen loader if we have NO data at all (not even from cache)
  if (!mounted || (!summary && !accounts)) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-surface-500 animate-pulse">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-brand-500" />
        <p>Syncing your financial data...</p>
      </div>
    );
  }
  
  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

  function renderTxIcon(type: string) {
    const baseClass = "p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center";
    if (type === 'INCOME') return <div className={cn(baseClass, "nm-inset text-emerald-600/90")}><ArrowUpRight size={18} /></div>;
    if (type === 'EXPENSE') return <div className={cn(baseClass, "nm-inset text-rose-600/90")}><ArrowDownRight size={18} /></div>;
    return <div className={cn(baseClass, "nm-inset text-brand-600/90")}><RefreshCw size={18} /></div>;
  }

  // Calculate Net Worth
  const netWorth = accounts?.reduce((acc, account) => acc + account.currentBalance, 0) || 0;

  return (
    <div className="space-y-10 pb-12">
      {/* Timeframe Filter & Status */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-surface-800 tracking-tight font-plus">Dashboard</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-surface-500 font-medium">Financial overview for {format(new Date(), 'MMMM yyyy')}</p>
            {isSyncing && (
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-brand-500 nm-inset px-2.5 py-1 rounded-full animate-pulse">
                <RefreshCw size={10} className="animate-spin" />
                SYNCING
              </div>
            )}
          </div>
        </div>
        <div className="w-full md:w-56">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <Card className="col-span-1 md:col-span-2 xl:col-span-1 shadow-nm-outset overflow-hidden">
          <CardContent className="p-8 h-full flex flex-col justify-center">
            <p className="text-surface-500 text-[10px] font-extrabold uppercase tracking-widest mb-3">Net Worth</p>
            <p className="text-xl font-black text-brand-700 tracking-tight font-plus leading-tight break-all" title={formatCurrency(netWorth)}>
              {formatCurrency(netWorth)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-8 h-full flex flex-col justify-center">
            <div className="flex items-center gap-3 text-surface-500 text-[10px] font-extrabold uppercase tracking-widest mb-3">
              <div className="nm-inset-deep p-1.5 rounded-lg text-emerald-700">
                <ArrowUpRight size={14} />
              </div>
              Income
            </div>
            <p className="text-xl font-black text-emerald-700 tracking-tight font-plus">{formatCurrency(summary?.totalIncome || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-8 h-full flex flex-col justify-center">
            <div className="flex items-center gap-3 text-surface-500 text-[10px] font-extrabold uppercase tracking-widest mb-3">
              <div className="nm-inset-deep p-1.5 rounded-lg text-rose-700">
                <ArrowDownRight size={14} />
              </div>
              Expenses
            </div>
            <p className="text-xl font-black text-rose-700 tracking-tight font-plus">{formatCurrency(summary?.totalExpense || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-8 h-full flex flex-col justify-center">
            <div className="flex items-center gap-3 text-surface-500 text-[10px] font-extrabold uppercase tracking-widest mb-3">
              <div className="nm-inset-deep p-1.5 rounded-lg text-orange-700">
                <Wallet size={14} />
              </div>
              CC Debt
            </div>
            <p className="text-xl font-black text-orange-700 tracking-tight font-plus">{formatCurrency(summary?.totalCreditCardDebt || 0)}</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 xl:col-span-1">
          <CardContent className="p-8 h-full flex flex-col justify-center">
            <p className="text-surface-500 text-[10px] font-extrabold uppercase tracking-widest mb-3">Net Cashflow</p>
            <p className={`text-xl font-black tracking-tight font-plus ${(summary?.netCashflow || 0) >= 0 ? 'text-brand-700' : 'text-rose-700'}`}>
              {formatCurrency(summary?.netCashflow || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Spending By Category Chart */}
          <Card>
            <CardHeader className="px-8 pt-8 pb-0">
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-6">
              {summary?.spendingByCategoryData && summary.spendingByCategoryData.length > 0 ? (
                <div className="h-72 w-full">
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
                        paddingAngle={4}
                      >
                        {summary.spendingByCategoryData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(value as number)} 
                        contentStyle={{ 
                          backgroundColor: '#E0E5EC', 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '9px 9px 16px rgba(163, 177, 198, 0.6), -9px -9px 16px rgba(255, 255, 255, 0.5)',
                          padding: '12px'
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : summary?.spendingByCategoryData ? (
                <div className="h-64 flex items-center justify-center text-surface-400 text-sm font-medium">
                  No expense data for this month.
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-surface-400 text-sm animate-pulse">
                  Loading chart...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget vs Actual */}
          <Card>
            <CardHeader className="px-8 pt-8 pb-0">
              <CardTitle>Budget vs Actual</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-6">
              {budgetVsActual && budgetVsActual.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetVsActual} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="categoryName" type="category" width={100} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(value as number)}
                        contentStyle={{ 
                          backgroundColor: '#E0E5EC', 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '9px 9px 16px rgba(163, 177, 198, 0.6), -9px -9px 16px rgba(255, 255, 255, 0.5)',
                          padding: '12px'
                        }}
                      />
                      <Legend iconType="circle" />
                      <Bar dataKey="budgeted" name="Budget" fill="#b8c6dc" radius={[0, 8, 8, 0]} barSize={12} />
                      <Bar dataKey="spent" name="Actual" fill="#6C63FF" radius={[0, 8, 8, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : budgetVsActual ? (
                <div className="h-48 flex items-center justify-center text-surface-400 text-sm font-medium">
                   No budgets set for this month.
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-surface-400 text-sm animate-pulse">
                  Loading budget comparison...
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column */}
        <div className="space-y-8">
          
          {/* Account Balances */}
          <Card>
            <CardHeader className="px-8 pt-8 pb-0">
              <CardTitle>Accounts</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-6">
              <ul className="space-y-4">
                {accounts?.filter(a => a.isActive).map((account) => (
                  <li key={account.id} className="p-4 rounded-2xl nm-inset flex items-center justify-between transition-all hover:scale-[1.02]">
                    <div className="flex items-center gap-3">
                      <div className="text-brand-500">
                        <Wallet size={18} />
                      </div>
                      <span className="font-bold text-surface-800 text-sm tracking-tight">{account.name}</span>
                    </div>
                    <span className={`font-extrabold text-sm ${account.currentBalance < 0 ? 'text-rose-600/90' : 'text-surface-700'}`}>
                      {formatCurrency(account.currentBalance)}
                    </span>
                  </li>
                ))}
                {!accounts && (
                  <li className="p-8 text-center text-sm text-surface-400 animate-pulse font-medium">
                    Syncing accounts...
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="px-8 pt-8 pb-0">
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-6">
              <ul className="space-y-4">
                {recentTransactions?.map((tx) => (
                  <li key={tx.id} className="p-4 rounded-2xl nm-button flex items-start justify-between transition-all hover:nm-button-hover group cursor-pointer">
                    <div className="flex gap-4">
                      <div className="mt-0.5">
                        {renderTxIcon(tx.type)}
                      </div>
                      <div>
                        <p className="font-bold text-surface-800 text-sm tracking-tight leading-tight">{tx.description}</p>
                        <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mt-1">{formatDate(tx.date)} &middot; {tx.category?.name || 'Uncategorized'}</p>
                      </div>
                    </div>
                    <div className={`font-extrabold text-sm mt-1 ${
                      tx.type === 'INCOME' ? 'text-emerald-600/90' : 
                      tx.type === 'EXPENSE' ? 'text-rose-600/90' : 'text-brand-600/90'
                    }`}>
                      {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                      {formatCurrency(tx.amount)}
                    </div>
                  </li>
                ))}
                {recentTransactions?.length === 0 && (
                  <li className="p-6 text-center text-sm text-surface-500 font-medium">
                    No recent activity.
                  </li>
                )}
                {!recentTransactions && (
                   <li className="p-8 text-center text-sm text-surface-400 animate-pulse font-medium">
                    Syncing transactions...
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
