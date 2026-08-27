
import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface QueryErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  title?: string;
}

const QueryErrorFallback: React.FC<QueryErrorFallbackProps> = ({ 
  error, 
  resetError, 
  title = "Failed to load data" 
}) => (
  <Card className="p-6 bg-yellow-900/20 border-yellow-500/50">
    <div className="flex items-center space-x-3 mb-4">
      <AlertCircle className="h-5 w-5 text-yellow-400" />
      <h3 className="text-lg font-semibold text-yellow-400">{title}</h3>
    </div>
    
    <div className="space-y-3">
      <p className="text-yellow-300 text-sm">
        Unable to fetch the latest data. This could be due to network issues or server maintenance.
      </p>
      
      {resetError && (
        <Button 
          onClick={resetError}
          variant="outline"
          size="sm"
          className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  </Card>
);

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
}

export const QueryErrorBoundary: React.FC<QueryErrorBoundaryProps> = ({ 
  children, 
  title 
}) => {
  return (
    <ErrorBoundary
      fallback={<QueryErrorFallback title={title} />}
      onError={(error, errorInfo) => {
        console.error('Query error boundary caught:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
