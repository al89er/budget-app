import { getBudgets } from '@/actions/budget';
import { getCategories } from '@/actions/category';
import BudgetsClient from './BudgetsClient';

export default async function BudgetsPage() {
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  
  const [budgets, categories] = await Promise.all([
    getBudgets(), // Fetch all to allow client side filtering or just start simple
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header handled by BudgetsClient */}

      <BudgetsClient 
        initialBudgets={budgets} 
        categories={categories} 
        currentMonth={currentMonth}
      />
    </div>
  );
}
