import { FileListContext } from "@/app/_context/FileListContext";
import React, { useContext, useEffect, useState } from "react";
import moment from "moment";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { Archive, MoreHorizontal, Trash2, Edit, Download } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { FileListSkeleton } from "@/components/ui/file-list-skeleton";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import ExportDropdown from "@/components/ui/export-dropdown";
import { getFileType, getAvailableFormats } from "@/lib/exportUtils";

export interface FILE {
  archive: boolean;
  createdBy: string;
  document: string;
  fileName: string;
  teamId: string;
  whiteboard: string;
  _id: string;
  _creationTime: number;
}

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

const FileList = () => {
  const { FileList_, setFileList_ } = useContext(FileListContext);
  const [FileList, setFileList] = useState<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [deleteProgress, setDeleteProgress] = useState<{[key: string]: 'loading' | 'success' | 'error' | 'idle'}>({});
  const [renameProgress, setRenameProgress] = useState<{[key: string]: 'loading' | 'success' | 'error' | 'idle'}>({});
  const { user } = useKindeBrowserClient();
  const router=useRouter();
  const deleteFile = useMutation(api.files.deleteFile);
  const renameFile = useMutation(api.files.renameFile);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingFileId, setRenamingFileId] = useState<string>("");
  const [newFileName, setNewFileName] = useState<string>("");

  const handleDeleteFile = (fileId: string, fileName: string) => {
    if (confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      setDeleteProgress(prev => ({ ...prev, [fileId]: 'loading' }));
      
      deleteFile({ _id: fileId as any })
        .then(() => {
          setDeleteProgress(prev => ({ ...prev, [fileId]: 'success' }));
          toast.success("File deleted successfully");
          
          // Remove the deleted file from the local state after a brief delay
          setTimeout(() => {
            const updatedFileList = FileList.filter((file: FILE) => file._id !== fileId);
            setFileList(updatedFileList);
            setFileList_(updatedFileList);
            setDeleteProgress(prev => ({ ...prev, [fileId]: 'idle' }));

          }, 1000);
        })
        .catch((error) => {
          console.error("Error deleting file:", error);
          setDeleteProgress(prev => ({ ...prev, [fileId]: 'error' }));
          toast.error("Failed to delete file");
          
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

   const confirmRename = () => {
     if (newFileName.trim() && renamingFileId) {
       setRenameProgress(prev => ({ ...prev, [renamingFileId]: 'loading' }));
       
       renameFile({ _id: renamingFileId as any, fileName: newFileName.trim() })
         .then(() => {
           setRenameProgress(prev => ({ ...prev, [renamingFileId]: 'success' }));
           toast.success("File renamed successfully");
           
           // Update the file list with the new name
           const updatedFileList = FileList.map((file: FILE) => 
             file._id === renamingFileId ? { ...file, fileName: newFileName.trim() } : file
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
           console.error("Error renaming file:", error);
           setRenameProgress(prev => ({ ...prev, [renamingFileId]: 'error' }));
           toast.error("Failed to rename file");
           
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
    console.log(FileList_);
  }, [FileList_]);

  // Show loading skeleton while files are being fetched
  if (isLoading || !FileList) {
    return <FileListSkeleton rows={5} />;
  }

  // Show empty state if no files
  if (FileList.length === 0) {
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
    <div className="mt-10">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y-2 divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 text-sm">
          <thead className="ltr:text-left rtl:text-right bg-gray-50 dark:bg-gray-900">
            <tr>

              <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                File Name
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
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {FileList?.map((file: FILE, index: number) => {
              const isDeleting = deleteProgress[file._id] === 'loading';
              const isRenaming = renameProgress[file._id] === 'loading';
              const hasDeleteError = deleteProgress[file._id] === 'error';
              const hasRenameError = renameProgress[file._id] === 'error';
              const isProcessing = isDeleting || isRenaming;
              
              return (
                <tr key={file._id} className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  isProcessing ? 'opacity-60' : ''
                }`} onClick={()=>!isProcessing && router.push("/wokspace/"+file._id)}>

                  <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      {file.fileName}
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
                    {moment(file._creationTime).format("DD MMM YYYY")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-gray-300">
                    {moment(file._creationTime).format("DD MMM YYYY")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-gray-300">
                    {user?.given_name}
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
                            handleRenameFile(file._id, file.fileName);
                          }}
                        >
                          <Edit className="h-4 w-4"/>Rename
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
                            handleDeleteFile(file._id, file.fileName);
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
      
      {/* Rename Dialog */}
      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Enter a new name for your file.
            </DialogDescription>
          </DialogHeader>
          
          {/* Show progress indicator if renaming */}
          {renamingFileId && renameProgress[renamingFileId] === 'loading' && (
            <ProgressIndicator 
              status="loading" 
              message="Renaming file..." 
              className="mb-4"
            />
          )}
          
          {renamingFileId && renameProgress[renamingFileId] === 'success' && (
            <ProgressIndicator 
              status="success" 
              message="File renamed successfully!" 
              className="mb-4"
            />
          )}
          
          {renamingFileId && renameProgress[renamingFileId] === 'error' && (
            <ProgressIndicator 
              status="error" 
              message="Failed to rename file. Please try again." 
              className="mb-4"
            />
          )}
          
          <Input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="Enter file name"
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
    </div>
  );
};

export default FileList;
