'use client'

import * as React from 'react'
import { MoreHorizontal, FileText, Image, Calendar, User, Archive, Edit, Trash2, Download, Share } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FILE } from '@/app/dashboard/_components/FileList'
import { useFileManagement } from '@/app/_context/FileManagementContext'
import { ProgressIndicator } from '@/components/ui/progress-indicator'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import ExportDropdown from '@/components/ui/export-dropdown'
import moment from 'moment'
import { useRouter } from 'next/navigation'

interface FileCardProps {
  file: FILE
  onRename?: (fileId: string, fileName: string) => void
  onDelete?: (fileId: string, fileName: string) => void
  onShare?: (file: FILE) => void
  onArchive?: (fileId: string) => void
  deleteProgress?: { [key: string]: 'loading' | 'success' | 'error' | 'idle' }
  renameProgress?: { [key: string]: 'loading' | 'success' | 'error' | 'idle' }
  className?: string
  showThumbnail?: boolean
  // Drag and drop props
  isDraggable?: boolean
  isDragging?: boolean
  isDragOver?: boolean
  dropPosition?: 'before' | 'after' | null
  onDragStart?: (file: FILE) => void
  onDragEnd?: () => void
  onDragOver?: (e: React.DragEvent, file: FILE) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent, file: FILE) => void
}

const getFileIcon = (file: FILE) => {
  const hasDocument = file.document && file.document.trim() !== ''
  const hasWhiteboard = file.whiteboard && file.whiteboard.trim() !== ''
  
  if (hasWhiteboard) {
    return Image
  }
  return FileText
}

const getFileType = (file: FILE): string => {
  const hasDocument = file.document && file.document.trim() !== ''
  const hasWhiteboard = file.whiteboard && file.whiteboard.trim() !== ''
  
  if (hasWhiteboard) {
    return 'Whiteboard'
  }
  if (hasDocument) {
    return 'Document'
  }
  return 'File'
}

const FileCard = React.forwardRef<
  HTMLDivElement,
  FileCardProps
>(({ 
  file, 
  onRename, 
  onDelete, 
  onShare,
  onArchive,
  deleteProgress = {},
  renameProgress = {},
  className,
  showThumbnail = false,
  // Drag and drop props
  isDraggable = false,
  isDragging = false,
  isDragOver = false,
  dropPosition = null,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  ...props 
}, ref) => {
  const router = useRouter()
  const { isSelectionMode, isFileSelected, toggleFileSelection } = useFileManagement()
  const [isNavigating, setIsNavigating] = React.useState(false)
  
  const isSelected = isFileSelected(file._id)
  const isDeleting = deleteProgress[file._id] === 'loading'
  const isRenaming = renameProgress[file._id] === 'loading'
  const hasDeleteError = deleteProgress[file._id] === 'error'
  const hasRenameError = renameProgress[file._id] === 'error'
  const isProcessing = isDeleting || isRenaming
  
  const FileIcon = getFileIcon(file)
  const fileType = getFileType(file)
  
  const handleCardClick = () => {
    if (isSelectionMode) {
      toggleFileSelection(file._id)
    } else if (!isProcessing && !isNavigating) {
      // Show immediate feedback that the click was registered
      setIsNavigating(true)
      router.push(`/wokspace/${file._id}`)
      // Note: setIsNavigating(false) is not needed as component will unmount during navigation
    }
  }
  
  const handleSelectionToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFileSelection(file._id)
  }
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    toggleFileSelection(file._id)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable || isProcessing) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', file._id)
    onDragStart?.(file)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    onDragEnd?.()
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!isDraggable || isProcessing) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDragOver?.(e, file)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    onDragLeave?.()
  }

  const handleDrop = (e: React.DragEvent) => {
    if (!isDraggable || isProcessing) return
    e.preventDefault()
    onDrop?.(e, file)
  }

  return (
    <div
      ref={ref}
      className={cn(
        'group relative rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:shadow-md cursor-pointer',
        isSelected && 'ring-2 ring-primary ring-offset-2 bg-accent/50',
        (isProcessing || isNavigating) && 'opacity-60 cursor-not-allowed',
        isDragging && 'opacity-50 scale-95 rotate-2 shadow-lg z-10',
        isDragOver && 'ring-2 ring-blue-500 ring-offset-2',
        isDraggable && !isProcessing && !isNavigating && 'hover:scale-[1.02]',
        className
      )}
      draggable={isDraggable && !isProcessing && !isNavigating && !isSelectionMode}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCardClick}
      {...props}
    >
      {/* Drop Indicator */}
      {isDragOver && dropPosition && (
        <div className={cn(
          'absolute left-0 right-0 h-0.5 bg-blue-500 z-20',
          dropPosition === 'before' ? '-top-1' : '-bottom-1'
        )} />
      )}
      {/* Selection Checkbox */}
      {(isSelectionMode || isSelected) && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      
      {/* File Icon/Thumbnail */}
      <div className="flex items-center justify-center mb-3">
        {showThumbnail ? (
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
            <FileIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            fileType === 'Whiteboard' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
            'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
          )}>
            {isNavigating ? (
              <LoadingSpinner size="sm" className="text-current" />
            ) : (
              <FileIcon className="h-6 w-6" />
            )}
          </div>
        )}
      </div>
      
      {/* File Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm text-card-foreground truncate flex-1">
            {file.fileName}
            {isNavigating && (
              <span className="ml-2 text-xs text-muted-foreground">
                Opening...
              </span>
            )}
          </h3>
          
          {/* Actions Menu */}
          {!isSelectionMode && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    disabled={isProcessing}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem 
                    className="gap-2" 
                    onClick={(e) => {
                      e.stopPropagation()
                      onArchive?.(file._id)
                    }}
                  >
                    <Archive className="h-4 w-4" />Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="gap-2" 
                    disabled={isProcessing}
                    onClick={(e) => {
                      e.stopPropagation()
                      onRename?.(file._id, file.fileName)
                    }}
                  >
                    <Edit className="h-4 w-4" />Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="gap-2" 
                    disabled={isProcessing}
                    onClick={(e) => {
                      e.stopPropagation()
                      onShare?.(file)
                    }}
                  >
                    <Share className="h-4 w-4" />Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="px-1">
                    <ExportDropdown 
                      file={file}
                      variant="ghost"
                      size="sm"
                      disabled={isProcessing}
                      className="w-full justify-start h-8 px-2 py-1.5 text-sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </ExportDropdown>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="gap-2 text-destructive hover:text-destructive" 
                    disabled={isProcessing}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete?.(file._id, file.fileName)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        
        {/* File Type Badge */}
        <div className="flex items-center gap-1">
          <span className={cn(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
            fileType === 'Whiteboard' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' :
            'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
          )}>
            {fileType}
          </span>
        </div>
        
        {/* File Metadata */}
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Created: {moment(file._creationTime).format('MMM DD, YYYY')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Edited: {moment(file.lastModified || file._creationTime).format('MMM DD, YYYY')}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate">{file.createdBy}</span>
          </div>
        </div>
        
        {/* Progress Indicators */}
        {(isDeleting || isRenaming || hasDeleteError || hasRenameError) && (
          <div className="mt-2">
            {isDeleting && (
              <ProgressIndicator 
                status="loading" 
                message="Deleting..."
                className="text-xs"
              />
            )}
            {isRenaming && (
              <ProgressIndicator 
                status="loading" 
                message="Renaming..."
                className="text-xs"
              />
            )}
            {hasDeleteError && (
              <ProgressIndicator 
                status="error" 
                message="Delete failed"
                className="text-xs"
              />
            )}
            {hasRenameError && (
              <ProgressIndicator 
                status="error" 
                message="Rename failed"
                className="text-xs"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
})

FileCard.displayName = 'FileCard'

export { FileCard }
export type { FileCardProps }