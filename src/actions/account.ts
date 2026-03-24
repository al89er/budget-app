'use server';

import prisma from '@/lib/prisma';
import { AccountSchema } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

export async function getAccounts() {
  const accounts = await prisma.account.findMany({
    orderBy: { name: 'asc' },
  });

  // Calculate current balance on the fly for data integrity
  const accountsWithBalance = await Promise.all(
    accounts.map(async (account) => {
      // Income into this account
      const incomeAndTransfersIn = await prisma.transaction.aggregate({
        where: { destinationAccountId: account.id },
        _sum: { amount: true },
      });

      // Expense from this account
      const expensesAndTransfersOut = await prisma.transaction.aggregate({
        where: { sourceAccountId: account.id },
        _sum: { amount: true },
      });

      const totalIn = incomeAndTransfersIn._sum.amount || 0;
      const totalOut = expensesAndTransfersOut._sum.amount || 0;
      
      const currentBalance = account.openingBalance + totalIn - totalOut;

      return {
        ...account,
        currentBalance,
      };
    })
  );

  return accountsWithBalance;
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
    return { error: result.error.errors[0].message };
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
    return { error: result.error.errors[0].message };
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
