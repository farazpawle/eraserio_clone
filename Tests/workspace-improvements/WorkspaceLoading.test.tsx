import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { getFile } from '@/lib/data/files';
import Workspace from '@/app/(routes)/workspace/[fileId]/page';
import { useKeyboardShortcutsContext } from '@/app/_context/KeyboardShortcutsContext';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
jest.mock('@/lib/data/files');
jest.mock('@/app/_context/KeyboardShortcutsContext');
jest.mock('sonner');
jest.mock('@/app/(routes)/workspace/_components/WSHeader', () => {
  return function MockWSHeader() {
    return <div data-testid="ws-header">Mock Header</div>;
  };
});
jest.mock('@/app/(routes)/workspace/_components/Editor', () => {
  return function MockEditor() {
    return <div data-testid="editor">Mock Editor</div>;
  };
});
jest.mock('@/app/(routes)/workspace/_components/WSCanvas', () => {
  return function MockWSCanvas() {
    return <div data-testid="ws-canvas">Mock Canvas</div>;
  };
});
jest.mock('@/components/ui/resizable-pane', () => {
  return {
    ResizablePane: function MockResizablePane({ leftPanel, rightPanel }: any) {
      return (
        <div data-testid="resizable-pane">
          <div data-testid="left-panel">{leftPanel}</div>
          <div data-testid="right-panel">{rightPanel}</div>
        </div>
      );
    },
  };
});

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
};

const mockGetFile = getFile as jest.Mock;

const mockKeyboardShortcuts = {
  registerShortcuts: jest.fn(),
  unregisterShortcuts: jest.fn(),
  shortcutConfigs: [
    {
      id: 'save',
      key: 's',
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      description: 'Save file',
      category: 'file',
    },
  ],
};

const mockFileData = {
  _id: 'test-file-id',
  fileName: 'Test File',
  document: JSON.stringify({ blocks: [] }),
  whiteboard: JSON.stringify([]),
  _creationTime: Date.now(),
  createdBy: 'test-user',
  teamId: 'test-team',
};

describe('Workspace Loading States', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useKeyboardShortcutsContext as jest.Mock).mockReturnValue(mockKeyboardShortcuts);
    (toast as any).error = jest.fn();
    
    jest.clearAllMocks();
  });

  it('should show loading state while fetching file data', async () => {
    // Mock a delayed response
    mockGetFile.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockFileData), 100))
    );

    render(<Workspace params={{ fileId: 'test-file-id' }} />);

    // Should show loading state initially
    expect(screen.getByText('Loading your workspace...')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we fetch your file data')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    // Should show skeleton elements
    expect(screen.getAllByTestId('skeleton')).toHaveLength(14); // Header (5) + workspace (9) skeletons

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading your workspace...')).not.toBeInTheDocument();
    });

    // Should show actual workspace components
    expect(screen.getByTestId('ws-header')).toBeInTheDocument();
    expect(screen.getByTestId('resizable-pane')).toBeInTheDocument();
  });

  it('should show error state when file loading fails', async () => {
    // Mock a failed response
    mockGetFile.mockRejectedValue(new Error('Network error'));

    render(<Workspace params={{ fileId: 'test-file-id' }} />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Failed to Load File')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load file. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Go Back')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Failed to load file');
  });

  it('should show error state when file is not found', async () => {
    // Mock a null response (file not found)
    mockGetFile.mockResolvedValue(null);

    render(<Workspace params={{ fileId: 'test-file-id' }} />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Failed to Load File')).toBeInTheDocument();
    });

    expect(screen.getByText('File not found or you don\'t have permission to access it.')).toBeInTheDocument();
  });

  it('should handle try again button click', async () => {
    // Mock a failed response initially
    mockGetFile.mockRejectedValueOnce(new Error('Network error'));
    
    // jsdom's window.location cannot be redefined, so it cannot be swapped for a
    // mock. Its reload() reports "Not implemented: navigation" through
    // console.error instead, which proves the reload was attempted.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<Workspace params={{ fileId: 'test-file-id' }} />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    // Click try again
    fireEvent.click(screen.getByText('Try Again'));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Not implemented: navigation'),
      })
    );
    consoleSpy.mockRestore();
  });

  it('should handle go back button click', async () => {
    // Mock a failed response
    mockGetFile.mockRejectedValue(new Error('Network error'));
    
    // Mock window.history.back
    const mockBack = jest.fn();
    Object.defineProperty(window, 'history', {
      value: { back: mockBack },
      writable: true,
    });

    render(<Workspace params={{ fileId: 'test-file-id' }} />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });

    // Click go back
    fireEvent.click(screen.getByText('Go Back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('should register keyboard shortcuts after successful load', async () => {
    mockGetFile.mockResolvedValue(mockFileData);

    render(<Workspace params={{ fileId: 'test-file-id' }} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('ws-header')).toBeInTheDocument();
    });

    // Should register shortcuts
    expect(mockKeyboardShortcuts.registerShortcuts).toHaveBeenCalled();
  });

  it('should not show workspace components during loading', () => {
    // Mock a delayed response
    mockGetFile.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<Workspace params={{ fileId: 'test-file-id' }} />);

    // Should not show workspace components
    expect(screen.queryByTestId('ws-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('resizable-pane')).not.toBeInTheDocument();
    expect(screen.queryByTestId('editor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ws-canvas')).not.toBeInTheDocument();
  });

  it('should show proper loading skeleton structure', () => {
    // Mock a delayed response
    mockGetFile.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<Workspace params={{ fileId: 'test-file-id' }} />);

    // Check header skeleton
    const headerSkeletons = screen.getAllByTestId('skeleton');
    expect(headerSkeletons.length).toBeGreaterThan(0);

    // Check main content structure
    expect(screen.getByText('Loading your workspace...')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});