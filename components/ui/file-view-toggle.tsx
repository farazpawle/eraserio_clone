'use client'

import * as React from 'react'
import { List, Grid3X3, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useFileManagement, ViewMode } from '@/app/_context/FileManagementContext'

interface FileViewToggleProps {
  className?: string
  size?: 'default' | 'sm' | 'lg'
  showLabels?: boolean
}

const viewModes: Array<{
  value: ViewMode
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = [
  {
    value: 'list',
    label: 'List',
    icon: List,
    description: 'View files in a detailed list'
  },
  {
    value: 'grid',
    label: 'Grid',
    icon: LayoutGrid,
    description: 'View files in a grid layout'
  },
]

const FileViewToggle = React.forwardRef<
  HTMLDivElement,
  FileViewToggleProps
>(({ className, size = 'default', showLabels = false, ...props }, ref) => {
  const { viewMode, setViewMode } = useFileManagement()

  const buttonSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'

  const ViewToggleButton = ({ mode }: { mode: ViewMode }) => {
    const modeConfig = viewModes.find(m => m.value === mode)!
    const Icon = modeConfig.icon
    const isActive = viewMode === mode

    const button = (
      <Button
        variant={isActive ? 'default' : 'ghost'}
        size={buttonSize}
        onClick={() => setViewMode(mode)}
        className={cn(
          'transition-all duration-200',
          isActive && 'shadow-sm',
          !isActive && 'hover:bg-accent hover:text-accent-foreground',
          showLabels && 'gap-2'
        )}
        aria-pressed={isActive}
        aria-label={`Switch to ${modeConfig.label.toLowerCase()} view`}
      >
        <Icon className={iconSize} />
        {showLabels && (
          <span className="hidden sm:inline">{modeConfig.label}</span>
        )}
      </Button>
    )

    if (!showLabels) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {button}
            </TooltipTrigger>
            <TooltipContent>
              <p>{modeConfig.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return button
  }

  return (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-lg border border-input bg-background p-1',
        className
      )}
      role="tablist"
      aria-label="File view options"
      {...props}
    >
      {viewModes.map((mode) => (
        <div key={mode.value} role="tab" aria-selected={viewMode === mode.value}>
          <ViewToggleButton mode={mode.value} />
        </div>
      ))}
    </div>
  )
})

FileViewToggle.displayName = 'FileViewToggle'

export { FileViewToggle }
export type { FileViewToggleProps }