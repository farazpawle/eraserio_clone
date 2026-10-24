'use client';
import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
  // Fire even while the user is typing in a field or editor.
  allowInInput?: boolean;
}

interface UseKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({ shortcuts, enabled = true }: UseKeyboardShortcutsProps) => {
  // Depend on the array itself: JSON.stringify drops the action functions, so a
  // stringified key would leave stale action closures registered.
  const memoizedShortcuts = shortcuts;
  
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Find matching shortcut first
      const matchingShortcut = memoizedShortcuts.find((shortcut) => {
        if (!shortcut.key || !event.key) return false;
        const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
        const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
        const altMatches = !!shortcut.altKey === event.altKey;
        const metaMatches = !!shortcut.metaKey === event.metaKey;
        return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
      });

      // Don't trigger shortcuts when user is typing in input fields
      // event.target can be null or a non-element (document/window), so guard it.
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true' ||
          target.closest('[contenteditable="true"]'))
      ) {
        // Allow Escape, save-related shortcuts and shortcuts that opt in (view switching must work while typing)
        if (
          event.key !== 'Escape' &&
          (!matchingShortcut ||
            !(matchingShortcut.allowInInput || matchingShortcut.description.toLowerCase().includes('save')))
        ) {
          return;
        }
      }

      if (matchingShortcut) {
        event.preventDefault();
        event.stopPropagation();
        matchingShortcut.action();
      }
    },
    [memoizedShortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return { shortcuts: memoizedShortcuts };
};

// Helper function to format shortcut display
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.metaKey) parts.push('Cmd');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.altKey) parts.push('Alt');
  
  // Format special keys
  let keyDisplay = shortcut.key;
  switch (shortcut.key.toLowerCase()) {
    case ' ':
      keyDisplay = 'Space';
      break;
    case 'escape':
      keyDisplay = 'Esc';
      break;
    case 'enter':
      keyDisplay = 'Enter';
      break;
    case 'arrowup':
      keyDisplay = '↑';
      break;
    case 'arrowdown':
      keyDisplay = '↓';
      break;
    case 'arrowleft':
      keyDisplay = '←';
      break;
    case 'arrowright':
      keyDisplay = '→';
      break;
    case '/':
      keyDisplay = '/';
      break;
    default:
      keyDisplay = shortcut.key.toUpperCase();
  }
  
  parts.push(keyDisplay);
  return parts.join(' + ');
};

// Predefined shortcut categories
export const SHORTCUT_CATEGORIES = {
  FILE: 'File Operations',
  EDIT: 'Editing',
  VIEW: 'View',
  HELP: 'Help',
  NAVIGATION: 'Navigation',
} as const;

export type ShortcutCategory = typeof SHORTCUT_CATEGORIES[keyof typeof SHORTCUT_CATEGORIES];