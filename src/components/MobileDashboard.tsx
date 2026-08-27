
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DataIngestionPanel } from './DataIngestionPanel';
import { ProcessingQueuePanel } from './ProcessingQueuePanel';
import { StorageStatusPanel } from './StorageStatusPanel';
import { ConfigPanel } from './ConfigPanel';
import { RecommendationsPanel } from './RecommendationsPanel';
import { SignalTransparencyPanel } from './SignalTransparencyPanel';
import { SentimentData, AlertConfig } from '@/types/sentiment';
import { Database, TrendingUp, Settings, RefreshCw } from 'lucide-react';

interface MobileDashboardProps {
  sentimentData: Record<string, SentimentData>;
  alertConfig: AlertConfig;
  onConfigChange: (config: AlertConfig) => void;
  onRefresh: () => void;
}

export const MobileDashboard = ({ 
  sentimentData, 
  alertConfig, 
  onConfigChange, 
  onRefresh
}: MobileDashboardProps) => {
  return (
    <div className="px-4 py-6">
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      <Tabs defaultValue="processing" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-gray-800 mb-6 rounded-xl border border-gray-200 dark:border-gray-700 p-1">
          <TabsTrigger
            value="processing"
            className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg"
          >
            <Database className="h-4 w-4 mb-1" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
          <TabsTrigger 
            value="signals"
            className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg"
          >
            <TrendingUp className="h-4 w-4 mb-1" />
            <span className="hidden sm:inline">Signals</span>
          </TabsTrigger>
          <TabsTrigger 
            value="config"
            className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg"
          >
            <Settings className="h-4 w-4 mb-1" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="processing" className="space-y-4">
          <DataIngestionPanel />
          <ProcessingQueuePanel />
          <StorageStatusPanel />
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <SignalTransparencyPanel />
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <ConfigPanel 
            alertConfig={alertConfig}
            onConfigChange={onConfigChange}
          />
          <RecommendationsPanel 
            alertConfig={alertConfig}
            onConfigChange={onConfigChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
