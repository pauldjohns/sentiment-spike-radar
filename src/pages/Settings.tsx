
import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { ConfigPanel } from '@/components/ConfigPanel';
import { RecommendationsPanel } from '@/components/RecommendationsPanel';
import { NotificationPreferencesPanel } from '@/components/NotificationPreferencesPanel';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { AlertConfig } from '@/types/sentiment';

const Settings = () => {
  const [alertConfig, setAlertConfig] = useLocalStorage<AlertConfig>('alertConfig', {
    volumeSpike: 2.0,
    sentimentThreshold: 0.7,
    timeWindow: 300,
    enableNotifications: true,
    volumeZScoreThreshold: 3.0,
    sentimentShiftThreshold: 20,
    pumpRiskThreshold: 0.8,
    minUserDiversity: 5,
    enableTimeWeighting: true,
    enablePolarityDetection: true
  });

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">System Settings</h1>
          <p className="text-slate-400">Configure alert thresholds and detection parameters</p>
        </div>
        <div className="space-y-8">
          <RecommendationsPanel
            alertConfig={alertConfig}
            onConfigChange={setAlertConfig}
          />
          <ConfigPanel
            alertConfig={alertConfig}
            onConfigChange={setAlertConfig}
          />
          <NotificationPreferencesPanel />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
