'use server';

import prisma from '@/lib/prisma';
import { CategorySchema } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

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
