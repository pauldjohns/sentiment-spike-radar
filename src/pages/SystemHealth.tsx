
import React from 'react';
import { SystemHealthDashboard } from '@/components/SystemHealthDashboard';
import { TestIngestionButton } from '@/components/TestIngestionButton';
import { MaintenancePanel } from '@/components/MaintenancePanel';
import { SignalHealthMonitor } from '@/components/SignalHealthMonitor';
import DashboardLayout from '@/components/DashboardLayout';

const SystemHealth = () => {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">System Health</h1>
            <p className="text-slate-400">Monitor system performance and signal generation quality</p>
          </div>
          <SignalHealthMonitor />
          <TestIngestionButton />
          <MaintenancePanel />
          <SystemHealthDashboard />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SystemHealth;
