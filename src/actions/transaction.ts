'use server';

import prisma from '@/lib/prisma';
import { TransactionSchema } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

export async function getTransactions(page = 1, limit = 50, filters?: { type?: string; categoryId?: string; accountId?: string; startDate?: Date; endDate?: Date; search?: string }) {
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filters?.type) where.type = filters.type;
  if (filters?.categoryId) {
    where.categories = {
      some: {
        categoryId: filters.categoryId
      }
    };
  }
  if (filters?.accountId) {
    where.OR = [
      { sourceAccountId: filters.accountId },
      { destinationAccountId: filters.accountId },
    ];
  }

  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = filters.startDate;
    if (filters.endDate) where.date.lte = filters.endDate;
  }

  if (filters?.search) {
    const searchFilter = { contains: filters.search, mode: 'insensitive' };
    where.OR = [
      ...(where.OR || []),
      { description: searchFilter },
      { notes: searchFilter },
      { categories: { some: { category: { name: searchFilter } } } },
      { sourceAccount: { name: searchFilter } },
      { destinationAccount: { name: searchFilter } },
    ];
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take: limit,
      include: {
        categories: {
          include: {
            category: true
          }
        },
        sourceAccount: true,
        destinationAccount: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getTransactionById(id: string) {
  return prisma.transaction.findUnique({
    where: { id },
    include: {
      categories: {
        include: {
          category: true
        }
      },
      sourceAccount: true,
      destinationAccount: true,
    },
  });
}

// Helper to extract multiple values from FormData
function getFormDataArray(formData: FormData, key: string): string[] {
  const values: string[] = [];
  formData.forEach((value, k) => {
    if (k === key && typeof value === 'string' && value) {
      values.push(value);
    }
  });
  return values;
}

export async function createTransaction(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const categoryIds = getFormDataArray(formData, 'categoryIds');
  
  const result = TransactionSchema.safeParse({
    ...data,
    categoryIds,
    isRetrospective: data.isRetrospective === 'on' || data.isRetrospective === 'true',
  });

  if (!result.success) {
    // Return formatted error messages
    const mappedErrors = Object.entries(result.error.flatten().fieldErrors).map(([key, value]) => `${key}: ${value}`).join(', ');
    return { error: `Validation failed: ${mappedErrors}` };
  }

  try {
    await prisma.transaction.create({
      data: {
        date: result.data.date,
        description: result.data.description,
        amount: result.data.amount,
        type: result.data.type,
        categories: {
          create: result.data.categoryIds.map(id => ({
            category: { connect: { id } }
          }))
        },
        sourceAccountId: result.data.sourceAccountId || null,
        destinationAccountId: result.data.destinationAccountId || null,
        notes: result.data.notes,
        isRetrospective: result.data.isRetrospective,
      },
    });
    revalidatePath('/transactions');
    revalidatePath('/accounts');
    revalidatePath('/reports');
    revalidatePath('/'); // dashboard
    return { success: true };
  } catch (error) {
    return { error: 'Failed to create transaction' };
  }
}

export async function updateTransaction(id: string, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const categoryIds = getFormDataArray(formData, 'categoryIds');
  
  const result = TransactionSchema.safeParse({
    ...data,
    categoryIds,
    isRetrospective: data.isRetrospective === 'on' || data.isRetrospective === 'true',
  });

  if (!result.success) {
    const mappedErrors = Object.entries(result.error.flatten().fieldErrors).map(([key, value]) => `${key}: ${value}`).join(', ');
    return { error: `Validation failed: ${mappedErrors}` };
  }

  try {
    await prisma.transaction.update({
      where: { id },
      data: {
        date: result.data.date,
        description: result.data.description,
        amount: result.data.amount,
        type: result.data.type,
        categories: {
          deleteMany: {},
          create: result.data.categoryIds.map(id => ({
            category: { connect: { id } }
          }))
        },
        sourceAccountId: result.data.sourceAccountId || null,
        destinationAccountId: result.data.destinationAccountId || null,
        notes: result.data.notes,
        isRetrospective: result.data.isRetrospective,
      },
    });
    revalidatePath('/transactions');
    revalidatePath('/accounts');
    revalidatePath('/reports');
    revalidatePath('/'); 
    return { success: true };
  } catch (error) {
    return { error: 'Failed to update transaction' };
  }
}

export async function deleteTransaction(id: string) {
  try {
    await prisma.transaction.delete({
      where: { id },
    });
    revalidatePath('/transactions');
    revalidatePath('/accounts');
    revalidatePath('/reports');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete transaction' };
  }
}

export async function deleteTransactions(ids: string[]) {
  try {
    await prisma.transaction.deleteMany({
      where: { id: { in: ids } },
    });
    revalidatePath('/transactions');
    revalidatePath('/accounts');
    revalidatePath('/reports');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete transactions' };
  }
}

