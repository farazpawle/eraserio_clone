import { Button } from '@/components/ui/button'
import { Link, SaveIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import ExportDropdown from '@/components/ui/export-dropdown'
import { FILE } from '@/app/dashboard/_components/FileList'
import { getFileType } from '@/lib/exportUtils'
import FileShareModal from '@/components/ui/file-share-modal'

const WSHeader = ({onSave, fileName, fileData}:{onSave: () => void, fileName: string, fileData?: FILE}) => {
  const router=useRouter();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  return (
    <>
    <div className='p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex justify-between items-center'>
        <div className='flex gap-2 items-center'>
          <Image 
            className='cursor-pointer' 
            src='/logo-1.svg' 
            alt='logo' 
            height={40} 
            width={40} 
            onClick={()=>router.push('/dashboard')}
          />
          <h2 className='text-gray-900 dark:text-gray-100 font-medium'>{fileName || 'File Name'}</h2>
        </div>
        <div className='flex gap-4 items-center'>
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Export Button - Only show for document files, canvas files have their own export in WSCanvas */}
          {fileData && getFileType(fileData) === 'document' && (
            <ExportDropdown 
              file={fileData}
              variant="outline"
              size="sm"
              className="h-8 text-[12px]"
            />
          )}
          
          <Button 
            onClick={()=>onSave()} 
            className='h-8 text-[12px] gap-2 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-400 dark:hover:bg-yellow-300 text-white dark:text-black'
          >
            Save <SaveIcon className='h-4 w-4'/>
          </Button>

          <Button 
            onClick={() => setIsShareModalOpen(true)}
            className='h-8 text-[12px] gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white'
            disabled={!fileData}
          >
            Share <Link className='h-4 w-4'/>
          </Button>
        </div>
    </div>
    
    {/* File Share Modal */}
    {fileData && (
      <FileShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        file={fileData}
      />
    )}
    </>
  )
}

export default WSHeader