'use client'

import * as React from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Calendar, User, FileText, Clock } from 'lucide-react'
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
import { useFileManagement, SortOption, SortDirection } from '@/app/_context/FileManagementContext'

interface FileSortDropdownProps {
  className?: string
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}

const sortOptions: Array<{
  value: SortOption
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = [
  {
    value: 'name',
    label: 'Name',
    icon: FileText,
    description: 'Sort by file name'
  },
  {
    value: 'date',
    label: 'Date Created',
    icon: Calendar,
    description: 'Sort by creation date'
  },
  {
    value: 'modified',
    label: 'Last Modified',
    icon: Clock,
    description: 'Sort by last modified date'
  },
  {
    value: 'author',
    label: 'Author',
    icon: User,
    description: 'Sort by file author'
  },
]

const getSortIcon = (direction: SortDirection) => {
  switch (direction) {
    case 'asc':
      return ArrowUp
    case 'desc':
      return ArrowDown
    default:
      return ArrowUpDown
  }
}

const FileSortDropdown = React.forwardRef<
  HTMLButtonElement,
  FileSortDropdownProps
>(({ className, variant = 'outline', size = 'default', ...props }, ref) => {
  const {
    sortBy,
    sortDirection,
    setSortBy,
    setSortDirection,
    toggleSortDirection,
  } = useFileManagement()

  const currentSort = sortOptions.find(option => option.value === sortBy)
  const SortIcon = getSortIcon(sortDirection)
  const CurrentIcon = currentSort?.icon || FileText

  const handleSortChange = (newSortBy: SortOption) => {
    if (newSortBy === sortBy) {
      // If clicking the same sort option, toggle direction
      toggleSortDirection()
    } else {
      // If clicking a different sort option, set it and default to desc
      setSortBy(newSortBy)
      setSortDirection('desc')
    }
  }

  const handleDirectionToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleSortDirection()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={ref}
          variant={variant}
          size={size}
          className={cn(
            'flex items-center gap-2 min-w-[120px] justify-start',
            className
          )}
          {...props}
        >
          <CurrentIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{currentSort?.label || 'Sort'}</span>
          <SortIcon className="h-4 w-4 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4" />
          Sort Files
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {sortOptions.map((option) => {
          const OptionIcon = option.icon
          const isActive = sortBy === option.value
          const DirectionIcon = isActive ? getSortIcon(sortDirection) : null
          
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleSortChange(option.value)}
              className={cn(
                'flex items-center gap-3 cursor-pointer',
                isActive && 'bg-accent text-accent-foreground'
              )}
            >
              <OptionIcon className="h-4 w-4" />
              <div className="flex-1">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">
                  {option.description}
                </div>
              </div>
              {isActive && DirectionIcon && (
                <button
                  onClick={handleDirectionToggle}
                  className="p-1 hover:bg-accent-foreground/10 rounded transition-colors"
                  title={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
                >
                  <DirectionIcon className="h-3 w-3" />
                </button>
              )}
            </DropdownMenuItem>
          )
        })}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => {
            setSortBy('date')
            setSortDirection('desc')
          }}
          className="text-muted-foreground"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Reset to Default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

FileSortDropdown.displayName = 'FileSortDropdown'

export { FileSortDropdown }
export type { FileSortDropdownProps }