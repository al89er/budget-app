'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, Button, Modal, Input, Select } from '@/components/ui';
import { createCategory, updateCategory, deleteCategory } from '@/actions/category';
import { PieChart, Plus, Edit2, Trash2, RefreshCw, Palette } from 'lucide-react';
import { Category } from '@prisma/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import useSWR, { mutate } from 'swr';
import { getCategories } from '@/actions/category';
import { useEffect } from 'react';

export default function CategoriesClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: categories } = useSWR(mounted ? 'categories' : null, () => getCategories());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [randomDefaultColor, setRandomDefaultColor] = useState('#3b82f6');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const DEFAULT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

  if (!mounted || !categories) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-surface-500 animate-pulse">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-brand-500" />
        <p>Loading categories...</p>
      </div>
    );
  }

  // Group by type
  const incomeCategories = categories.filter(c => c.type === 'INCOME');
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');
  const transferCategories = categories.filter(c => c.type === 'TRANSFER');

  async function openCreateModal() {
    setEditingId(null);
    setError(null);
    setRandomDefaultColor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);
    setIsModalOpen(true);
  }

  async function openEditModal(id: string) {
    setEditingId(id);
    setError(null);
    setIsModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const res = editingId 
        ? await updateCategory(editingId, formData)
        : await createCategory(formData);

      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        mutate('categories');
        setIsModalOpen(false);
        toast.success(editingId ? "Category updated successfully" : "Category created successfully");
      }
    });
  }

  function confirmDelete(id: string) {
    setDeleteConfirmId(id);
  }

  function handleDelete() {
    if (!deleteConfirmId) return;
    
    startTransition(async () => {
      const res = await deleteCategory(deleteConfirmId);
      if (res.error) {
        toast.error(res.error);
      } else {
        mutate('categories');
        if (res.message) toast.success(res.message);
        else toast.success("Category deleted successfully");
        setDeleteConfirmId(null);
      }
    });
  }

  const editingCategory = editingId ? categories.find(c => c.id === editingId) : null;

  const CategorySection = ({ title, items, colorClass }: { title: string, items: Category[], colorClass: string }) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-surface-900 mb-4">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map(cat => (
          <Card key={cat.id} className={!cat.isActive ? 'opacity-60 bg-surface-50' : ''}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: cat.color || '#ccc' }}
                />
                <span className="font-medium text-surface-900">{cat.name}</span>
                {!cat.isActive && <span className="text-xs bg-surface-200 text-surface-600 px-2 py-0.5 rounded-full">Inactive</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(cat.id)} className="text-surface-400 hover:text-brand-600">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => confirmDelete(cat.id)} className="text-surface-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="col-span-full py-6 text-center text-sm text-surface-500 border border-surface-200 border-dashed rounded-xl">
            No {title.toLowerCase()} categories found.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <CategorySection title="Income Categories" items={incomeCategories} colorClass="bg-green-100 text-green-700" />
      <CategorySection title="Expense Categories" items={expenseCategories} colorClass="bg-red-100 text-red-700" />
      <CategorySection title="Transfer Categories" items={transferCategories} colorClass="bg-blue-100 text-blue-700" />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            name="name" 
            label="Category Name" 
            placeholder="e.g. Groceries" 
            defaultValue={editingCategory?.name || ''} 
            required 
          />
          <Select 
            name="type" 
            label="Type" 
            defaultValue={editingCategory?.type || 'EXPENSE'}
            options={[
              { value: 'EXPENSE', label: 'Expense' },
              { value: 'INCOME', label: 'Income' },
              { value: 'TRANSFER', label: 'Transfer' },
            ]}
          />
          <Input 
            name="color" 
            type="color" 
            label="Color" 
            defaultValue={editingCategory?.color || randomDefaultColor} 
            className="h-10 w-full cursor-pointer p-1"
          />
          
          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              name="isActive" 
              id="isActive" 
              defaultChecked={editingCategory ? editingCategory.isActive : true}
              className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isActive" className="text-sm text-surface-700">Category is active</label>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Category'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4 pt-2">
          <p className="text-surface-600 text-sm">
            Are you sure you want to delete this category? If it's used in transactions or budgets, it will be deactivated instead so you don't lose your data.
          </p>
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleDelete} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {isPending ? 'Deleting...' : 'Delete Category'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
