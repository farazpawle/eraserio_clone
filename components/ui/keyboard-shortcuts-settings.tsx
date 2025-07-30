'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, RotateCcw, AlertTriangle, Check } from 'lucide-react';
import { formatShortcut, SHORTCUT_CATEGORIES } from '@/app/_hooks/useKeyboardShortcuts';
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
  id: string;
  customizable?: boolean;
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

interface KeyboardShortcutsSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
  onShortcutsUpdate: (shortcuts: ShortcutConfig[]) => void;
}

// Default shortcut configurations
const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
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

// Browser shortcuts that should be avoided
const BROWSER_SHORTCUTS = [
  { key: 's', ctrlKey: true, shiftKey: false, altKey: false, description: 'Save page' },
  { key: 'n', ctrlKey: true, shiftKey: false, altKey: false, description: 'New window' },
  { key: 't', ctrlKey: true, shiftKey: false, altKey: false, description: 'New tab' },
  { key: 'w', ctrlKey: true, shiftKey: false, altKey: false, description: 'Close tab' },
  { key: 'r', ctrlKey: true, shiftKey: false, altKey: false, description: 'Refresh page' },
  { key: 'f', ctrlKey: true, shiftKey: false, altKey: false, description: 'Find in page' },
  { key: 'l', ctrlKey: true, shiftKey: false, altKey: false, description: 'Focus address bar' },
  { key: 'd', ctrlKey: true, shiftKey: false, altKey: false, description: 'Bookmark page' },
  { key: 'h', ctrlKey: true, shiftKey: false, altKey: false, description: 'History' },
  { key: 'j', ctrlKey: true, shiftKey: false, altKey: false, description: 'Downloads' },
  { key: 'u', ctrlKey: true, shiftKey: false, altKey: false, description: 'View source' },
  { key: 'p', ctrlKey: true, shiftKey: false, altKey: false, description: 'Print page' },
];

export const KeyboardShortcutsSettings: React.FC<KeyboardShortcutsSettingsProps> = ({
  isOpen,
  onClose,
  shortcuts,
  onShortcutsUpdate,
}) => {
  const [shortcutConfigs, setShortcutConfigs] = useState<ShortcutConfig[]>(DEFAULT_SHORTCUTS);
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [tempShortcut, setTempShortcut] = useState<Partial<ShortcutConfig>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);

  // Load saved shortcuts from localStorage on mount
  useEffect(() => {
    const savedShortcuts = localStorage.getItem('keyboard-shortcuts-config');
    if (savedShortcuts) {
      try {
        const parsed = JSON.parse(savedShortcuts);
        // Ensure parsed data is an array
        if (Array.isArray(parsed)) {
          setShortcutConfigs(parsed);
        } else {
          console.warn('Invalid shortcut config format, using defaults');
          setShortcutConfigs(DEFAULT_SHORTCUTS);
        }
      } catch (error) {
        console.error('Failed to parse saved shortcuts:', error);
        setShortcutConfigs(DEFAULT_SHORTCUTS);
      }
    }
  }, []);

  // Check for conflicts with browser shortcuts
  const checkConflicts = (config: ShortcutConfig) => {
    const browserConflict = BROWSER_SHORTCUTS.find(
      (bs) =>
        bs.key.toLowerCase() === config.key.toLowerCase() &&
        !!bs.ctrlKey === !!config.ctrlKey &&
        !!bs.shiftKey === !!config.shiftKey &&
        !!bs.altKey === !!config.altKey
    );

    const duplicateConflict = shortcutConfigs.find(
      (sc) =>
        sc.id !== config.id &&
        sc.key.toLowerCase() === config.key.toLowerCase() &&
        !!sc.ctrlKey === !!config.ctrlKey &&
        !!sc.shiftKey === !!config.shiftKey &&
        !!sc.altKey === !!config.altKey
    );

    return {
      browserConflict,
      duplicateConflict,
      hasConflict: !!browserConflict || !!duplicateConflict,
    };
  };

  // Handle keyboard input for shortcut recording
  const handleKeyDown = React.useCallback((event: KeyboardEvent) => {
    if (!isRecording || !editingShortcut) return;

    event.preventDefault();
    event.stopPropagation();

    // Ignore modifier-only keys
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
      return;
    }

    const newShortcut = {
      ...tempShortcut,
      key: event.key,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    };

    setTempShortcut(newShortcut);
    setIsRecording(false);
  }, [isRecording, editingShortcut, tempShortcut]);

  // Effect to manage keydown event listener
  useEffect(() => {
    if (isRecording) {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [isRecording, handleKeyDown]);

  // Effect to cleanup when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsRecording(false);
      setEditingShortcut(null);
      setTempShortcut({});
    }
  }, [isOpen]);

  // Start recording a new shortcut
  const startRecording = (shortcutId: string) => {
    const shortcut = shortcutConfigs.find((s) => s.id === shortcutId);
    if (!shortcut) return;

    setEditingShortcut(shortcutId);
    setTempShortcut(shortcut);
    setIsRecording(true);
  };

  // Save the edited shortcut
  const saveShortcut = () => {
    if (!editingShortcut || !tempShortcut.key) return;

    const { hasConflict, browserConflict, duplicateConflict } = checkConflicts(tempShortcut as ShortcutConfig);

    if (hasConflict) {
      let conflictMessage = '';
      if (browserConflict) {
        conflictMessage = `This shortcut conflicts with browser function: ${browserConflict.description}`;
      } else if (duplicateConflict) {
        conflictMessage = `This shortcut is already used by: ${duplicateConflict.description}`;
      }
      toast.error(conflictMessage);
      return;
    }

    const updatedConfigs = shortcutConfigs.map((config) =>
      config.id === editingShortcut ? { ...config, ...tempShortcut } : config
    );

    setShortcutConfigs(updatedConfigs);
    setEditingShortcut(null);
    setTempShortcut({});
    setIsRecording(false);
    toast.success('Shortcut updated successfully');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingShortcut(null);
    setTempShortcut({});
    setIsRecording(false);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setShortcutConfigs(DEFAULT_SHORTCUTS);
    localStorage.removeItem('keyboard-shortcuts-config');
    toast.success('Shortcuts reset to defaults');
  };

  // Save all shortcuts
  const saveAllShortcuts = () => {
    localStorage.setItem('keyboard-shortcuts-config', JSON.stringify(shortcutConfigs));
    onShortcutsUpdate(shortcutConfigs);
    toast.success('Shortcuts saved successfully');
    onClose();
  };

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    if (!Array.isArray(shortcutConfigs)) {
      return {} as Record<string, ShortcutConfig[]>;
    }
    return shortcutConfigs.reduce((acc, shortcut) => {
      const category = shortcut.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(shortcut);
      return acc;
    }, {} as Record<string, ShortcutConfig[]>);
  }, [shortcutConfigs]);

  // Clean up event listener on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Settings className="h-5 w-5" />
            Keyboard Shortcuts Settings
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Customize your keyboard shortcuts. Click on a shortcut to edit it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning about browser conflicts */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Browser Shortcut Conflicts</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Some shortcuts may conflict with browser functions. We recommend using Alt or Shift modifiers to avoid conflicts.
                </p>
              </div>
            </div>
          </div>

          {/* Shortcuts by category */}
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                {category}
              </h3>
              <div className="space-y-3">
                {categoryShortcuts.map((shortcut) => {
                  const isEditing = editingShortcut === shortcut.id;
                  const displayShortcut = isEditing && tempShortcut.key ? tempShortcut : shortcut;
                  const { hasConflict, browserConflict } = checkConflicts(displayShortcut as ShortcutConfig);

                  return (
                    <div
                      key={shortcut.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        isEditing
                          ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 dark:text-gray-100 font-medium">
                            {shortcut.description}
                          </span>
                          {hasConflict && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" aria-label="Potential conflict" />
                          )}
                        </div>
                        {browserConflict && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            Conflicts with: {browserConflict.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <kbd className="px-3 py-2 text-sm font-mono bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded min-w-[120px] text-center">
                                {isRecording ? (
                                  <span className="text-blue-500 animate-pulse">Press keys...</span>
                                ) : displayShortcut.key ? (
                                  formatShortcut(displayShortcut as any)
                                ) : (
                                  'Not set'
                                )}
                              </kbd>
                              {!isRecording && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startRecording(shortcut.id)}
                                >
                                  Record
                                </Button>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={saveShortcut}
                                disabled={!tempShortcut.key || isRecording}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <kbd className="px-3 py-2 text-sm font-mono bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded min-w-[120px] text-center">
                              {formatShortcut(shortcut as any)}
                            </kbd>
                            {shortcut.customizable && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startRecording(shortcut.id)}
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-6" />

        {/* Action buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={resetToDefaults} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={saveAllShortcuts} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsSettings;