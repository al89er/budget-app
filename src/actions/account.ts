'use server';

import prisma from '@/lib/prisma';
import { AccountSchema } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

export async function getAccounts() {
  const accounts = await prisma.account.findMany({
    orderBy: { name: 'asc' },
  });

  // Combine aggregations into two massive queries for performance
  const [incomes, expenses] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['destinationAccountId'],
      _sum: { amount: true },
      where: { 
        destinationAccountId: { not: null },
        isRetrospective: false 
      },
    }),
    prisma.transaction.groupBy({
      by: ['sourceAccountId'],
      _sum: { amount: true },
      where: { 
        sourceAccountId: { not: null },
        isRetrospective: false 
      },
    })
  ]);

  const incomeMap = new Map(incomes.map(i => [i.destinationAccountId as string, i._sum.amount || 0]));
  const expenseMap = new Map(expenses.map(e => [e.sourceAccountId as string, e._sum.amount || 0]));

  return accounts.map(account => {
    const totalIn = incomeMap.get(account.id) || 0;
    const totalOut = expenseMap.get(account.id) || 0;
    return {
      ...account,
      currentBalance: account.openingBalance + totalIn - totalOut,
    };
  });
}

export async function getAccountById(id: string) {
  return prisma.account.findUnique({
    where: { id },
  });
}

export async function createAccount(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const result = AccountSchema.safeParse({
    ...data,
    isActive: data.isActive === 'on' || data.isActive === 'true',
  });

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  try {
    await prisma.account.create({
      data: {
        name: result.data.name,
        type: result.data.type,
        openingBalance: result.data.openingBalance,
        isActive: result.data.isActive,
        notes: result.data.notes,
      },
    });
    revalidatePath('/accounts');
    revalidatePath('/'); // Revalidate dashboard
    return { success: true };
  } catch (error) {
    return { error: 'Failed to create account' };
  }
}

export async function updateAccount(id: string, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const result = AccountSchema.safeParse({
    ...data,
    isActive: data.isActive === 'on' || data.isActive === 'true',
  });

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  try {
    await prisma.account.update({
      where: { id },
      data: {
        name: result.data.name,
        type: result.data.type,
        openingBalance: result.data.openingBalance,
        isActive: result.data.isActive,
        notes: result.data.notes,
      },
    });
    revalidatePath('/accounts');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to update account' };
  }
}

export async function setAccountActive(id: string, isActive: boolean) {
  try {
    await prisma.account.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath('/accounts');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to update account status' };
  }
}
