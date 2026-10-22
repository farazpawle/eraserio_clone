'use client';
import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  keyboardShortcuts: any;
  preferences: any;
}

interface UseUserSettingsReturn {
  settings: UserSettings;
  isLoading: boolean;
  updateTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  updateKeyboardShortcuts: (shortcuts: any) => Promise<void>;
  updatePreferences: (preferences: any) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  keyboardShortcuts: {},
  preferences: {},
};

export const useUserSettings = (): UseUserSettingsReturn => {
  const { user } = useUser();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Get user ID
  const getUserId = useCallback(() => {
    return user?.email || user?.id || 'anonymous';
  }, [user]);

  // Load settings from localStorage
  const loadLocalSettings = useCallback((): UserSettings => {
    try {
      const theme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
      const keyboardShortcuts = JSON.parse(localStorage.getItem('keyboard-shortcuts-config') || '{}');
      const preferences = JSON.parse(localStorage.getItem('user-preferences') || '{}');
      
      return {
        theme,
        keyboardShortcuts,
        preferences,
      };
    } catch (error) {
      console.error('Error loading local settings:', error);
      return DEFAULT_SETTINGS;
    }
  }, []);

  // Save settings to localStorage
  const saveLocalSettings = useCallback((newSettings: UserSettings) => {
    try {
      localStorage.setItem('theme', newSettings.theme);
      localStorage.setItem('keyboard-shortcuts-config', JSON.stringify(newSettings.keyboardShortcuts));
      localStorage.setItem('user-preferences', JSON.stringify(newSettings.preferences));
    } catch (error) {
      console.error('Error saving local settings:', error);
    }
  }, []);



  // Load settings from localStorage
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load from localStorage
       const localSettings = loadLocalSettings();
       setSettings(localSettings);
     } catch (error) {
       console.error('Failed to load settings:', error);
       toast.error('Failed to load user settings');
     } finally {
       setIsLoading(false);
     }
   }, [loadLocalSettings]);

  // Initialize settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Update theme
  const updateTheme = useCallback(async (theme: 'light' | 'dark' | 'system') => {
    const newSettings = { ...settings, theme };
    setSettings(newSettings);
    
    // Save locally
      saveLocalSettings(newSettings);
    }, [settings, saveLocalSettings]);

  // Update keyboard shortcuts
  const updateKeyboardShortcuts = useCallback(async (keyboardShortcuts: Record<string, any>) => {
    const newSettings = { ...settings, keyboardShortcuts };
    setSettings(newSettings);
    
     // Save locally
     saveLocalSettings(newSettings);
   }, [settings, saveLocalSettings]);

  // Update preferences
  const updatePreferences = useCallback(async (preferences: Record<string, any>) => {
    const newSettings = { ...settings, preferences };
    setSettings(newSettings);
    
      // Save locally
      saveLocalSettings(newSettings);
    }, [settings, saveLocalSettings]);

  // Reset settings to defaults
  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    
    // Clear localStorage
    try {
      localStorage.removeItem('theme');
      localStorage.removeItem('keyboard-shortcuts-config');
      localStorage.removeItem('user-preferences');
      toast.success('Settings reset to defaults');
    } catch (error) {
      console.error('Error clearing local settings:', error);
      toast.error('Failed to reset settings');
    }
  }, []);

  return {
    settings,
    isLoading,
    updateTheme,
    updateKeyboardShortcuts,
    updatePreferences,
    resetSettings,
  };
};

export default useUserSettings;