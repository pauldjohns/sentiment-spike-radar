
import React from 'react';
import { Button } from '@/components/ui/button';
import { Filter, RotateCcw } from 'lucide-react';
import { ReplayEvaluationFilters } from '@/hooks/useReplayEvaluationStats';

interface ReplayAnalysisFiltersProps {
  filters: ReplayEvaluationFilters;
  onFiltersChange: (filters: ReplayEvaluationFilters) => void;
}

export const ReplayAnalysisFilters = ({ filters, onFiltersChange }: ReplayAnalysisFiltersProps) => {
  const updateFilter = (key: keyof ReplayEvaluationFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <Filter className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-400">Analysis Filters</span>
        {hasActiveFilters && (
          <Button
            onClick={clearFilters}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Replay Batch ID */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Replay Batch ID</label>
          <input
            type="text"
            value={filters.replay_batch_id || ''}
            onChange={(e) => updateFilter('replay_batch_id', e.target.value)}
            placeholder="Filter by batch..."
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Min Z-Score */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Min Z-Score</label>
          <input
            type="number"
            step="0.1"
            value={filters.min_z_score || ''}
            onChange={(e) => updateFilter('min_z_score', parseFloat(e.target.value))}
            placeholder="e.g., 2.0"
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Sentiment Type */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Sentiment Type</label>
          <select
            value={filters.sentiment_type || ''}
            onChange={(e) => updateFilter('sentiment_type', e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Sentiment Types</option>
            <option value="bullish">Bullish</option>
            <option value="bearish">Bearish</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>

        {/* Time Window */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Time Window</label>
          <select
            value={filters.time_window || ''}
            onChange={(e) => updateFilter('time_window', e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Time Windows</option>
            <option value="pre_market">Pre-Market</option>
            <option value="market_open">Market Open</option>
            <option value="plus_30_min">+30 Minutes</option>
            <option value="plus_1_hr">+1 Hour</option>
            <option value="market_hours">Market Hours</option>
          </select>
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Start Date</label>
          <input
            type="date"
            value={filters.date_range?.start || ''}
            onChange={(e) => updateFilter('date_range', {
              ...filters.date_range,
              start: e.target.value
            })}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">End Date</label>
          <input
            type="date"
            value={filters.date_range?.end || ''}
            onChange={(e) => updateFilter('date_range', {
              ...filters.date_range,
              end: e.target.value
            })}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};
