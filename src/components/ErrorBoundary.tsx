
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    console.error('🚨 ERROR BOUNDARY CAUGHT:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const crashDetails = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      component: this.props.componentName || 'Unknown',
      errorId: this.state.errorId
    };
    
    console.error('🚨 FULL CRASH DETAILS:', crashDetails);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Log to session storage for debugging
    try {
      const existingCrashes = JSON.parse(sessionStorage.getItem('app_crashes') || '[]');
      existingCrashes.push(crashDetails);
      sessionStorage.setItem('app_crashes', JSON.stringify(existingCrashes.slice(-10))); // Keep last 10 crashes
    } catch (e) {
      console.warn('Failed to log crash to session storage:', e);
    }
  }

  handleRetry = () => {
    console.log('🔄 RETRYING after error boundary catch');
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="p-6 bg-red-900/20 border-red-500/50 m-4">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            <h3 className="text-lg font-semibold text-red-400">
              Component Crash Detected {this.props.componentName && `in ${this.props.componentName}`}
            </h3>
          </div>
          
          <div className="space-y-3">
            <p className="text-red-300 text-sm">
              A component has crashed and been safely contained. Error ID: {this.state.errorId}
            </p>
            
            {this.state.error && (
              <details className="text-xs text-red-200 bg-red-900/30 p-3 rounded">
                <summary className="cursor-pointer mb-2 font-medium flex items-center">
                  <Bug className="h-3 w-3 mr-1" />
                  Error Details (Click to expand)
                </summary>
                <div className="space-y-2">
                  <div><strong>Message:</strong> {this.state.error.message}</div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="whitespace-pre-wrap text-xs mt-1 bg-red-950/50 p-2 rounded">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap text-xs mt-1 bg-red-950/50 p-2 rounded">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="border-red-500 text-red-400 hover:bg-red-500/10"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
