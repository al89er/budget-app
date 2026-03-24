import { getCategories } from '@/actions/category';
import CategoriesClient from './CategoriesClient';

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Categories</h1>
        <p className="text-surface-500">Organize your income, expenses, and transfers.</p>
      </div>

      <CategoriesClient initialCategories={categories} />
    </div>
  );
}
