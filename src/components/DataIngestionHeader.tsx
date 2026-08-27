import { Database } from 'lucide-react';
import { DataFreshnessIndicator } from './DataFreshnessIndicator';

export const DataIngestionHeader = () => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-600 rounded-lg">
          <Database className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Industry-Focused Detection</h3>
          <p className="text-sm text-slate-400">Defense/Aerospace • Energy & Renewables • Biotech/Pharma</p>
        </div>
      </div>
      <DataFreshnessIndicator size="sm" />
    </div>
  );
};
