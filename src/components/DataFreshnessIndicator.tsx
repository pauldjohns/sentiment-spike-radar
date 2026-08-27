
import { Badge } from '@/components/ui/badge';
import { Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useDataFreshness } from '@/contexts/DataFreshnessContext';

interface DataFreshnessIndicatorProps {
  showLastUpdate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const DataFreshnessIndicator = ({ showLastUpdate = true, size = 'md' }: DataFreshnessIndicatorProps) => {
  const { lastIngestionRun, isJobRunning, dataFreshness } = useDataFreshness();

  const getFreshnessConfig = () => {
    switch (dataFreshness) {
      case 'fresh':
        return {
          variant: 'default' as const,
          color: 'bg-green-600',
          icon: Wifi,
          label: 'Live',
          description: 'Data is fresh (< 3 min)'
        };
      case 'moderate':
        return {
          variant: 'secondary' as const,
          color: 'bg-yellow-600',
          icon: Clock,
          label: 'Recent',
          description: 'Data is recent (< 8 min)'
        };
      case 'stale':
        return {
          variant: 'outline' as const,
          color: 'bg-red-600',
          icon: WifiOff,
          label: 'Stale',
          description: 'Data may be outdated (> 8 min)'
        };
    }
  };

  const config = getFreshnessConfig();
  const IconComponent = isJobRunning ? RefreshCw : config.icon;

  const formatLastUpdate = () => {
    if (!lastIngestionRun) return 'Never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastIngestionRun.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return lastIngestionRun.toLocaleTimeString();
  };

  const badgeSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs';
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3';

  return (
    <div className="flex items-center space-x-2">
      <Badge 
        variant={isJobRunning ? 'default' : config.variant} 
        className={`${badgeSize} ${isJobRunning ? 'bg-blue-600 animate-pulse' : config.color} text-white flex items-center`}
        title={config.description}
      >
        <IconComponent className={`${iconSize} mr-1 ${isJobRunning ? 'animate-spin' : ''}`} />
        {isJobRunning ? 'Updating...' : config.label}
      </Badge>
      
      {showLastUpdate && lastIngestionRun && (
        <span className="text-xs text-slate-400">
          {formatLastUpdate()}
        </span>
      )}
    </div>
  );
};
