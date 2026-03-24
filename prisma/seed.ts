import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Create Accounts
  const cimb = await prisma.account.create({
    data: { name: 'CIMB', type: 'BANK', openingBalance: 5000 },
  });
  const maybank = await prisma.account.create({
    data: { name: 'Maybank', type: 'BANK', openingBalance: 2000 },
  });
  const cash = await prisma.account.create({
    data: { name: 'Cash', type: 'CASH', openingBalance: 500 },
  });
  const savings = await prisma.account.create({
    data: { name: 'Savings', type: 'SAVINGS', openingBalance: 10000 },
  });

  // 2. Create Categories
  // Income
  const salaryCat = await prisma.category.create({ data: { name: 'Salary', type: 'INCOME', color: '#10b981' } });
  const hsaasCat = await prisma.category.create({ data: { name: 'HSAAS', type: 'INCOME', color: '#34d399' } });
  const familyCat = await prisma.category.create({ data: { name: 'Family Support', type: 'INCOME', color: '#6ee7b7' } });
  const otherIncCat = await prisma.category.create({ data: { name: 'Other Income', type: 'INCOME', color: '#a7f3d0' } });

  // Expense
  const loanCat = await prisma.category.create({ data: { name: 'Loan', type: 'EXPENSE', color: '#ef4444' } });
  const parentExpCat = await prisma.category.create({ data: { name: 'Parents', type: 'EXPENSE', color: '#f87171' } });
  const mainCat = await prisma.category.create({ data: { name: 'Maintenance', type: 'EXPENSE', color: '#fca5a5' } });
  const phoneCat = await prisma.category.create({ data: { name: 'Phone/Internet', type: 'EXPENSE', color: '#fecaca' } });
  const foodCat = await prisma.category.create({ data: { name: 'Food', type: 'EXPENSE', color: '#f97316' } });
  const transportCat = await prisma.category.create({ data: { name: 'Transport', type: 'EXPENSE', color: '#fb923c' } });
  const medicalCat = await prisma.category.create({ data: { name: 'Medical', type: 'EXPENSE', color: '#fdba74' } });
  const shoppingCat = await prisma.category.create({ data: { name: 'Shopping', type: 'EXPENSE', color: '#ec4899' } });
  const miscCat = await prisma.category.create({ data: { name: 'Miscellaneous', type: 'EXPENSE', color: '#d1d5db' } });

  // Transfer
  const transferCat = await prisma.category.create({ data: { name: 'Transfer', type: 'TRANSFER', color: '#3b82f6' } });

  // 3. Create Transactions
  const today = new Date();
  
  // Income: Salary paid into CIMB
  await prisma.transaction.create({
    data: {
      date: new Date(today.getFullYear(), today.getMonth(), 1),
      description: 'Monthly Salary',
      amount: 4000,
      type: 'INCOME',
      categoryId: salaryCat.id,
      destinationAccountId: cimb.id,
    },
  });

  // Income: Work income paid into CIMB
  await prisma.transaction.create({
    data: {
      date: new Date(today.getFullYear(), today.getMonth(), 5),
      description: 'HSAAS Claims',
      amount: 800,
      type: 'INCOME',
      categoryId: hsaasCat.id,
      destinationAccountId: cimb.id,
    },
  });

  // Expense: Support sent to parents from CIMB
  await prisma.transaction.create({
    data: {
      date: new Date(today.getFullYear(), today.getMonth(), 2),
      description: 'Monthly Support for Parents',
      amount: 500,
      type: 'EXPENSE',
      categoryId: parentExpCat.id,
      sourceAccountId: cimb.id,
    },
  });

  // Expense: Car loan paid from CIMB
  await prisma.transaction.create({
    data: {
      date: new Date(today.getFullYear(), today.getMonth(), 3),
      description: 'Car Loan',
      amount: 600,
      type: 'EXPENSE',
      categoryId: loanCat.id,
      sourceAccountId: cimb.id,
    },
  });

  // Expense: Maintenance paid from Maybank
  await prisma.transaction.create({
    data: {
      date: new Date(today.getFullYear(), today.getMonth(), 10),
      description: 'Apartment Maintenance',
      amount: 250,
      type: 'EXPENSE',
      categoryId: mainCat.id,
      sourceAccountId: maybank.id,
    },
  });

  // Expense: Food expenses from cash
  await prisma.transaction.create({
    data: {
      date: new Date(today.getFullYear(), today.getMonth(), 12),
      description: 'Groceries and Market',
      amount: 150,
      type: 'EXPENSE',
      categoryId: foodCat.id,
      sourceAccountId: cash.id,
    },
  });

  // Transfer: from CIMB to savings
  await prisma.transaction.create({
    data: {
      date: new Date(today.getFullYear(), today.getMonth(), 15),
      description: 'Monthly Savings Transfer',
      amount: 1000,
      type: 'TRANSFER',
      categoryId: transferCat.id,
      sourceAccountId: cimb.id,
      destinationAccountId: savings.id,
    },
  });

  // 4. Create Budgets
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  await prisma.budget.create({
    data: { month: currentMonth, amount: 800, categoryId: foodCat.id },
  });
  await prisma.budget.create({
    data: { month: currentMonth, amount: 300, categoryId: transportCat.id },
  });
  await prisma.budget.create({
    data: { month: currentMonth, amount: 400, categoryId: shoppingCat.id },
  });
  await prisma.budget.create({
    data: { month: currentMonth, amount: 200, categoryId: miscCat.id },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
