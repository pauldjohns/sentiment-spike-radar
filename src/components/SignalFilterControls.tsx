
import React from 'react';
import { Filter } from 'lucide-react';

interface SignalFilterControlsProps {
  confidenceFilter: string;
  disparityFilter: string;
  onConfidenceFilterChange: (value: string) => void;
  onDisparityFilterChange: (value: string) => void;
}

export const SignalFilterControls = ({
  confidenceFilter,
  disparityFilter,
  onConfidenceFilterChange,
  onDisparityFilterChange
}: SignalFilterControlsProps) => {
  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4 text-slate-400" />
        <select 
          value={confidenceFilter}
          onChange={(e) => onConfidenceFilterChange(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
        >
          <option value="all">All Confidence</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      
      <select 
        value={disparityFilter}
        onChange={(e) => onDisparityFilterChange(e.target.value)}
        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
      >
        <option value="all">All Signals</option>
        <option value="disparity_only">Disparity Only</option>
        <option value="no_disparity">No Disparity</option>
      </select>
    </div>
  );
};
