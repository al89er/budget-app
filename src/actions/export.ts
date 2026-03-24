'use server';

import prisma from '@/lib/prisma';

export async function exportTransactionsToCSV() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
      include: {
        category: true,
        sourceAccount: true,
        destinationAccount: true,
      },
    });

    const headers = ['Date', 'Type', 'Description', 'Amount', 'Category', 'Source Account', 'Destination Account', 'Notes'];
    
    const rows = transactions.map(tx => {
      // Handle CSV escaping for strings
      const desc = `"${tx.description.replace(/"/g, '""')}"`;
      const cat = `"${tx.category?.name || 'Uncategorized'}"`;
      const src = `"${tx.sourceAccount?.name || ''}"`;
      const dest = `"${tx.destinationAccount?.name || ''}"`;
      const notes = `"${(tx.notes || '').replace(/"/g, '""')}"`;

      return [
        tx.date.toISOString().split('T')[0],
        tx.type,
        desc,
        tx.amount,
        cat,
        src,
        dest,
        notes
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    return { success: true, data: csvContent };
  } catch (error) {
    console.error('Export error:', error);
    return { error: 'Failed to generate CSV data' };
  }
}
