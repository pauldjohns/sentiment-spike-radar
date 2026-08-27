
import React, { useState, useEffect } from 'react';
import { TrendingUp, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDataFreshness } from '@/contexts/DataFreshnessContext';

interface DashboardHeaderProps {
  isAnalyzing?: boolean; // Keep for backward compatibility but will be overridden
  activeSection?: string;
}

export const DashboardHeader = ({ activeSection }: DashboardHeaderProps) => {
  const isMobile = useIsMobile();
  const { isJobRunning } = useDataFreshness();
  const [debouncedAnalyzing, setDebouncedAnalyzing] = useState(false);

  // Debounce the analyzing status to prevent flickering
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isJobRunning) {
      // Immediately show analyzing state
      setDebouncedAnalyzing(true);
    } else {
      // Delay hiding the analyzing state by 500ms
      timeoutId = setTimeout(() => {
        setDebouncedAnalyzing(false);
      }, 500);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isJobRunning]);

  const getSectionTitle = (section: string) => {
    const titles = {
      overview: "Dashboard Overview",
      system: "System Status",
      processing: "Data Processing",
      analytics: "Analytics",
      alerts: "Alerts",
      moves: "10% Move Candidates",
      config: "Configuration"
    };
    return titles[section] || "Sentiment Spike Radar";
  };

  if (isMobile) {
    return (
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-gray-200 dark:bg-gray-900/80 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Sentiment Spike Radar</h1>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${debouncedAnalyzing ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className={`text-sm ${debouncedAnalyzing ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>
                {debouncedAnalyzing ? 'Active' : 'Idle'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between p-6 bg-white/80 backdrop-blur-md border-b border-gray-200 dark:bg-gray-900/80 dark:border-gray-700">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-300">
              {activeSection ? getSectionTitle(activeSection) : "Sentiment Spike Radar"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Real-time sentiment monitoring dashboard</p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className={`w-2 h-2 rounded-full ${debouncedAnalyzing ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
        <span className={`text-sm font-medium ${debouncedAnalyzing ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>
          {debouncedAnalyzing ? 'Analyzing...' : 'Idle'}
        </span>
      </div>
    </div>
  );
};
