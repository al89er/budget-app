import { getSettings } from '@/actions/setting';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      {/* Header handled by SettingsClient */}

      <SettingsClient initialSettings={settings} />
    </div>
  );
}
