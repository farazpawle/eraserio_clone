'use client';
import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { useKeyboardShortcuts, SHORTCUT_CATEGORIES } from '../_hooks/useKeyboardShortcuts';
import { useUserSettings } from '../_hooks/useUserSettings';
import KeyboardShortcutsHelp from '@/components/ui/keyboard-shortcuts-help';
import KeyboardShortcutsSettings from '@/components/ui/keyboard-shortcuts-settings';
import { toast } from 'sonner';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
  id?: string;
}

interface ShortcutConfig {
  id: string;
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  category: string;
  customizable: boolean;
}

interface KeyboardShortcutsContextType {
  isHelpOpen: boolean;
  isSettingsOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  registerShortcuts: (shortcuts: KeyboardShortcut[]) => void;
  unregisterShortcuts: () => void;
  allShortcuts: KeyboardShortcut[];
  shortcutConfigs: ShortcutConfig[];
  updateShortcutConfigs: (configs: ShortcutConfig[]) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
}

// Default shortcut configurations
const DEFAULT_SHORTCUT_CONFIGS: ShortcutConfig[] = [
  {
    id: 'save',
    key: 's',
    altKey: true,
    description: 'Save file',
    category: SHORTCUT_CATEGORIES.FILE,
    customizable: true,
  },
  {
    id: 'new-file',
    key: 'n',
    altKey: true,
    description: 'Create new file',
    category: SHORTCUT_CATEGORIES.FILE,
    customizable: true,
  },
  {
    id: 'help',
    key: '/',
    ctrlKey: true,
    description: 'Show/hide keyboard shortcuts help',
    category: SHORTCUT_CATEGORIES.HELP,
    customizable: true,
  },
  {
    id: 'escape',
    key: 'Escape',
    description: 'Close modals and dialogs',
    category: SHORTCUT_CATEGORIES.NAVIGATION,
    customizable: false,
  },
];

export const KeyboardShortcutsProvider: React.FC<KeyboardShortcutsProviderProps> = ({ children }) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [registeredShortcuts, setRegisteredShortcuts] = useState<KeyboardShortcut[]>([]);
  const { settings, updateKeyboardShortcuts } = useUserSettings();
  
  // Use shortcuts from settings, fallback to defaults if empty
  const shortcutConfigs = useMemo(() => {
    const savedConfigs = settings.keyboardShortcuts;
    if (savedConfigs && Object.keys(savedConfigs).length > 0) {
      // If saved configs is an array, use it directly
      if (Array.isArray(savedConfigs)) {
        return savedConfigs;
      }
      // If it's an object but not an array, convert to array format
      return DEFAULT_SHORTCUT_CONFIGS;
    }
    return DEFAULT_SHORTCUT_CONFIGS;
  }, [settings.keyboardShortcuts]);

  const openHelp = useCallback(() => setIsHelpOpen(true), []);
  const closeHelp = useCallback(() => setIsHelpOpen(false), []);
  const toggleHelp = useCallback(() => setIsHelpOpen(!isHelpOpen), [isHelpOpen]);
  
  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  
  const updateShortcutConfigs = useCallback(async (configs: ShortcutConfig[]) => {
    await updateKeyboardShortcuts(configs);
  }, [updateKeyboardShortcuts]);

  const registerShortcuts = useCallback((shortcuts: KeyboardShortcut[]) => {
    setRegisteredShortcuts(prev => {
      // Remove duplicates and add new shortcuts
      const filtered = prev.filter(existing => 
        !shortcuts.some(newShortcut => 
          existing.key === newShortcut.key &&
          existing.ctrlKey === newShortcut.ctrlKey &&
          existing.shiftKey === newShortcut.shiftKey &&
          existing.altKey === newShortcut.altKey &&
          existing.metaKey === newShortcut.metaKey
        )
      );
      // Ensure all shortcuts have ids
      const shortcutsWithIds = shortcuts.map((shortcut, index) => ({
        ...shortcut,
        id: shortcut.id || `registered-${Date.now()}-${index}`
      }));
      return [...filtered, ...shortcutsWithIds];
    });
  }, []);

  const unregisterShortcuts = useCallback(() => {
    setRegisteredShortcuts([]);
  }, []);

  // Global shortcuts based on configurations
  const globalShortcuts: KeyboardShortcut[] = useMemo(() => {
    const helpConfig = shortcutConfigs.find(config => config.id === 'help');
    const escapeConfig = shortcutConfigs.find(config => config.id === 'escape');
    
    const shortcuts: KeyboardShortcut[] = [];
    
    if (helpConfig) {
      shortcuts.push({
        key: helpConfig.key,
        ctrlKey: helpConfig.ctrlKey,
        shiftKey: helpConfig.shiftKey,
        altKey: helpConfig.altKey,
        metaKey: helpConfig.metaKey,
        action: toggleHelp,
        description: helpConfig.description,
        category: helpConfig.category,
        id: helpConfig.id,
      });
    }
    
    if (escapeConfig) {
      shortcuts.push({
        key: escapeConfig.key,
        ctrlKey: escapeConfig.ctrlKey,
        shiftKey: escapeConfig.shiftKey,
        altKey: escapeConfig.altKey,
        metaKey: escapeConfig.metaKey,
        action: () => {
          if (isSettingsOpen) {
            closeSettings();
            return;
          }
          if (isHelpOpen) {
            closeHelp();
            return;
          }
          // Close any open modals or dialogs
          const openDialogs = document.querySelectorAll('[role="dialog"]');
          if (openDialogs.length > 0) {
            // Trigger escape key event on the last opened dialog
            const lastDialog = openDialogs[openDialogs.length - 1];
            const escapeEvent = new KeyboardEvent('keydown', {
              key: 'Escape',
              bubbles: true,
              cancelable: true,
            });
            lastDialog.dispatchEvent(escapeEvent);
          }
        },
        description: escapeConfig.description,
        category: escapeConfig.category,
        id: escapeConfig.id,
      });
    }
    
    return shortcuts;
  }, [shortcutConfigs, toggleHelp, isHelpOpen, isSettingsOpen, closeHelp, closeSettings]);

  const allShortcuts = useMemo(() => {
    const combined = [...globalShortcuts, ...registeredShortcuts];
    // Ensure all shortcuts have ids for the settings component
    return combined.map((shortcut, index) => ({
      ...shortcut,
      id: shortcut.id || `shortcut-${index}`
    }));
  }, [globalShortcuts, registeredShortcuts]);

  // Register global shortcuts
  useKeyboardShortcuts({
    shortcuts: allShortcuts,
    enabled: true,
  });

  const contextValue: KeyboardShortcutsContextType = useMemo(() => ({
    isHelpOpen,
    isSettingsOpen,
    openHelp,
    closeHelp,
    toggleHelp,
    openSettings,
    closeSettings,
    registerShortcuts,
    unregisterShortcuts,
    allShortcuts,
    shortcutConfigs,
    updateShortcutConfigs,
  }), [isHelpOpen, isSettingsOpen, openHelp, closeHelp, toggleHelp, openSettings, closeSettings, registerShortcuts, unregisterShortcuts, allShortcuts, shortcutConfigs, updateShortcutConfigs]);

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}
      <KeyboardShortcutsHelp
        isOpen={isHelpOpen}
        onClose={closeHelp}
        shortcuts={allShortcuts}
      />
      <KeyboardShortcutsSettings
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        shortcuts={allShortcuts}
        onShortcutsUpdate={updateShortcutConfigs}
      />
    </KeyboardShortcutsContext.Provider>
  );
};

export const useKeyboardShortcutsContext = (): KeyboardShortcutsContextType => {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcutsContext must be used within a KeyboardShortcutsProvider');
  }
  return context;
};

export default KeyboardShortcutsProvider;