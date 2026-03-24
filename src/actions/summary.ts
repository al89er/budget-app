'use server';

import prisma from '@/lib/prisma';
import { startOfMonth, endOfMonth, parse, subMonths, startOfYear } from 'date-fns';

export async function getSummaryData(timeframe: string = 'this_month') {
  const now = new Date();
  let start: Date;
  let end: Date = now; // All dates before now or end of month

  if (timeframe === 'this_month') {
    start = startOfMonth(now);
    end = endOfMonth(now);
  } else if (timeframe === 'last_month') {
    const lastMonth = subMonths(now, 1);
    start = startOfMonth(lastMonth);
    end = endOfMonth(lastMonth);
  } else if (timeframe === 'ytd') {
    start = startOfYear(now);
    // end is now
  } else if (timeframe === 'all_time') {
    start = new Date('2000-01-01'); // arbitrary far past date
  } else {
    // fallback to this month
    start = startOfMonth(now);
    end = endOfMonth(now);
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      category: true,
    },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const expensesByCategory: Record<string, { name: string; amount: number; color?: string }> = {};

  transactions.forEach((tx) => {
    if (tx.type === 'INCOME') {
      totalIncome += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      totalExpense += tx.amount;
      
      // Calculate category spending
      if (tx.category) {
        if (!expensesByCategory[tx.category.id]) {
          expensesByCategory[tx.category.id] = {
            name: tx.category.name,
            amount: 0,
            color: tx.category.color || undefined,
          };
        }
        expensesByCategory[tx.category.id].amount += tx.amount;
      }
    }
    // TRANSFERS DO NOT COUNT TOWARDS INCOME OR EXPENSE
  });

  const netCashflow = totalIncome - totalExpense;

  // Formatting for Recharts
  const spendingByCategoryData = Object.values(expensesByCategory).sort((a, b) => b.amount - a.amount);

  return {
    totalIncome,
    totalExpense,
    netCashflow,
    spendingByCategoryData,
  };
}

export async function getBudgetVsActual(monthString: string) {
  const date = parse(monthString, 'yyyy-MM', new Date());
  const start = startOfMonth(date);
  const end = endOfMonth(date);

  const [budgets, expenses] = await Promise.all([
    prisma.budget.findMany({
      where: { month: monthString },
      include: { category: true },
    }),
    prisma.transaction.findMany({
      where: {
        date: { gte: start, lte: end },
        type: 'EXPENSE',
      },
    }),
  ]);

  const spentByCategory = expenses.reduce((acc, tx) => {
    if (tx.categoryId) {
      acc[tx.categoryId] = (acc[tx.categoryId] || 0) + tx.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  return budgets.map((b) => {
    const spent = spentByCategory[b.categoryId] || 0;
    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: b.category.name,
      budgeted: b.amount,
      spent: spent,
      difference: b.amount - spent,
      percentUsed: b.amount > 0 ? (spent / b.amount) * 100 : 0,
    };
  }).sort((a, b) => b.percentUsed - a.percentUsed);
}

export async function getRecentTrends(monthsCount = 6) {
  const trendsPromises = [];
  const today = new Date();
  
  for (let i = monthsCount - 1; i >= 0; i--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthString = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    trendsPromises.push(
      prisma.transaction.findMany({
        where: { date: { gte: start, lte: end } },
      }).then(txs => {
        let income = 0;
        let expense = 0;
        txs.forEach(t => {
          if (t.type === 'INCOME') income += t.amount;
          else if (t.type === 'EXPENSE') expense += t.amount;
        });
        return {
          month: monthString,
          income,
          expense,
          net: income - expense
        };
      })
    );
  }

  return Promise.all(trendsPromises);
}
