'use client';

import { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, Button, Modal, Input, Select } from '@/components/ui';
import { createBudget, updateBudget, deleteBudget } from '@/actions/budget';
import { cn, formatCurrency } from '@/lib/utils';
import { Target, Plus, Edit2, Trash2, Filter, Calendar, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { Budget, Category } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type PopulatedBudget = Budget & { category: Category };

export default function BudgetsClient({ 
  initialBudgets, 
  categories,
  currentMonth
}: { 
  initialBudgets: PopulatedBudget[], 
  categories: Category[],
  currentMonth: string
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const budgets = initialBudgets;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!mounted) return null;

  const displayedBudgets = budgets.filter(b => b.month === selectedMonth);

  // Budgets apply to EXPENSE categories
  const expenseCategories = categories
    .filter(c => c.type === 'EXPENSE' && c.isActive)
    .map(c => ({ value: c.id, label: c.name }));

  function openCreateModal() {
    setEditingId(null);
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(id: string) {
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
        ? await updateBudget(editingId, formData)
        : await createBudget(formData);

      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        setIsModalOpen(false);
        toast.success(editingId ? "Budget updated successfully" : "Budget created successfully");
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    startTransition(async () => {
      const res = await deleteBudget(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Budget deleted successfully");
        router.refresh();
      }
    });
  }

  const editingBudget = editingId ? budgets.find(b => b.id === editingId) : null;

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <h2 className="text-3xl font-extrabold text-surface-800 tracking-tight font-plus">Budgets</h2>
          <p className="text-surface-400 text-sm font-bold uppercase tracking-widest mt-1">Set targets and control your spending</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative nm-inset-deep rounded-2xl p-2.5 flex items-center gap-3 w-full sm:w-auto">
            <Calendar className="h-4.5 w-4.5 text-surface-400 ml-2" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-surface-800 focus:outline-none focus:ring-0 cursor-pointer min-w-[120px]"
            />
          </div>
          <Button onClick={openCreateModal} className="w-full sm:w-auto shadow-nm-outset" variant="primary" size="md">
            <Plus className="h-4 w-4 mr-2" strokeWidth={3} />
            Set Target
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {displayedBudgets.map(budget => (
          <div 
            key={budget.id} 
            className="group p-8 rounded-[40px] nm-button hover:nm-button-hover cursor-pointer transition-all duration-300 flex flex-col gap-8"
            onClick={() => openEditModal(budget.id)}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-5">
                <div 
                  className="p-4 rounded-2xl transition-all duration-300 flex items-center justify-center nm-inset"
                  style={{ color: budget.category.color || '#3b82f6' }}
                >
                  <Target size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-surface-800 tracking-tight group-hover:text-brand-500 transition-colors">
                    {budget.category.name}
                  </h3>
                  <p className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest mt-0.5">
                    Target for {budget.month}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); openEditModal(budget.id); }} 
                  className="p-2.5 rounded-xl nm-button-sm text-surface-400 hover:text-brand-500 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(budget.id); }} 
                  className="p-2.5 rounded-xl nm-button-sm text-surface-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest pl-1 block mb-2">
                Target Amount
              </span>
              <div className="nm-inset-deep py-6 px-7 rounded-[24px]">
                <p className="text-3xl font-extrabold tracking-tighter text-surface-800 font-plus">
                  {formatCurrency(budget.amount)}
                </p>
              </div>
            </div>
          </div>
        ))}
        {displayedBudgets.length === 0 && (
          <div className="col-span-full py-24 text-center nm-inset rounded-[40px] flex flex-col items-center gap-4">
             <div className="p-8 rounded-full nm-inset text-surface-200">
               <TrendingUp size={64} strokeWidth={1} />
             </div>
             <div>
               <p className="text-surface-600 font-extrabold text-xl tracking-tight">No budgets set</p>
               <p className="text-surface-400 text-sm mt-1">Ready to start planning? Set your first target for {selectedMonth}.</p>
             </div>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? 'Edit Budget' : 'Set Budget'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            name="month" 
            type="month" 
            label="Month" 
            defaultValue={editingBudget?.month || selectedMonth} 
            required 
          />
          <Select 
            name="categoryId" 
            label="Expense Category" 
            defaultValue={editingBudget?.categoryId || ''}
            options={expenseCategories}
            required
          />
          <Input 
            name="amount" 
            type="number" 
            step="0.01" 
            min="0"
            label="Target Amount" 
            defaultValue={editingBudget?.amount || ''} 
            required 
          />
          
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Budget'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
