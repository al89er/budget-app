import CategoriesClient from './CategoriesClient';
import { Suspense } from 'react';

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      {/* Header handled by CategoriesClient */}

      <Suspense fallback={<div className="h-64 flex items-center justify-center text-surface-500">Loading categories...</div>}>
        <CategoriesClient />
      </Suspense>
    </div>
  );
}
