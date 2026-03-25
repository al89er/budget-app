'use server';

import prisma from '@/lib/prisma';
import { addDays, addWeeks, addMonths, addYears, isBefore, isEqual, startOfDay } from 'date-fns';
import { revalidatePath } from 'next/cache';

export async function getRecurringTransactions() {
  return prisma.recurringTransaction.findMany({
    orderBy: { createdAt: 'desc' },
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

export async function createRecurringTransaction(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const categoryIds = getFormDataArray(formData, 'categoryIds');
  
  try {
    const amount = parseFloat(data.amount as string);
    if (isNaN(amount) || amount <= 0) return { error: 'Invalid amount' };

    await prisma.recurringTransaction.create({
      data: {
        description: data.description as string,
        amount,
        type: data.type as string,
        categories: {
          create: categoryIds.map(id => ({
            category: { connect: { id } }
          }))
        },
        sourceAccountId: data.sourceAccountId as string || null,
        destinationAccountId: data.destinationAccountId as string || null,
        frequency: data.frequency as string,
        startDate: new Date(data.startDate as string),
        endDate: data.endDate ? new Date(data.endDate as string) : null,
        maxOccurrences: data.maxOccurrences ? parseInt(data.maxOccurrences as string, 10) : null,
        isActive: data.isActive === 'on' || data.isActive === 'true',
        notes: data.notes as string,
      },
    });
    
    await processDueRecurringTransactions();
    
    revalidatePath('/recurring');
    revalidatePath('/transactions');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to create recurring transaction' };
  }
}

export async function updateRecurringTransaction(id: string, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const categoryIds = getFormDataArray(formData, 'categoryIds');
  
  try {
    const amount = parseFloat(data.amount as string);
    
    await prisma.recurringTransaction.update({
      where: { id },
      data: {
        description: data.description as string,
        amount,
        type: data.type as string,
        categories: {
          deleteMany: {},
          create: categoryIds.map(id => ({
            category: { connect: { id } }
          }))
        },
        sourceAccountId: data.sourceAccountId as string || null,
        destinationAccountId: data.destinationAccountId as string || null,
        frequency: data.frequency as string,
        startDate: new Date(data.startDate as string),
        endDate: data.endDate ? new Date(data.endDate as string) : null,
        maxOccurrences: data.maxOccurrences ? parseInt(data.maxOccurrences as string, 10) : null,
        isActive: data.isActive === 'on' || data.isActive === 'true',
        notes: data.notes as string,
      },
    });

    // Trigger retroactive update in the background (non-blocking)
    syncTransactionsWithRecurring(id, categoryIds).catch(err => {
      console.error('Background sync failed:', err);
    });

    await processDueRecurringTransactions();
    revalidatePath('/recurring');
    revalidatePath('/transactions');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to update recurring transaction' };
  }
}

export async function deleteRecurringTransaction(id: string) {
  try {
    await prisma.recurringTransaction.delete({
      where: { id },
    });
    revalidatePath('/recurring');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete recurring transaction' };
  }
}

function calculateNextDate(currentDate: Date, frequency: string): Date {
  switch (frequency) {
    case 'DAILY': return addDays(currentDate, 1);
    case 'WEEKLY': return addWeeks(currentDate, 1);
    case 'MONTHLY': return addMonths(currentDate, 1);
    case 'YEARLY': return addYears(currentDate, 1);
    default: return addMonths(currentDate, 1);
  }
}

export async function processDueRecurringTransactions() {
  try {
    const activeRecurring = await prisma.recurringTransaction.findMany({
      where: { isActive: true },
      include: {
        categories: true
      }
    });

    const now = startOfDay(new Date());
    let processedCount = 0;

    for (const r of activeRecurring) {
      let currentDateToProcess = r.lastProcessed ? calculateNextDate(r.lastProcessed, r.frequency) : r.startDate;
      let lastProcessedDate = r.lastProcessed;
      let processedForThisItem = 0;

      // Keep generating transactions as long as the due date is <= today
      while (isBefore(currentDateToProcess, now) || isEqual(currentDateToProcess, now)) {
        if (r.endDate && isBefore(r.endDate, currentDateToProcess)) {
          break;
        }
        if (r.maxOccurrences && r.currentOccurrences + processedForThisItem >= r.maxOccurrences) {
          break;
        }

        // Generate transaction
        await prisma.transaction.create({
          data: {
            date: currentDateToProcess,
            description: r.description + ` (Auto: ${r.frequency})`,
            amount: r.amount,
            type: r.type,
            recurringTransactionId: r.id, // Link to the recurring template
            categories: {
              create: r.categories.map(c => ({
                category: { connect: { id: c.categoryId } }
              }))
            },
            sourceAccountId: r.sourceAccountId,
            destinationAccountId: r.destinationAccountId,
            notes: r.notes,
            isRetrospective: isBefore(currentDateToProcess, now),
          }
        });

        processedCount++;
        processedForThisItem++;
        lastProcessedDate = currentDateToProcess;
        currentDateToProcess = calculateNextDate(currentDateToProcess, r.frequency);
      }

      // Update the recurring record if we actually processed anything
      if (lastProcessedDate && lastProcessedDate !== r.lastProcessed) {
        const totalOccurrences = r.currentOccurrences + processedForThisItem;
        const reachedEnd = (r.endDate && isBefore(r.endDate, currentDateToProcess)) || 
                           (r.maxOccurrences && totalOccurrences >= r.maxOccurrences);

        await prisma.recurringTransaction.update({
          where: { id: r.id },
          data: { 
            lastProcessed: lastProcessedDate,
            currentOccurrences: totalOccurrences,
            isActive: !reachedEnd // automatically pause it if limits are hit
          }
        });
      }
    }

    if (processedCount > 0) {
      // revalidatePath cannot be used here because this function is called during the server render of the Dashboard
      console.log(`Processed ${processedCount} recurring transactions`);
    }

    return { success: true, count: processedCount };
  } catch (error) {
    console.error('Failed to process recurring transactions:', error);
    return { error: 'Failed to process recurring transactions' };
  }
}

/**
 * Background helper to sync transactions with their recurring parent
 * Optimized to run without blocking the main UI response
 */
async function syncTransactionsWithRecurring(recurringId: string, categoryIds: string[]) {
  const recurring = await prisma.recurringTransaction.findUnique({
    where: { id: recurringId },
    select: { description: true, frequency: true }
  });

  if (!recurring) return;

  const autoDescription = `${recurring.description} (Auto: ${recurring.frequency})`;
  
  // Find all related transactions (linked or matching pattern)
  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { recurringTransactionId: recurringId },
        { description: autoDescription }
      ]
    },
    select: { id: true }
  });

  // Perform updates in series to avoid DB locks, but without blocking the user
  for (const tx of transactions) {
    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        recurringTransactionId: recurringId,
        categories: {
          deleteMany: {},
          create: categoryIds.map(catId => ({
            category: { connect: { id: catId } }
          }))
        }
      }
    });
  }
}
