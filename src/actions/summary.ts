'use server';

import prisma from '@/lib/prisma';
import { startOfMonth, endOfMonth, parse, subMonths, startOfYear } from 'date-fns';
import { getAccounts } from '@/actions/account';

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
      categories: {
        include: {
          category: true
        }
      },
    },
  } as any) as any[];


  let totalIncome = 0;
  let totalExpense = 0;
  const expensesByCategory: Record<string, { name: string; amount: number; color?: string }> = {};

  transactions.forEach((tx) => {
    if (tx.type === 'INCOME') {
      totalIncome += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      totalExpense += tx.amount;
      
      // Calculate category spending
      tx.categories.forEach((catLink: any) => {
        const category = catLink.category;
        if (!expensesByCategory[category.id]) {
          expensesByCategory[category.id] = {
            name: category.name,
            amount: 0,
            color: category.color || undefined,
          };
        }
        expensesByCategory[category.id].amount += tx.amount;
      });
    }
  });

  const netCashflow = totalIncome - totalExpense;

  // Calculate Total Credit Card Debt (Global, not timeframe bound)
  // Reusing getAccounts() which already has the date filter (date <= now)
  const accounts = await getAccounts();
  const totalCreditCardDebt = accounts
    .filter(a => a.type === 'CREDIT_CARD' && a.isActive)
    .reduce((acc, a) => {
      // Balance < 0 means money is owed (debt)
      return acc + (a.currentBalance < 0 ? Math.abs(a.currentBalance) : 0);
    }, 0);

  // Formatting for Recharts
  const spendingByCategoryData = Object.values(expensesByCategory).sort((a, b) => b.amount - a.amount);

  return {
    totalIncome,
    totalExpense,
    netCashflow,
    totalCreditCardDebt,
    spendingByCategoryData,
  };
}

export async function getMonthlySummary(monthString: string) {
  const date = parse(monthString, 'yyyy-MM', new Date());
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const transactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      categories: {
        include: {
          category: true
        }
      },
    },
  } as any) as any[];


  let totalIncome = 0;
  let totalExpense = 0;
  const expensesByCategory: Record<string, { name: string; amount: number; color?: string }> = {};

  transactions.forEach((tx) => {
    if (tx.type === 'INCOME') {
      totalIncome += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      totalExpense += tx.amount;
      
      // Calculate category spending
      tx.categories.forEach((catLink: any) => {
        const category = catLink.category;
        if (!expensesByCategory[category.id]) {
          expensesByCategory[category.id] = {
            name: category.name,
            amount: 0,
            color: category.color || undefined,
          };
        }
        expensesByCategory[category.id].amount += tx.amount;
      });
    }
  });

  const netCashflow = totalIncome - totalExpense;

  // CC-Specific Monthly Metrics
  const ccTransactions = await prisma.transaction.findMany({
    where: {
      date: { gte: start, lte: end },
      OR: [
        { sourceAccount: { type: 'CREDIT_CARD' } },
        { destinationAccount: { type: 'CREDIT_CARD' } }
      ]
    }
  });

  let ccSpending = 0;
  let ccRepayment = 0;

  ccTransactions.forEach((tx: any) => {
    if (tx.type === 'EXPENSE' && tx.sourceAccountId) {
       ccSpending += tx.amount;
    }
    if (tx.type === 'TRANSFER' && tx.destinationAccountId) {
       ccRepayment += tx.amount;
    }
  });

  const spendingByCategoryData = Object.values(expensesByCategory).sort((a, b) => b.amount - a.amount);

  return {
    totalIncome,
    totalExpense,
    netCashflow,
    ccSpending,
    ccRepayment,
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
      include: {
        categories: true
      }
    } as any) as Promise<any[]>,
  ]);

  const spentByCategory = expenses.reduce((acc: any, tx: any) => {
    tx.categories.forEach((catLink: any) => {
      acc[catLink.categoryId] = (acc[catLink.categoryId] || 0) + tx.amount;
    });
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
        include: {
          sourceAccount: { select: { type: true } },
          destinationAccount: { select: { type: true } }
        }
      }).then(txs => {
        let income = 0;
        let expense = 0;
        let ccSpending = 0;
        let ccRepayment = 0;
        
        txs.forEach(t => {
          if (t.type === 'INCOME') income += t.amount;
          else if (t.type === 'EXPENSE') {
            expense += t.amount;
            if (t.sourceAccount?.type === 'CREDIT_CARD') ccSpending += t.amount;
          }
          else if (t.type === 'TRANSFER') {
            if (t.destinationAccount?.type === 'CREDIT_CARD') ccRepayment += t.amount;
          }
        });

        return {
          month: monthString,
          income,
          expense,
          ccSpending,
          ccRepayment,
          net: income - expense
        };
      })
    );
  }

  return Promise.all(trendsPromises);
}

export async function getCategoryReportData(categoryId: string, monthString: string) {
  const date = parse(monthString, 'yyyy-MM', new Date());
  const start = startOfMonth(date);
  const end = endOfMonth(date);

  const transactions = (await (prisma.transaction.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
      categories: {
        some: {
          categoryId: categoryId
        }
      }
    },
    include: {
      categories: {
        include: {
          category: true
        }
      },
      sourceAccount: true,
      destinationAccount: true
    },
    orderBy: {
      date: 'desc'
    }
  } as any))) as any[];

  let totalIn = 0;
  let totalOut = 0;

  transactions.forEach((tx: any) => {
    if (tx.type === 'INCOME') {
      totalIn += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      totalOut += tx.amount;
    }
    // For Transfers, we might want to show them but not count for income/expense?
    // User requested "Total Income/Expense" logic usually.
  });

  return {
    transactions,
    totalIn,
    totalOut
  };
}
