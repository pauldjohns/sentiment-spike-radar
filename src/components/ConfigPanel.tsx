
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { AlertConfig } from '@/types/sentiment';

interface ConfigPanelProps {
  alertConfig: AlertConfig;
  onConfigChange: (config: AlertConfig) => void;
}

export const ConfigPanel = ({
  alertConfig,
  onConfigChange: setAlertConfig
}: ConfigPanelProps) => {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">10% Move Prediction Configuration</h2>
        </div>

        <div className="space-y-6">
          {/* Enhanced Alert Configuration for 10% Moves */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Early Signal Detection (Optimized for 10% Moves)</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-slate-300">Volume Z-Score Threshold</Label>
                  <span className="text-white font-semibold">{alertConfig.volumeZScoreThreshold?.toFixed(1) || '1.5'}</span>
                </div>
                <Slider
                  value={[alertConfig.volumeZScoreThreshold || 1.5]}
                  onValueChange={([value]) => setAlertConfig({ ...alertConfig, volumeZScoreThreshold: value })}
                  min={1.0}
                  max={3.0}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  ⚡ Lowered to 1.5σ for earlier 10% move detection (vs 2.0σ standard)
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-slate-300">Sentiment Shift Threshold</Label>
                  <span className="text-white font-semibold">{alertConfig.sentimentShiftThreshold || 15}%</span>
                </div>
                <Slider
                  value={[alertConfig.sentimentShiftThreshold || 15]}
                  onValueChange={([value]) => setAlertConfig({ ...alertConfig, sentimentShiftThreshold: value })}
                  min={10}
                  max={35}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  ⚡ Reduced to 15% for catching early momentum shifts leading to 10% moves
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-slate-300">High Sentiment Threshold</Label>
                  <span className="text-white font-semibold">{alertConfig.sentimentThreshold || 55}%</span>
                </div>
                <Slider
                  value={[alertConfig.sentimentThreshold || 55]}
                  onValueChange={([value]) => setAlertConfig({ ...alertConfig, sentimentThreshold: value })}
                  min={45}
                  max={75}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  ⚡ Lowered to 55% to catch early bullish consensus before major moves
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-slate-300">Pump Risk Threshold</Label>
                  <span className="text-white font-semibold">{alertConfig.pumpRiskThreshold || 45}%</span>
                </div>
                <Slider
                  value={[alertConfig.pumpRiskThreshold || 45]}
                  onValueChange={([value]) => setAlertConfig({ ...alertConfig, pumpRiskThreshold: value })}
                  min={30}
                  max={80}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  ⚡ Lowered to 45% to include legitimate breakouts that may appear coordinated
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-slate-300">Min User Diversity</Label>
                  <span className="text-white font-semibold">{alertConfig.minUserDiversity || 3}</span>
                </div>
                <Slider
                  value={[alertConfig.minUserDiversity || 3]}
                  onValueChange={([value]) => setAlertConfig({ ...alertConfig, minUserDiversity: value })}
                  min={2}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  ⚡ Reduced to 3 users minimum for faster signal detection
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-slate-300">Time Window</Label>
                  <span className="text-white font-semibold">{alertConfig.timeWindow} minutes</span>
                </div>
                <Slider
                  value={[alertConfig.timeWindow]}
                  onValueChange={([value]) => setAlertConfig({ ...alertConfig, timeWindow: value })}
                  min={5}
                  max={30}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  ⚡ Shorter windows for real-time 10% move prediction
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                  <div>
                    <Label className="text-slate-300">Pre-Market Weighting (4-9:30 AM ET)</Label>
                    <p className="text-xs text-slate-400">Give 2x weight to early morning sentiment for day move prediction</p>
                  </div>
                  <Switch
                    checked={alertConfig.enableTimeWeighting || true}
                    onCheckedChange={(enabled) => setAlertConfig({ ...alertConfig, enableTimeWeighting: enabled })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                  <div>
                    <Label className="text-slate-300">Early Momentum Detection</Label>
                    <p className="text-xs text-slate-400">Detect early shifts from neutral to bullish for 10% predictions</p>
                  </div>
                  <Switch
                    checked={alertConfig.enablePolarityDetection || true}
                    onCheckedChange={(enabled) => setAlertConfig({ ...alertConfig, enablePolarityDetection: enabled })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                  <div>
                    <Label className="text-slate-300">10% Move Notifications</Label>
                    <p className="text-xs text-slate-400">High-priority alerts for stocks with 10% move potential</p>
                  </div>
                  <Switch
                    checked={alertConfig.enableNotifications}
                    onCheckedChange={(enabled) => setAlertConfig({ ...alertConfig, enableNotifications: enabled })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-900/20 rounded-lg border border-green-500/30">
          <h4 className="text-green-300 font-semibold mb-2">10% Move Optimization Active</h4>
          <div className="text-xs text-green-200 space-y-1">
            <p>• Volume threshold lowered to 1.5σ for earlier detection</p>
            <p>• Sentiment shift threshold reduced to 15% for momentum capture</p>
            <p>• Pre-market activity weighted 2x higher for day predictions</p>
            <p>• Minimum user diversity lowered for faster signals</p>
            <p>• Enhanced tracking for stocks achieving 10%+ intraday moves</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
