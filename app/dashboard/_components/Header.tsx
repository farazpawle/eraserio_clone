import { Button } from '@/components/ui/button'
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import { Search, Send } from 'lucide-react'
import Image from 'next/image'
import React from 'react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const Header = () => {
    const {user}:any=useKindeBrowserClient();
  return (
    <div className='flex justify-end w-full items-center gap-2'>
        <div className='flex gap-2 items-center border border-gray-300 dark:border-gray-600 rounded-md p-1 bg-white dark:bg-gray-800'>
            <Search className='h-4 w-4 text-gray-500 dark:text-gray-400'/>
            <input 
              type="text" 
              placeholder='search' 
              className='bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400'
              name="" 
              id="" 
            />
        </div>
        
        {/* Theme Toggle */}
        <ThemeToggle />
        
        <div>
            <Image alt='image user' className='cursor-pointer rounded-full border-2 border-gray-200 dark:border-gray-600' src={user?.picture} width={30} height={30}/>
        </div>
        <Button className='text-sm flex gap-2 h-8 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white'>
            <Send className='h-4 w-4'/> Invite
        </Button>
    </div>
  )
}

export default Header