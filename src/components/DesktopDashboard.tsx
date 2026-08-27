
import React from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataIngestionPanel } from './DataIngestionPanel';
import { ProcessingQueuePanel } from './ProcessingQueuePanel';
import { StorageStatusPanel } from './StorageStatusPanel';
import { ConfigPanel } from './ConfigPanel';
import { RecommendationsPanel } from './RecommendationsPanel';
import { SignalTransparencyPanel } from './SignalTransparencyPanel';
import { ErrorBoundary } from './ErrorBoundary';
import { QueryErrorBoundary } from './QueryErrorBoundary';
import { SentimentData, AlertConfig } from '@/types/sentiment';

interface DesktopDashboardProps {
  activeSection: string;
  sentimentData: Record<string, SentimentData>;
  alertConfig: AlertConfig;
  onConfigChange: (config: AlertConfig) => void;
  onRefresh: () => void;
}

export const DesktopDashboard = ({ 
  activeSection,
  sentimentData, 
  alertConfig, 
  onConfigChange,
  onRefresh
}: DesktopDashboardProps) => {
  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <ErrorBoundary><DataIngestionPanel /></ErrorBoundary>
              <ErrorBoundary><ProcessingQueuePanel /></ErrorBoundary>
              <ErrorBoundary><StorageStatusPanel /></ErrorBoundary>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-1 gap-8">
              <ErrorBoundary>
                <SignalTransparencyPanel />
              </ErrorBoundary>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ErrorBoundary><DataIngestionPanel /></ErrorBoundary>
          </div>
        );

      case 'processing':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ErrorBoundary><ProcessingQueuePanel /></ErrorBoundary>
            <ErrorBoundary><StorageStatusPanel /></ErrorBoundary>
          </div>
        );

      case 'signals':
        return (
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary>
              <SignalTransparencyPanel />
            </ErrorBoundary>
          </div>
        );

      case 'config':
        return (
          <div className="space-y-8 max-w-6xl mx-auto">
            <ErrorBoundary>
              <RecommendationsPanel 
                alertConfig={alertConfig}
                onConfigChange={onConfigChange}
              />
            </ErrorBoundary>
            <ErrorBoundary>
              <ConfigPanel 
                alertConfig={alertConfig}
                onConfigChange={onConfigChange}
              />
            </ErrorBoundary>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">Select a section from the sidebar</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-8 max-w-full overflow-hidden">
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      {renderSection()}
    </div>
  );
};
