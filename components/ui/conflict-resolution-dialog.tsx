'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  User,
  Clock,
  FileText,
  GitMerge,
  Check,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';
// Define Conflict interface locally since it's not in CollaborationContext
interface Conflict {
  _id: string;
  fileId: string;
  conflictId: string;
  type: string;
  conflictData: string;
  involvedUsers: string[];
  status: string;
  createdAt: number;
  description?: string;
  currentVersion?: string;
  incomingVersion?: string;
  currentUserName?: string;
  incomingUserName?: string;
  currentTimestamp?: number;
  incomingTimestamp?: number;
}
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import moment from 'moment';

interface ConflictResolutionDialogProps {
  conflict: Conflict | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (conflictId: string, resolution: 'accept_current' | 'accept_incoming' | 'manual_merge', mergedContent?: any) => void;
  onAutoResolve?: (conflictId: string) => void;
  className?: string;
}

interface ConflictDiff {
  type: 'added' | 'removed' | 'modified';
  content: string;
  lineNumber?: number;
}

const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  conflict,
  isOpen,
  onClose,
  onResolve,
  onAutoResolve,
  className,
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'accept_current' | 'accept_incoming' | 'manual_merge'>('accept_current');
  const [manualContent, setManualContent] = useState('');
  const [showDiff, setShowDiff] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['current', 'incoming']));
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (conflict) {
      setSelectedResolution('accept_current');
      setManualContent('');
      setShowDiff(true);
      setExpandedSections(new Set(['current', 'incoming']));
    }
  }, [conflict]);

  if (!conflict) return null;

  const getUserInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimestamp = (timestamp: number) => {
    return moment(timestamp).format('MMM D, YYYY [at] h:mm A');
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleResolve = async () => {
    if (!conflict) return;
    
    setIsResolving(true);
    try {
      let mergedContent;
      
      if (selectedResolution === 'manual_merge') {
        if (!manualContent.trim()) {
          toast.error('Please provide merged content for manual resolution');
          return;
        }
        mergedContent = manualContent;
      }
      
      await onResolve(conflict._id, selectedResolution, mergedContent);
      toast.success('Conflict resolved successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to resolve conflict');
      console.error('Error resolving conflict:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleAutoResolve = async () => {
    if (!conflict || !onAutoResolve) return;
    
    setIsResolving(true);
    try {
      await onAutoResolve(conflict._id);
      toast.success('Conflict auto-resolved');
      onClose();
    } catch (error) {
      toast.error('Failed to auto-resolve conflict');
      console.error('Error auto-resolving conflict:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const renderContentPreview = (content: any, title: string, user: string, timestamp: number) => {
    const sectionKey = title.toLowerCase().replace(' ', '_');
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <div 
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer"
          onClick={() => toggleSection(sectionKey)}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            <h4 className="font-medium text-gray-900 dark:text-gray-100">{title}</h4>
            <Badge variant="outline" className="text-xs">
              {user}
            </Badge>
          </div>
          <span className="text-xs text-gray-500">
            {formatTimestamp(timestamp)}
          </span>
        </div>
        
        {isExpanded && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 font-mono text-sm max-h-40 overflow-auto">
              <pre className="whitespace-pre-wrap">
                {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderResolutionOption = (
    value: 'accept_current' | 'accept_incoming' | 'manual_merge',
    title: string,
    description: string,
    icon: React.ReactNode
  ) => {
    const isSelected = selectedResolution === value;
    
    return (
      <div
        className={cn(
          'border rounded-lg p-4 cursor-pointer transition-all',
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        )}
        onClick={() => setSelectedResolution(value)}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex-shrink-0 mt-1',
            isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
          )}>
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className={cn(
                'font-medium',
                isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
              )}>
                {title}
              </h4>
              {isSelected && (
                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <p className={cn(
              'text-sm mt-1',
              isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'
            )}>
              {description}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn('max-w-4xl max-h-[90vh] overflow-hidden', className)}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <DialogTitle>Resolve Conflict</DialogTitle>
            <Badge variant="destructive">Conflict</Badge>
          </div>
          <DialogDescription>
            Multiple users have made conflicting changes to the same content. Choose how to resolve this conflict.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Conflict Info */}
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-orange-900 dark:text-orange-100">
                    Conflict Details
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    {conflict.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-orange-600 dark:text-orange-400">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      File: {conflict.fileId}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(conflict.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Content Comparison */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Content Comparison
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDiff(!showDiff)}
                  className="text-xs"
                >
                  {showDiff ? (
                    <><EyeOff className="h-3 w-3 mr-1" /> Hide Diff</>
                  ) : (
                    <><Eye className="h-3 w-3 mr-1" /> Show Diff</>
                  )}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderContentPreview(
                  conflict.currentVersion,
                  'Current Version',
                  conflict.currentUserName || 'Unknown',
                  conflict.currentTimestamp || Date.now()
                )}
                
                {renderContentPreview(
                  conflict.incomingVersion,
                  'Incoming Version',
                  conflict.incomingUserName || 'Unknown',
                  conflict.incomingTimestamp || Date.now()
                )}
              </div>
            </div>
            
            {/* Resolution Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Resolution Options
              </h3>
              
              <div className="space-y-3">
                {renderResolutionOption(
                  'accept_current',
                  'Accept Current Version',
                  'Keep the current version and discard incoming changes',
                  <FileText className="h-5 w-5" />
                )}
                
                {renderResolutionOption(
                  'accept_incoming',
                  'Accept Incoming Version',
                  'Replace current version with incoming changes',
                  <User className="h-5 w-5" />
                )}
                
                {renderResolutionOption(
                  'manual_merge',
                  'Manual Merge',
                  'Manually combine both versions into a single solution',
                  <GitMerge className="h-5 w-5" />
                )}
              </div>
              
              {/* Manual merge content */}
              {selectedResolution === 'manual_merge' && (
                <div className="space-y-2">
                  <Label htmlFor="manual-content">Merged Content</Label>
                  <Textarea
                    id="manual-content"
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    placeholder="Enter the manually merged content here..."
                    className="min-h-32 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Combine the best parts of both versions or create a completely new solution.
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
        
        <Separator />
        
        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onAutoResolve && (
              <Button
                variant="outline"
                onClick={handleAutoResolve}
                disabled={isResolving}
                className="text-sm"
              >
                <GitMerge className="h-4 w-4 mr-2" />
                Auto Resolve
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isResolving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={isResolving || (selectedResolution === 'manual_merge' && !manualContent.trim())}
            >
              {isResolving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Resolving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Resolve Conflict
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Conflict indicator component for showing conflicts in the UI
export const ConflictIndicator: React.FC<{
  conflictCount: number;
  onClick: () => void;
  className?: string;
}> = ({ conflictCount, onClick, className }) => {
  if (conflictCount === 0) return null;
  
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={onClick}
      className={cn('animate-pulse', className)}
    >
      <AlertTriangle className="h-4 w-4 mr-2" />
      {conflictCount} Conflict{conflictCount > 1 ? 's' : ''}
    </Button>
  );
};

export default ConflictResolutionDialog;