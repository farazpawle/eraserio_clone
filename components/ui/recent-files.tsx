'use client'

import * as React from 'react'
import { Clock, FileText, Image, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import moment from 'moment'

interface RecentFile {
  id: string
  name: string
  type: 'document' | 'canvas' | 'whiteboard'
  lastModified: Date
  thumbnail?: string
  teamName?: string
  onClick?: () => void
}

interface RecentFilesProps {
  files: RecentFile[]
  maxItems?: number
  showThumbnails?: boolean
  className?: string
  onFileClick?: (file: RecentFile) => void
  onFileAction?: (action: string, file: RecentFile) => void
}

const getFileIcon = (type: RecentFile['type']) => {
  switch (type) {
    case 'document':
      return FileText
    case 'canvas':
    case 'whiteboard':
      return Image
    default:
      return FileText
  }
}

const getFileTypeColor = (type: RecentFile['type']) => {
  switch (type) {
    case 'document':
      return 'text-blue-600 dark:text-blue-400'
    case 'canvas':
      return 'text-green-600 dark:text-green-400'
    case 'whiteboard':
      return 'text-purple-600 dark:text-purple-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

const RecentFiles = React.forwardRef<
  HTMLDivElement,
  RecentFilesProps
>(({ 
  files, 
  maxItems = 5, 
  showThumbnails = false, 
  className, 
  onFileClick,
  onFileAction,
  ...props 
}, ref) => {
  const displayFiles = files.slice(0, maxItems)
  const [loadingFileId, setLoadingFileId] = React.useState<string | null>(null)

  const handleFileClick = (file: RecentFile) => {
    setLoadingFileId(file.id)
    if (file.onClick) {
      file.onClick()
    } else if (onFileClick) {
      onFileClick(file)
    }
    // Note: setLoadingFileId(null) is not needed as component will likely unmount during navigation
  }

  const handleFileAction = (action: string, file: RecentFile) => {
    if (onFileAction) {
      onFileAction(action, file)
    }
  }

  if (displayFiles.length === 0) {
    return (
      <div
        ref={ref}
        className={cn(
          'p-4 text-center text-gray-500 dark:text-gray-400',
          className
        )}
        {...props}
      >
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent files</p>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={cn('space-y-1', className)}
      {...props}
    >
      <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        <Clock className="h-3 w-3" />
        Recent Files
      </div>
      
      {displayFiles.map((file) => {
        const FileIcon = getFileIcon(file.type)
        const iconColor = getFileTypeColor(file.type)
        
        const isLoading = loadingFileId === file.id
        
        return (
          <div
            key={file.id}
            className={cn(
              "group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors",
              isLoading && "opacity-60 cursor-not-allowed"
            )}
            onClick={() => !isLoading && handleFileClick(file)}
          >
            {/* File Icon or Thumbnail */}
            <div className="flex-shrink-0">
              {showThumbnails && file.thumbnail ? (
                <div className="w-8 h-8 rounded border border-gray-200 dark:border-gray-600 overflow-hidden">
                  {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : (
                    <img
                      src={file.thumbnail}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ) : (
                <div className="w-8 h-8 flex items-center justify-center">
                  {isLoading ? (
                    <LoadingSpinner size="sm" className={iconColor} />
                  ) : (
                    <FileIcon className={cn('h-4 w-4', iconColor)} />
                  )}
                </div>
              )}
            </div>
            
            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {file.name}
                {isLoading && (
                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                    Opening...
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                {file.teamName && (
                  <>
                    <span className="truncate">{file.teamName}</span>
                    <span>•</span>
                  </>
                )}
                <span>{moment(file.lastModified).fromNow()}</span>
              </div>
            </div>
            
            {/* Actions Menu */}
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFileAction('open', file)
                    }}
                  >
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFileAction('rename', file)
                    }}
                  >
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFileAction('duplicate', file)
                    }}
                  >
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFileAction('delete', file)
                    }}
                    className="text-red-600 dark:text-red-400"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )
      })}
      
      {files.length > maxItems && (
        <div className="px-2 py-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            onClick={() => handleFileAction('view-all', files[0])}
          >
            View all {files.length} files
          </Button>
        </div>
      )}
    </div>
  )
})

RecentFiles.displayName = 'RecentFiles'

export { RecentFiles, type RecentFile, type RecentFilesProps }