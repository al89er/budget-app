'use client';

import { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, Button, Modal, Input, Select } from '@/components/ui';
import { createAccount, updateAccount, setAccountActive } from '@/actions/account';
import { cn, formatCurrency } from '@/lib/utils';
import { 
  Wallet, 
  Plus, 
  Edit2, 
  Archive, 
  ArchiveRestore, 
  RefreshCw, 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  ExternalLink,
  CreditCard,
  Banknote,
  Smartphone,
  Trophy,
  MoreHorizontal
} from 'lucide-react';
import { Account } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import useSWR, { useSWRConfig } from 'swr';
import { getAccounts } from '@/actions/account';
import { getTransactions } from '@/actions/transaction';

type AccountWithBalance = Account & { currentBalance: number };

export default function AccountsClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: accounts, isValidating } = useSWR(mounted ? 'accounts' : null, () => getAccounts());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmToggleId, setConfirmToggleId] = useState<{ id: string, currentStatus: boolean } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedHistoryAccountId, setSelectedHistoryAccountId] = useState<string | null>(null);
  
  const { data: historyData, isLoading: historyLoading } = useSWR(
    selectedHistoryAccountId ? ['account-history', selectedHistoryAccountId] : null,
    ([, id]) => getTransactions(1, 10, { accountId: id })
  );

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { mutate } = useSWRConfig();
  const router = useRouter();

  if (!mounted || !accounts) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-surface-400 animate-pulse">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-brand-500" />
        <p className="font-extrabold uppercase tracking-widest text-xs">Fetching Account Totals...</p>
      </div>
    );
  }

  function getAccountIcon(type: string) {
    if (type === 'CREDIT_CARD') return <CreditCard size={24} />;
    if (type === 'CASH') return <Banknote size={24} />;
    if (type === 'EWALLET') return <Smartphone size={24} />;
    if (type === 'SAVINGS') return <Trophy size={24} />;
    return <Wallet size={24} />;
  }

  function renderTxIcon(type: string) {
    const baseClass = "p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center";
    if (type === 'INCOME') return <div className={cn(baseClass, "nm-inset text-emerald-700")}><ArrowUpRight size={18} /></div>;
    if (type === 'EXPENSE') return <div className={cn(baseClass, "nm-inset text-rose-700")}><ArrowDownRight size={18} /></div>;
    return <div className={cn(baseClass, "nm-inset text-brand-500")}><RefreshCw size={18} /></div>;
  }

  async function openCreateModal() {
    setEditingId(null);
    setError(null);
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
        ? await updateAccount(editingId, formData)
        : await createAccount(formData);

      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        await Promise.all([
          mutate('accounts'),
          mutate(['summary', 'this_month']),
        ]);
        setIsModalOpen(false);
        toast.success(editingId ? "Account updated successfully" : "Account created successfully");
      }
    });
  }

  function openToggleConfirm(id: string, currentStatus: boolean) {
    setConfirmToggleId({ id, currentStatus });
  }

  function handleToggleStatus() {
    if (!confirmToggleId) return;
    const { id, currentStatus } = confirmToggleId;
    
    startTransition(async () => {
      await setAccountActive(id, !currentStatus);
      mutate('accounts');
      toast.success(`Account ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      setConfirmToggleId(null);
    });
  }

  const editingAccount = editingId ? accounts.find(a => a.id === editingId) : null;
  const historyAccount = selectedHistoryAccountId ? accounts.find(a => a.id === selectedHistoryAccountId) : null;

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
        <div>
          <h2 className="text-3xl font-extrabold text-surface-800 tracking-tight font-plus">Your Accounts</h2>
          <p className="text-surface-400 text-sm font-bold uppercase tracking-widest mt-1">Manage your liquidity and balances</p>
        </div>
        <Button onClick={openCreateModal} className="w-full sm:w-auto shadow-nm-outset" variant="primary" size="md">
          <Plus className="h-4 w-4 mr-2" strokeWidth={3} />
          Create Account
        </Button>
      </div>

      <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 transition-all duration-500", isValidating ? "opacity-50" : "opacity-100")}>
        {accounts.map(account => (
          <div 
            key={account.id} 
            className={cn(
              "group p-8 rounded-[40px] transition-all duration-300 flex flex-col gap-8",
              account.isActive ? "nm-button hover:nm-button-hover cursor-pointer" : "nm-inset opacity-60"
            )}
            onClick={() => account.isActive && setSelectedHistoryAccountId(account.id)}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-5">
                <div className={cn(
                  "p-4 rounded-2xl transition-all duration-300 flex items-center justify-center",
                  account.isActive ? "nm-inset text-brand-500" : "nm-flat text-surface-400"
                )}>
                  {getAccountIcon(account.type)}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-surface-800 tracking-tight group-hover:text-brand-500 transition-colors">
                    {account.name}
                  </h3>
                  <p className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest mt-0.5">
                    {account.type.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); openEditModal(account.id); }} 
                  className="p-2.5 rounded-xl nm-button-sm text-surface-400 hover:text-brand-500 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); openToggleConfirm(account.id, account.isActive); }} 
                  className="p-2.5 rounded-xl nm-button-sm text-surface-400 hover:text-orange-500 transition-colors"
                >
                  {account.isActive ? <Archive size={16} /> : <ArchiveRestore size={16} />}
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest pl-1">
                  Balance
                </span>
                <History size={16} className="text-surface-300 group-hover:text-brand-500 transition-all group-hover:scale-110" />
              </div>
              <div className="nm-inset-deep py-6 px-7 rounded-[24px]">
                <p className={cn(
                  "text-3xl font-extrabold tracking-tighter font-plus transition-all",
                  account.currentBalance < 0 ? 'text-rose-700' : 'text-surface-700'
                )}>
                  {formatCurrency(account.currentBalance)}
                </p>
              </div>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-full py-24 text-center nm-inset rounded-[40px] flex flex-col items-center gap-4">
             <div className="p-8 rounded-full nm-inset text-surface-200">
               <Wallet size={64} strokeWidth={1} />
             </div>
             <div>
               <p className="text-surface-600 font-extrabold text-xl tracking-tight">No accounts found</p>
               <p className="text-surface-400 text-sm mt-1">Ready to start tracking? Add your first account above.</p>
             </div>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? 'Edit Account' : 'Add Account'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            name="name" 
            label="Account Name" 
            placeholder="e.g. Maybank Checking" 
            defaultValue={editingAccount?.name || ''} 
            required 
          />
          <Select 
            name="type" 
            label="Account Type" 
            defaultValue={editingAccount?.type || 'BANK'}
            options={[
              { value: 'BANK', label: 'Bank Account' },
              { value: 'CASH', label: 'Physical Cash' },
              { value: 'EWALLET', label: 'E-Wallet (TNG, Boost)' },
              { value: 'SAVINGS', label: 'Savings/Investment' },
              { value: 'CREDIT_CARD', label: 'Credit Card' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />
          <Input 
            name="openingBalance" 
            type="number" 
            step="0.01" 
            label="Opening Balance" 
            defaultValue={editingAccount?.openingBalance || 0} 
            required 
          />
          <Input 
            name="notes" 
            label="Notes (Optional)" 
            defaultValue={editingAccount?.notes || ''} 
          />
          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              name="isActive" 
              id="isActive" 
              defaultChecked={editingAccount ? editingAccount.isActive : true}
              className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isActive" className="text-sm text-surface-700">Account is active</label>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Account'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!confirmToggleId}
        onClose={() => setConfirmToggleId(null)}
        title={confirmToggleId?.currentStatus ? 'Confirm Deactivation' : 'Confirm Activation'}
      >
        <div className="space-y-4 pt-2">
          <p className="text-surface-600 text-sm">
            Are you sure you want to {confirmToggleId?.currentStatus ? 'deactivate' : 'activate'} this account?
          </p>
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirmToggleId(null)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleToggleStatus} disabled={isPending} className="bg-orange-600 hover:bg-orange-700 text-white">
              {isPending ? 'Saving...' : (confirmToggleId?.currentStatus ? 'Deactivate' : 'Activate')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Account History Modal */}
      <Modal
        isOpen={!!selectedHistoryAccountId}
        onClose={() => setSelectedHistoryAccountId(null)}
        title={historyAccount ? `${historyAccount.name} History` : 'Account History'}
      >
        <div className="space-y-4">
          {historyLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-surface-400">
              <RefreshCw className="h-8 w-8 animate-spin mb-2 text-brand-500" />
              <p className="text-sm">Loading transactions...</p>
            </div>
          ) : historyData?.transactions.length === 0 ? (
            <div className="py-12 text-center text-surface-500">
              No transactions found for this account.
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {historyData?.transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-xl border border-surface-100 group hover:border-brand-200 transition-all">
                  <div className="flex items-center gap-3">
                    {renderTxIcon(tx.type)}
                    <div>
                      <p className="font-semibold text-surface-900 group-hover:text-brand-600 transition-colors">{tx.description}</p>
                      <p className="text-[10px] text-surface-400 uppercase tracking-widest font-bold">
                        {new Date(tx.date).toLocaleDateString()} • {tx.category?.name || 'Uncategorized'}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold ${tx.type === 'INCOME' ? 'text-emerald-700' : tx.type === 'EXPENSE' ? 'text-rose-700' : 'text-brand-700'}`}>
                    {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                    {formatCurrency(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-surface-100 flex justify-between items-center">
            <Button variant="ghost" onClick={() => setSelectedHistoryAccountId(null)}>Close</Button>
            <Button 
              variant="outline" 
              className="group"
              onClick={() => {
                router.push(`/transactions?accountId=${selectedHistoryAccountId}`);
              }}
            >
              Full Transactions
              <ExternalLink size={14} className="ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
