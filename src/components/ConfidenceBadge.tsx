
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface ConfidenceBadgeProps {
  score: number | null;
  source?: string | null;
  showDetails?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ 
  score, 
  source,
  showDetails = false 
}) => {
  if (score === null || score === undefined) {
    return (
      <Badge variant="secondary" className="text-xs">
        No Score
      </Badge>
    );
  }

  // Convert to percentage
  const percentage = Math.round(score * 100);
  
  // Determine badge variant based on confidence level
  const getVariant = (confidence: number) => {
    if (confidence >= 70) return 'default'; // High confidence - green
    if (confidence >= 50) return 'secondary'; // Medium confidence - neutral
    return 'outline'; // Low confidence - subtle
  };

  // Determine color classes for more nuanced styling
  const getColorClasses = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-600 text-white hover:bg-green-700';
    if (confidence >= 70) return 'bg-green-500 text-white hover:bg-green-600';
    if (confidence >= 60) return 'bg-blue-500 text-white hover:bg-blue-600';
    if (confidence >= 50) return 'bg-yellow-500 text-white hover:bg-yellow-600';
    if (confidence >= 30) return 'bg-orange-500 text-white hover:bg-orange-600';
    return 'bg-red-500 text-white hover:bg-red-600';
  };

  const variant = getVariant(percentage);
  const colorClasses = getColorClasses(percentage);

  return (
    <div className="flex items-center space-x-1">
      <Badge 
        variant={variant} 
        className={`text-xs font-medium ${colorClasses}`}
        title={showDetails && source ? `Source: ${source}` : undefined}
      >
        {percentage}% 
        {showDetails && (
          <span className="ml-1 text-xs opacity-75">
            CONF
          </span>
        )}
      </Badge>
      
      {showDetails && source && (
        <span className="text-xs text-slate-400 ml-1">
          ({source.includes('pattern_stats') ? 'Pattern' : 'Default'})
        </span>
      )}
    </div>
  );
};
