import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExportDropdown from '@/components/ui/export-dropdown';
import ExportProvider from '@/app/_context/ExportContext';
import { FILE } from '@/app/dashboard/_components/FileList';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn()
  }
}));

jest.mock('@/lib/exportUtils', () => ({
  getFileType: jest.fn(),
  getAvailableFormats: jest.fn(),
  exportFile: jest.fn()
}));

import { getFileType, getAvailableFormats } from '@/lib/exportUtils';
import { toast } from 'sonner';

// Test wrapper with ExportProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ExportProvider>{children}</ExportProvider>
);

describe('ExportDropdown', () => {
  const mockDocumentFile: FILE = {
    _id: 'doc1',
    fileName: 'Test Document',
    document: JSON.stringify({ blocks: [] }),
    whiteboard: '',
    teamId: 'team1',
    createdBy: 'user1',
    archive: false,
    _creationTime: Date.now()
  };

  const mockCanvasFile: FILE = {
    _id: 'canvas1',
    fileName: 'Test Canvas',
    document: '',
    whiteboard: JSON.stringify([{ type: 'rectangle' }]),
    teamId: 'team1',
    createdBy: 'user1',
    archive: false,
    _creationTime: Date.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render export dropdown for document file', () => {
    const mockGetFileType = getFileType as jest.MockedFunction<typeof getFileType>;
    const mockGetAvailableFormats = getAvailableFormats as jest.MockedFunction<typeof getAvailableFormats>;
    
    mockGetFileType.mockReturnValue('document');
    mockGetAvailableFormats.mockReturnValue(['pdf']);

    render(
      <TestWrapper>
        <ExportDropdown file={mockDocumentFile} />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('should render export dropdown for canvas file', () => {
    const mockGetFileType = getFileType as jest.MockedFunction<typeof getFileType>;
    const mockGetAvailableFormats = getAvailableFormats as jest.MockedFunction<typeof getAvailableFormats>;
    
    mockGetFileType.mockReturnValue('canvas');
    mockGetAvailableFormats.mockReturnValue(['png', 'svg']);

    render(
      <TestWrapper>
        <ExportDropdown file={mockCanvasFile} />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('should show available export formats when clicked', async () => {
    const mockGetFileType = getFileType as jest.MockedFunction<typeof getFileType>;
    const mockGetAvailableFormats = getAvailableFormats as jest.MockedFunction<typeof getAvailableFormats>;
    
    mockGetFileType.mockReturnValue('document');
    mockGetAvailableFormats.mockReturnValue(['pdf']);

    render(
      <TestWrapper>
        <ExportDropdown file={mockDocumentFile} />
      </TestWrapper>
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export as PDF')).toBeInTheDocument();
    });
  });

  it('should show multiple formats for canvas files', async () => {
    const mockGetFileType = getFileType as jest.MockedFunction<typeof getFileType>;
    const mockGetAvailableFormats = getAvailableFormats as jest.MockedFunction<typeof getAvailableFormats>;
    
    mockGetFileType.mockReturnValue('canvas');
    mockGetAvailableFormats.mockReturnValue(['png', 'svg']);

    render(
      <TestWrapper>
        <ExportDropdown file={mockCanvasFile} />
      </TestWrapper>
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export as PNG')).toBeInTheDocument();
      expect(screen.getByText('Export as SVG')).toBeInTheDocument();
    });
  });

  it('should handle PDF export for document files', async () => {
    const mockGetFileType = getFileType as jest.MockedFunction<typeof getFileType>;
    const mockGetAvailableFormats = getAvailableFormats as jest.MockedFunction<typeof getAvailableFormats>;
    
    mockGetFileType.mockReturnValue('document');
    mockGetAvailableFormats.mockReturnValue(['pdf']);

    render(
      <TestWrapper>
        <ExportDropdown file={mockDocumentFile} />
      </TestWrapper>
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const pdfOption = screen.getByText('Export as PDF');
      fireEvent.click(pdfOption);
    });

    // The export should be triggered
    expect(mockGetFileType).toHaveBeenCalledWith(mockDocumentFile);
  });

  it('should show workspace message for canvas files', async () => {
    const mockGetFileType = getFileType as jest.MockedFunction<typeof getFileType>;
    const mockGetAvailableFormats = getAvailableFormats as jest.MockedFunction<typeof getAvailableFormats>;
    
    mockGetFileType.mockReturnValue('canvas');
    mockGetAvailableFormats.mockReturnValue(['png', 'svg']);

    render(
      <TestWrapper>
        <ExportDropdown file={mockCanvasFile} />
      </TestWrapper>
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const pngOption = screen.getByText('Export as PNG');
      fireEvent.click(pngOption);
    });

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        'Please use the export option in the workspace for canvas files'
      );
    });
  });

  it('should handle multiple files export', async () => {
    const mockGetAvailableFormats = getAvailableFormats as jest.MockedFunction<typeof getAvailableFormats>;
    
    mockGetAvailableFormats
      .mockReturnValueOnce(['pdf'])
      .mockReturnValueOnce(['pdf']);

    const files = [mockDocumentFile, { ...mockDocumentFile, _id: 'doc2' }];

    render(
      <TestWrapper>
        <ExportDropdown files={files} />
      </TestWrapper>
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export 2 Files')).toBeInTheDocument();
    });
  });

  it('should be disabled when specified', () => {
    const mockGetAvailableFormats = getAvailableFormats as jest.MockedFunction<typeof getAvailableFormats>;
    mockGetAvailableFormats.mockReturnValue(['pdf']);

    render(
      <TestWrapper>
        <ExportDropdown file={mockDocumentFile} disabled={true} />
      </TestWrapper>
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeDisabled();
  });

  it('should not render when no formats available', () => {
    const mockGetAvailableFormats = getAvailableFormats as jest.MockedFunction<typeof getAvailableFormats>;
    mockGetAvailableFormats.mockReturnValue([]);

    const { container } = render(
      <TestWrapper>
        <ExportDropdown file={mockDocumentFile} />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render with custom children', () => {
    const mockGetAvailableFormats = getAvailableFormats as jest.MockedFunction<typeof getAvailableFormats>;
    mockGetAvailableFormats.mockReturnValue(['pdf']);

    render(
      <TestWrapper>
        <ExportDropdown file={mockDocumentFile}>
          <span>Custom Export Button</span>
        </ExportDropdown>
      </TestWrapper>
    );

    expect(screen.getByText('Custom Export Button')).toBeInTheDocument();
  });

  it('should apply custom variant and size', () => {
    const mockGetAvailableFormats = getAvailableFormats as jest.MockedFunction<typeof getAvailableFormats>;
    mockGetAvailableFormats.mockReturnValue(['pdf']);

    render(
      <TestWrapper>
        <ExportDropdown 
          file={mockDocumentFile} 
          variant="outline" 
          size="sm"
          className="custom-class"
        />
      </TestWrapper>
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toHaveClass('custom-class');
  });

  it('should handle mixed file types in batch export', async () => {
    const mockGetFileType = getFileType as jest.MockedFunction<typeof getFileType>;
    const mockGetAvailableFormats = getAvailableFormats as jest.MockedFunction<typeof getAvailableFormats>;
    
    mockGetFileType
      .mockReturnValueOnce('document')
      .mockReturnValueOnce('canvas');
    
    mockGetAvailableFormats
      .mockReturnValueOnce(['pdf'])
      .mockReturnValueOnce(['png', 'svg'])
      .mockReturnValue([]); // No common formats

    const mixedFiles = [mockDocumentFile, mockCanvasFile];

    render(
      <TestWrapper>
        <ExportDropdown files={mixedFiles} />
      </TestWrapper>
    );

    // Should not render when no common formats
    const { container } = render(
      <TestWrapper>
        <ExportDropdown files={mixedFiles} />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show warning for canvas files in batch export', async () => {
    const mockGetFileType = getFileType as jest.MockedFunction<typeof getFileType>;
    const mockGetAvailableFormats = getAvailableFormats as jest.MockedFunction<typeof getAvailableFormats>;
    
    mockGetFileType.mockReturnValue('canvas');
    mockGetAvailableFormats.mockReturnValue(['png']);

    const canvasFiles = [mockCanvasFile, { ...mockCanvasFile, _id: 'canvas2' }];

    render(
      <TestWrapper>
        <ExportDropdown files={canvasFiles} />
      </TestWrapper>
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const pngOption = screen.getByText('Export as PNG');
      fireEvent.click(pngOption);
    });

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(
        'Canvas files must be exported individually from the workspace'
      );
    });
  });
});