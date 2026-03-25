'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, Button, Modal, Input, Select } from '@/components/ui';
import { createRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction } from '@/actions/recurring';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Edit2, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw, Repeat, PlusCircle } from 'lucide-react';
import { Account, Category, RecurringTransaction } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import useSWR, { useSWRConfig } from 'swr';
import { getRecurringTransactions } from '@/actions/recurring';
import { getAccounts } from '@/actions/account';
import { getCategories, createCategory } from '@/actions/category';
import { useEffect } from 'react';
import { X } from 'lucide-react';

type PopulatedRecurring = RecurringTransaction & { 
  categories: {
    category: Category;
  }[];
  sourceAccount: Account | null;
  destinationAccount: Account | null;
};

export default function RecurringClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: recurringTxs, mutate: mutateRecurring } = useSWR(
    mounted ? 'recurring' : null, 
    () => getRecurringTransactions().then(res => res as PopulatedRecurring[])
  );
  const { data: accounts } = useSWR(mounted ? 'accounts' : null, () => getAccounts());
  const { data: categories } = useSWR(mounted ? 'categories' : null, () => getCategories());
  const { mutate: globalMutate } = useSWRConfig();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickCategoryModalOpen, setIsQuickCategoryModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [randomCategoryColor, setRandomCategoryColor] = useState('#3b82f6');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const DEFAULT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

  const editingTx = editingId ? (recurringTxs?.find(t => t.id === editingId)) : null;
  const [txType, setTxType] = useState<string>('EXPENSE');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  if (!mounted || !recurringTxs || !accounts || !categories) {
    return (
      <Card className="animate-pulse">
        <div className="h-64 bg-surface-100 rounded-lg"></div>
      </Card>
    );
  }

  function openCreateModal() {
    setEditingId(null);
    setTxType('EXPENSE');
    setSelectedCategoryIds([]);
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(tx: PopulatedRecurring) {
    setEditingId(tx.id);
    setTxType(tx.type);
    setSelectedCategoryIds(tx.categories.map(c => c.category.id));
    setError(null);
    setIsModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    // Append all selected category IDs
    formData.delete('categoryIds');
    selectedCategoryIds.forEach(id => formData.append('categoryIds', id));
    
    startTransition(async () => {
      const res = editingId 
        ? await updateRecurringTransaction(editingId, formData)
        : await createRecurringTransaction(formData);

      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        setIsModalOpen(false);
        toast.success(editingId ? "Recurring transaction updated successfully" : "Recurring transaction created successfully");
        mutateRecurring();
      }
    });
  }

  function confirmDelete(id: string) {
    setDeleteConfirmId(id);
  }

  function handleDelete() {
    if (!deleteConfirmId) return;
    startTransition(async () => {
      const res = await deleteRecurringTransaction(deleteConfirmId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Recurring transaction deleted successfully");
        setDeleteConfirmId(null);
        mutateRecurring();
      }
    });
  }

  function handleQuickCategorySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('type', txType);
    formData.set('isActive', 'true');
    
    startTransition(async () => {
      const res = await createCategory(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Category created successfully");
        const refreshedCategories = await globalMutate('categories');
        const name = formData.get('name') as string;
        const created = (refreshedCategories as any[])?.find((c: any) => c.name === name);
        if (created) {
          setSelectedCategoryIds(prev => Array.from(new Set([...prev, created.id])));
        }
        setIsQuickCategoryModalOpen(false);
      }
    });
  }

  const categoryOptions = categories
    .filter(c => c.type === txType && c.isActive)
    .map(c => ({ value: c.id, label: c.name }));

  const activeAccounts = accounts.filter(a => a.isActive).map(a => ({ value: a.id, label: a.name }));

  function renderTxIcon(type: string) {
    if (type === 'INCOME') return <div className="p-2 bg-green-100 text-green-600 rounded-lg"><ArrowUpRight size={18} /></div>;
    if (type === 'EXPENSE') return <div className="p-2 bg-red-100 text-red-600 rounded-lg"><ArrowDownRight size={18} /></div>;
    return <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><RefreshCw size={18} /></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-lg font-medium text-surface-700">Automations</h2>
        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-surface-500 uppercase bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="px-6 py-3">Details</th>
                <th className="px-6 py-3 hidden md:table-cell">Frequency</th>
                <th className="px-6 py-3 hidden sm:table-cell">Status</th>
                <th className="px-6 py-3 hidden lg:table-cell">Account(s)</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recurringTxs.map((tx) => (
                <tr key={tx.id} className="bg-white border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {renderTxIcon(tx.type)}
                      <div>
                        <span className="font-medium text-surface-900 block line-clamp-1">{tx.description}</span>
                        <div className="flex flex-wrap items-center gap-1 mt-1 text-[10px] text-surface-400">
                          {tx.categories?.map(catLink => (
                            <span 
                              key={catLink.category.id}
                              className="px-1.5 py-0.5 rounded bg-surface-100 text-surface-600 border border-surface-200"
                            >
                              {catLink.category.name}
                            </span>
                          ))}
                          {(!tx.categories || tx.categories.length === 0) && <span>Uncategorized</span>}
                          <span className="md:hidden ml-1">&bull; {tx.frequency.toLowerCase()}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-surface-600 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                       <Repeat size={14} className="text-brand-500" />
                       {tx.frequency}
                    </div>
                    <div className="text-xs text-surface-400 mt-1">
                      Started: {formatDate(tx.startDate)}
                    </div>
                    {tx.endDate && (
                      <div className="text-xs text-surface-400">
                        Ends: {formatDate(tx.endDate)}
                      </div>
                    )}
                    {tx.maxOccurrences && (
                      <div className="text-xs text-surface-400">
                        Runs: {tx.currentOccurrences} / {tx.maxOccurrences}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                    {tx.isActive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-surface-200 text-surface-600 rounded text-xs font-medium">Paused</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-surface-600 text-xs space-y-1 hidden lg:table-cell">
                    {tx.type === 'EXPENSE' && <div>From: {tx.sourceAccount?.name}</div>}
                    {tx.type === 'INCOME' && <div>To: {tx.destinationAccount?.name}</div>}
                    {tx.type === 'TRANSFER' && (
                      <div className="text-xs">
                        <span className="text-red-500">Out: {tx.sourceAccount?.name}</span><br/>
                        <span className="text-green-500">In: {tx.destinationAccount?.name}</span>
                      </div>
                    )}
                  </td>
                  <td className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${
                    tx.type === 'INCOME' ? 'text-green-600' : 
                    tx.type === 'EXPENSE' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(tx)} className="text-surface-400 hover:text-brand-600">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => confirmDelete(tx.id)} className="text-surface-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {recurringTxs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-surface-500">
                    No recurring transactions setup yet. Automate your bills here!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? 'Edit Recurring Item' : 'Add Recurring Item'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            name="description" 
            label="Description" 
            placeholder="e.g. Netflix Subscription" 
            defaultValue={editingTx?.description || ''} 
            required 
          />
          <Input 
            name="amount" 
            type="number" 
            step="0.01" 
            min="0.01"
            label="Amount" 
            defaultValue={editingTx?.amount || ''} 
            required 
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Select 
              name="type" 
              label="Transaction Type" 
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              options={[
                { value: 'EXPENSE', label: 'Expense' },
                { value: 'INCOME', label: 'Income' },
                { value: 'TRANSFER', label: 'Transfer' },
              ]}
            />
            <Select 
              name="frequency" 
              label="Frequency" 
              defaultValue={editingTx?.frequency || 'MONTHLY'}
              options={[
                { value: 'DAILY', label: 'Daily' },
                { value: 'WEEKLY', label: 'Weekly' },
                { value: 'MONTHLY', label: 'Monthly' },
                { value: 'YEARLY', label: 'Yearly' },
              ]}
            />
          </div>

          <Input 
            name="startDate" 
            type="date" 
            label="Start Date (Next occurence)" 
            defaultValue={editingTx ? new Date(editingTx.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
            required 
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              name="endDate" 
              type="date" 
              label="End Date (Optional)" 
              defaultValue={editingTx?.endDate ? new Date(editingTx.endDate).toISOString().split('T')[0] : ''} 
            />
            <Input 
              name="maxOccurrences" 
              type="number" 
              min="1"
              label="Max Runs (Optional)" 
              placeholder="e.g. 12"
              defaultValue={editingTx?.maxOccurrences || ''} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-700">Categories</label>
            <div className="flex flex-wrap gap-2 p-2 min-h-[42px] bg-white border border-surface-200 rounded-lg">
              {selectedCategoryIds.map(id => {
                const cat = categories.find(c => c.id === id);
                if (!cat) return null;
                return (
                  <span 
                    key={id} 
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-50 text-brand-700 text-xs font-medium border border-brand-100 animate-in zoom-in-95 duration-200"
                  >
                    {cat.name}
                    <button 
                      type="button" 
                      onClick={() => setSelectedCategoryIds(prev => prev.filter(p => p !== id))}
                      className="hover:text-brand-900"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
              {selectedCategoryIds.length === 0 && (
                <span className="text-surface-400 text-xs py-1 italic">No categories selected</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select 
                  label="" 
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id && !selectedCategoryIds.includes(id)) {
                      setSelectedCategoryIds(prev => [...prev, id]);
                    }
                  }}
                  options={[
                    { value: '', label: 'Add a category...' },
                    ...categoryOptions.filter(opt => !selectedCategoryIds.includes(opt.value))
                  ]}
                  required={txType !== 'TRANSFER' && selectedCategoryIds.length === 0}
                />
              </div>
              <button 
                type="button"
                onClick={() => {
                  setRandomCategoryColor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);
                  setIsQuickCategoryModalOpen(true);
                }}
                className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                title="Quick Add Category"
              >
                <PlusCircle size={20} />
              </button>
            </div>
          </div>

          {(txType === 'EXPENSE' || txType === 'TRANSFER') && (
            <Select 
              name="sourceAccountId" 
              label={txType === 'TRANSFER' ? 'Transfer From' : 'Paid From'} 
              defaultValue={editingTx?.sourceAccountId || ''}
              options={activeAccounts}
              required
            />
          )}

          {(txType === 'INCOME' || txType === 'TRANSFER') && (
            <Select 
              name="destinationAccountId" 
              label={txType === 'TRANSFER' ? 'Transfer To' : 'Received In'} 
              defaultValue={editingTx?.destinationAccountId || ''}
              options={activeAccounts}
              required
            />
          )}

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              name="isActive" 
              id="isActive" 
              defaultChecked={editingTx ? editingTx.isActive : true}
              className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isActive" className="text-sm text-surface-700">Automation is Active</label>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Automation'}
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
            Are you sure you want to delete this recurring transaction? It will no longer generate future transactions automatically.
          </p>
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleDelete} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {isPending ? 'Deleting...' : 'Delete Series'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quick Category Modal */}
      <Modal
        isOpen={isQuickCategoryModalOpen}
        onClose={() => setIsQuickCategoryModalOpen(false)}
        title={`Quick Add ${txType.toLowerCase()} Category`}
      >
        <form onSubmit={handleQuickCategorySubmit} className="space-y-4">
          <Input name="name" label="Category Name" placeholder="e.g. Subscriptions" required />
          <div className="grid grid-cols-2 gap-4">
            <Input name="color" label="Color" type="color" defaultValue={randomCategoryColor} />
            <Input name="icon" label="Icon (Emoji)" placeholder="🛒" defaultValue="📦" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsQuickCategoryModalOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
