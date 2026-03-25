'use client';

import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { cn, formatCurrency } from '@/lib/utils';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { format, parse } from 'date-fns';
import { useEffect, useState } from 'react';
import { 
  RefreshCw,
  Calendar, 
  ChevronLeft,
  ChevronRight, 
  TrendingUp, 
  Filter, 
  BarChart3, 
  PieChartIcon,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
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

  const { data: summary, isLoading: summaryLoading } = useSWR(mounted ? ['monthly-summary', currentMonth] : null, () => getMonthlySummary(currentMonth));
  const { data: trends, isLoading: trendsLoading } = useSWR(mounted ? 'recent-trends' : null, () => getRecentTrends(6));
  const { data: budgetVsActual, isLoading: budgetLoading } = useSWR(mounted ? ['budgetVsActual', currentMonth] : null, () => getBudgetVsActual(currentMonth));
  const { data: accounts, isLoading: accountsLoading } = useSWR(mounted ? 'accounts' : null, () => getAccounts());
  const { data: categories, isLoading: categoriesLoading } = useSWR(mounted ? 'categories' : null, () => getCategories());
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [spotlightMonth, setSpotlightMonth] = useState(currentMonth);

  const { data: categoryReport, isLoading: categoryReportLoading } = useSWR(
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

  const isInitialLoading = !mounted || (summaryLoading && !summary) || (trendsLoading && !trends) || (accountsLoading && !accounts) || (categoriesLoading && !categories);

  if (isInitialLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-surface-400 animate-pulse">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-brand-500" />
        <p className="font-extrabold uppercase tracking-widest text-xs">Crunching Analytics...</p>
      </div>
    );
  }

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <h2 className="text-3xl font-extrabold text-surface-800 tracking-tight font-plus">Financial Reports</h2>
          <p className="text-surface-400 text-sm font-bold uppercase tracking-widest mt-1">Deep dive into your spending patterns</p>
        </div>
        
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative nm-inset-deep rounded-2xl p-2.5 flex items-center gap-3 w-full lg:w-auto">
            <Calendar className="h-4.5 w-4.5 text-surface-400 ml-2" />
            <span className="text-xs font-extrabold text-surface-500 uppercase tracking-widest">Report Period:</span>
            <input 
              type="month" 
              value={currentMonth}
              onChange={(e) => {
                if (e.target.value) {
                  router.push(`/reports?month=${e.target.value}`);
                }
              }}
              className="bg-transparent text-sm font-bold text-surface-800 focus:outline-none focus:ring-0 cursor-pointer min-w-[120px]"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {[
          { label: 'Total Income', value: summary?.totalIncome || 0, icon: ArrowUpRight, color: 'text-emerald-600/90' },
          { label: 'Total Expense', value: summary?.totalExpense || 0, icon: ArrowDownRight, color: 'text-rose-600/90' },
          { label: 'Net Cashflow', value: summary?.netCashflow || 0, icon: TrendingUp, color: (summary?.netCashflow || 0) >= 0 ? 'text-brand-600/90' : 'text-orange-600/90' },
          { label: 'CC Repayments', value: summary?.ccRepayment || 0, icon: CreditCard, color: 'text-brand-600/90' },
        ].map((item, idx) => (
          <div key={idx} className="nm-button p-6 rounded-[32px] group hover:nm-button-hover transition-all">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest">{item.label}</span>
              <item.icon size={16} className={cn("transition-transform group-hover:scale-110", item.color)} />
            </div>
            <p className={cn("text-2xl font-black tracking-tight font-plus", item.color)}>
              {formatCurrency(item.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        <div className="nm-button p-10 rounded-[40px] flex flex-col gap-8 h-full">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl nm-inset text-brand-500">
              <PieChartIcon size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-surface-800 tracking-tight font-plus">Spending Profile</h3>
              <p className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest mt-1">Expenses by Category</p>
            </div>
          </div>
          <div className="h-[350px] w-full nm-inset-deep rounded-3xl p-6">
            {summary?.spendingByCategoryData && summary.spendingByCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.spendingByCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="amount"
                  >
                    {summary.spendingByCategoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || `hsl(${index * 45}, 70%, 60%)`} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="nm-flat px-4 py-3 rounded-2xl border-none">
                            <p className="text-xs font-extrabold uppercase tracking-widest text-surface-400 mb-1">{payload[0].name}</p>
                            <p className="text-sm font-extrabold text-surface-800">{formatCurrency(payload[0].value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-surface-400 italic font-bold">No data for this period</div>
            )}
          </div>
        </div>

        <div className="nm-button p-8 rounded-[40px] flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl nm-inset text-brand-500">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-xl font-extrabold text-surface-800 tracking-tight font-plus">6-Month Trend</h3>
          </div>

          <div className="h-80 w-full nm-inset-deep rounded-3xl p-4">
            {trends && trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E5EC" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#A0AEC0' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#A0AEC0' }}
                    tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="nm-flat px-4 py-3 rounded-2xl border-none space-y-2">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-surface-400">{label}</p>
                            {payload.map((p: any, i: number) => (
                              <div key={i} className="flex items-center justify-between gap-6">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: p.color }}>{p.name}</span>
                                <span className="text-xs font-extrabold text-surface-800">{formatCurrency(p.value)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '10px' }} />
                  <Line type="monotone" dataKey="income" name="Income" stroke="#059669" strokeWidth={4} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#059669' }} />
                  <Line type="monotone" dataKey="expense" name="Expense" stroke="#e11d48" strokeWidth={4} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#e11d48' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-surface-400 italic font-bold">No trend data available</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        <div className="nm-button p-10 rounded-[40px] flex flex-col gap-8 h-full">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl nm-inset text-brand-500">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-surface-800 tracking-tight font-plus">Budget Performance</h3>
              <p className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest mt-1">Target vs. Actual</p>
            </div>
          </div>
          <div className="space-y-6 mt-4">
            {(budgetVsActual || []).slice(0, 4).map((b) => (
              <div key={b.id} className="space-y-2">
                <div className="flex justify-between items-end px-1">
                  <span className="text-xs font-black text-surface-700 uppercase tracking-widest">{b.categoryName}</span>
                  <span className="text-[10px] font-black text-surface-400">{Math.round(b.percentUsed)}%</span>
                </div>
                <div className="h-4 w-full nm-inset rounded-full overflow-hidden p-[3px]">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      b.percentUsed > 100 ? 'bg-rose-600/90' : b.percentUsed > 80 ? 'bg-orange-600/90' : 'bg-brand-600/90'
                    )}
                    style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {(!budgetVsActual || budgetVsActual.length === 0) && (
              <div className="py-12 text-center nm-inset rounded-3xl text-surface-400 text-xs font-bold uppercase tracking-widest italic">No budgets set for this month</div>
            )}
          </div>
        </div>

        <div className="nm-button p-8 rounded-[40px] flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl nm-inset text-red-500">
              <CreditCard size={20} />
            </div>
            <h3 className="text-xl font-extrabold text-surface-800 tracking-tight font-plus">Credit Card Analytics</h3>
          </div>
          <div className="h-80 w-full nm-inset-deep rounded-3xl p-4">
            {trends && trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E5EC" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#A0AEC0' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#A0AEC0' }}
                    tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="nm-flat px-4 py-3 rounded-2xl border-none space-y-2">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-surface-400">{label}</p>
                            {payload.map((p: any, i: number) => (
                              <div key={i} className="flex items-center justify-between gap-6">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: p.color }}>{p.name}</span>
                                <span className="text-xs font-extrabold text-surface-800">{formatCurrency(p.value)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '10px' }} />
                  <Bar dataKey="ccSpending" name="CC Spending" fill="#e11d48" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="ccRepayment" name="CC Repayment" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-surface-400 italic font-bold">No CC data available</div>
            )}
          </div>
          <div className="nm-inset-deep p-6 rounded-[24px]">
            <p className="text-xs text-surface-500 font-bold leading-relaxed italic">
              <span className="text-brand-500 font-extrabold uppercase tracking-widest block mb-1">Financial Tip</span>
              Keep your CC Repayment consistently higher than Spending to maintain a healthy credit score and avoid debt cycles.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8 pt-6">
        <div className="flex items-center gap-3 pl-2 mb-6">
          <div className="p-2.5 rounded-xl nm-inset text-brand-500">
            <Filter size={18} />
          </div>
          <h3 className="text-xl font-extrabold text-surface-800 tracking-tight font-plus">Category Spotlight</h3>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar">
          {(categories || []).filter(c => c.isActive).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={cn(
                "flex-shrink-0 px-6 py-3 rounded-2xl text-[11px] font-extrabold uppercase tracking-widest transition-all duration-300",
                selectedCategoryId === cat.id 
                  ? "nm-inset text-brand-500" 
                  : "nm-button hover:nm-button-hover text-surface-400"
              )}
            >
              <span className="flex items-center gap-2">
                {cat.icon && <span>{cat.icon}</span>}
                {cat.name}
              </span>
            </button>
          ))}
        </div>

        {selectedCategoryId && categoryReport ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
              <div className="nm-button p-8 rounded-[40px] flex flex-col justify-between gap-6">
                <div>
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-surface-400 mb-2">Spotlight Data</h4>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-extrabold text-surface-800 tracking-tight flex items-center gap-3">
                      {categories?.find(c => c.id === selectedCategoryId)?.name || 'Category'}
                      <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest mt-1">
                        &bull; {spotlightMonth}
                      </span>
                    </span>
                  </div>
                </div>
                
                <div className="relative nm-inset p-2 rounded-2xl flex items-center gap-3 w-max">
                  <Calendar className="h-4 w-4 text-surface-400 ml-2" />
                  <input 
                    type="month" 
                    value={spotlightMonth}
                    onChange={(e) => setSpotlightMonth(e.target.value)}
                    className="bg-transparent text-[10px] font-extrabold text-surface-600 uppercase tracking-widest focus:outline-none focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="nm-button p-8 rounded-[40px] flex flex-col justify-center">
                  <p className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest mb-1">Total In</p>
                  <p className="text-2xl font-extrabold text-emerald-700 tracking-tighter">
                    {formatCurrency(categoryReport.totalIn)}
                  </p>
                </div>
                <div className="nm-button p-8 rounded-[40px] flex flex-col justify-center text-right">
                  <p className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest mb-1">Total Out</p>
                  <p className="text-2xl font-extrabold text-rose-700 tracking-tighter">
                    {formatCurrency(categoryReport.totalOut)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-2">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-surface-400 pl-4 mb-4">Related Transactions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryReport.transactions.length > 0 ? (
                  categoryReport.transactions.map((tx: any) => (
                    <div key={tx.id} className="nm-button p-6 rounded-[32px] flex flex-col justify-between gap-4 group">
                      <div className="flex items-center justify-between">
                         <div className={cn(
                           "p-2.5 rounded-xl nm-inset",
                           tx.type === 'INCOME' ? 'text-emerald-700' : tx.type === 'EXPENSE' ? 'text-rose-700' : 'text-brand-700'
                         )}>
                           {tx.type === 'INCOME' ? <ArrowUpRight size={16} /> : tx.type === 'EXPENSE' ? <ArrowDownRight size={16} /> : <RefreshCw size={16} />}
                         </div>
                         <p className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest">
                           {format(new Date(tx.date), 'MMM dd')}
                         </p>
                      </div>
                      
                      <div>
                        <p className="font-extrabold text-surface-800 tracking-tight text-lg group-hover:text-brand-600/90 transition-colors truncate">
                          {tx.description}
                        </p>
                        <p className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest mt-1">
                          {tx.type === 'INCOME' ? tx.destinationAccount?.name : tx.sourceAccount?.name}
                          {tx.type === 'TRANSFER' && ` Transfer`}
                        </p>
                      </div>

                      <div className="nm-inset p-3 rounded-2xl text-center">
                        <p className={cn(
                          "text-lg font-extrabold tracking-tight font-plus",
                          tx.type === 'INCOME' ? 'text-emerald-700' : tx.type === 'EXPENSE' ? 'text-rose-700' : 'text-brand-700'
                        )}>
                          {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                          {formatCurrency(tx.amount)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center nm-inset rounded-[40px] flex flex-col items-center gap-4">
                     <p className="text-surface-400 font-extrabold text-xs uppercase tracking-widest">No transactions found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center nm-inset rounded-[40px] text-surface-400 text-xs font-extrabold uppercase tracking-widest border-none mx-2">
             {selectedCategoryId ? 'Fetching spotlight data...' : 'Select a category to spotlight'}
          </div>
        )}
      </div>
    </div>
  );
}
