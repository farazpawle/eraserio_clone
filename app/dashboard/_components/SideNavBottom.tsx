'use client'
import { Button } from '@/components/ui/button'
import { Archive, Flag, Github } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { RecentFiles, RecentFile } from '@/components/ui/recent-files'
import { useRouter } from 'next/navigation'
import { useFileManagement } from '@/app/_context/FileManagementContext'

  

interface SideNavBottomProps {
  onFileCreate: (fileName: string) => void;
  Files: any;
  isCreating: boolean;
}

const SideNavBottom = ({onFileCreate,Files,isCreating}:SideNavBottomProps) => {
  // useEffect(()=>{

  // },[Files])
    const [FileName,setFileName]=useState('');
    const router = useRouter();
    const { newFileDialogOpen, setNewFileDialogOpen } = useFileManagement();
    
    // Convert Files to RecentFile format
    const recentFiles: RecentFile[] = Files && Array.isArray(Files) ? Files.slice(0, 5).map((file: any) => ({
      id: file.id,
      name: file.name,
      type: file.document ? 'document' : 'canvas',
      lastModified: new Date(file.updated_at ?? file.created_at),
    })) : [];
    
    const handleDialogChange = (open: boolean) => {
      setNewFileDialogOpen(open);
    };
    
    const handleCreateFile = () => {
      if (FileName && FileName.length > 0 && !isCreating) {
        onFileCreate(FileName);
        setFileName(''); // Clear the input after creating
        handleDialogChange(false); // Close the dialog
      }
    };
    
    // Handle recent file actions
    const handleRecentFileClick = (file: RecentFile) => {
        router.push(`/workspace/${file.id}`);
    };
    
    const handleRecentFileAction = (action: string, file: RecentFile) => {
        switch (action) {
            case 'open':
                router.push(`/workspace/${file.id}`);
                break;
            case 'view-all':
                // Could navigate to a full files view
                break;
            default:
                console.log(`Action ${action} not implemented for file ${file.name}`);
        }
    };
    const menuList=[{
        id:1,
        name:'Getting started',
        icon:Flag,
        path:''
    },{
        id:2,
        name:'Github',
        icon:Github,
        path:''


    },{
        id:3,
        name:'Archive',
        icon:Archive,
        path:''

    }]
  return (
    <div>
         {/* Recent Files Section */}
         {recentFiles.length > 0 && (
           <div className="mb-4">
             <RecentFiles 
               files={recentFiles}
               maxItems={3}
               onFileClick={handleRecentFileClick}
               onFileAction={handleRecentFileAction}
               className="text-sm"
             />
           </div>
         )}
         
         {menuList.map((item, index) => (
            <h2
              key={index}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex gap-2 items-center cursor-pointer text-gray-900 dark:text-gray-100"
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </h2>
          ))}
          {/* add new project button */}
          <Button 
            className='mt-3 w-full bg-blue-600 dark:bg-blue-500 justify-start hover:bg-blue-700 dark:hover:bg-blue-400 text-white'
            disabled={isCreating}
            data-testid="add-new-file-button"
            onClick={() => setNewFileDialogOpen(true)}
          >
            {isCreating ? (
              <LoadingSpinner size="sm" text="Creating..." />
            ) : (
              'Add New Project'
            )}
          </Button>
          
          <Dialog open={newFileDialogOpen} onOpenChange={handleDialogChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle className="text-gray-900 dark:text-gray-100">Create New Project</DialogTitle>
      <DialogDescription>
        <Input 
          value={FileName}
          onChange={(e)=>setFileName(e.target.value)}
          className='mt-3 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400' 
          placeholder='Enter Project Name'
          disabled={isCreating}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && FileName && FileName.length > 0 && !isCreating) {
              handleCreateFile();
            }
          }}
        />
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button 
              onClick={handleCreateFile}
              disabled={!(FileName&&FileName.length>0) || isCreating}
              type="button" 
              className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400 text-white w-max"
            >
              {isCreating ? (
                <LoadingSpinner size="sm" text="Creating..." />
              ) : (
                'Create'
              )}
            </Button>
          </DialogClose>
        </DialogFooter>
  </DialogContent>
</Dialog>



    </div>
  )
}

export default SideNavBottom