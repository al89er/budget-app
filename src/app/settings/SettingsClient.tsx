'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, Button, Select } from '@/components/ui';
import { updateSetting } from '@/actions/setting';
import { exportTransactionsToCSV } from '@/actions/export';
import { Save, Download, Settings as SettingsIcon, Database } from 'lucide-react';
import { toast } from 'sonner';

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
              <SettingsIcon size={24} />
            </div>
            <h2 className="text-xl font-semibold text-surface-900">General Preferences</h2>
          </div>

          <div className="space-y-6">
            <Select
              name="defaultCurrency"
              label="Default Currency"
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

            <Select
              name="theme"
              label="Theme Preference"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              options={[
                { value: 'light', label: 'Light Mode' },
                { value: 'dark', label: 'Dark Mode (Coming Soon)' },
                { value: 'system', label: 'System Default' },
              ]}
            />

            <Button onClick={handleSavePreferences} disabled={isPending} className="w-full sm:w-auto">
              {isPending ? 'Saving...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <Database size={24} />
            </div>
            <h2 className="text-xl font-semibold text-surface-900">Data Management</h2>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm text-surface-600 mb-4">
                Export all your transactions to a CSV file. This includes all accounts, categories, amounts, and notes. Perfect for backing up your data or analyzing it in Excel.
              </p>
              <Button 
                onClick={handleExport} 
                disabled={isExporting} 
                variant="outline" 
                className="w-full sm:w-auto border-surface-300 text-surface-700 hover:bg-surface-50"
              >
                {isExporting ? 'Generating CSV...' : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export Transactions to CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
