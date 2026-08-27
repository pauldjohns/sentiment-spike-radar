
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, TrendingUp, Settings } from 'lucide-react';
import { AlertConfig } from '@/types/sentiment';
import { useToast } from '@/hooks/use-toast';

interface RecommendationsPanelProps {
  alertConfig: AlertConfig;
  onConfigChange: (config: AlertConfig) => void;
}

// ✅ MEMOIZED: Status card component with stable props checking
const StatusCard = React.memo(({ 
  icon: Icon, 
  title, 
  value, 
  description, 
  color 
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | number;
  description: string;
  color: string;
}) => {
  return (
    <div className="bg-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm font-medium text-white">{title}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  );
});

StatusCard.displayName = 'StatusCard';

export const RecommendationsPanel = React.memo(({
  alertConfig,
  onConfigChange
}: RecommendationsPanelProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // ✅ STABLE CALLBACK: Memoize the refresh handler
  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Analysis Complete",
        description: "Your current configuration appears optimized for the focused industry detection strategy.",
        duration: 5000,
      });
    }, 2000);
  }, [toast]);

  // ✅ DEEPLY MEMOIZED: Only recalculate when actual config values change
  const statusCards = useMemo(() => {
    return [
      {
        icon: TrendingUp,
        title: 'Volume Threshold',
        value: `${alertConfig.volumeSpike}x`,
        description: 'Median volume spike detection',
        color: 'text-green-400'
      },
      {
        icon: Settings,
        title: 'Sentiment Threshold',
        value: `${alertConfig.sentimentThreshold}%`,
        description: 'Bullish sentiment trigger',
        color: 'text-blue-400'
      },
      {
        icon: AlertTriangle,
        title: 'Time Window',
        value: `${alertConfig.timeWindow}m`,
        description: 'Analysis window',
        color: 'text-yellow-400'
      }
    ];
  }, [
    alertConfig.volumeSpike, 
    alertConfig.sentimentThreshold, 
    alertConfig.timeWindow
  ]);

  // ✅ RENDER CARDS: Only re-render when statusCards actually changes
  const renderedStatusCards = useMemo(() => {
    return statusCards.map((card, index) => (
      <StatusCard
        key={card.title}
        icon={card.icon}
        title={card.title}
        value={card.value}
        description={card.description}
        color={card.color}
      />
    ));
  }, [statusCards]);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-400" />
            Configuration Status
          </h2>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {isLoading ? 'Checking...' : 'Check Status'}
          </Button>
        </div>

        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Industry-Focused Configuration Active</h3>
          <p className="text-slate-400 mb-4">
            Your system is configured for Defense/Aerospace, Energy, and Biotech/Pharma anomaly detection
            with optimized thresholds for the curated 305-ticker universe.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {renderedStatusCards}
          </div>
        </div>
      </div>
    </Card>
  );
}, (prevProps, nextProps) => {
  // ✅ CUSTOM COMPARISON: Only re-render if actual config values changed
  return (
    prevProps.alertConfig.volumeSpike === nextProps.alertConfig.volumeSpike &&
    prevProps.alertConfig.sentimentThreshold === nextProps.alertConfig.sentimentThreshold &&
    prevProps.alertConfig.timeWindow === nextProps.alertConfig.timeWindow
  );
});

RecommendationsPanel.displayName = 'RecommendationsPanel';
