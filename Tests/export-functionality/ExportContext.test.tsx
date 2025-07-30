import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExportProvider, { useExportContext } from '@/app/_context/ExportContext';
import { FILE } from '@/app/dashboard/_components/FileList';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn()
  }
}));

jest.mock('@/lib/exportUtils', () => ({
  exportFile: jest.fn(),
  batchExportFiles: jest.fn()
}));

import { exportFile, batchExportFiles } from '@/lib/exportUtils';
import { toast } from 'sonner';

// Test component that uses the export context
const TestComponent: React.FC = () => {
  const {
    exportState,
    exportSingleFile,
    exportMultipleFiles,
    resetExportState
  } = useExportContext();

  const mockFile: FILE = {
    _id: 'test1',
    fileName: 'Test File',
    document: JSON.stringify({ blocks: [] }),
    whiteboard: '',
    teamId: 'team1',
    createdBy: 'user1',
    archive: false,
    _creationTime: Date.now()
  };

  const mockFiles: FILE[] = [mockFile, { ...mockFile, _id: 'test2', fileName: 'Test File 2' }];

  return (
    <div>
      <div data-testid="export-state">
        {JSON.stringify(exportState)}
      </div>
      <button
        data-testid="export-single"
        onClick={() => exportSingleFile(mockFile, 'pdf')}
      >
        Export Single
      </button>
      <button
        data-testid="export-multiple"
        onClick={() => exportMultipleFiles(mockFiles, 'pdf')}
      >
        Export Multiple
      </button>
      <button
        data-testid="reset-state"
        onClick={resetExportState}
      >
        Reset State
      </button>
    </div>
  );
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ExportProvider>{children}</ExportProvider>
);

describe('ExportContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide initial export state', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const stateElement = screen.getByTestId('export-state');
    const state = JSON.parse(stateElement.textContent || '{}');

    expect(state).toEqual({
      isExporting: false,
      progress: 0,
      message: '',
      currentFile: undefined
    });
  });

  it('should handle single file export successfully', async () => {
    const mockExportFile = exportFile as jest.MockedFunction<typeof exportFile>;
    mockExportFile.mockResolvedValue({
      success: true,
      fileName: 'test-file.pdf'
    });

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const exportButton = screen.getByTestId('export-single');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockExportFile).toHaveBeenCalledWith(
        expect.objectContaining({ fileName: 'Test File' }),
        'pdf',
        expect.any(Function)
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Successfully exported Test File as PDF'
      );
    });
  });

  it('should handle single file export failure', async () => {
    const mockExportFile = exportFile as jest.MockedFunction<typeof exportFile>;
    mockExportFile.mockResolvedValue({
      success: false,
      error: 'Export failed'
    });

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const exportButton = screen.getByTestId('export-single');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to export Test File: Export failed'
      );
    });
  });

  it('should handle multiple files export successfully', async () => {
    const mockBatchExportFiles = batchExportFiles as jest.MockedFunction<typeof batchExportFiles>;
    mockBatchExportFiles.mockResolvedValue([
      { success: true, fileName: 'test-file-1.pdf' },
      { success: true, fileName: 'test-file-2.pdf' }
    ]);

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const exportButton = screen.getByTestId('export-multiple');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockBatchExportFiles).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ fileName: 'Test File' }),
          expect.objectContaining({ fileName: 'Test File 2' })
        ]),
        'pdf',
        expect.any(Function)
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Successfully exported all 2 files as PDF'
      );
    });
  });

  it('should handle partial batch export success', async () => {
    const mockBatchExportFiles = batchExportFiles as jest.MockedFunction<typeof batchExportFiles>;
    mockBatchExportFiles.mockResolvedValue([
      { success: true, fileName: 'test-file-1.pdf' },
      { success: false, error: 'Export failed' }
    ]);

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const exportButton = screen.getByTestId('export-multiple');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(
        'Exported 1 files successfully, 1 failed'
      );
    });
  });

  it('should handle complete batch export failure', async () => {
    const mockBatchExportFiles = batchExportFiles as jest.MockedFunction<typeof batchExportFiles>;
    mockBatchExportFiles.mockResolvedValue([
      { success: false, error: 'Export failed' },
      { success: false, error: 'Export failed' }
    ]);

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const exportButton = screen.getByTestId('export-multiple');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to export all 2 files'
      );
    });
  });

  it('should update export state during export process', async () => {
    const mockExportFile = exportFile as jest.MockedFunction<typeof exportFile>;
    mockExportFile.mockImplementation((file, format, progressCallback) => {
      // Simulate progress updates
      if (progressCallback) {
        progressCallback(25, 'Processing...');
        progressCallback(50, 'Converting...');
        progressCallback(100, 'Complete!');
      }
      return Promise.resolve({ success: true, fileName: 'test.pdf' });
    });

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const exportButton = screen.getByTestId('export-single');
    fireEvent.click(exportButton);

    // Check that state updates during export
    await waitFor(() => {
      const stateElement = screen.getByTestId('export-state');
      const state = JSON.parse(stateElement.textContent || '{}');
      expect(state.isExporting).toBe(true);
    });

    await waitFor(() => {
      const stateElement = screen.getByTestId('export-state');
      const state = JSON.parse(stateElement.textContent || '{}');
      expect(state.isExporting).toBe(false);
      expect(state.progress).toBe(100);
    });
  });

  it('should reset export state', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const resetButton = screen.getByTestId('reset-state');
    fireEvent.click(resetButton);

    const stateElement = screen.getByTestId('export-state');
    const state = JSON.parse(stateElement.textContent || '{}');

    expect(state).toEqual({
      isExporting: false,
      progress: 0,
      message: '',
      currentFile: undefined
    });
  });

  it('should handle export context errors gracefully', async () => {
    const mockExportFile = exportFile as jest.MockedFunction<typeof exportFile>;
    mockExportFile.mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const exportButton = screen.getByTestId('export-single');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Export failed: Network error'
      );
    });
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useExportContext must be used within an ExportProvider');

    consoleSpy.mockRestore();
  });
});