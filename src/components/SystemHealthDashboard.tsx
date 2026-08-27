
import React, { useEffect, useState } from 'react';
import { LiveReadinessPanel } from './LiveReadinessPanel';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, Zap, TrendingUp } from 'lucide-react';
import { validateSystemReadiness, SystemReadinessResult } from '@/utils/testIEXConnection';

export const SystemHealthDashboard = () => {
  const [checks, setChecks] = useState<{
    database: boolean;
    finnhub: boolean;
    stocktwits: boolean;
    edgeFunctions: boolean;
  } | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const result = await validateSystemReadiness();
        setChecks(result.checks);
      } catch {
        setChecks({
          database: false,
          finnhub: false,
          stocktwits: false,
          edgeFunctions: false,
        });
      }
    };
    loadStatus();
  }, []);

  const getStatusText = (value?: boolean) => {
    if (value === undefined) return 'Checking...';
    return value ? 'Online' : 'Offline';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">System Health Dashboard</h2>
          <p className="text-slate-400">Monitor system readiness for live market operation</p>
        </div>
        <Badge variant="outline" className="text-green-400 border-green-400">
          <Activity className="h-3 w-3 mr-1" />
          Monitoring Active
        </Badge>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-800 border-slate-600">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-blue-400" />
            <div>
              <div className="text-sm text-slate-400">Data Pipeline</div>
              <div
                className="font-semibold text-white"
                data-testid="status-dataPipeline"
              >
                {getStatusText(checks?.stocktwits)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-800 border-slate-600">
          <div className="flex items-center space-x-3">
            <Zap className="h-6 w-6 text-yellow-400" />
            <div>
              <div className="text-sm text-slate-400">Edge Functions</div>
              <div
                className="font-semibold text-white"
                data-testid="status-edgeFunctions"
              >
                {getStatusText(checks?.edgeFunctions)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-800 border-slate-600">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-6 w-6 text-green-400" />
            <div>
              <div className="text-sm text-slate-400">Signal Detection</div>
              <div
                className="font-semibold text-white"
                data-testid="status-signalDetection"
              >
                {getStatusText(checks?.database)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-800 border-slate-600">
          <div className="flex items-center space-x-3">
            <Activity className="h-6 w-6 text-purple-400" />
            <div>
              <div className="text-sm text-slate-400">Learning Loop</div>
              <div
                className="font-semibold text-white"
                data-testid="status-learningLoop"
              >
                {getStatusText(checks?.finnhub)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Live Readiness Check */}
      <LiveReadinessPanel />

      {/* System Architecture Overview */}
      <Card className="p-6 bg-slate-800 border-slate-600">
        <h3 className="text-lg font-semibold text-white mb-4">System Architecture</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <div className="p-4 bg-slate-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">📡 Data Ingestion</h4>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• StockTwits API Integration</li>
              <li>• Real-time Message Processing</li>
              <li>• Sentiment Analysis (FinALBERT)</li>
              <li>• Industry Ticker Filtering</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">🎯 Signal Detection</h4>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Z-Score Anomaly Detection</li>
              <li>• Sentiment Velocity Analysis</li>
              <li>• Volume Spike Detection</li>
              <li>• Pattern Recognition</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">💰 Price Enrichment</h4>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Finnhub API / yfinance fallback</li>
              <li>• Real-time Price Capture</li>
              <li>• Multi-timeframe Tracking</li>
              <li>• Success Rate Calculation</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">🧠 Evaluation System</h4>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Signal Success Evaluation</li>
              <li>• Confidence Score Assignment</li>
              <li>• Pattern Statistics</li>
              <li>• Performance Auditing</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">📚 Learning Loop</h4>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Training Data Collection</li>
              <li>• Pattern Analysis</li>
              <li>• Model Refinement</li>
              <li>• Performance Optimization</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">🖥️ User Interface</h4>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Real-time Signal Display</li>
              <li>• Performance Metrics</li>
              <li>• System Health Monitoring</li>
              <li>• Historical Analysis</li>
            </ul>
          </div>

        </div>
      </Card>
    </div>
  );
};
