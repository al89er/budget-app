import { getSettings } from '@/actions/setting';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
        <p className="text-surface-500">Manage your application preferences and data.</p>
      </div>

      <SettingsClient initialSettings={settings} />
    </div>
  );
}
