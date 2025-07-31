'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FILE } from '@/app/dashboard/_components/FileList';

export type ViewMode = 'list' | 'grid';
export type SortOption = 'name' | 'date' | 'author' | 'modified';
export type SortDirection = 'asc' | 'desc';

export interface FileFilter {
  searchQuery: string;
  fileType?: 'document' | 'whiteboard' | 'all';
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  author?: string;
}

export interface FileManagementState {
  viewMode: ViewMode;
  sortBy: SortOption;
  sortDirection: SortDirection;
  selectedFiles: Set<string>;
  filters: FileFilter;
  isSelectionMode: boolean;
}

export interface FileManagementContextType {
  // State
  viewMode: ViewMode;
  sortBy: SortOption;
  sortDirection: SortDirection;
  selectedFiles: Set<string>;
  filters: FileFilter;
  isSelectionMode: boolean;
  newFileDialogOpen: boolean;
  
  // Actions
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sort: SortOption) => void;
  setSortDirection: (direction: SortDirection) => void;
  toggleSortDirection: () => void;
  selectFile: (fileId: string) => void;
  deselectFile: (fileId: string) => void;
  selectAllFiles: (fileIds: string[]) => void;
  clearSelection: () => void;
  toggleFileSelection: (fileId: string) => void;
  setFilters: (filters: Partial<FileFilter>) => void;
  clearFilters: () => void;
  toggleSelectionMode: () => void;
  setNewFileDialogOpen: (open: boolean) => void;
  openNewFileDialog: () => void;
  
  // Computed
  selectedCount: number;
  hasSelection: boolean;
  isFileSelected: (fileId: string) => boolean;
  
  // Utilities
  sortFiles: (files: FILE[]) => FILE[];
  filterFiles: (files: FILE[]) => FILE[];
}

const FileManagementContext = createContext<FileManagementContextType | undefined>(undefined);

const defaultFilters: FileFilter = {
  searchQuery: '',
  fileType: 'all',
};

interface FileManagementProviderProps {
  children: ReactNode;
}

export const FileManagementProvider: React.FC<FileManagementProviderProps> = ({ children }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [filters, setFiltersState] = useState<FileFilter>(defaultFilters);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);

  // Actions
  const toggleSortDirection = useCallback(() => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  const selectFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => new Set([...Array.from(prev), fileId]));
  }, []);

  const deselectFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  }, []);

  const selectAllFiles = useCallback((fileIds: string[]) => {
    setSelectedFiles(new Set(fileIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
    setIsSelectionMode(false);
  }, []);

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  }, []);

  const setFilters = useCallback((newFilters: Partial<FileFilter>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
      if (prev) {
        // Exiting selection mode, clear selections
        setSelectedFiles(new Set());
      }
      return !prev;
    });
  }, []);

  const openNewFileDialog = useCallback(() => {
    setNewFileDialogOpen(true);
  }, []);

  // Computed values
  const selectedCount = selectedFiles.size;
  const hasSelection = selectedCount > 0;
  const isFileSelected = useCallback((fileId: string) => selectedFiles.has(fileId), [selectedFiles]);

  // Utility functions
  const sortFiles = useCallback((files: FILE[]): FILE[] => {
    return [...files].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.fileName.localeCompare(b.fileName);
          break;
        case 'date':
          comparison = a._creationTime - b._creationTime;
          break;
        case 'modified':
          comparison = (a.lastModified || a._creationTime) - (b.lastModified || b._creationTime);
          break;
        case 'author':
          comparison = a.createdBy.localeCompare(b.createdBy);
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [sortBy, sortDirection]);

  const filterFiles = useCallback((files: FILE[]): FILE[] => {
    return files.filter(file => {
      // Search query filter
      if (filters.searchQuery && !file.fileName.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        return false;
      }
      
      // File type filter
      if (filters.fileType && filters.fileType !== 'all') {
        const hasDocument = file.document && file.document.trim() !== '';
        const hasWhiteboard = file.whiteboard && file.whiteboard.trim() !== '';
        
        if (filters.fileType === 'document' && !hasDocument) {
          return false;
        }
        if (filters.fileType === 'whiteboard' && !hasWhiteboard) {
          return false;
        }
      }
      
      // Date range filter
      if (filters.dateRange) {
        const fileDate = new Date(file._creationTime);
        if (filters.dateRange.start && fileDate < filters.dateRange.start) {
          return false;
        }
        if (filters.dateRange.end && fileDate > filters.dateRange.end) {
          return false;
        }
      }
      
      // Author filter
      if (filters.author && !file.createdBy.toLowerCase().includes(filters.author.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [filters]);

  const contextValue: FileManagementContextType = {
    // State
    viewMode,
    sortBy,
    sortDirection,
    selectedFiles,
    filters,
    isSelectionMode,
    newFileDialogOpen,
    
    // Actions
    setViewMode,
    setSortBy,
    setSortDirection,
    toggleSortDirection,
    selectFile,
    deselectFile,
    selectAllFiles,
    clearSelection,
    toggleFileSelection,
    setFilters,
    clearFilters,
    toggleSelectionMode,
    setNewFileDialogOpen,
    openNewFileDialog,
    
    // Computed
    selectedCount,
    hasSelection,
    isFileSelected,
    
    // Utilities
    sortFiles,
    filterFiles,
  };

  return (
    <FileManagementContext.Provider value={contextValue}>
      {children}
    </FileManagementContext.Provider>
  );
};

export const useFileManagement = (): FileManagementContextType => {
  const context = useContext(FileManagementContext);
  if (!context) {
    throw new Error('useFileManagement must be used within a FileManagementProvider');
  }
  return context;
};

export default FileManagementContext;