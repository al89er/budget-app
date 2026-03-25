'use client';

import { useState, useTransition, useEffect } from 'react';
import { Card, Button, Modal, Input, Select } from '@/components/ui';
import { createTransaction, updateTransaction, deleteTransaction, deleteTransactions, getTransactions } from '@/actions/transaction';
import { getAccounts } from '@/actions/account';
import { getCategories } from '@/actions/category';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  Search, 
  Calendar, 
  X, 
  PlusCircle 
} from 'lucide-react';
import { Account, Category, Transaction } from '@prisma/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import useSWR, { useSWRConfig } from 'swr';
import { startOfMonth, endOfMonth, parseISO, isValid } from 'date-fns';
import { createCategory } from '@/actions/category';

type PopulatedTransaction = Transaction & { 
  categories: {
    category: Category;
  }[];
  sourceAccount: Account | null;
  destinationAccount: Account | null;
  isRetrospective?: boolean;
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

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search to avoid excessive server requests
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, mutate, isValidating } = useSWR(
    mounted ? ['transactions-list', page, type, categoryId, accountId, startStr, endStr, debouncedSearch] : null, 
    () => getTransactions(page, 50, { type, categoryId, accountId, startDate, endDate, search: debouncedSearch }).then(res => ({
      ...res,
      transactions: res.transactions as PopulatedTransaction[]
    })),
    { keepPreviousData: true }
  );
  const { data: accounts } = useSWR(mounted ? 'accounts' : null, () => getAccounts());
  const { data: categories } = useSWR(mounted ? 'categories' : null, () => getCategories());
  const { mutate: globalMutate } = useSWRConfig();

  const refreshAppData = async () => {
    // Refresh all data that depends on transactions
    mutate(); // Refresh the current transaction list
    const currentMonth = new Date().toISOString().substring(0, 7); // yyyy-MM
    await Promise.all([
      globalMutate(['summary', 'this_month']),
      globalMutate('accounts'),
      globalMutate('recentTx'),
      globalMutate('recent-trends'),
      globalMutate(['monthly-summary', currentMonth]),
      globalMutate(['budgetVsActual', currentMonth]),
    ]);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickCategoryModalOpen, setIsQuickCategoryModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [txType, setTxType] = useState<string>('EXPENSE');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [randomCategoryColor, setRandomCategoryColor] = useState('#3b82f6');
  const DEFAULT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

  // Strict guard for initial load to satisfy TypeScript narrowing
  if (!mounted || !accounts || !categories || !data) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-surface-500 animate-pulse">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-brand-500" />
        <p>Fetching transactions...</p>
      </div>
    );
  }

  // At this point, data, accounts, and categories are guaranteed to be defined
  const { transactions, total, totalPages } = data;

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
        refreshAppData();
      }
    });
  };

  // Form local state to dynamically adjust fields
  const editingTx = editingId ? transactions.find(t => t.id === editingId) : null;

  function openCreateModal() {
    setEditingId(null);
    setTxType('EXPENSE');
    setSelectedCategoryIds([]);
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(tx: PopulatedTransaction) {
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
    formData.delete('categoryIds'); // Remove any accidental ones
    selectedCategoryIds.forEach(id => formData.append('categoryIds', id));
    
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
        refreshAppData(); // use global refresh instead of just local mutate
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
        refreshAppData();
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
    const baseClass = "p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center";
    if (type === 'INCOME') return <div className={cn(baseClass, "nm-inset text-emerald-700")}><ArrowUpRight size={18} /></div>;
    if (type === 'EXPENSE') return <div className={cn(baseClass, "nm-inset text-rose-700")}><ArrowDownRight size={18} /></div>;
    return <div className={cn(baseClass, "nm-inset text-brand-700")}><RefreshCw size={18} /></div>;
  }

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div className="w-full lg:w-auto">
          <h2 className="text-3xl font-extrabold text-surface-800 tracking-tight font-plus">
            {accountId ? `${accounts.find(a => a.id === accountId)?.name}` : 'Transactions'}
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full lg:w-auto">
            <div className="relative flex-grow sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-surface-400" />
              <input
                type="text"
                placeholder="Search anything..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-background nm-inset-deep rounded-2xl text-sm font-bold text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500/10 transition-all font-plus placeholder:text-surface-300"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {isValidating && (
                <div className={`absolute ${searchTerm ? 'right-12' : 'right-4'} top-1/2 -translate-y-1/2`}>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand-500" />
                </div>
              )}
            </div>
          </div>
          {(accountId || categoryId || type || startDate || endDate) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {accountId && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full nm-inset text-brand-500 text-[10px] font-extrabold uppercase tracking-widest">
                  Account: {accounts.find(a => a.id === accountId)?.name}
                  <button onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('accountId');
                    router.push(`/transactions?${params.toString()}`);
                  }} className="hover:text-brand-700 transition-colors"><X size={12} strokeWidth={3} /></button>
                </span>
              )}
              {startDate && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full nm-inset text-brand-500 text-[10px] font-extrabold uppercase tracking-widest">
                  From: {formatDate(startDate)}
                  <button onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('startDate');
                    router.push(`/transactions?${params.toString()}`);
                  }} className="hover:text-brand-700 transition-colors"><X size={12} strokeWidth={3} /></button>
                </span>
              )}
              {endDate && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full nm-inset text-brand-500 text-[10px] font-extrabold uppercase tracking-widest">
                  To: {formatDate(endDate)}
                  <button onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('endDate');
                    router.push(`/transactions?${params.toString()}`);
                  }} className="hover:text-brand-700 transition-colors"><X size={12} strokeWidth={3} /></button>
                </span>
              )}
              <button 
                onClick={() => router.push('/transactions')}
                className="text-xs font-bold text-surface-400 hover:text-brand-500 underline decoration-2 underline-offset-4 ml-2 transition-colors uppercase tracking-widest text-[10px]"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full lg:w-auto">
          <div className="flex flex-1 items-center gap-3 nm-inset px-4 py-2.5 rounded-2xl w-full sm:w-auto overflow-x-auto">
            <Calendar size={14} className="text-surface-400 shrink-0" />
            <input 
              type="date" 
              className="bg-transparent border-none text-xs font-bold text-surface-800 focus:ring-0 p-0 w-24 uppercase"
              value={startStr || ''}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.value) params.set('startDate', e.target.value);
                else params.delete('startDate');
                router.push(`/transactions?${params.toString()}`);
              }}
            />
            <span className="text-surface-300 text-[10px] font-extrabold tracking-widest">TO</span>
            <input 
              type="date" 
              className="bg-transparent border-none text-xs font-bold text-surface-800 focus:ring-0 p-0 w-24 uppercase"
              value={endStr || ''}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.value) params.set('endDate', e.target.value);
                else params.delete('endDate');
                router.push(`/transactions?${params.toString()}`);
              }}
            />
          </div>
          <div className="hidden sm:block">
            <Select 
              className="w-40 text-xs h-11"
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
          </div>
          <Button onClick={openCreateModal} className="w-full sm:w-auto shadow-nm-outset" variant="primary" size="md">
            <Plus className="h-4 w-4 mr-2" strokeWidth={3} />
            Add New
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="sticky top-4 z-30 flex items-center justify-between px-6 py-4 bg-background nm-flat rounded-2xl animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4">
              <span className="text-sm font-extrabold text-brand-500 uppercase tracking-widest">{selectedIds.size} Selected</span>
              <button 
                onClick={() => setSelectedIds(new Set())}
                className="text-xs font-bold text-surface-400 hover:text-surface-600 underline"
              >
                Deselect All
              </button>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="text-rose-600 hover:text-rose-700"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Transaction List */}
        <div className={cn("grid grid-cols-1 gap-4 transition-all duration-500", isValidating ? "opacity-50" : "opacity-100")}>
          <div className="flex items-center justify-between px-4 mb-2">
            <div className="flex items-center gap-3">
              <input 
                 type="checkbox" 
                 className="rounded-lg nm-inset-deep border-none text-brand-500 focus:ring-brand-500/20 h-5 w-5 cursor-pointer"
                 checked={transactions.length > 0 && selectedIds.size === transactions.length}
                 onChange={toggleSelectAll}
              />
              <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest">Select All</span>
            </div>
            <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest">
              {transactions.length} of {total} Records
            </span>
          </div>

          {transactions.map((tx) => (
            <div 
              key={tx.id} 
              className={cn(
                "group relative flex items-center gap-4 p-5 rounded-[24px] transition-all duration-300 cursor-pointer overflow-hidden",
                selectedIds.has(tx.id) ? "nm-inset" : "nm-button hover:nm-button-hover"
              )}
              onClick={() => openEditModal(tx)}
            >
              <div 
                className="shrink-0" 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(tx.id);
                }}
              >
                <input 
                  type="checkbox" 
                  className="rounded-lg nm-inset-deep border-none text-brand-500 focus:ring-brand-500/20 h-6 w-6 cursor-pointer"
                  checked={selectedIds.has(tx.id)}
                  readOnly
                />
              </div>

              <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div className="shrink-0">
                    {renderTxIcon(tx.type)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-surface-800 tracking-tight text-base leading-tight group-hover:text-brand-500 transition-colors">
                      {tx.description}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest">{formatDate(tx.date)}</span>
                      <div className="h-1 w-1 rounded-full bg-surface-300" />
                      <span className="text-[10px] font-extrabold text-brand-500/70 uppercase tracking-widest">
                        {tx.type === 'EXPENSE' ? tx.sourceAccount?.name : tx.type === 'INCOME' ? tx.destinationAccount?.name : `${tx.sourceAccount?.name} → ${tx.destinationAccount?.name}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6">
                  <div className="flex flex-wrap gap-1.5 justify-end hidden sm:flex">
                    {tx.categories.map((catLink) => (
                      <span 
                         key={catLink.category.id}
                         className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-tight rounded-lg nm-inset"
                         style={{ color: catLink.category.color || '#6B7280' }}
                      >
                        {catLink.category.name}
                      </span>
                    ))}
                  </div>
                  
                  <div className="text-right">
                    <p className={cn(
                      "text-xl font-extrabold tracking-tight font-plus whitespace-nowrap",
                      tx.type === 'INCOME' ? 'text-emerald-700' : tx.type === 'EXPENSE' ? 'text-rose-700' : 'text-brand-700'
                    )}>
                      {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:flex">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEditModal(tx); }}
                      className="p-2 rounded-xl nm-button hover:text-brand-500 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); confirmDelete(tx.id); }}
                      className="p-2 rounded-xl nm-button hover:text-rose-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <div className="py-20 text-center nm-inset rounded-[32px]">
              <p className="text-surface-400 font-extrabold uppercase tracking-widest text-sm">No transactions found</p>
            </div>
          )}
        </div>

        {/* Pagination placeholder */}
        <div className="flex items-center justify-center pt-10">
          <div className="flex gap-4">
             {page > 1 && (
               <Button 
                 variant="secondary" 
                 size="sm" 
                 onClick={() => {
                   const params = new URLSearchParams(searchParams.toString());
                   params.set('page', (page - 1).toString());
                   router.push(`/transactions?${params.toString()}`);
                 }}
               >
                 Previous
               </Button>
             )}
             {totalPages > page && (
               <Button 
                 variant="secondary" 
                 size="sm"
                 onClick={() => {
                   const params = new URLSearchParams(searchParams.toString());
                   params.set('page', (page + 1).toString());
                   router.push(`/transactions?${params.toString()}`);
                 }}
               >
                 Next
               </Button>
             )}
          </div>
        </div>
      </div>

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
