import { FileListContext } from "@/app/_context/FileListContext";
import { useFileManagement } from "@/app/_context/FileManagementContext";
import React, { useContext, useEffect, useState, useMemo } from "react";
import moment from "moment";
import { useUser } from "@/hooks/useUser";
import { Archive, MoreHorizontal, Trash2, Edit, Download, Grid3X3, List, CheckSquare, Square, Plus, Share } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteFile, renameFile } from "@/lib/data/files";
import { toast } from "sonner";
import { FileListSkeleton } from "@/components/ui/file-list-skeleton";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import ExportDropdown from "@/components/ui/export-dropdown";
import { getFileType, getAvailableFormats } from "@/lib/exportUtils";
import { FileSortDropdown } from "@/components/ui/file-sort-dropdown";
import { FileViewToggle } from "@/components/ui/file-view-toggle";
import { FileCard } from "@/components/ui/file-card";
import { BulkActionsToolbar } from "@/components/ui/bulk-actions-toolbar";
import { cn } from "@/lib/utils";
import { useDragAndDrop } from "@/app/_hooks/useDragAndDrop";
import FileShareModal from "@/components/ui/file-share-modal";
import type { FileRow, FileSummary } from "@/lib/data/files";

// List rows omit document/whiteboard; the workspace loads the full row.
export type FILE = FileSummary & Partial<Pick<FileRow, "document" | "whiteboard">>;

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface FileListProps {
  // No props needed - filtering handled through FileManagement context
}

const FileList = ({}: FileListProps = {}) => {
  const { FileList_, setFileList_ } = useContext(FileListContext);
  const {
    viewMode,
    sortFiles,
    filterFiles,
    selectedFiles,
    isSelectionMode,
    toggleSelectionMode,
    isFileSelected,
    toggleFileSelection,
    clearSelection,
    setFilters,
    filters
  } = useFileManagement();
  const [FileList, setFileList] = useState<any>();
  const [filteredFileList, setFilteredFileList] = useState<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [deleteProgress, setDeleteProgress] = useState<{[key: string]: 'loading' | 'success' | 'error' | 'idle'}>({});
  const [renameProgress, setRenameProgress] = useState<{[key: string]: 'loading' | 'success' | 'error' | 'idle'}>({});
  const [navigatingFileId, setNavigatingFileId] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [fileToShare, setFileToShare] = useState<FILE | null>(null);
  
  // Drag and drop functionality
  const {
    dragState,
    handlers,
    isDraggedFile,
    isDragOverFile,
    getDropIndicatorPosition
  } = useDragAndDrop({
    files: filteredFileList || [],
    onReorder: (reorderedFiles) => {
      setFilteredFileList(reorderedFiles);
      // Optionally persist the new order to the backend
      toast.success('Files reordered successfully');
    },
    disabled: isSelectionMode
  });
  const { user } = useUser();
  const router=useRouter();
  const db = useMemo(() => createClient(), []);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingFileId, setRenamingFileId] = useState<string>("");
  const [newFileName, setNewFileName] = useState<string>("");

  const handleDeleteFile = (fileId: string, fileName: string) => {
    if (confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      setDeleteProgress(prev => ({ ...prev, [fileId]: 'loading' }));
      
      deleteFile(db, fileId)
        .then(() => {
          setDeleteProgress(prev => ({ ...prev, [fileId]: 'success' }));
          toast.success("File deleted successfully");
          
          // Remove the deleted file from the local state after a brief delay
          setTimeout(() => {
            const updatedFileList = FileList.filter((file: FILE) => file.id !== fileId);
            setFileList(updatedFileList);
            setFileList_(updatedFileList);
            setDeleteProgress(prev => ({ ...prev, [fileId]: 'idle' }));

          }, 1000);
        })
        .catch((error) => {
          setDeleteProgress(prev => ({ ...prev, [fileId]: 'error' }));
          toast.error(error instanceof Error ? error.message : "Failed to delete file");
          
          // Reset error state after 3 seconds
          setTimeout(() => {
            setDeleteProgress(prev => ({ ...prev, [fileId]: 'idle' }));
          }, 3000);
        });
     }
   }

   const handleRenameFile = (fileId: string, currentFileName: string) => {
     setRenamingFileId(fileId);
     setNewFileName(currentFileName);
     setIsRenaming(true);
   };

   const handleShareFile = (file: FILE) => {
     setFileToShare(file);
     setShareModalOpen(true);
   };

   // Bulk operations
   const handleBulkDelete = async (fileIds: string[]) => {
     try {
       await Promise.all(fileIds.map(id => deleteFile(db, id)));
       const updatedFileList = FileList.filter((file: FILE) => !fileIds.includes(file.id));
       setFileList(updatedFileList);
       setFileList_(updatedFileList);
     } catch (error) {
       console.error('Bulk delete failed:', error);
       throw error;
     }
   };

   const handleBulkArchive = async (fileIds: string[]) => {
     // Archive functionality would be implemented here
   };

   const handleBulkExport = async (fileIds: string[]) => {
     // Bulk export functionality would be implemented here
   };

   // Process files with filtering and sorting
   const processedFiles = useMemo(() => {
     if (!FileList) return [];
     
     // Apply context filters
     let files = filterFiles(FileList);
     
     // Apply sorting
     files = sortFiles(files);
     
     return files;
   }, [FileList, filterFiles, sortFiles]);

   const confirmRename = () => {
     if (newFileName.trim() && renamingFileId) {
       setRenameProgress(prev => ({ ...prev, [renamingFileId]: 'loading' }));
       
       renameFile(db, renamingFileId, newFileName.trim())
         .then(() => {
           setRenameProgress(prev => ({ ...prev, [renamingFileId]: 'success' }));
           toast.success("File renamed successfully");
           
           // Update the file list with the new name
           const updatedFileList = FileList.map((file: FILE) => 
             file.id === renamingFileId ? { ...file, name: newFileName.trim() } : file
           );
           setFileList(updatedFileList);
           setFileList_(updatedFileList);
           
           setTimeout(() => {
             setIsRenaming(false);
             setRenamingFileId("");
             setNewFileName("");
             setRenameProgress(prev => ({ ...prev, [renamingFileId]: 'idle' }));
           }, 1000);
         })
         .catch((error) => {
           setRenameProgress(prev => ({ ...prev, [renamingFileId]: 'error' }));
           toast.error(error instanceof Error ? error.message : "Failed to rename file");
           
           // Reset error state after 3 seconds
           setTimeout(() => {
             setRenameProgress(prev => ({ ...prev, [renamingFileId]: 'idle' }));
           }, 3000);
         });
     }
   };

   const cancelRename = () => {
     setIsRenaming(false);
     setRenamingFileId("");
     setNewFileName("");
   };

  useEffect(() => {
    if (FileList_) {
      setFileList(FileList_);
      setIsLoading(false);
    }
  }, [FileList_]);

  // Update filtered file list when processed files change
  useEffect(() => {
    setFilteredFileList(processedFiles);
  }, [processedFiles]);

  // Show loading skeleton while files are being fetched
  if (isLoading || !FileList) {
    return <FileListSkeleton rows={5} />;
  }

  // Show empty state if no files or no search results
  if (filteredFileList?.length === 0) {
    if (filters.searchQuery && filters.searchQuery.trim()) {
      return (
        <div className="mt-10 text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium mb-2">No files found</p>
            <p className="text-sm">No files match your search for "{filters.searchQuery}"</p>
          </div>
        </div>
      );
    }
    return (
      <div className="mt-10 text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium mb-2">No files yet</p>
          <p className="text-sm">Create your first file to get started</p>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-10 space-y-4">
      {/* File Management Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Right side - View Controls and Actions */}
        <div className="flex items-center gap-2">
          <FileSortDropdown />
          <FileViewToggle />
          
          {/* Selection Mode Toggle */}
          <Button
            variant="outline"
            size="default"
            onClick={toggleSelectionMode}
            className={cn(
              'gap-2',
              isSelectionMode && 'bg-accent text-accent-foreground'
            )}
          >
            {isSelectionMode ? (
              <>
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Exit Select</span>
              </>
            ) : (
              <>
                <Square className="h-4 w-4" />
                <span className="hidden sm:inline">Select</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar 
        files={filteredFileList || []}
        onBulkDelete={handleBulkDelete}
        onBulkArchive={handleBulkArchive}
        onBulkExport={handleBulkExport}
      />
      
      {/* File Display */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className={cn(
          "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
          dragState.isDragging && "select-none"
        )}>
          {filteredFileList?.map((file: FILE) => (
            <FileCard
              key={file.id}
              file={file}
              onRename={handleRenameFile}
              onDelete={handleDeleteFile}
              onShare={handleShareFile}
              deleteProgress={deleteProgress}
              renameProgress={renameProgress}
              // Drag and drop props
              isDraggable={!isSelectionMode}
              isDragging={isDraggedFile(file)}
              isDragOver={isDragOverFile(file)}
              dropPosition={getDropIndicatorPosition(file)}
              onDragStart={handlers.onDragStart}
              onDragEnd={handlers.onDragEnd}
              onDragOver={handlers.onDragOver}
              onDragLeave={handlers.onDragLeave}
              onDrop={handlers.onDrop}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y-2 divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 text-sm">
            <thead className="ltr:text-left rtl:text-right bg-gray-50 dark:bg-gray-900">
              <tr>
                {/* Selection Column */}
                {isSelectionMode && (
                  <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                    <input
                      type="checkbox"
                      checked={selectedFiles.size === filteredFileList?.length && filteredFileList?.length > 0}
                      onChange={() => {
                        if (selectedFiles.size === filteredFileList?.length) {
                          clearSelection();
                        } else {
                          const allIds = filteredFileList?.map((f: FILE) => f.id) || [];
                          allIds.forEach((id: string) => {
                            if (!isFileSelected(id)) {
                              toggleFileSelection(id);
                            }
                          });
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                  Project Name
                </td>
                <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                  Created At
                </td>
                <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                  Edited
                </td>
                <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                  Author
                </td>
                <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                  Actions
                </td>
              </tr>
            </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredFileList?.map((file: FILE, index: number) => {
              const isDeleting = deleteProgress[file.id] === 'loading';
              const isRenaming = renameProgress[file.id] === 'loading';
              const hasDeleteError = deleteProgress[file.id] === 'error';
              const hasRenameError = renameProgress[file.id] === 'error';
              const isProcessing = isDeleting || isRenaming;
              const isSelected = isFileSelected(file.id);
              const isNavigating = navigatingFileId === file.id;
              
              const handleRowClick = () => {
                if (isSelectionMode) {
                  toggleFileSelection(file.id);
                } else if (!isProcessing && !isNavigating) {
                  setNavigatingFileId(file.id);
                  router.push("/workspace/" + file.id);
                  // Note: setNavigatingFileId(null) is not needed as component will unmount during navigation
                }
              };
              
              return (
                <tr key={file.id} className={cn(
                  'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                  (isProcessing || isNavigating) && 'opacity-60',
                  isSelected && 'bg-accent/50 hover:bg-accent/60'
                )} onClick={handleRowClick}>
                  
                  {/* Selection Column */}
                  {isSelectionMode && (
                    <td className="whitespace-nowrap px-4 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleFileSelection(file.id);
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}

                  <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      {file.name}
                      {isNavigating && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          Opening...
                        </span>
                      )}
                      {(isDeleting || isRenaming) && (
                        <ProgressIndicator 
                          status="loading" 
                          message={isDeleting ? "Deleting..." : "Renaming..."}
                          className="ml-2"
                        />
                      )}
                      {hasDeleteError && (
                        <ProgressIndicator 
                          status="error" 
                          message="Delete failed"
                          className="ml-2"
                        />
                      )}
                      {hasRenameError && (
                        <ProgressIndicator 
                          status="error" 
                          message="Rename failed"
                          className="ml-2"
                        />
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-gray-300">
                    {moment(file.created_at).format("DD MMM YYYY")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-gray-300">
                    {moment(file.updated_at ?? file.created_at).format("DD MMM YYYY")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-gray-300">
                    {file.created_by && file.created_by === user?.id ? "You" : ""}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-gray-300">
                    <DropdownMenu>
                      <DropdownMenuTrigger disabled={isProcessing}>
                        <MoreHorizontal className={isProcessing ? 'opacity-50' : ''} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem className="gap-2 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"> 
                          <Archive className="h-4 w-4"/>Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2" 
                          disabled={isProcessing}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameFile(file.id, file.name);
                          }}
                        >
                          <Edit className="h-4 w-4"/>Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2" 
                          disabled={isProcessing}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareFile(file);
                          }}
                        >
                          <Share className="h-4 w-4"/>Share
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
                          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50" 
                          disabled={isProcessing}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id, file.name);
                          }}
                        >
                          <Trash2 className="h-4 w-4"/>Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
      
      {/* Rename Dialog */}
      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for your project.
            </DialogDescription>
          </DialogHeader>
          
          {/* Show progress indicator if renaming */}
          {renamingFileId && renameProgress[renamingFileId] === 'loading' && (
            <ProgressIndicator 
              status="loading" 
              message="Renaming project..." 
              className="mb-4"
            />
          )}
          
          {renamingFileId && renameProgress[renamingFileId] === 'success' && (
            <ProgressIndicator 
              status="success" 
              message="Project renamed successfully!" 
              className="mb-4"
            />
          )}
          
          {renamingFileId && renameProgress[renamingFileId] === 'error' && (
            <ProgressIndicator 
              status="error" 
              message="Failed to rename project. Please try again." 
              className="mb-4"
            />
          )}
          
          <Input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="Enter project name"
            disabled={!!(renamingFileId && renameProgress[renamingFileId] === 'loading')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !renameProgress[renamingFileId]) {
                confirmRename();
              } else if (e.key === 'Escape') {
                cancelRename();
              }
            }}
          />
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={cancelRename}
              disabled={!!(renamingFileId && renameProgress[renamingFileId] === 'loading')}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmRename}
              disabled={!newFileName.trim() || !!(renamingFileId && renameProgress[renamingFileId] === 'loading')}
            >
              {renamingFileId && renameProgress[renamingFileId] === 'loading' ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Share Modal */}
      {fileToShare && (
        <FileShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setFileToShare(null);
          }}
          file={fileToShare}
        />
      )}
    </div>
  );
};

export default FileList;
