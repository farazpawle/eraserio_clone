'use client'

import * as React from 'react'
import { X, Trash2, Archive, Download, Edit, Copy, Move, CheckSquare, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useFileManagement } from '@/app/_context/FileManagementContext'
import { FILE } from '@/app/dashboard/_components/FileList'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface BulkActionsToolbarProps {
  files: FILE[]
  onBulkDelete?: (fileIds: string[]) => Promise<void>
  onBulkArchive?: (fileIds: string[]) => Promise<void>
  onBulkExport?: (fileIds: string[]) => Promise<void>
  className?: string
  isProcessing?: boolean
}

const BulkActionsToolbar = React.forwardRef<
  HTMLDivElement,
  BulkActionsToolbarProps
>(({ 
  files, 
  onBulkDelete, 
  onBulkArchive, 
  onBulkExport,
  className,
  isProcessing = false,
  ...props 
}, ref) => {
  const {
    selectedFiles,
    selectedCount,
    hasSelection,
    clearSelection,
    selectAllFiles,
    isSelectionMode,
    toggleSelectionMode
  } = useFileManagement()
  
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isArchiving, setIsArchiving] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  
  const selectedFileIds = Array.from(selectedFiles)
  const allFileIds = files.map(file => file._id)
  const isAllSelected = selectedCount === files.length && files.length > 0
  const isPartiallySelected = selectedCount > 0 && selectedCount < files.length
  
  // Don't render if not in selection mode or no files
  if (!isSelectionMode || files.length === 0) {
    return null
  }
  
  const handleSelectAll = () => {
    if (isAllSelected) {
      clearSelection()
    } else {
      selectAllFiles(allFileIds)
    }
  }
  
  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedFileIds.length === 0) return
    
    setIsDeleting(true)
    try {
      await onBulkDelete(selectedFileIds)
      toast.success(`Successfully deleted ${selectedFileIds.length} file(s)`)
      clearSelection()
    } catch (error) {
      console.error('Bulk delete failed:', error)
      toast.error('Failed to delete files')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }
  
  const handleBulkArchive = async () => {
    if (!onBulkArchive || selectedFileIds.length === 0) return
    
    setIsArchiving(true)
    try {
      await onBulkArchive(selectedFileIds)
      toast.success(`Successfully archived ${selectedFileIds.length} file(s)`)
      clearSelection()
    } catch (error) {
      console.error('Bulk archive failed:', error)
      toast.error('Failed to archive files')
    } finally {
      setIsArchiving(false)
    }
  }
  
  const handleBulkExport = async () => {
    if (!onBulkExport || selectedFileIds.length === 0) return
    
    setIsExporting(true)
    try {
      await onBulkExport(selectedFileIds)
      toast.success(`Successfully exported ${selectedFileIds.length} file(s)`)
    } catch (error) {
      console.error('Bulk export failed:', error)
      toast.error('Failed to export files')
    } finally {
      setIsExporting(false)
    }
  }
  
  const getSelectionText = () => {
    if (selectedCount === 0) {
      return 'No files selected'
    }
    if (selectedCount === 1) {
      return '1 file selected'
    }
    return `${selectedCount} files selected`
  }

  return (
    <>
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between p-3 bg-accent/50 border border-border rounded-lg shadow-sm',
          'animate-in slide-in-from-top-2 duration-200',
          className
        )}
        {...props}
      >
        {/* Left side - Selection info and controls */}
        <div className="flex items-center gap-3">
          {/* Select All Checkbox */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="h-8 w-8 p-0"
            disabled={isProcessing}
          >
            {isAllSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : isPartiallySelected ? (
              <div className="h-4 w-4 border-2 border-primary bg-primary/20 rounded-sm flex items-center justify-center">
                <div className="h-2 w-2 bg-primary rounded-sm" />
              </div>
            ) : (
              <Square className="h-4 w-4" />
            )}
          </Button>
          
          {/* Selection count */}
          <span className="text-sm font-medium text-foreground">
            {getSelectionText()}
          </span>
          
          {hasSelection && (
            <>
              <Separator orientation="vertical" className="h-4" />
              
              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkArchive}
                  disabled={isProcessing || isArchiving}
                  className="h-8 gap-2"
                >
                  <Archive className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {isArchiving ? 'Archiving...' : 'Archive'}
                  </span>
                </Button>
                
                {onBulkExport && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBulkExport}
                    disabled={isProcessing || isExporting}
                    className="h-8 gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {isExporting ? 'Exporting...' : 'Export'}
                    </span>
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isProcessing || isDeleting}
                  className="h-8 gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </span>
                </Button>
              </div>
            </>
          )}
        </div>
        
        {/* Right side - Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearSelection()
            toggleSelectionMode()
          }}
          className="h-8 w-8 p-0"
          disabled={isProcessing}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Files</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} file{selectedCount !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})

BulkActionsToolbar.displayName = 'BulkActionsToolbar'

export { BulkActionsToolbar }
export type { BulkActionsToolbarProps }