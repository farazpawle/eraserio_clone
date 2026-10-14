'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Users,
  MessageSquare,
  Bell,
  Share2,
  Settings,
  Eye,
  EyeOff,
  MousePointer,
  AlertTriangle,
  Wifi,
  WifiOff,
  Clock,
  Save,
  CheckCircle,
} from 'lucide-react';
import UserPresenceIndicator from './user-presence-indicator';
import NotificationsPanel from './notifications-panel';
import { ConflictIndicator } from './conflict-resolution-dialog';
import { useCollaboration } from '@/app/_context/CollaborationContext';
import { toast } from 'sonner';
import moment from 'moment';

interface CollaborationToolbarProps {
  fileId: string;
  onToggleComments?: () => void;
  onToggleLiveCursors?: () => void;
  onShowConflicts?: () => void;
  onShare?: () => void;
  className?: string;
  showPresence?: boolean;
  showComments?: boolean;
  showNotifications?: boolean;
  showCursors?: boolean;
  showConflicts?: boolean;
  showConnectionStatus?: boolean;
  showAutoSave?: boolean;
}

const CollaborationToolbar: React.FC<CollaborationToolbarProps> = ({
  fileId,
  onToggleComments,
  onToggleLiveCursors,
  onShowConflicts,
  onShare,
  className,
  showPresence = true,
  showComments = true,
  showNotifications = true,
  showCursors = true,
  showConflicts = true,
  showConnectionStatus = true,
  showAutoSave = true,
}) => {
  const {
    activeUsers,
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useCollaboration();

  // Mock values for missing properties
  const conflicts: any[] = [];
  const isConnected = true;
  const lastSaved = Date.now();
  const deleteNotification = (id: string) => {};

  const [showLiveCursors, setShowLiveCursors] = useState(true);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);

  const activeUsersInFile = activeUsers.filter(user => user.fileId === fileId);
  const pendingConflicts = conflicts.filter(conflict => 
    conflict.fileId === fileId && conflict.status === 'pending'
  );
  const fileNotifications = notifications.filter(notification => 
    notification.fileId === fileId
  );

  const handleToggleComments = () => {
    setShowCommentsPanel(!showCommentsPanel);
    onToggleComments?.();
  };

  const handleToggleLiveCursors = () => {
    setShowLiveCursors(!showLiveCursors);
    onToggleLiveCursors?.();
    toast.success(showLiveCursors ? 'Live cursors hidden' : 'Live cursors shown');
  };

  const handleShare = () => {
    onShare?.();
  };

  const formatLastSaved = () => {
    if (!lastSaved) return 'Never saved';
    const now = Date.now();
    const diff = now - lastSaved;
    
    if (diff < 5000) {
      return 'Saved just now';
    } else if (diff < 60000) {
      return `Saved ${Math.floor(diff / 1000)}s ago`;
    } else {
      return `Saved ${moment(lastSaved).fromNow()}`;
    }
  };

  const getConnectionStatusColor = () => {
    return isConnected 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400';
  };

  const getConnectionStatusIcon = () => {
    return isConnected ? (
      <Wifi className="h-4 w-4" />
    ) : (
      <WifiOff className="h-4 w-4" />
    );
  };

  return (
    <TooltipProvider>
      <div className={cn(
        'flex items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2',
        className
      )}>
        {/* Left section - User presence and collaboration status */}
        <div className="flex items-center gap-3">
          {/* User presence */}
          {showPresence && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <UserPresenceIndicator
                activeUsers={activeUsersInFile}
                maxVisible={5}
                showActivity={true}
                className=""
              />
              {activeUsersInFile.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeUsersInFile.length} online
                </Badge>
              )}
            </div>
          )}
          
          {showPresence && (showComments || showCursors || showConflicts) && (
            <Separator orientation="vertical" className="h-6" />
          )}
          
          {/* Collaboration controls */}
          <div className="flex items-center gap-1">
            {/* Comments toggle */}
            {showComments && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showCommentsPanel ? 'default' : 'ghost'}
                    size="sm"
                    onClick={handleToggleComments}
                    className="relative"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {fileNotifications.filter(n => n.type === 'comment').length > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
                      >
                        {fileNotifications.filter(n => n.type === 'comment').length}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showCommentsPanel ? 'Hide comments' : 'Show comments'}</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Live cursors toggle */}
            {showCursors && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showLiveCursors ? 'default' : 'ghost'}
                    size="sm"
                    onClick={handleToggleLiveCursors}
                  >
                    {showLiveCursors ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showLiveCursors ? 'Hide live cursors' : 'Show live cursors'}</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Conflicts indicator */}
            {showConflicts && pendingConflicts.length > 0 && (
              <ConflictIndicator
                conflictCount={pendingConflicts.length}
                onClick={() => onShowConflicts?.()}
                className="ml-1"
              />
            )}
          </div>
        </div>
        
        {/* Center section - Connection and save status */}
        <div className="flex items-center gap-4">
          {/* Connection status */}
          {showConnectionStatus && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  'flex items-center gap-2 text-sm',
                  getConnectionStatusColor()
                )}>
                  {getConnectionStatusIcon()}
                  <span className="hidden sm:inline">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isConnected 
                    ? 'Real-time collaboration is active' 
                    : 'Connection lost - trying to reconnect'
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Auto-save status */}
          {showAutoSave && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  {lastSaved && Date.now() - lastSaved < 5000 ? (
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {formatLastSaved()}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Auto-save status</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* Right section - Actions and notifications */}
        <div className="flex items-center gap-2">
          {/* Share button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Share</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Share this file</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Notifications */}
          {showNotifications && (
            <NotificationsPanel
              notifications={fileNotifications}
              unreadCount={unreadCount}
              onMarkAsRead={markNotificationAsRead}
              onMarkAllAsRead={markAllNotificationsAsRead}
              onDeleteNotification={deleteNotification}
            />
          )}
          
          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Collaboration settings</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

// Compact version for mobile or smaller spaces
export const CompactCollaborationToolbar: React.FC<CollaborationToolbarProps> = (props) => {
  const {
    activeUsers,
    unreadCount,
  } = useCollaboration();

  // Mock values for missing properties
  const conflicts: any[] = [];
  const isConnected = true;

  const activeUsersInFile = activeUsers.filter(user => user.fileId === props.fileId);
  const pendingConflicts = conflicts.filter(conflict => 
    conflict.fileId === props.fileId && conflict.status === 'pending'
  );

  return (
    <TooltipProvider>
      <div className={cn(
        'flex items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 py-1',
        props.className
      )}>
        {/* User count and connection status */}
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-1 text-xs',
            isConnected ? 'text-green-600' : 'text-red-600'
          )}>
            {isConnected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            <span>{activeUsersInFile.length}</span>
          </div>
          
          {pendingConflicts.length > 0 && (
            <Badge variant="destructive" className="text-xs h-5">
              {pendingConflicts.length}
            </Badge>
          )}
        </div>
        
        {/* Notifications */}
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs h-5">
              {unreadCount}
            </Badge>
          )}
          
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Bell className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CollaborationToolbar;