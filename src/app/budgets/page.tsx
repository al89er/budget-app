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
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Budgets</h1>
        <p className="text-surface-500">Plan and track your monthly spending targets.</p>
      </div>

      <BudgetsClient 
        initialBudgets={budgets} 
        categories={categories} 
        currentMonth={currentMonth}
      />
    </div>
  );
}
