'use client';

import { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, Button, Modal, Input, Select } from '@/components/ui';
import { createCategory, updateCategory, deleteCategory } from '@/actions/category';
import { cn } from '@/lib/utils';
import { 
  PieChart, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Palette, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Repeat,
  Tag,
  Settings2
} from 'lucide-react';
import { Category } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import useSWR, { useSWRConfig } from 'swr';
import { getCategories } from '@/actions/category';

export default function CategoriesClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: categories, isValidating } = useSWR(mounted ? 'categories' : null, () => getCategories());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [randomDefaultColor, setRandomDefaultColor] = useState('#3b82f6');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { mutate } = useSWRConfig();
  const router = useRouter();

  const DEFAULT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

  if (!mounted || !categories) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-surface-400 animate-pulse">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-brand-500" />
        <p className="font-extrabold uppercase tracking-widest text-xs">Loading Categories...</p>
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
        await Promise.all([
          mutate('categories'),
          mutate('summary'),
          mutate('recentTx'),
          mutate(key => Array.isArray(key) && key[0] === 'transactions-list'),
        ]);
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
        await Promise.all([
          mutate('categories'),
          mutate('summary'),
          mutate('recentTx'),
          mutate(key => Array.isArray(key) && key[0] === 'transactions-list'),
        ]);
        if (res.message) toast.success(res.message);
        else toast.success("Category deleted successfully");
        setDeleteConfirmId(null);
      }
    });
  }

  const editingCategory = editingId ? categories.find(c => c.id === editingId) : null;

  const CategorySection = ({ title, items, icon: Icon, color }: { title: string, items: Category[], icon: any, color: string }) => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pl-2">
        <div className={cn("p-2.5 rounded-xl nm-inset", color)}>
          <Icon size={18} />
        </div>
        <h3 className="text-xl font-extrabold text-surface-800 tracking-tight font-plus">{title}</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map(cat => (
          <div 
            key={cat.id} 
            className={cn(
              "group p-5 rounded-[32px] transition-all duration-300 flex items-center justify-between gap-4",
              cat.isActive ? "nm-button hover:nm-button-hover cursor-pointer" : "nm-inset opacity-60"
            )}
            onClick={() => cat.isActive && openEditModal(cat.id)}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 nm-inset-deep p-1"
              >
                <div className="w-full h-full rounded-xl" style={{ backgroundColor: cat.color || '#ccc' }} />
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-surface-800 tracking-tight truncate block group-hover:text-brand-500 transition-colors">
                  {cat.name}
                </span>
                {!cat.isActive && (
                  <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest mt-0.5 block">
                    Inactive
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); openEditModal(cat.id); }} 
                className="p-2 rounded-xl nm-button-sm text-surface-400 hover:text-brand-500 transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); confirmDelete(cat.id); }} 
                className="p-2 rounded-xl nm-button-sm text-surface-400 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full py-12 text-center nm-inset rounded-[32px] flex flex-col items-center gap-3">
            <Tag size={32} className="text-surface-200" strokeWidth={1} />
            <p className="text-surface-400 font-extrabold text-[10px] uppercase tracking-widest">
              No {title.toLowerCase()} categories found
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-12 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
        <div>
          <h2 className="text-3xl font-extrabold text-surface-800 tracking-tight font-plus">Categories</h2>
          <p className="text-surface-400 text-sm font-bold uppercase tracking-widest mt-1">Organize your transaction labels</p>
        </div>
        <Button onClick={openCreateModal} className="w-full sm:w-auto shadow-nm-outset" variant="primary" size="md">
          <Plus className="h-4 w-4 mr-2" strokeWidth={3} />
          Create Category
        </Button>
      </div>

      <div className={cn("space-y-16 transition-all duration-500", isValidating ? "opacity-50" : "opacity-100")}>
        <CategorySection title="Income" items={incomeCategories} icon={ArrowUpCircle} color="text-emerald-700" />
        <CategorySection title="Expense" items={expenseCategories} icon={ArrowDownCircle} color="text-rose-700" />
        <CategorySection title="Transfer" items={transferCategories} icon={Repeat} color="text-brand-500" />
      </div>

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
