import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';

interface TickerPriority {
  ticker: string;
  priority_score: number | null;
}

const Monitoring = () => {
  const [feedbackCount, setFeedbackCount] = useState<number>(0);
  const [tickerPriorities, setTickerPriorities] = useState<TickerPriority[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { count } = await supabase
        .from('signal_learning_log')
        .select('*', { count: 'exact', head: true });
      setFeedbackCount(count || 0);

      const { data } = await supabase
        .from('active_ticker_queue')
        .select('ticker, priority_score')
        .order('priority_score', { ascending: false })
        .limit(20);
      setTickerPriorities(data || []);
    };

    fetchData();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Monitoring Dashboard</h1>
          <p className="text-slate-400">Feedback counts and model adjustments</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Feedback Count</h2>
            <p className="text-3xl">{feedbackCount}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Ticker Priorities</h2>
            <ul>
              {tickerPriorities.map((t) => (
                <li key={t.ticker} className="flex justify-between py-1">
                  <span>{t.ticker}</span>
                  <span>{(t.priority_score ?? 0).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Monitoring;
