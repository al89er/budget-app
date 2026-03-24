'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getSettings() {
  const settings = await prisma.setting.findMany();
  // Return as { key: value } map for easier frontend consumption
  return settings.reduce((acc: Record<string, string>, current: { key: string, value: string }) => {
    acc[current.key] = current.value;
    return acc;
  }, {} as Record<string, string>);
}

export async function updateSetting(key: string, value: string) {
  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    // Revalidate the entire app since settings like currency might affect everything
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to update setting' };
  }
}
