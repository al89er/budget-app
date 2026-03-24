import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Wiping all user data...');
  
  // Use TRUNCATE with CASCADE to instantly delete all rows and ignore foreign key order
  await prisma.$executeRaw\`TRUNCATE TABLE "Transaction", "RecurringTransaction", "Budget", "Account", "Category" CASCADE;\`;
  
  console.log('Database successfully wiped! It is now a completely clean slate.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
