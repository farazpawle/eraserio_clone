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
    DialogTrigger,
  } from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

  

interface SideNavBottomProps {
  onFileCreate: (fileName: string) => void;
  Files: any;
  isCreating: boolean;
  newFileDialogOpen?: boolean;
  setNewFileDialogOpen?: (open: boolean) => void;
}

const SideNavBottom = ({onFileCreate,Files,isCreating,newFileDialogOpen,setNewFileDialogOpen}:SideNavBottomProps) => {
  // useEffect(()=>{

  // },[Files])
    const [FileName,setFileName]=useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // Sync with external dialog state if provided
    React.useEffect(() => {
      if (newFileDialogOpen !== undefined) {
        setIsDialogOpen(newFileDialogOpen);
      }
    }, [newFileDialogOpen]);
    
    const handleDialogChange = (open: boolean) => {
      setIsDialogOpen(open);
      if (setNewFileDialogOpen) {
        setNewFileDialogOpen(open);
      }
    };
    
    const handleCreateFile = () => {
      if (FileName && FileName.length > 0 && !isCreating) {
        onFileCreate(FileName);
        setFileName(''); // Clear the input after creating
        handleDialogChange(false); // Close the dialog
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
         {menuList.map((item, index) => (
            <h2
              key={index}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex gap-2 items-center cursor-pointer text-gray-900 dark:text-gray-100"
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </h2>
          ))}
          {/* add new file button */}
          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
  <DialogTrigger className='w-full' asChild>
  <Button 
    className='mt-3 w-full bg-blue-600 dark:bg-blue-500 justify-start hover:bg-blue-700 dark:hover:bg-blue-400 text-white'
    disabled={isCreating}
    data-testid="add-new-file-button"
  >
    {isCreating ? (
      <LoadingSpinner size="sm" text="Creating..." />
    ) : (
      'Add New File'
    )}
  </Button>

  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle className="text-gray-900 dark:text-gray-100">Create New File</DialogTitle>
      <DialogDescription>
        <Input 
          value={FileName}
          onChange={(e)=>setFileName(e.target.value)}
          className='mt-3 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400' 
          placeholder='Enter File Name'
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