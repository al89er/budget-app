'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, Button, Modal, Input, Select } from '@/components/ui';
import { createAccount, updateAccount, setAccountActive } from '@/actions/account';
import { formatCurrency } from '@/lib/utils';
import { Wallet, Plus, Edit2, Archive, ArchiveRestore } from 'lucide-react';
import { Account } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type AccountWithBalance = Account & { currentBalance: number };

export default function AccountsClient({ initialAccounts }: { initialAccounts: AccountWithBalance[] }) {
  const accounts = initialAccounts;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmToggleId, setConfirmToggleId] = useState<{ id: string, currentStatus: boolean } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
        setIsModalOpen(false);
        toast.success(editingId ? "Account updated successfully" : "Account created successfully");
        router.refresh();
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
      toast.success(`Account ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      setConfirmToggleId(null);
      router.refresh();
    });
  }

  const editingAccount = editingId ? accounts.find(a => a.id === editingId) : null;

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={openCreateModal}>
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
                  <div>
                    <h3 className="font-semibold text-surface-900">{account.name}</h3>
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

              <div className="mt-6">
                <p className="text-sm text-surface-500 mb-1">Current Balance</p>
                <p className={`text-2xl font-bold ${account.currentBalance < 0 ? 'text-red-600' : 'text-surface-900'}`}>
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
    </div>
  );
}
