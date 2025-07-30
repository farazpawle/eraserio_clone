'use client';
import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, FileText, Image, FileImage, Loader2 } from 'lucide-react';
import { FILE } from '@/app/dashboard/_components/FileList';
import { getFileType, getAvailableFormats } from '@/lib/exportUtils';
import { useExportContext } from '@/app/_context/ExportContext';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { toast } from 'sonner';

// Export dropdown props
interface ExportDropdownProps {
  file?: FILE;
  files?: FILE[];
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Format icon mapping
const formatIcons = {
  pdf: FileText,
  png: Image,
  svg: FileImage,
};

// Format labels
const formatLabels = {
  pdf: 'Export as PDF',
  png: 'Export as PNG',
  svg: 'Export as SVG',
};

const ExportDropdown: React.FC<ExportDropdownProps> = ({
  file,
  files,
  variant = 'default',
  size = 'default',
  disabled = false,
  className = '',
  children
}) => {
  const { exportState, exportSingleFile, exportMultipleFiles } = useExportContext();
  const [isOpen, setIsOpen] = useState(false);

  // Determine available formats
  const availableFormats = React.useMemo(() => {
    if (file) {
      return getAvailableFormats(file);
    } else if (files && files.length > 0) {
      // For multiple files, find common formats
      const allFormats = files.map(f => getAvailableFormats(f));
      return allFormats.reduce((common, formats) => 
        common.filter(format => formats.includes(format))
      );
    }
    return [];
  }, [file, files]);

  // Handle export action
  const handleExport = async (format: string) => {
    setIsOpen(false);
    
    try {
      if (file) {
        // Single file export
        const fileType = getFileType(file);
        
        if (fileType === 'canvas' && (format === 'png' || format === 'svg')) {
          // For canvas files, show a message to use workspace export
          toast.info('Please use the export option in the workspace for canvas files');
          return;
        }
        
        await exportSingleFile(file, format);
      } else if (files && files.length > 0) {
        // Multiple files export
        const documentFiles = files.filter(f => getFileType(f) === 'document');
        
        if (format === 'pdf' && documentFiles.length > 0) {
          await exportMultipleFiles(documentFiles, format);
        } else {
          toast.warning('Canvas files must be exported individually from the workspace');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed. Please try again.');
    }
  };

  // Render format menu items
  const renderFormatItems = () => {
    return availableFormats.map((format) => {
      const Icon = formatIcons[format as keyof typeof formatIcons];
      const label = formatLabels[format as keyof typeof formatLabels];
      
      return (
        <DropdownMenuItem
          key={format}
          onClick={() => handleExport(format)}
          disabled={exportState.isExporting}
          className="cursor-pointer"
        >
          <Icon className="mr-2 h-4 w-4" />
          {label}
        </DropdownMenuItem>
      );
    });
  };

  // Show progress indicator when exporting
  if (exportState.isExporting) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">
          {exportState.message}
        </span>
        {exportState.progress > 0 && (
          <ProgressIndicator 
            status="loading"
            progress={exportState.progress} 
            className="w-20"
          />
        )}
      </div>
    );
  }

  // Don't render if no formats available
  if (availableFormats.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || exportState.isExporting}
          className={className}
        >
          {children || (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>
          {file ? 'Export File' : files ? `Export ${files.length} Files` : 'Export'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {renderFormatItems()}
        {file && getFileType(file) === 'canvas' && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Canvas files can be exported from the workspace
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportDropdown;
export type { ExportDropdownProps };