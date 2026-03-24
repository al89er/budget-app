import CategoriesClient from './CategoriesClient';
import { Suspense } from 'react';

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Categories</h1>
        <p className="text-surface-500">Organize your income, expenses, and transfers.</p>
      </div>

      <Suspense fallback={<div className="h-64 flex items-center justify-center text-surface-500">Loading categories...</div>}>
        <CategoriesClient />
      </Suspense>
    </div>
  );
}
