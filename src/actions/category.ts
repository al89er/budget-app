'use server';

import prisma from '@/lib/prisma';
import { CategorySchema } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

const DEFAULT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

function getRandomColor() {
  return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
}

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    include: { parent: true },
  });
}

export async function getCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
  });
}

export async function createCategory(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  
  const result = CategorySchema.safeParse({
    ...data,
    isActive: data.isActive === 'on' || data.isActive === 'true',
  });

  if (!result.success) {
    return { error: 'Invalid category data provided' };
  }

  try {
    await prisma.category.create({
      data: {
        name: result.data.name,
        type: result.data.type,
        color: !result.data.color || result.data.color === '#3b82f6' ? getRandomColor() : result.data.color,
        icon: result.data.icon,
        isActive: result.data.isActive,
        parentId: result.data.parentId,
      },
    });
    
    revalidatePath('/categories');
    revalidatePath('/transactions');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to create category' };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  
  const result = CategorySchema.safeParse({
    ...data,
    isActive: data.isActive === 'on' || data.isActive === 'true',
  });

  if (!result.success) {
    return { error: 'Invalid category data provided' };
  }

  try {
    await prisma.category.update({
      where: { id },
      data: {
        name: result.data.name,
        type: result.data.type,
        color: result.data.color,
        icon: result.data.icon,
        isActive: result.data.isActive,
        parentId: result.data.parentId,
      },
    });
    revalidatePath('/categories');
    revalidatePath('/transactions');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to update category' };
  }
}

export async function deleteCategory(id: string) {
  try {
    // Check if category is used in transactions
    const txCount = await prisma.transaction.count({
      where: { categoryId: id }
    });

    // Check if category is used in budgets
    const budgetCount = await prisma.budget.count({
      where: { categoryId: id }
    });

    if (txCount > 0 || budgetCount > 0) {
      // Instead of deleting, just deactivate
      await prisma.category.update({
        where: { id },
        data: { isActive: false }
      });
      revalidatePath('/categories');
      revalidatePath('/transactions');
      return { success: true, message: 'Category deactivated because it is in use.' };
    }

    await prisma.category.delete({
      where: { id },
    });
    revalidatePath('/categories');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete category' };
  }
}
