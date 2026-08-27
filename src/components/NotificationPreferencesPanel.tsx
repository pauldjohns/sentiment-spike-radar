
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, Mail, Webhook, Settings } from 'lucide-react';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';

export const NotificationPreferencesPanel = () => {
  const { preferences, updatePreferences } = useRealTimeNotifications();
  const [webhookUrl, setWebhookUrl] = useState(preferences.webhookUrl || '');

  const handlePreferenceChange = (key: string, value: any) => {
    updatePreferences({ [key]: value });
  };

  const handleWebhookUrlSave = () => {
    updatePreferences({ webhookUrl });
  };

  return (
    <Card className="p-6 bg-slate-800 border-slate-600">
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="h-5 w-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Notification Preferences</h3>
      </div>

      <div className="space-y-6">
        {/* Push Notifications */}
        <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-green-400" />
            <div>
              <Label className="text-white font-medium">Browser Push Notifications</Label>
              <p className="text-sm text-slate-400">Real-time alerts in your browser</p>
            </div>
          </div>
          <Switch
            checked={preferences.enablePush}
            onCheckedChange={(checked) => handlePreferenceChange('enablePush', checked)}
          />
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-blue-400" />
            <div>
              <Label className="text-white font-medium">Email Notifications</Label>
              <p className="text-sm text-slate-400">Daily signal summaries via email</p>
            </div>
          </div>
          <Switch
            checked={preferences.enableEmail}
            onCheckedChange={(checked) => handlePreferenceChange('enableEmail', checked)}
          />
        </div>

        {/* Webhook Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <Webhook className="h-5 w-5 text-purple-400" />
              <div>
                <Label className="text-white font-medium">Webhook Integration</Label>
                <p className="text-sm text-slate-400">Send signals to external systems</p>
              </div>
            </div>
            <Switch
              checked={preferences.enableWebhook}
              onCheckedChange={(checked) => handlePreferenceChange('enableWebhook', checked)}
            />
          </div>
          
          {preferences.enableWebhook && (
            <div className="pl-4 space-y-2">
              <Label className="text-sm text-slate-400">Webhook URL</Label>
              <div className="flex space-x-2">
                <Input
                  type="url"
                  placeholder="https://your-webhook-endpoint.com/signals"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Button onClick={handleWebhookUrlSave} size="sm">
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Signal Filtering */}
        <div className="space-y-4 border-t border-slate-600 pt-4">
          <h4 className="text-white font-medium">Signal Filtering</h4>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">High Confidence Only</Label>
              <p className="text-sm text-slate-400">Only notify for high-confidence signals</p>
            </div>
            <Switch
              checked={preferences.highConfidenceOnly}
              onCheckedChange={(checked) => handlePreferenceChange('highConfidenceOnly', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Batch Notifications</Label>
              <p className="text-sm text-slate-400">Group signals into periodic summaries</p>
            </div>
            <Switch
              checked={preferences.batchingEnabled}
              onCheckedChange={(checked) => handlePreferenceChange('batchingEnabled', checked)}
            />
          </div>

          {preferences.batchingEnabled && (
            <div className="pl-4">
              <Label className="text-sm text-slate-400">Batch Interval (minutes)</Label>
              <Input
                type="number"
                min="5"
                max="120"
                value={preferences.batchingInterval}
                onChange={(e) => handlePreferenceChange('batchingInterval', parseInt(e.target.value))}
                className="bg-slate-700 border-slate-600 text-white w-24 mt-1"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
