import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { FileCard } from '@/components/ui/file-card';
import { useFileManagement } from '@/app/_context/FileManagementContext';
import { FILE } from '@/app/dashboard/_components/FileList';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/app/_context/FileManagementContext');
jest.mock('@/components/ui/export-dropdown', () => {
  return function MockExportDropdown() {
    return <div data-testid="export-dropdown">Export</div>;
  };
});

const mockRouter = {
  push: jest.fn(),
};

const mockFileManagement = {
  isSelectionMode: false,
  toggleFileSelection: jest.fn(),
  isFileSelected: jest.fn().mockReturnValue(false),
};

const mockFile: FILE = {
  id: 'test-file-id',
  name: 'Test Document.txt',
  created_by: 'test-user',
  team_id: 'test-team',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  archived: false,
  document: { blocks: [] },
};

describe('FileCard Loading States', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useFileManagement as jest.Mock).mockReturnValue(mockFileManagement);
    jest.clearAllMocks();
  });

  it('should show loading state when file is clicked', async () => {
    render(
      <FileCard
        file={mockFile}
        deleteProgress={{}}
        renameProgress={{}}
      />
    );

    const fileCard = screen.getByRole('button');
    
    // Click the file card
    fireEvent.click(fileCard);

    // Should show loading spinner in icon area
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    
    // Should show "Opening..." text
    expect(screen.getByText('Opening...')).toBeInTheDocument();
    
    // Should navigate to workspace
    expect(mockRouter.push).toHaveBeenCalledWith('/wokspace/test-file-id');
  });

  it('should disable card interactions while loading', () => {
    render(
      <FileCard
        file={mockFile}
        deleteProgress={{}}
        renameProgress={{}}
      />
    );

    const fileCard = screen.getByRole('button');
    
    // Click the file card to start loading
    fireEvent.click(fileCard);

    // Card should have disabled styling
    expect(fileCard).toHaveClass('opacity-60', 'cursor-not-allowed');
    
    // Should not be draggable while loading
    expect(fileCard).toHaveAttribute('draggable', 'false');
  });

  it('should not navigate when already loading', () => {
    render(
      <FileCard
        file={mockFile}
        deleteProgress={{}}
        renameProgress={{}}
      />
    );

    const fileCard = screen.getByRole('button');
    
    // Click multiple times rapidly
    fireEvent.click(fileCard);
    fireEvent.click(fileCard);
    fireEvent.click(fileCard);

    // Should only navigate once
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
  });

  it('should not show loading state in selection mode', () => {
    (useFileManagement as jest.Mock).mockReturnValue({
      ...mockFileManagement,
      isSelectionMode: true,
    });

    render(
      <FileCard
        file={mockFile}
        deleteProgress={{}}
        renameProgress={{}}
      />
    );

    const fileCard = screen.getByRole('button');
    
    // Click the file card
    fireEvent.click(fileCard);

    // Should not show loading spinner
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    
    // Should not show "Opening..." text
    expect(screen.queryByText('Opening...')).not.toBeInTheDocument();
    
    // Should toggle selection instead
    expect(mockFileManagement.toggleFileSelection).toHaveBeenCalledWith('test-file-id');
    
    // Should not navigate
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('should not show loading state when file is processing', () => {
    render(
      <FileCard
        file={mockFile}
        deleteProgress={{ 'test-file-id': 'loading' }}
        renameProgress={{}}
      />
    );

    const fileCard = screen.getByRole('button');
    
    // Click the file card
    fireEvent.click(fileCard);

    // Should not show navigation loading spinner (different from processing indicator)
    expect(screen.queryByText('Opening...')).not.toBeInTheDocument();
    
    // Should not navigate
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('should show correct file icon when not loading', () => {
    render(
      <FileCard
        file={mockFile}
        deleteProgress={{}}
        renameProgress={{}}
      />
    );

    // Should show file icon initially
    const fileIcon = screen.getByTestId('file-icon');
    expect(fileIcon).toBeInTheDocument();
    
    // Should not show loading spinner initially
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('should replace file icon with loading spinner when clicked', () => {
    render(
      <FileCard
        file={mockFile}
        deleteProgress={{}}
        renameProgress={{}}
      />
    );

    const fileCard = screen.getByRole('button');
    
    // Initially should show file icon
    expect(screen.getByTestId('file-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    
    // Click the file card
    fireEvent.click(fileCard);

    // Should now show loading spinner instead of file icon
    expect(screen.queryByTestId('file-icon')).not.toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should maintain file name visibility during loading', () => {
    render(
      <FileCard
        file={mockFile}
        deleteProgress={{}}
        renameProgress={{}}
      />
    );

    const fileCard = screen.getByRole('button');
    
    // File name should be visible initially
    expect(screen.getByText('Test Document.txt')).toBeInTheDocument();
    
    // Click the file card
    fireEvent.click(fileCard);

    // File name should still be visible
    expect(screen.getByText('Test Document.txt')).toBeInTheDocument();
    
    // Should also show opening indicator
    expect(screen.getByText('Opening...')).toBeInTheDocument();
  });

  it('should handle different file types correctly during loading', () => {
    const whiteboardFile: FILE = {
      ...mockFile,
      name: 'Test Whiteboard',
      document: undefined,
      whiteboard: [{ type: 'rectangle' }],
    };

    render(
      <FileCard
        file={whiteboardFile}
        deleteProgress={{}}
        renameProgress={{}}
      />
    );

    const fileCard = screen.getByRole('button');
    
    // Click the file card
    fireEvent.click(fileCard);

    // Should show loading state regardless of file type
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Opening...')).toBeInTheDocument();
    
    // Should navigate to workspace
    expect(mockRouter.push).toHaveBeenCalledWith('/wokspace/test-file-id');
  });
});