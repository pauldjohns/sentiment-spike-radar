
import React from 'react';
import { EnrichmentTestPanel } from '@/components/EnrichmentTestPanel';
import BacktestingPanel from '@/components/BacktestingPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EnrichmentTest = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Signal Intelligence & Backtesting</h1>
            <p className="text-slate-400 mt-1">
              Test enrichment pipeline and analyze historical signal performance
            </p>
          </div>
        </div>
        
        <Tabs defaultValue="enrichment" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger value="enrichment" className="text-white data-[state=active]:bg-slate-700">
              Signal Enrichment
            </TabsTrigger>
            <TabsTrigger value="backtesting" className="text-white data-[state=active]:bg-slate-700">
              Historical Backtesting
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="enrichment" className="space-y-6">
            <EnrichmentTestPanel />
          </TabsContent>
          
          <TabsContent value="backtesting" className="space-y-6">
            <BacktestingPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnrichmentTest;
