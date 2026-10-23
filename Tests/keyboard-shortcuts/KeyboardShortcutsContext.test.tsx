import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { KeyboardShortcutsProvider, useKeyboardShortcutsContext } from '@/app/_context/KeyboardShortcutsContext';
import { SHORTCUT_CATEGORIES } from '@/app/_hooks/useKeyboardShortcuts';

// Mock the toast function
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Test component that uses the context
const TestComponent = () => {
  const {
    isHelpOpen,
    openHelp,
    closeHelp,
    toggleHelp,
    registerShortcuts,
    allShortcuts,
  } = useKeyboardShortcutsContext();

  const handleRegisterShortcuts = () => {
    registerShortcuts([
      {
        key: 't',
        ctrlKey: true,
        action: () => console.log('Test shortcut'),
        description: 'Test shortcut',
        category: SHORTCUT_CATEGORIES.FILE,
      },
    ]);
  };

  return (
    <div>
      <div data-testid="help-status">{isHelpOpen ? 'open' : 'closed'}</div>
      <div data-testid="shortcuts-count">{allShortcuts.length}</div>
      <button onClick={openHelp} data-testid="open-help">Open Help</button>
      <button onClick={closeHelp} data-testid="close-help">Close Help</button>
      <button onClick={toggleHelp} data-testid="toggle-help">Toggle Help</button>
      <button onClick={handleRegisterShortcuts} data-testid="register-shortcuts">
        Register Shortcuts
      </button>
    </div>
  );
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <KeyboardShortcutsProvider>
      {component}
    </KeyboardShortcutsProvider>
  );
};

describe('KeyboardShortcutsProvider', () => {
  beforeEach(() => {
    // Clear any existing event listeners
    document.removeEventListener = jest.fn();
    document.addEventListener = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should provide initial context values', () => {
    renderWithProvider(<TestComponent />);

    expect(screen.getByTestId('help-status')).toHaveTextContent('closed');
    expect(screen.getByTestId('shortcuts-count')).toHaveTextContent('2'); // Global shortcuts
  });

  it('should open and close help modal', () => {
    renderWithProvider(<TestComponent />);

    const openButton = screen.getByTestId('open-help');
    const closeButton = screen.getByTestId('close-help');
    const helpStatus = screen.getByTestId('help-status');

    // Initially closed
    expect(helpStatus).toHaveTextContent('closed');

    // Open help
    fireEvent.click(openButton);
    expect(helpStatus).toHaveTextContent('open');

    // Close help
    fireEvent.click(closeButton);
    expect(helpStatus).toHaveTextContent('closed');
  });

  it('should toggle help modal', () => {
    renderWithProvider(<TestComponent />);

    const toggleButton = screen.getByTestId('toggle-help');
    const helpStatus = screen.getByTestId('help-status');

    // Initially closed
    expect(helpStatus).toHaveTextContent('closed');

    // Toggle to open
    fireEvent.click(toggleButton);
    expect(helpStatus).toHaveTextContent('open');

    // Toggle to close
    fireEvent.click(toggleButton);
    expect(helpStatus).toHaveTextContent('closed');
  });

  it('should register new shortcuts', () => {
    renderWithProvider(<TestComponent />);

    const registerButton = screen.getByTestId('register-shortcuts');
    const shortcutsCount = screen.getByTestId('shortcuts-count');

    // Initially has global shortcuts
    expect(shortcutsCount).toHaveTextContent('2');

    // Register new shortcut
    fireEvent.click(registerButton);
    expect(shortcutsCount).toHaveTextContent('3');
  });

  it('should handle Ctrl+/ shortcut to toggle help', () => {
    renderWithProvider(<TestComponent />);

    const helpStatus = screen.getByTestId('help-status');
    
    // Get the event handler that was registered
    const eventHandler = (document.addEventListener as jest.Mock).mock.calls.find(
      call => call[0] === 'keydown'
    )?.[1];

    expect(eventHandler).toBeDefined();

    // Initially closed
    expect(helpStatus).toHaveTextContent('closed');

    // Simulate Ctrl+/ keypress
    const event = new KeyboardEvent('keydown', {
      key: '/',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    
    event.preventDefault = jest.fn();
    event.stopPropagation = jest.fn();

    act(() => {
      eventHandler(event);
    });

    expect(helpStatus).toHaveTextContent('open');
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should handle Escape key to close help', () => {
    renderWithProvider(<TestComponent />);

    const helpStatus = screen.getByTestId('help-status');
    const openButton = screen.getByTestId('open-help');
    
    // Open help first
    fireEvent.click(openButton);
    expect(helpStatus).toHaveTextContent('open');

    // The handler is re-registered when help opens, so use the latest one
    // (the first one still closes over isHelpOpen = false). Radix registers its
    // own keydown listeners with an options argument; ours has none.
    const eventHandler = (document.addEventListener as jest.Mock).mock.calls
      .filter(call => call[0] === 'keydown' && call.length === 2)
      .pop()?.[1];

    // Simulate Escape keypress
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    
    event.preventDefault = jest.fn();
    event.stopPropagation = jest.fn();

    act(() => {
      eventHandler(event);
    });

    expect(helpStatus).toHaveTextContent('closed');
  });

  it('should prevent duplicate shortcuts when registering', () => {
    renderWithProvider(<TestComponent />);

    const registerButton = screen.getByTestId('register-shortcuts');
    const shortcutsCount = screen.getByTestId('shortcuts-count');

    // Register shortcut twice
    fireEvent.click(registerButton);
    fireEvent.click(registerButton);

    // Should only have one instance of the shortcut
    expect(shortcutsCount).toHaveTextContent('3'); // 2 global + 1 registered
  });

  it('should render help modal when open', () => {
    renderWithProvider(<TestComponent />);

    const openButton = screen.getByTestId('open-help');
    fireEvent.click(openButton);

    // Check if help modal is rendered
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Use these keyboard shortcuts to work more efficiently')).toBeInTheDocument();
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useKeyboardShortcutsContext must be used within a KeyboardShortcutsProvider');

    consoleSpy.mockRestore();
  });
});

describe('KeyboardShortcutsHelp Modal', () => {
  it('should display shortcuts grouped by category', () => {
    renderWithProvider(<TestComponent />);

    const openButton = screen.getByTestId('open-help');
    fireEvent.click(openButton);

    // Check if categories are displayed
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    
    // Check if shortcut descriptions are displayed
    expect(screen.getByText('Show/hide keyboard shortcuts help')).toBeInTheDocument();
    expect(screen.getByText('Close modals and dialogs')).toBeInTheDocument();
  });

  it('should display formatted shortcuts', () => {
    renderWithProvider(<TestComponent />);

    const openButton = screen.getByTestId('open-help');
    fireEvent.click(openButton);

    // Check if formatted shortcuts are displayed
    // Shown in the shortcut list and again in the footer hint
    expect(screen.getAllByText('Ctrl + /')).toHaveLength(2);
    expect(screen.getByText('Esc')).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', () => {
    renderWithProvider(<TestComponent />);

    const openButton = screen.getByTestId('open-help');
    fireEvent.click(openButton);

    // Modal should be open
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

    // Click close button in modal
    // Two close buttons: the dialog's corner X and the footer Close button
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    expect(closeButtons).toHaveLength(2);
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    // Modal should be closed
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
  });
});