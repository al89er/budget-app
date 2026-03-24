'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, Button, Modal, Input, Select } from '@/components/ui';
import { createTransaction, updateTransaction, deleteTransaction, getTransactions } from '@/actions/transaction';
import { getAccounts } from '@/actions/account';
import { getCategories } from '@/actions/category';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Edit2, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Account, Category, Transaction } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import useSWR from 'swr';

type PopulatedTransaction = Transaction & { 
  category: Category | null;
  sourceAccount: Account | null;
  destinationAccount: Account | null;
};

type TxData = {
  transactions: PopulatedTransaction[];
  total: number;
  page: number;
  totalPages: number;
};

export default function TransactionsClient({ 
  initialData, 
  accounts: initialAccounts, 
  categories: initialCategories 
}: { 
  initialData: TxData;
  accounts: any[];
  categories: any[];
}) {
  const { data } = useSWR(['transactions-list'], () => getTransactions(initialData.page || 1, 50), { fallbackData: initialData });
  const { data: accounts } = useSWR('accounts', () => getAccounts(), { fallbackData: initialAccounts });
  const { data: categories } = useSWR('categories', () => getCategories(), { fallbackData: initialCategories });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Form local state to dynamically adjust fields
  const editingTx = editingId ? data.transactions.find(t => t.id === editingId) : null;
  const [txType, setTxType] = useState<string>('EXPENSE');

  function openCreateModal() {
    setEditingId(null);
    setTxType('EXPENSE');
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(tx: PopulatedTransaction) {
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
        ? await updateTransaction(editingId, formData)
        : await createTransaction(formData);

      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        setIsModalOpen(false);
        toast.success(editingId ? "Transaction updated successfully" : "Transaction created successfully");
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
      const res = await deleteTransaction(deleteConfirmId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Transaction deleted successfully");
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
        <h2 className="text-lg font-medium text-surface-700">Recent Transactions</h2>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-surface-500 uppercase bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Account(s)</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((tx) => (
                <tr key={tx.id} className="bg-white border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-surface-500">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {renderTxIcon(tx.type)}
                      <span className="font-medium text-surface-900">{tx.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span 
                       className="px-2 py-1 text-xs rounded-md"
                       style={{ 
                         backgroundColor: tx.category?.color ? `${tx.category.color}20` : '#f1f5f9',
                         color: tx.category?.color || '#475569'
                       }}
                    >
                      {tx.category?.name || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-surface-600 space-y-1">
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
              {data.transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-surface-500">
                    No transactions found. Look at you all sensible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Simple pagination info */}
        <div className="px-6 py-4 bg-surface-50 border-t border-surface-200 flex items-center justify-between text-sm text-surface-500">
          <span>Showing ~{data.transactions.length} of {data.total} records</span>
          {/* Real Pagination can be added via Link with ?page=2 */}
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? 'Edit Transaction' : 'Add Transaction'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            name="date" 
            type="date" 
            label="Date" 
            defaultValue={editingTx ? new Date(editingTx.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
            required 
          />
          <Input 
            name="description" 
            label="Description" 
            placeholder="What was this for?" 
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

          <Input 
            name="notes" 
            label="Notes (Optional)" 
            defaultValue={editingTx?.notes || ''} 
          />

          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Transaction'}
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
            Are you sure you want to delete this transaction? This action will impact your account balances and budget calculations.
          </p>
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleDelete} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {isPending ? 'Deleting...' : 'Delete Transaction'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
