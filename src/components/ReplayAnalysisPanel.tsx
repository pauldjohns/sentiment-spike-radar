
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Download, Filter, Target, Clock } from 'lucide-react';
import { useReplayEvaluationStats, ReplayEvaluationFilters } from '@/hooks/useReplayEvaluationStats';
import { ReplayAnalysisFilters } from './ReplayAnalysisFilters';
import { toast } from '@/hooks/use-toast';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const ReplayAnalysisPanel = () => {
  const { stats, isLoading, error, fetchStats, exportResults, clearError } = useReplayEvaluationStats();
  const [filters, setFilters] = useState<ReplayEvaluationFilters>({});
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchStats(filters);
  }, [fetchStats, filters]);

  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    setIsExporting(true);
    try {
      const result = await exportResults(filters, format);
      
      if (format === 'csv') {
        // For CSV, create a download
        const blob = new Blob([result], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `replay-analysis-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export Successful",
          description: `Downloaded ${format.toUpperCase()} file with replay analysis data.`,
        });
      } else {
        // For JSON, show success message
        toast({
          title: "Export Successful", 
          description: `Exported ${result.count} replay signals to ${format.toUpperCase()}.`,
        });
      }
    } catch (err) {
      toast({
        title: "Export Failed",
        description: err instanceof Error ? err.message : 'Failed to export replay data',
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (error) {
    return (
      <Card className="p-6 bg-slate-800 border-slate-600">
        <div className="text-center">
          <div className="text-red-400 mb-2">❌ Failed to load replay analysis</div>
          <div className="text-slate-400 text-sm mb-4">{error}</div>
          <Button onClick={() => { clearError(); fetchStats(filters); }} variant="outline">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-slate-800 border-slate-600">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Replay Signal Analysis</h3>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => handleExport('csv')}
              disabled={isExporting || !stats}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() => handleExport('json')}
              disabled={isExporting || !stats}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        <ReplayAnalysisFilters
          filters={filters}
          onFiltersChange={setFilters}
        />
      </Card>

      {isLoading ? (
        <Card className="p-6 bg-slate-800 border-slate-600">
          <div className="text-center py-8 text-slate-400">Loading replay analysis...</div>
        </Card>
      ) : !stats ? (
        <Card className="p-6 bg-slate-800 border-slate-600">
          <div className="text-center py-8 text-slate-400">No data available</div>
        </Card>
      ) : (
        <>
          {/* Overview Stats */}
          <Card className="p-6 bg-slate-800 border-slate-600">
            <h4 className="text-lg font-semibold text-white mb-4">Overview Statistics</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{stats.totalSignals}</div>
                <div className="text-sm text-slate-400">Total Signals</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">{stats.successRates.eod.toFixed(1)}%</div>
                <div className="text-sm text-slate-400">EOD Success Rate</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">{stats.avgChanges.eod.toFixed(2)}%</div>
                <div className="text-sm text-slate-400">Avg EOD Change</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-400">{stats.tickerPerformance.length}</div>
                <div className="text-sm text-slate-400">Tickers Analyzed</div>
              </div>
            </div>

            {/* Success Rates by Time Window */}
            <div className="mb-6">
              <h5 className="text-md font-semibold text-white mb-3">Success Rates by Time Window</h5>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-orange-400">{stats.successRates['1h'].toFixed(1)}%</div>
                  <div className="text-sm text-slate-400">1 Hour</div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-blue-400">{stats.successRates['3h'].toFixed(1)}%</div>
                  <div className="text-sm text-slate-400">3 Hours</div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-400">{stats.successRates.eod.toFixed(1)}%</div>
                  <div className="text-sm text-slate-400">End of Day</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Ticker Performance */}
          <Card className="p-6 bg-slate-800 border-slate-600">
            <h4 className="text-lg font-semibold text-white mb-4">Top Performing Tickers</h4>
            
            <div className="space-y-3 mb-6">
              {stats.tickerPerformance.slice(0, 10).map((ticker, index) => (
                <div key={ticker.ticker} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg font-bold text-white">{index + 1}</div>
                    <div>
                      <div className="font-semibold text-white">{ticker.ticker}</div>
                      <div className="text-sm text-slate-400">{ticker.totalSignals} signals</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-400">{ticker.successRate.toFixed(1)}%</div>
                    <div className="text-sm text-slate-400">Avg: {ticker.avgChange.toFixed(2)}%</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ticker Performance Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.tickerPerformance.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="ticker" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="successRate" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Time Window Performance */}
          <Card className="p-6 bg-slate-800 border-slate-600">
            <h4 className="text-lg font-semibold text-white mb-4">Performance by Time Window</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.timeWindowPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="timeWindow" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '6px'
                      }}
                    />
                    <Bar dataKey="successRate" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.timeWindowPerformance}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ timeWindow, totalSignals }) => `${timeWindow}: ${totalSignals}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalSignals"
                    >
                      {stats.timeWindowPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Sentiment Type Performance */}
          <Card className="p-6 bg-slate-800 border-slate-600">
            <h4 className="text-lg font-semibold text-white mb-4">Performance by Sentiment Type</h4>
            
            <div className="space-y-3">
              {stats.sentimentTypePerformance.map((sentiment, index) => (
                <div key={sentiment.sentimentType} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-slate-300">
                      {sentiment.sentimentType}
                    </Badge>
                    <div className="text-sm text-slate-400">{sentiment.totalSignals} signals</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-400">{sentiment.successRate.toFixed(1)}%</div>
                    <div className="text-sm text-slate-400">Avg: {sentiment.avgChange.toFixed(2)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
