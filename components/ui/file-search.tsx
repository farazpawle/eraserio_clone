'use client'

import * as React from 'react'
import { Search, Filter, X, Calendar, User, FileText, Image, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useFileManagement, FileFilter } from '@/app/_context/FileManagementContext'
import { Badge } from '@/components/ui/badge'

interface FileSearchProps {
  placeholder?: string
  className?: string
  showFilters?: boolean
}

const FileSearch = React.forwardRef<
  HTMLDivElement,
  FileSearchProps
>(({ 
  placeholder = 'Search files...', 
  className,
  showFilters = true,
  ...props 
}, ref) => {
  const { filters, setFilters, clearFilters } = useFileManagement()
  const [isFilterOpen, setIsFilterOpen] = React.useState(false)
  const [localFilters, setLocalFilters] = React.useState<FileFilter>(filters)
  
  // Sync local filters with context when filters change externally
  React.useEffect(() => {
    setLocalFilters(filters)
  }, [filters])
  
  const handleSearchChange = (value: string) => {
    const newFilters = { ...filters, searchQuery: value }
    setFilters(newFilters)
  }
  
  const handleFilterChange = (key: keyof FileFilter, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }))
  }
  
  const applyFilters = () => {
    setFilters(localFilters)
    setIsFilterOpen(false)
  }
  
  const resetFilters = () => {
    const defaultFilters: FileFilter = {
      searchQuery: '',
      fileType: 'all',
    }
    setLocalFilters(defaultFilters)
    setFilters(defaultFilters)
  }
  
  const getActiveFilterCount = () => {
    let count = 0
    if (filters.fileType && filters.fileType !== 'all') count++
    if (filters.dateRange?.start || filters.dateRange?.end) count++
    if (filters.author && filters.author.trim() !== '') count++
    return count
  }
  
  const activeFilterCount = getActiveFilterCount()
  const hasActiveFilters = activeFilterCount > 0 || (filters.searchQuery && filters.searchQuery.trim() !== '')
  
  const getFilterBadges = () => {
    const badges = []
    
    if (filters.fileType && filters.fileType !== 'all') {
      badges.push({
        key: 'fileType',
        label: `Type: ${filters.fileType}`,
        onRemove: () => setFilters({ fileType: 'all' })
      })
    }
    
    if (filters.author && filters.author.trim() !== '') {
      badges.push({
        key: 'author',
        label: `Author: ${filters.author}`,
        onRemove: () => setFilters({ author: '' })
      })
    }
    
    if (filters.dateRange?.start || filters.dateRange?.end) {
      const start = filters.dateRange.start ? filters.dateRange.start.toLocaleDateString() : 'Any'
      const end = filters.dateRange.end ? filters.dateRange.end.toLocaleDateString() : 'Any'
      badges.push({
        key: 'dateRange',
        label: `Date: ${start} - ${end}`,
        onRemove: () => setFilters({ dateRange: undefined })
      })
    }
    
    return badges
  }

  return (
    <div ref={ref} className={cn('space-y-2', className)} {...props}>
      {/* Search Input and Filter Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-4"
          />
          {filters.searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSearchChange('')}
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {showFilters && (
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className={cn(
                  'gap-2 relative',
                  activeFilterCount > 0 && 'border-primary text-primary'
                )}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filter Files</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="h-8 gap-1 text-muted-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                </div>
                
                <Separator />
                
                {/* File Type Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">File Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'all', label: 'All', icon: FileText },
                      { value: 'document', label: 'Document', icon: FileText },
                      { value: 'whiteboard', label: 'Whiteboard', icon: Image },
                    ].map((type) => {
                      const Icon = type.icon
                      const isSelected = localFilters.fileType === type.value
                      return (
                        <Button
                          key={type.value}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleFilterChange('fileType', type.value)}
                          className="gap-1 text-xs"
                        >
                          <Icon className="h-3 w-3" />
                          {type.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
                
                {/* Author Filter */}
                <div className="space-y-2">
                  <Label htmlFor="author-filter" className="text-sm font-medium">
                    Author
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="author-filter"
                      placeholder="Filter by author..."
                      value={localFilters.author || ''}
                      onChange={(e) => handleFilterChange('author', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                {/* Date Range Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="date-start" className="text-xs text-muted-foreground">
                        From
                      </Label>
                      <Input
                        id="date-start"
                        type="date"
                        value={localFilters.dateRange?.start?.toISOString().split('T')[0] || ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : undefined
                          handleFilterChange('dateRange', {
                            ...localFilters.dateRange,
                            start: date
                          })
                        }}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date-end" className="text-xs text-muted-foreground">
                        To
                      </Label>
                      <Input
                        id="date-end"
                        type="date"
                        value={localFilters.dateRange?.end?.toISOString().split('T')[0] || ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : undefined
                          handleFilterChange('dateRange', {
                            ...localFilters.dateRange,
                            end: date
                          })
                        }}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Apply/Cancel Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={applyFilters}
                    size="sm"
                    className="flex-1"
                  >
                    Apply Filters
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsFilterOpen(false)}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        
        {/* Clear All Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
      
      {/* Active Filter Badges */}
      {getFilterBadges().length > 0 && (
        <div className="flex flex-wrap gap-1">
          {getFilterBadges().map((badge) => (
            <Badge
              key={badge.key}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {badge.label}
              <Button
                variant="ghost"
                size="sm"
                onClick={badge.onRemove}
                className="h-4 w-4 p-0 hover:bg-muted-foreground/20"
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
})

FileSearch.displayName = 'FileSearch'

export { FileSearch }
export type { FileSearchProps }