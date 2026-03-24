'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, Button, Modal, Input, Select } from '@/components/ui';
import { createAccount, updateAccount, setAccountActive } from '@/actions/account';
import { formatCurrency } from '@/lib/utils';
import { Wallet, Plus, Edit2, Archive, ArchiveRestore, RefreshCw, History, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';
import { Account } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import useSWR, { mutate } from 'swr';
import { getAccounts } from '@/actions/account';
import { getTransactions } from '@/actions/transaction';
import { useEffect } from 'react';

type AccountWithBalance = Account & { currentBalance: number };

export default function AccountsClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: accounts } = useSWR(mounted ? 'accounts' : null, () => getAccounts());
  
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
  const router = useRouter();

  if (!mounted || !accounts) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-surface-500 animate-pulse">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-brand-500" />
        <p>Updating account totals...</p>
      </div>
    );
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
        mutate('accounts');
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

  function renderTxIcon(type: string) {
    if (type === 'INCOME') return <div className="p-2 bg-green-100 text-green-600 rounded-lg"><ArrowUpRight size={18} /></div>;
    if (type === 'EXPENSE') return <div className="p-2 bg-red-100 text-red-600 rounded-lg"><ArrowDownRight size={18} /></div>;
    return <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><RefreshCw size={18} /></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-surface-900">Your Accounts</h2>
        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {accounts.map(account => (
          <Card key={account.id} className={!account.isActive ? 'opacity-60 bg-surface-50' : ''}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${account.isActive ? 'bg-brand-50 text-brand-600' : 'bg-surface-200 text-surface-500'}`}>
                    <Wallet size={24} />
                  </div>
                  <div 
                    className="cursor-pointer group flex-1"
                    onClick={() => setSelectedHistoryAccountId(account.id)}
                  >
                    <h3 className="font-semibold text-surface-900 group-hover:text-brand-600 transition-colors uppercase tracking-wider">{account.name}</h3>
                    <p className="text-sm text-surface-500">{account.type}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(account.id)} className="text-surface-400 hover:text-brand-600 transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => openToggleConfirm(account.id, account.isActive)} className="text-surface-400 hover:text-orange-600 transition-colors">
                    {account.isActive ? <Archive size={16} /> : <ArchiveRestore size={16} />}
                  </button>
                </div>
              </div>

              <div 
                className="mt-6 cursor-pointer group"
                onClick={() => setSelectedHistoryAccountId(account.id)}
              >
                <div className="flex justify-between items-end mb-1">
                  <p className="text-sm text-surface-500 uppercase tracking-widest font-semibold p-0">Current Balance</p>
                  <History size={14} className="text-surface-300 group-hover:text-brand-500 transition-all group-hover:scale-125" />
                </div>
                <p className={`text-xl md:text-2xl font-bold transition-all ${account.currentBalance < 0 ? 'text-red-500' : 'text-surface-900'} group-hover:text-brand-600`}>
                  {formatCurrency(account.currentBalance)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-full py-12 text-center text-surface-500 bg-white rounded-xl border border-surface-200 border-dashed">
            No accounts found. Create one to get started!
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
                  <p className={`font-bold ${tx.type === 'INCOME' ? 'text-green-600' : tx.type === 'EXPENSE' ? 'text-red-500' : 'text-blue-600'}`}>
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
