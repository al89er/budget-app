'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, Button, Select } from '@/components/ui';
import { updateSetting } from '@/actions/setting';
import { exportTransactionsToCSV } from '@/actions/export';
import { Save, Download, Settings as SettingsIcon, Database, Globe, Palette, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SettingsClient({ initialSettings }: { initialSettings: Record<string, string> }) {
  const [currency, setCurrency] = useState(initialSettings?.defaultCurrency || 'USD');
  const [theme, setTheme] = useState(initialSettings?.theme || 'light');
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  function handleSavePreferences() {
    startTransition(async () => {
      // Save currency
      const res1 = await updateSetting('defaultCurrency', currency);
      // Save theme
      const res2 = await updateSetting('theme', theme);

      if (res1.error || res2.error) {
        toast.error('Failed to save some preferences');
      } else {
        toast.success('Preferences saved successfully!');
      }
    });
  }

  async function handleExport() {
    setIsExporting(true);
    const res = await exportTransactionsToCSV();
    setIsExporting(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    if (res.data) {
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `budget_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Data exported successfully!');
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-12">
      <div className="nm-button p-8 rounded-[40px] flex flex-col gap-8 h-full">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl nm-inset text-brand-500">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-surface-800 tracking-tight font-plus">General</h2>
            <p className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest mt-1">App preferences & styling</p>
          </div>
        </div>

        <div className="space-y-8 flex-1">
          <div className="space-y-4">
             <div className="flex items-center gap-2 mb-2 pl-1">
               <Globe size={14} className="text-surface-400" />
               <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest">Localization</span>
             </div>
             <Select
               name="defaultCurrency"
               value={currency}
               onChange={(e) => setCurrency(e.target.value)}
               options={[
                 { value: 'USD', label: 'US Dollar ($)' },
                 { value: 'EUR', label: 'Euro (€)' },
                 { value: 'GBP', label: 'British Pound (£)' },
                 { value: 'MYR', label: 'Malaysian Ringgit (RM)' },
                 { value: 'SGD', label: 'Singapore Dollar (S$)' },
                 { value: 'AUD', label: 'Australian Dollar (A$)' },
                 { value: 'CAD', label: 'Canadian Dollar (C$)' },
               ]}
             />
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-2 mb-2 pl-1">
               <Palette size={14} className="text-surface-400" />
               <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest">Interface Theme</span>
             </div>
             <Select
               name="theme"
               value={theme}
               onChange={(e) => setTheme(e.target.value)}
               options={[
                 { value: 'light', label: 'Light Mode (Neumorphic)' },
                 { value: 'dark', label: 'Dark Mode (Coming Soon)' },
                 { value: 'system', label: 'System Default' },
               ]}
             />
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={handleSavePreferences} disabled={isPending} className="w-full shadow-nm-outset" size="md">
            {isPending ? 'Saving...' : (
              <>
                <Save className="w-4 h-4 mr-3" strokeWidth={3} />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="nm-button p-8 rounded-[40px] flex flex-col gap-8 h-full">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl nm-inset text-emerald-600/90">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-surface-800 tracking-tight font-plus">Data Management</h2>
            <p className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest mt-1">Export & Backup</p>
          </div>
        </div>

        <div className="space-y-8 flex-1">
          <div className="nm-inset-deep rounded-3xl p-6">
            <p className="text-xs text-surface-500 font-bold leading-relaxed italic">
              <span className="text-brand-500 font-extrabold uppercase tracking-widest block mb-1">Information</span>
              Export all your transactions to a CSV file. This includes all accounts, categories, amounts, and notes. Perfect for backing up your data or analyzing it in external tools.
            </p>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleExport} 
            disabled={isExporting} 
            variant="outline" 
            className="w-full shadow-nm-inset-sm hover:nm-button-hover"
            size="md"
          >
            {isExporting ? 'Generating CSV...' : (
              <>
                <Download className="w-4 h-4 mr-3" strokeWidth={3} />
                Export to CSV
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
