
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDataFreshness } from '@/contexts/DataFreshnessContext';
import { DataFreshnessIndicator } from '@/components/DataFreshnessIndicator';
import { DashboardHeader } from '@/components/DashboardHeader';
import { MobileDashboard } from '@/components/MobileDashboard';
import { DesktopDashboard } from '@/components/DesktopDashboard';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { AlertConfig } from '@/types/sentiment';
import { useSentimentDataManager } from '@/hooks/useSentimentDataManager';
import DashboardLayout from '@/components/DashboardLayout';

const Index = () => {
  const { user } = useAuth();
  const { lastIngestionRun } = useDataFreshness();
  const [isMobile, setIsMobile] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const [alertConfig, setAlertConfig] = useLocalStorage<AlertConfig>('alertConfig', {
    volumeSpike: 2.0,
    sentimentThreshold: 0.7,
    timeWindow: 300,
    enableNotifications: true,
    volumeZScoreThreshold: 3.0,
    sentimentShiftThreshold: 20,
    pumpRiskThreshold: 0.8,
    minUserDiversity: 5,
    enableTimeWeighting: true,
    enablePolarityDetection: true
  });

  const { sentimentData, updateData, isAnalyzing } = useSentimentDataManager();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  const handleRefresh = () => {
    updateData(true, Object.keys(sentimentData), () => {}, () => {});
  };

  if (!user) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto">
        <DashboardHeader
          activeSection={activeSection}
        />

        <DataFreshnessIndicator />

        {isMobile ? (
          <MobileDashboard
            sentimentData={sentimentData}
            alertConfig={alertConfig}
            onConfigChange={setAlertConfig}
            onRefresh={handleRefresh}
          />
        ) : (
          <DesktopDashboard
            activeSection={activeSection}
            sentimentData={sentimentData}
            alertConfig={alertConfig}
            onConfigChange={setAlertConfig}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
