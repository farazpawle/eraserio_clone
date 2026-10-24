import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts, formatShortcut, SHORTCUT_CATEGORIES } from '@/app/_hooks/useKeyboardShortcuts';

// Mock keyboard event
const createKeyboardEvent = (key: string, options: Partial<KeyboardEvent> = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  
  // Mock preventDefault and stopPropagation
  event.preventDefault = jest.fn();
  event.stopPropagation = jest.fn();
  
  return event;
};

describe('useKeyboardShortcuts', () => {
  let mockAction: jest.Mock;
  
  beforeEach(() => {
    mockAction = jest.fn();
    // Clear any existing event listeners
    document.removeEventListener = jest.fn();
    document.addEventListener = jest.fn();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register keyboard shortcuts correctly', () => {
    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        action: mockAction,
        description: 'Save file',
        category: SHORTCUT_CATEGORIES.FILE,
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }));

    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should not register shortcuts when disabled', () => {
    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        action: mockAction,
        description: 'Save file',
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: false }));

    expect(document.addEventListener).not.toHaveBeenCalled();
  });

  it('should trigger action when matching shortcut is pressed', () => {
    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        action: mockAction,
        description: 'Save file',
      },
    ];

    const { result } = renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }));
    
    // Get the event handler that was registered
    const eventHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Simulate Ctrl+S keypress
    const event = createKeyboardEvent('s', { ctrlKey: true });
    
    act(() => {
      eventHandler(event);
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('should not trigger action for non-matching shortcuts', () => {
    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        action: mockAction,
        description: 'Save file',
      },
    ];

    const { result } = renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }));
    
    const eventHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Simulate Ctrl+A keypress (different key)
    const event = createKeyboardEvent('a', { ctrlKey: true });
    
    act(() => {
      eventHandler(event);
    });

    expect(mockAction).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('should not trigger shortcuts when typing in input fields', () => {
    const shortcuts = [
      {
        key: 'g',
        ctrlKey: true,
        action: mockAction,
        description: 'Toggle grid',
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }));
    
    const eventHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Mock input element as target
    const inputElement = document.createElement('input');
    const event = createKeyboardEvent('g', { ctrlKey: true });
    Object.defineProperty(event, 'target', { value: inputElement });
    
    act(() => {
      eventHandler(event);
    });

    expect(mockAction).not.toHaveBeenCalled();
  });

  it('should still trigger save shortcuts when typing in input fields', () => {
    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        action: mockAction,
        description: 'Save file',
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }));

    const eventHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];

    const inputElement = document.createElement('input');
    const event = createKeyboardEvent('s', { ctrlKey: true });
    Object.defineProperty(event, 'target', { value: inputElement });

    act(() => {
      eventHandler(event);
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should trigger a shortcut marked allowInInput while typing in an input', () => {
    const shortcuts = [
      { key: '2', altKey: true, action: mockAction, description: 'Show both panes', allowInInput: true },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }));

    const eventHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];

    const inputElement = document.createElement('input');
    const event = createKeyboardEvent('2', { altKey: true });
    Object.defineProperty(event, 'target', { value: inputElement });

    act(() => {
      eventHandler(event);
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should allow Escape key even in input fields', () => {
    const shortcuts = [
      {
        key: 'Escape',
        action: mockAction,
        description: 'Close modal',
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }));
    
    const eventHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Mock input element as target
    const inputElement = document.createElement('input');
    const event = createKeyboardEvent('Escape');
    Object.defineProperty(event, 'target', { value: inputElement });
    
    act(() => {
      eventHandler(event);
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should clean up event listeners on unmount', () => {
    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        action: mockAction,
        description: 'Save file',
      },
    ];

    const { unmount } = renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }));
    
    unmount();

    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

describe('formatShortcut', () => {
  it('should format simple key shortcuts', () => {
    const shortcut = {
      key: 's',
      action: jest.fn(),
      description: 'Save',
    };

    expect(formatShortcut(shortcut)).toBe('S');
  });

  it('should format Ctrl+key shortcuts', () => {
    const shortcut = {
      key: 's',
      ctrlKey: true,
      action: jest.fn(),
      description: 'Save',
    };

    expect(formatShortcut(shortcut)).toBe('Ctrl + S');
  });

  it('should format complex shortcuts with multiple modifiers', () => {
    const shortcut = {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
      action: jest.fn(),
      description: 'Save As',
    };

    expect(formatShortcut(shortcut)).toBe('Ctrl + Shift + S');
  });

  it('should format special keys correctly', () => {
    const shortcuts = [
      { key: 'Escape', action: jest.fn(), description: 'Close' },
      { key: ' ', action: jest.fn(), description: 'Space' },
      { key: 'Enter', action: jest.fn(), description: 'Submit' },
      { key: '/', action: jest.fn(), description: 'Search' },
    ];

    expect(formatShortcut(shortcuts[0])).toBe('Esc');
    expect(formatShortcut(shortcuts[1])).toBe('Space');
    expect(formatShortcut(shortcuts[2])).toBe('Enter');
    expect(formatShortcut(shortcuts[3])).toBe('/');
  });

  it('should format arrow keys correctly', () => {
    const shortcuts = [
      { key: 'ArrowUp', action: jest.fn(), description: 'Up' },
      { key: 'ArrowDown', action: jest.fn(), description: 'Down' },
      { key: 'ArrowLeft', action: jest.fn(), description: 'Left' },
      { key: 'ArrowRight', action: jest.fn(), description: 'Right' },
    ];

    expect(formatShortcut(shortcuts[0])).toBe('↑');
    expect(formatShortcut(shortcuts[1])).toBe('↓');
    expect(formatShortcut(shortcuts[2])).toBe('←');
    expect(formatShortcut(shortcuts[3])).toBe('→');
  });
});

describe('SHORTCUT_CATEGORIES', () => {
  it('should have all expected categories', () => {
    expect(SHORTCUT_CATEGORIES.FILE).toBe('File Operations');
    expect(SHORTCUT_CATEGORIES.EDIT).toBe('Editing');
    expect(SHORTCUT_CATEGORIES.VIEW).toBe('View');
    expect(SHORTCUT_CATEGORIES.HELP).toBe('Help');
    expect(SHORTCUT_CATEGORIES.NAVIGATION).toBe('Navigation');
  });
});