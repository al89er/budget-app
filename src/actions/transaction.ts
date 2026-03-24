'use server';

import prisma from '@/lib/prisma';
import { TransactionSchema } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

export async function getTransactions(page = 1, limit = 50, filters?: { type?: string; categoryId?: string; accountId?: string }) {
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filters?.type) where.type = filters.type;
  if (filters?.categoryId) where.categoryId = filters.categoryId;
  if (filters?.accountId) {
    where.OR = [
      { sourceAccountId: filters.accountId },
      { destinationAccountId: filters.accountId },
    ];
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take: limit,
      include: {
        category: true,
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
      category: true,
      sourceAccount: true,
      destinationAccount: true,
    },
  });
}

export async function createTransaction(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  
  const result = TransactionSchema.safeParse(data);

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
        categoryId: result.data.categoryId || null,
        sourceAccountId: result.data.sourceAccountId || null,
        destinationAccountId: result.data.destinationAccountId || null,
        notes: result.data.notes,
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
  
  const result = TransactionSchema.safeParse(data);

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
        categoryId: result.data.categoryId || null,
        sourceAccountId: result.data.sourceAccountId || null,
        destinationAccountId: result.data.destinationAccountId || null,
        notes: result.data.notes,
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
