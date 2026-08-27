
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface SignalDetail {
  id: string;
  ticker: string;
  signalType: string;
  confidence: 'high' | 'medium' | 'low';
  timestamp: Date;
  volumeRatio: number;
  sentimentChange: string;
  messageCount: number;
  userCount: number;
  rationale: string;
  disparityDetected?: boolean;
  anomalyScore?: number;
  timeWindow?: string;
}

interface GroupedSignals {
  [key: string]: SignalDetail[];
}

interface CSVDownloadButtonProps {
  groupedSignals: GroupedSignals;
}

export const CSVDownloadButton = ({ groupedSignals }: CSVDownloadButtonProps) => {
  const exportSignals = () => {
    const allSignals = Object.values(groupedSignals).flat();
    const csvData = allSignals.map(signal => ({
      timestamp: signal.timestamp.toISOString(),
      ticker: signal.ticker,
      signal_type: signal.signalType,
      confidence: signal.confidence,
      time_window: signal.timeWindow,
      volume_ratio: signal.volumeRatio,
      sentiment_change: signal.sentimentChange,
      message_count: signal.messageCount,
      user_count: signal.userCount,
      rationale: signal.rationale,
      disparity_detected: signal.disparityDetected,
      anomaly_score: signal.anomalyScore
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_signal_predictions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={exportSignals} variant="outline" size="sm" className="text-slate-300">
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
};
