import {
  exportDocumentToPDF,
  getFileType,
  getAvailableFormats,
  generateExportFileName,
  exportFile
} from '@/lib/exportUtils';
import { FILE } from '@/app/dashboard/_components/FileList';

// Mock dependencies
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    addPage: jest.fn(),
    output: jest.fn().mockReturnValue(new Blob(['mock pdf'], { type: 'application/pdf' }))
  }));
});

jest.mock('html2canvas', () => {
  return jest.fn().mockResolvedValue({
    toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mock'),
    width: 800,
    height: 600
  });
});

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

// Mock DOM methods
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: jest.fn().mockReturnValue('mock-url'),
    revokeObjectURL: jest.fn()
  }
});

Object.defineProperty(document, 'createElement', {
  value: jest.fn().mockImplementation((tagName) => {
    if (tagName === 'a') {
      return {
        href: '',
        download: '',
        click: jest.fn(),
        style: {}
      };
    }
    if (tagName === 'div') {
      return {
        style: {},
        appendChild: jest.fn(),
        innerHTML: ''
      };
    }
    return {
      style: {},
      appendChild: jest.fn()
    };
  })
});

Object.defineProperty(document.body, 'appendChild', {
  value: jest.fn()
});

Object.defineProperty(document.body, 'removeChild', {
  value: jest.fn()
});

describe('Export Utils', () => {
  // Sample file data for testing
  const mockDocumentFile: FILE = {
    _id: 'doc1',
    fileName: 'Test Document',
    document: JSON.stringify({
      blocks: [
        {
          type: 'header',
          data: { text: 'Test Header', level: 2 }
        },
        {
          type: 'paragraph',
          data: { text: 'Test paragraph content' }
        }
      ]
    }),
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
    whiteboard: JSON.stringify([{ type: 'rectangle', x: 0, y: 0, width: 100, height: 100 }]),
    teamId: 'team1',
    createdBy: 'user1',
    archive: false,
    _creationTime: Date.now()
  };

  describe('getFileType', () => {
    it('should identify document files correctly', () => {
      expect(getFileType(mockDocumentFile)).toBe('document');
    });

    it('should identify canvas files correctly', () => {
      expect(getFileType(mockCanvasFile)).toBe('canvas');
    });

    it('should default to document for empty files', () => {
      const emptyFile: FILE = {
        ...mockDocumentFile,
        document: '',
        whiteboard: ''
      };
      expect(getFileType(emptyFile)).toBe('document');
    });
  });

  describe('getAvailableFormats', () => {
    it('should return PDF for document files', () => {
      expect(getAvailableFormats(mockDocumentFile)).toEqual(['pdf']);
    });

    it('should return PNG and SVG for canvas files', () => {
      expect(getAvailableFormats(mockCanvasFile)).toEqual(['png', 'svg']);
    });
  });

  describe('generateExportFileName', () => {
    it('should generate safe filename with date', () => {
      const fileName = generateExportFileName('Test File!@#', 'pdf');
      expect(fileName).toMatch(/^Test_File_\d{4}-\d{2}-\d{2}$/);
    });

    it('should remove file extensions', () => {
      const fileName = generateExportFileName('document.txt', 'pdf');
      expect(fileName).toMatch(/^document_\d{4}-\d{2}-\d{2}$/);
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(100);
      const fileName = generateExportFileName(longName, 'pdf');
      expect(fileName.length).toBeLessThanOrEqual(61); // 50 chars + date
    });
  });

  describe('exportDocumentToPDF', () => {
    it('should export document to PDF successfully', async () => {
      const mockProgress = jest.fn();
      const result = await exportDocumentToPDF(
        mockDocumentFile.document!,
        'test-doc',
        mockProgress
      );

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('test-doc.pdf');
      expect(mockProgress).toHaveBeenCalledWith(100, 'Export complete!');
    });

    it('should handle export errors gracefully', async () => {
      // Mock an error in the export process
      const mockProgress = jest.fn();
      const invalidDocument = 'invalid json';
      
      const result = await exportDocumentToPDF(
        invalidDocument,
        'test-doc',
        mockProgress
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should call progress callback with correct values', async () => {
      const mockProgress = jest.fn();
      await exportDocumentToPDF(
        mockDocumentFile.document!,
        'test-doc',
        mockProgress
      );

      expect(mockProgress).toHaveBeenCalledWith(10, 'Preparing document...');
      expect(mockProgress).toHaveBeenCalledWith(20, 'Creating PDF document...');
      expect(mockProgress).toHaveBeenCalledWith(30, 'Rendering content...');
      expect(mockProgress).toHaveBeenCalledWith(50, 'Converting to PDF...');
      expect(mockProgress).toHaveBeenCalledWith(70, 'Generating PDF file...');
      expect(mockProgress).toHaveBeenCalledWith(90, 'Finalizing export...');
      expect(mockProgress).toHaveBeenCalledWith(100, 'Export complete!');
    });
  });

  describe('exportFile', () => {
    it('should export document file to PDF', async () => {
      const mockProgress = jest.fn();
      const result = await exportFile(mockDocumentFile, 'pdf', mockProgress);

      expect(result.success).toBe(true);
      expect(mockProgress).toHaveBeenCalledWith(0, 'Starting export...');
    });

    it('should reject canvas export from utility function', async () => {
      const result = await exportFile(mockCanvasFile, 'png');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Canvas export must be initiated from the workspace');
    });

    it('should reject unsupported format combinations', async () => {
      const result = await exportFile(mockDocumentFile, 'png');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported export format');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document content', async () => {
      const emptyDoc = JSON.stringify({ blocks: [] });
      const result = await exportDocumentToPDF(emptyDoc, 'empty-doc');

      expect(result.success).toBe(true);
    });

    it('should handle malformed EditorJS data', async () => {
      const malformedDoc = JSON.stringify({ blocks: [{ type: 'unknown', data: {} }] });
      const result = await exportDocumentToPDF(malformedDoc, 'malformed-doc');

      expect(result.success).toBe(true); // Should still work with fallback rendering
    });

    it('should sanitize special characters in filenames', () => {
      const specialChars = 'file<>:"/\\|?*name';
      const fileName = generateExportFileName(specialChars, 'pdf');
      expect(fileName).not.toMatch(/[<>:"/\\|?*]/);
    });
  });
});