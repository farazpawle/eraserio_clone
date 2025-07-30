'use client';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Download, Loader2 } from 'lucide-react';
import { useExportContext } from '@/app/_context/ExportContext';

// Export progress modal props
interface ExportProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
  isOpen,
  onClose
}) => {
  const { exportState, resetExportState } = useExportContext();

  // Handle modal close
  const handleClose = () => {
    if (!exportState.isExporting) {
      resetExportState();
      onClose();
    }
  };

  // Get progress color based on state
  const getProgressColor = () => {
    if (exportState.progress === 100 && !exportState.isExporting) {
      return 'bg-green-500';
    }
    return 'bg-blue-500';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (exportState.isExporting) {
      return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
    } else if (exportState.progress === 100) {
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    } else {
      return <XCircle className="h-6 w-6 text-red-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Progress</span>
          </DialogTitle>
          <DialogDescription>
            {exportState.isExporting 
              ? 'Please wait while your files are being exported...' 
              : 'Export operation completed'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{exportState.progress}%</span>
            </div>
            <Progress 
              value={exportState.progress} 
              className="h-2"
            />
          </div>
          
          {/* Status message */}
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
            {getStatusIcon()}
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">
                {exportState.message || 'Processing...'}
              </p>
              {exportState.currentFile && (
                <p className="text-xs text-muted-foreground">
                  Current file: {exportState.currentFile}
                </p>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-end space-x-2">
            {!exportState.isExporting && (
              <Button onClick={handleClose} variant="default">
                Close
              </Button>
            )}
            {exportState.isExporting && (
              <Button disabled variant="outline">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportProgressModal;
export type { ExportProgressModalProps };