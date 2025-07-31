import { Button } from '@/components/ui/button'
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import { Search, Send, Filter, X, User, FileText, Image as ImageIcon, RotateCcw } from 'lucide-react'
import Image from 'next/image'
import React, { useState, useEffect } from 'react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Breadcrumb, BreadcrumbItem } from '@/components/ui/breadcrumb'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useFileManagement, FileFilter } from '@/app/_context/FileManagementContext'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import TeamInvitationModal from '@/components/ui/team-invitation-modal'
import { useConvex } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useTeam } from '@/app/_context/TeamContext'

interface HeaderProps {
  breadcrumbItems?: BreadcrumbItem[]
  onSearch?: (query: string) => void
}

const Header = ({ breadcrumbItems = [], onSearch }: HeaderProps) => {
    const {user}:any=useKindeBrowserClient();
    const convex = useConvex();
    const { activeTeam } = useTeam();
    const { filters, setFilters, clearFilters } = useFileManagement();
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [localFilters, setLocalFilters] = useState<FileFilter>(filters);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    
    // Sync local filters with context when filters change externally
    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);
    
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        const newFilters = { ...filters, searchQuery: query };
        setFilters(newFilters);
        if (onSearch) {
            onSearch(query);
        }
    };
    
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (onSearch) {
            onSearch(filters.searchQuery);
        }
    };
    
    const handleFilterChange = (key: keyof FileFilter, value: any) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };
    
    const applyFilters = () => {
        setFilters(localFilters);
        setIsFilterOpen(false);
    };
    
    const resetFilters = () => {
        const defaultFilters: FileFilter = {
            searchQuery: '',
            fileType: 'all',
        };
        setLocalFilters(defaultFilters);
        setFilters(defaultFilters);
    };
    
    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.fileType && filters.fileType !== 'all') count++;
        if (filters.dateRange?.start || filters.dateRange?.end) count++;
        if (filters.author && filters.author.trim() !== '') count++;
        return count;
    };
    
    const activeFilterCount = getActiveFilterCount();
    const hasActiveFilters = activeFilterCount > 0 || (filters.searchQuery && filters.searchQuery.trim() !== '');
  return (
    <>
    <div className='flex justify-between w-full items-center gap-4 p-4'>
        {/* Breadcrumb Navigation */}
        <div className='flex-1'>
          {breadcrumbItems.length > 0 && (
            <Breadcrumb items={breadcrumbItems} />
          )}
        </div>
        
        {/* Right side controls */}
        <div className='flex items-center gap-2'>
        {/* Enhanced Search with Filters */}
        <div className='flex items-center gap-2'>
          <form onSubmit={handleSearchSubmit} className='flex gap-2 items-center border border-gray-300 dark:border-gray-600 rounded-md p-1 bg-white dark:bg-gray-800'>
              <Search className='h-4 w-4 text-gray-500 dark:text-gray-400'/>
              <input 
                type="text" 
                placeholder='Search files...' 
                className='bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 min-w-[200px]'
                value={filters.searchQuery}
                onChange={handleSearchChange}
              />
              {filters.searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ searchQuery: '' })}
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
          </form>
          
          {/* Filter Button */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className={`gap-2 relative ${
                  activeFilterCount > 0 ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' : ''
                }`}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-blue-500 text-white"
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
                      { value: 'whiteboard', label: 'Whiteboard', icon: ImageIcon },
                    ].map((type) => {
                      const Icon = type.icon;
                      const isSelected = localFilters.fileType === type.value;
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
                      );
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
                          const date = e.target.value ? new Date(e.target.value) : undefined;
                          handleFilterChange('dateRange', {
                            ...localFilters.dateRange,
                            start: date
                          });
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
                          const date = e.target.value ? new Date(e.target.value) : undefined;
                          handleFilterChange('dateRange', {
                            ...localFilters.dateRange,
                            end: date
                          });
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
        
        {/* Theme Toggle */}
        <ThemeToggle />
        
        <div>
            <Image alt='image user' className='cursor-pointer rounded-full border-2 border-gray-200 dark:border-gray-600' src={user?.picture} width={30} height={30}/>
        </div>
        <Button 
          onClick={() => setIsInviteModalOpen(true)}
          className='text-sm flex gap-2 h-8 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white'
          disabled={!activeTeam}
        >
            <Send className='h-4 w-4'/> Invite
        </Button>
        </div>
    </div>
    
    {/* Team Invitation Modal */}
    {activeTeam && (
      <TeamInvitationModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        teamId={activeTeam._id}
        teamName={activeTeam.teamName}
      />
    )}
    </>
  )
}

export default Header