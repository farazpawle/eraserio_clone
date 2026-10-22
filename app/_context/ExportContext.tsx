'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { FILE } from '@/app/dashboard/_components/FileList';
import { ExportResult, ExportProgressCallback, exportFile, batchExportFiles } from '@/lib/exportUtils';
import { toast } from 'sonner';

// Export state interface
interface ExportState {
  isExporting: boolean;
  progress: number;
  message: string;
  currentFile?: string;
}

// Export context interface
interface ExportContextType {
  exportState: ExportState;
  exportSingleFile: (file: FILE, format: string) => Promise<ExportResult>;
  exportMultipleFiles: (files: FILE[], format: string) => Promise<ExportResult[]>;
  resetExportState: () => void;
}

// Create context
const ExportContext = createContext<ExportContextType | undefined>(undefined);

// Export provider component
interface ExportProviderProps {
  children: ReactNode;
}

const ExportProvider: React.FC<ExportProviderProps> = ({ children }) => {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    message: '',
    currentFile: undefined
  });

  // Progress callback for tracking export progress
  const createProgressCallback = useCallback((fileName?: string): ExportProgressCallback => {
    return (progress: number, message: string) => {
      setExportState(prev => ({
        ...prev,
        progress,
        message,
        currentFile: fileName
      }));
    };
  }, []);

  // Export single file
  const exportSingleFile = useCallback(async (
    file: FILE,
    format: string
  ): Promise<ExportResult> => {
    try {
      setExportState({
        isExporting: true,
        progress: 0,
        message: 'Starting export...',
        currentFile: file.name
      });

      const progressCallback = createProgressCallback(file.name);
      const result = await exportFile(file, format, progressCallback);

      if (result.success) {
        toast.success(`Successfully exported ${file.name} as ${format.toUpperCase()}`);
      } else {
        toast.error(`Failed to export ${file.name}: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Export failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setExportState({
        isExporting: false,
        progress: 100,
        message: 'Export complete',
        currentFile: undefined
      });
    }
  }, [createProgressCallback]);

  // Export multiple files
  const exportMultipleFiles = useCallback(async (
    files: FILE[],
    format: string
  ): Promise<ExportResult[]> => {
    try {
      setExportState({
        isExporting: true,
        progress: 0,
        message: 'Starting batch export...',
        currentFile: undefined
      });

      const progressCallback = createProgressCallback();
      const results = await batchExportFiles(files, format, progressCallback);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      if (failureCount === 0) {
        toast.success(`Successfully exported all ${files.length} files as ${format.toUpperCase()}`);
      } else if (successCount === 0) {
        toast.error(`Failed to export all ${files.length} files`);
      } else {
        toast.warning(`Exported ${successCount} files successfully, ${failureCount} failed`);
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Batch export failed: ${errorMessage}`);
      return files.map(() => ({
        success: false,
        error: errorMessage
      }));
    } finally {
      setExportState({
        isExporting: false,
        progress: 100,
        message: 'Batch export complete',
        currentFile: undefined
      });
    }
  }, [createProgressCallback]);

  // Reset export state
  const resetExportState = useCallback(() => {
    setExportState({
      isExporting: false,
      progress: 0,
      message: '',
      currentFile: undefined
    });
  }, []);

  const contextValue: ExportContextType = {
    exportState,
    exportSingleFile,
    exportMultipleFiles,
    resetExportState
  };

  return (
    <ExportContext.Provider value={contextValue}>
      {children}
    </ExportContext.Provider>
  );
};

// Hook to use export context
export const useExportContext = (): ExportContextType => {
  const context = useContext(ExportContext);
  if (!context) {
    throw new Error('useExportContext must be used within an ExportProvider');
  }
  return context;
};

export default ExportProvider;
export type { ExportState, ExportContextType };