'use client'

import * as React from 'react'
import { Plus, Edit, FileText, Image, Users, Settings } from 'lucide-react'
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

interface FloatingActionItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  disabled?: boolean
}

interface FloatingActionButtonProps {
  items?: FloatingActionItem[]
  className?: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary' | 'secondary'
}

const defaultItems: FloatingActionItem[] = [
  {
    id: 'new-file',
    label: 'New File',
    icon: FileText,
    onClick: () => console.log('New file'),
  },
  {
    id: 'new-canvas',
    label: 'New Canvas',
    icon: Image,
    onClick: () => console.log('New canvas'),
  },
  {
    id: 'invite-team',
    label: 'Invite Team',
    icon: Users,
    onClick: () => console.log('Invite team'),
  },
]

const positionClasses = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'top-right': 'top-6 right-6',
  'top-left': 'top-6 left-6',
}

const sizeClasses = {
  sm: 'h-12 w-12',
  md: 'h-14 w-14',
  lg: 'h-16 w-16',
}

const iconSizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-7 w-7',
}

const FloatingActionButton = React.forwardRef<
  HTMLButtonElement,
  FloatingActionButtonProps
>(({ 
  items = defaultItems, 
  className, 
  position = 'bottom-right', 
  size = 'md',
  variant = 'primary',
  ...props 
}, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)

  const buttonVariants = {
    default: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
    primary: 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400',
    secondary: 'bg-gray-600 dark:bg-gray-500 text-white hover:bg-gray-700 dark:hover:bg-gray-400',
  }

  if (items.length === 1) {
    // Single action - render as simple button
    const item = items[0]
    return (
      <Button
        ref={ref}
        onClick={item.onClick}
        disabled={item.disabled}
        className={cn(
          'fixed rounded-full shadow-lg transition-all duration-200 hover:scale-105 focus:scale-105',
          positionClasses[position],
          sizeClasses[size],
          buttonVariants[variant],
          className
        )}
        title={item.label}
        {...props}
      >
        <item.icon className={iconSizeClasses[size]} />
      </Button>
    )
  }

  // Multiple actions - render as dropdown
  return (
    <div className={cn('fixed z-50', positionClasses[position])}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={ref}
            className={cn(
              'rounded-full shadow-lg transition-all duration-200 hover:scale-105 focus:scale-105',
              sizeClasses[size],
              buttonVariants[variant],
              isOpen && 'rotate-45',
              className
            )}
            {...props}
          >
            <Plus className={cn(iconSizeClasses[size], 'transition-transform duration-200')} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          className="w-48 mb-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        >
          <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">
            Quick Actions
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
          {items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false); // Close dropdown immediately
                // Use setTimeout to ensure dropdown closes before executing action
                setTimeout(() => {
                  item.onClick();
                }, 100);
              }}
              disabled={item.disabled}
              className="flex items-center gap-2 cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})

FloatingActionButton.displayName = 'FloatingActionButton'

export { FloatingActionButton, type FloatingActionItem, type FloatingActionButtonProps }