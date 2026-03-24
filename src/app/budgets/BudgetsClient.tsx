'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, Button, Modal, Input, Select } from '@/components/ui';
import { createBudget, updateBudget, deleteBudget } from '@/actions/budget';
import { formatCurrency } from '@/lib/utils';
import { Target, Plus, Edit2, Trash2, Filter } from 'lucide-react';
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
  const budgets = initialBudgets;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Filter className="text-surface-400" size={18} />
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border-surface-300 px-3 py-1.5 text-sm focus:ring-brand-500"
          />
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Set Budget
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {displayedBudgets.map(budget => (
          <Card key={budget.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: budget.category.color ? `${budget.category.color}20` : '#f1f5f9', color: budget.category.color || '#475569' }}
                  >
                    <Target size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900">{budget.category.name}</h3>
                    <p className="text-sm text-surface-500">Planned for {budget.month}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(budget.id)} className="text-surface-400 hover:text-brand-600">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(budget.id)} className="text-surface-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm text-surface-500 mb-1">Budget Amount</p>
                <p className="text-2xl font-bold text-surface-900">
                  {formatCurrency(budget.amount)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {displayedBudgets.length === 0 && (
          <div className="col-span-full py-12 text-center text-surface-500 bg-white rounded-xl border border-surface-200 border-dashed">
            No budgets set for {selectedMonth}. Create one to start tracking spending targets!
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
