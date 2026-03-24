'use server';

import prisma from '@/lib/prisma';
import { BudgetSchema } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

export async function getBudgets(month?: string) {
  const where = month ? { month } : {};

  return prisma.budget.findMany({
    where,
    include: {
      category: true,
    },
    orderBy: {
      category: {
        name: 'asc'
      }
    }
  });
}

export async function getBudgetById(id: string) {
  return prisma.budget.findUnique({
    where: { id },
  });
}

export async function createBudget(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  
  const result = BudgetSchema.safeParse(data);

  if (!result.success) {
    const mappedErrors = Object.entries(result.error.flatten().fieldErrors).map(([key, value]) => `${key}: ${value}`).join(', ');
    return { error: `Validation failed: ${mappedErrors}` };
  }

  try {
    // Check for existing budget for same month and category
    const existing = await prisma.budget.findUnique({
      where: {
        month_categoryId: {
          month: result.data.month,
          categoryId: result.data.categoryId,
        }
      }
    });

    if (existing) {
      return { error: 'A budget already exists for this category in this month. Please update the existing budget.' };
    }

    await prisma.budget.create({
      data: {
        month: result.data.month,
        amount: result.data.amount,
        categoryId: result.data.categoryId,
      },
    });
    revalidatePath('/budgets');
    revalidatePath('/reports');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to create budget. Make sure it is unique for the month and category.' };
  }
}

export async function updateBudget(id: string, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  
  const result = BudgetSchema.safeParse(data);

  if (!result.success) {
    const mappedErrors = Object.entries(result.error.flatten().fieldErrors).map(([key, value]) => `${key}: ${value}`).join(', ');
    return { error: `Validation failed: ${mappedErrors}` };
  }

  try {
    await prisma.budget.update({
      where: { id },
      data: {
        month: result.data.month,
        amount: result.data.amount,
        categoryId: result.data.categoryId,
      },
    });
    revalidatePath('/budgets');
    revalidatePath('/reports');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to update budget. Ensure category/month combination is unique.' };
  }
}

export async function deleteBudget(id: string) {
  try {
    await prisma.budget.delete({
      where: { id },
    });
    revalidatePath('/budgets');
    revalidatePath('/reports');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete budget' };
  }
}
