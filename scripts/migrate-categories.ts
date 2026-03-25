import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration...');

  // 1. Migrate Transactions
  const transactions = await prisma.transaction.findMany({
    where: { categoryId: { not: null } }
  });

  console.log(`Found ${transactions.length} transactions to migrate.`);

  for (const tx of transactions) {
    if (tx.categoryId) {
      await prisma.categoryToTransaction.upsert({
        where: {
          transactionId_categoryId: {
            transactionId: tx.id,
            categoryId: tx.categoryId
          }
        },
        create: {
          transactionId: tx.id,
          categoryId: tx.categoryId
        },
        update: {}
      });
    }
  }

  // 2. Migrate Recurring Transactions
  const recurring = await prisma.recurringTransaction.findMany({
    where: { categoryId: { not: null } }
  });

  console.log(`Found ${recurring.length} recurring transactions to migrate.`);

  for (const rec of recurring) {
    if (rec.categoryId) {
      await prisma.categoryToRecurringTransaction.upsert({
        where: {
          recurringTransactionId_categoryId: {
            recurringTransactionId: rec.id,
            categoryId: rec.categoryId
          }
        },
        create: {
          recurringTransactionId: rec.id,
          categoryId: rec.categoryId
        },
        update: {}
      });
    }
  }

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
