'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, Button, Modal, Input, Select } from '@/components/ui';
import { createRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction } from '@/actions/recurring';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Edit2, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw, Repeat } from 'lucide-react';
import { Account, Category, RecurringTransaction } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type PopulatedRecurring = RecurringTransaction & { 
  category: Category | null;
  sourceAccount: Account | null;
  destinationAccount: Account | null;
};

export default function RecurringClient({ 
  initialRecurring, 
  accounts, 
  categories 
}: { 
  initialRecurring: PopulatedRecurring[];
  accounts: Account[];
  categories: Category[];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const editingTx = editingId ? initialRecurring.find(t => t.id === editingId) : null;
  const [txType, setTxType] = useState<string>('EXPENSE');

  function openCreateModal() {
    setEditingId(null);
    setTxType('EXPENSE');
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(tx: PopulatedRecurring) {
    setEditingId(tx.id);
    setTxType(tx.type);
    setError(null);
    setIsModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    
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
        router.refresh();
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
        router.refresh();
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-surface-700">Manage Automations</h2>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Recurring
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-surface-500 uppercase bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="px-6 py-3">Details</th>
                <th className="px-6 py-3">Frequency</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Account(s)</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialRecurring.map((tx) => (
                <tr key={tx.id} className="bg-white border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {renderTxIcon(tx.type)}
                      <div>
                        <span className="font-medium text-surface-900 block">{tx.description}</span>
                        <span className="text-xs text-surface-400">{tx.category?.name || 'Uncategorized'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-surface-600">
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    {tx.isActive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-surface-200 text-surface-600 rounded text-xs font-medium">Paused</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-surface-600 text-xs space-y-1">
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
              {initialRecurring.length === 0 && (
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

          <Select 
            name="categoryId" 
            label="Category" 
            defaultValue={editingTx?.categoryId || ''}
            options={categoryOptions}
            required={txType !== 'TRANSFER'}
          />

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
    </div>
  );
}
