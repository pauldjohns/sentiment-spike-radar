
import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { User, Settings, Bell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useUserPreferences } from '@/hooks/useUserPreferences';

const Profile = () => {
  const { user } = useAuth();
  const { preferences, updatePreference } = useUserPreferences();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">User Profile</h1>
          <p className="text-slate-400">Manage your account settings and preferences</p>
        </div>
        
        {!user ? (
          <Card className="p-6 bg-slate-800 border-slate-600">
            <div className="text-center text-slate-400">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Please sign in to view your profile</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 bg-slate-800 border-slate-600">
              <div className="flex items-center space-x-3 mb-4">
                <User className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Account Information</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400">Email</label>
                  <p className="text-white">{user?.email || 'Not available'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">User ID</label>
                  <p className="text-white font-mono text-sm">{user?.id || 'Not available'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Account Created</label>
                  <p className="text-white">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Not available'}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-slate-800 border-slate-600">
              <div className="flex items-center space-x-3 mb-4">
                <Settings className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Preferences</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Email Notifications</span>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Real-time Alerts</span>
                  <Switch
                    checked={preferences.realTimeAlerts}
                    onCheckedChange={(checked) => updatePreference('realTimeAlerts', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Dashboard Theme</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white capitalize">{preferences.dashboardTheme}</span>
                    <Switch
                      checked={preferences.dashboardTheme === 'dark'}
                      onCheckedChange={(checked) =>
                        updatePreference('dashboardTheme', checked ? 'dark' : 'light')
                      }
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-slate-800 border-slate-600 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <Bell className="h-5 w-5 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
              </div>
              <div className="space-y-2">
                <p className="text-slate-400">No recent activity to display</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Profile;
