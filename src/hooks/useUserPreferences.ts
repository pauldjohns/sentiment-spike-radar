import { useLocalStorage } from './useLocalStorage';

export interface UserPreferences {
  emailNotifications: boolean;
  realTimeAlerts: boolean;
  dashboardTheme: 'light' | 'dark';
}

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useLocalStorage<UserPreferences>('userPreferences', {
    emailNotifications: true,
    realTimeAlerts: true,
    dashboardTheme: 'dark'
  });

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return { preferences, updatePreference };
};

