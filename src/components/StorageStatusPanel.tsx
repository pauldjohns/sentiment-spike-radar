import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HardDrive, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const StorageStatusPanel = () => {
  const [storageInfo, setStorageInfo] = useState<{
    currentSize: number;
    maxSize: number;
    usagePercent: number;
    status: 'safe' | 'warning' | 'critical';
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCleanup, setLastCleanup] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchStorageInfo = async () => {
    try {
      // Get actual database size using the RPC function
      const { data: dbSize, error: sizeError } = await supabase.rpc('get_db_size');
      
      if (sizeError) {
        console.error('Error getting database size:', sizeError);
        // Fallback to estimation if RPC fails
        const { data: messageCount } = await supabase
          .from('stocktwits_messages')
          .select('id', { count: 'exact', head: true });
        
        const { data: sentimentCount } = await supabase
          .from('ticker_sentiment')
          .select('id', { count: 'exact', head: true });
        
        // Rough estimate: each message ~1KB, each sentiment record ~0.5KB
        const messageCountNum = Number(messageCount || 0);
        const sentimentCountNum = Number(sentimentCount || 0);
        const estimatedSizeGB = (messageCountNum * 1 + sentimentCountNum * 0.5) / (1024 * 1024);
        const maxSize = 100; // 100GB limit
        const usagePercent = (estimatedSizeGB / maxSize) * 100;
        
        let status: 'safe' | 'warning' | 'critical' = 'safe';
        if (usagePercent > 95) status = 'critical';
        else if (usagePercent > 85) status = 'warning';
        
        setStorageInfo({
          currentSize: estimatedSizeGB,
          maxSize,
          usagePercent,
          status
        });
      } else {
        // Use actual database size
        const currentSizeGB = Number(dbSize) / (1024 * 1024 * 1024); // Convert bytes to GB
        const maxSize = 100; // 100GB limit
        const usagePercent = (currentSizeGB / maxSize) * 100;
        
        let status: 'safe' | 'warning' | 'critical' = 'safe';
        if (usagePercent > 95) status = 'critical';
        else if (usagePercent > 85) status = 'warning';
        
        setStorageInfo({
          currentSize: currentSizeGB,
          maxSize,
          usagePercent,
          status
        });
      }
    } catch (error) {
      console.error('Error fetching storage info:', error);
    }
  };

  const triggerCleanup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('storage-management');
      if (error) throw error;
      
      setLastCleanup(new Date());
      toast({
        title: "Storage Cleanup Complete",
        description: `${data?.spaceFreed || 'Space'} freed up successfully`,
      });
      
      // Refresh storage info
      fetchStorageInfo();
    } catch (error) {
      console.error('Cleanup error:', error);
      toast({
        title: "Cleanup Failed",
        description: "Failed to clean up storage. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageInfo();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStorageInfo, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!storageInfo) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'warning': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Card className="p-6 bg-slate-800 border-slate-600">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <HardDrive className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Storage Monitor</h3>
        </div>
        <Badge variant={getStatusBadge(storageInfo.status) as any}>
          {storageInfo.status.toUpperCase()}
        </Badge>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">Usage</span>
          <span className={getStatusColor(storageInfo.status)}>
            {storageInfo.currentSize.toFixed(1)} GB / {storageInfo.maxSize} GB
          </span>
        </div>
        
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              storageInfo.status === 'critical' ? 'bg-red-500' :
              storageInfo.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(storageInfo.usagePercent, 100)}%` }}
          />
        </div>
        
        <div className="text-xs text-slate-400">
          {storageInfo.usagePercent.toFixed(1)}% used
        </div>
        
        {storageInfo.status !== 'safe' && (
          <div className="flex items-start space-x-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs">
            <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-yellow-200">
              {storageInfo.status === 'critical' 
                ? 'Storage critically high! Automated cleanup will run soon.' 
                : 'Storage usage is elevated. Monitor closely.'}
            </div>
          </div>
        )}
        
        {lastCleanup && (
          <div className="flex items-center space-x-2 text-xs text-green-400">
            <CheckCircle className="h-3 w-3" />
            <span>Last cleanup: {lastCleanup.toLocaleTimeString()}</span>
          </div>
        )}
        
        <Button 
          onClick={triggerCleanup}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="w-full text-slate-300 border-slate-600 hover:bg-slate-700"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Cleaning...
            </>
          ) : (
            <>
              <HardDrive className="h-4 w-4 mr-2" />
              Manual Cleanup
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
