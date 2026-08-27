
import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { SignalTransparencyPanel } from '@/components/SignalTransparencyPanel';

const Signals = () => {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Signal Detection</h1>
          <p className="text-slate-400">Monitor and analyze real-time trading signals</p>
        </div>
        <SignalTransparencyPanel />
      </div>
    </DashboardLayout>
  );
};

export default Signals;
