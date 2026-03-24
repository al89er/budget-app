'use client';

import { useState, useTransition, useEffect } from 'react';
import { Card, Button, Modal, Input, Select } from '@/components/ui';
import { createTransaction, updateTransaction, deleteTransaction, deleteTransactions, getTransactions } from '@/actions/transaction';
import { getAccounts } from '@/actions/account';
import { getCategories } from '@/actions/category';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Edit2, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Account, Category, Transaction } from '@prisma/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import useSWR, { mutate as globalMutate } from 'swr';
import { startOfMonth, endOfMonth, parseISO, isValid } from 'date-fns';
import { X, PlusCircle } from 'lucide-react';
import { createCategory } from '@/actions/category';

type PopulatedTransaction = Transaction & { 
  category: Category | null;
  sourceAccount: Account | null;
  destinationAccount: Account | null;
};

export default function TransactionsClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageParam = searchParams.get('page');
  const page = pageParam ? parseInt(pageParam) : 1;
  const type = searchParams.get('type') || undefined;
  const categoryId = searchParams.get('categoryId') || undefined;
  const accountId = searchParams.get('accountId') || undefined;
  const startStr = searchParams.get('startDate');
  const endStr = searchParams.get('endDate');

  const startDate = startStr && isValid(parseISO(startStr)) ? parseISO(startStr) : undefined;
  const endDate = endStr && isValid(parseISO(endStr)) ? parseISO(endStr) : undefined;

  const { data, mutate } = useSWR(
    mounted ? ['transactions-list', page, type, categoryId, accountId, startStr, endStr] : null, 
    () => getTransactions(page, 50, { type, categoryId, accountId, startDate, endDate })
  );
  const { data: accounts } = useSWR(mounted ? 'accounts' : null, () => getAccounts());
  const { data: categories } = useSWR(mounted ? 'categories' : null, () => getCategories());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickCategoryModalOpen, setIsQuickCategoryModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [txType, setTxType] = useState<string>('EXPENSE');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [randomCategoryColor, setRandomCategoryColor] = useState('#3b82f6');
  const DEFAULT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

  if (!mounted || !data || !accounts || !categories) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-surface-500 animate-pulse">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-brand-500" />
        <p>Fetching transactions...</p>
      </div>
    );
  }

  const { transactions, totalPages } = data;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    
    startTransition(async () => {
      const res = await deleteTransactions(Array.from(selectedIds));
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Deleted ${selectedIds.size} transactions`);
        setSelectedIds(new Set());
        setIsBulkDeleteModalOpen(false);
        mutate();
      }
    });
  };

  // Form local state to dynamically adjust fields
  const editingTx = editingId ? transactions.find(t => t.id === editingId) : null;

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
        mutate(); // use SWR mutate instead of router.refresh() for instant feedback
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
        mutate();
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
        const allCategories = await globalMutate('categories');
        const name = formData.get('name') as string;
        const created = (allCategories as any[])?.find((c: any) => c.name === name);
        if (created) {
          setNewCategoryId(created.id);
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
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-surface-900">
            {accountId ? `${accounts.find(a => a.id === accountId)?.name} Transactions` : 'Recent Transactions'}
          </h2>
          {(accountId || categoryId || type || startDate || endDate) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {accountId && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-50 text-brand-700 text-xs font-medium">
                  Account: {accounts.find(a => a.id === accountId)?.name}
                  <button onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('accountId');
                    router.push(`/transactions?${params.toString()}`);
                  }}><X size={12} /></button>
                </span>
              )}
              {startDate && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-50 text-brand-700 text-xs font-medium">
                  From: {formatDate(startDate)}
                  <button onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('startDate');
                    router.push(`/transactions?${params.toString()}`);
                  }}><X size={12} /></button>
                </span>
              )}
              {endDate && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-50 text-brand-700 text-xs font-medium">
                  To: {formatDate(endDate)}
                  <button onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('endDate');
                    router.push(`/transactions?${params.toString()}`);
                  }}><X size={12} /></button>
                </span>
              )}
              <button 
                onClick={() => router.push('/transactions')}
                className="text-xs text-surface-500 hover:text-surface-700 underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 bg-surface-50 p-1.5 rounded-lg border border-surface-200">
            <input 
              type="date" 
              className="bg-transparent border-none text-xs focus:ring-0 p-0 w-24"
              value={startStr || ''}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.value) params.set('startDate', e.target.value);
                else params.delete('startDate');
                router.push(`/transactions?${params.toString()}`);
              }}
            />
            <span className="text-surface-400 text-[10px] font-bold">TO</span>
            <input 
              type="date" 
              className="bg-transparent border-none text-xs focus:ring-0 p-0 w-24"
              value={endStr || ''}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.value) params.set('endDate', e.target.value);
                else params.delete('endDate');
                router.push(`/transactions?${params.toString()}`);
              }}
            />
            {(startStr || endStr) && (
              <button 
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete('startDate');
                  params.delete('endDate');
                  router.push(`/transactions?${params.toString()}`);
                }}
                className="ml-1 p-0.5 hover:bg-surface-200 rounded-full text-surface-400"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <Select 
            className="w-32 text-xs h-9"
            value={startStr && endStr ? 'custom' : 'all'}
            onChange={(e) => {
              const val = e.target.value;
              const params = new URLSearchParams(searchParams.toString());
              if (val === 'this-month') {
                params.set('startDate', startOfMonth(new Date()).toISOString().split('T')[0]);
                params.set('endDate', endOfMonth(new Date()).toISOString().split('T')[0]);
              } else if (val === 'all') {
                params.delete('startDate');
                params.delete('endDate');
              }
              router.push(`/transactions?${params.toString()}`);
            }}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'this-month', label: 'This Month' },
              { value: 'custom', label: 'Custom Range' },
            ]}
          />
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      <Card>
        {/* Table Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 border-b border-surface-100">
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 border border-brand-100 rounded-lg text-sm text-brand-700 animate-in fade-in slide-in-from-left-2 transition-all">
                <span className="font-semibold">{selectedIds.size} selected</span>
                <div className="h-4 w-px bg-brand-200 mx-1" />
                <button 
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="flex items-center gap-1.5 text-red-600 hover:text-red-700 font-medium transition-colors"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
            {selectedIds.size === 0 && (
              <span className="text-sm text-surface-500">Select transactions to perform bulk actions</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Filter indicators or search can go here */}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-surface-500 uppercase bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="px-6 py-3 w-10">
                   <input 
                     type="checkbox" 
                     className="rounded border-surface-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                     checked={transactions.length > 0 && selectedIds.size === transactions.length}
                     onChange={toggleSelectAll}
                   />
                </th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Account(s)</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr 
                  key={tx.id} 
                  className={`border-b border-surface-100 hover:bg-surface-50 transition-colors ${selectedIds.has(tx.id) ? 'bg-brand-50/50' : 'bg-white'}`}
                >
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-surface-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      checked={selectedIds.has(tx.id)}
                      onChange={() => toggleSelect(tx.id)}
                    />
                  </td>
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
                    <div className="flex items-center gap-2">
                      <span 
                         className="px-2 py-1 text-xs rounded-md"
                         style={{ 
                           backgroundColor: tx.category?.color ? `${tx.category.color}20` : '#f1f5f9',
                           color: tx.category?.color || '#475569'
                         }}
                      >
                        {tx.category?.name || 'Uncategorized'}
                      </span>
                      {tx.isRetrospective && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full border border-amber-200 font-medium">
                          Retro
                        </span>
                      )}
                    </div>
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
                      <button onClick={() => openEditModal(tx)} className="text-surface-400 hover:text-brand-600 p-1 rounded hover:bg-surface-100 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => confirmDelete(tx.id)} className="text-surface-400 hover:text-red-600 p-1 rounded hover:bg-surface-100 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-surface-500">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-surface-50 border-t border-surface-200 flex items-center justify-between text-sm text-surface-500">
          <span>Showing {transactions.length} of {data.total} records</span>
          <div className="flex gap-2">
             {/* Pagination controls could be implemented here */}
          </div>
        </div>
      </Card>

      {/* Transaction Form Modal */}
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

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select 
                name="categoryId" 
                label="Category" 
                defaultValue={newCategoryId || editingTx?.categoryId || ''}
                key={newCategoryId || 'cat-select'}
                options={categoryOptions}
                required={txType !== 'TRANSFER'}
              />
            </div>
            <button 
              type="button"
              onClick={() => {
                setRandomCategoryColor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);
                setIsQuickCategoryModalOpen(true);
              }}
              className="mb-2 p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
              title="Quick Add Category"
            >
              <PlusCircle size={20} />
            </button>
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

          <Input 
            name="notes" 
            label="Notes (Optional)" 
            defaultValue={editingTx?.notes || ''} 
          />
          
          <div className="flex items-start gap-2 pt-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <input 
              type="checkbox" 
              name="isRetrospective" 
              id="isRetrospective" 
              defaultChecked={editingTx?.isRetrospective || false}
              className="mt-1 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
            />
            <div>
              <label htmlFor="isRetrospective" className="text-sm font-medium text-amber-900 block">Retrospective Entry</label>
              <p className="text-xs text-amber-700">Does not affect account balances. Use this for past records where the account balance was already manually adjusted.</p>
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Transaction'}
            </Button>
          </div>
        </form>
      </Modal>    

      {/* Single Delete Confirmation */}
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

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Confirm Bulk Deletion"
      >
        <div className="space-y-4 pt-2">
          <p className="text-surface-600 text-sm">
            Are you sure you want to delete <span className="font-bold text-surface-900">{selectedIds.size}</span> selected transactions? This action cannot be undone.
          </p>
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsBulkDeleteModalOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleBulkDelete} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {isPending ? 'Deleting...' : 'Confirm Bulk Delete'}
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
