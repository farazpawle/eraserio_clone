'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  AlertTriangle, 
  X, 
  Check,
  Users,
  Wifi,
  WifiOff 
} from 'lucide-react';
import ConflictResolutionDialog from '@/components/ui/conflict-resolution-dialog';
import NotificationsPanel from '@/components/ui/notifications-panel';
import { toast } from 'sonner';

interface WorkspaceNotificationBarProps {
  pendingConflicts: any[];
  notifications: any[];
  unreadCount: number;
  onResolveConflict: (conflictId: string, resolution: 'accept_current' | 'accept_incoming' | 'manual_merge', mergedContent?: any) => Promise<boolean>;
  onAutoResolveConflict: (conflictId: string) => Promise<boolean>;
  className?: string;
}

const WorkspaceNotificationBar: React.FC<WorkspaceNotificationBarProps> = ({
  pendingConflicts,
  notifications,
  unreadCount,
  onResolveConflict,
  onAutoResolveConflict,
  className,
}) => {
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<any>(null);
  
  // Don't show the bar if there are no conflicts or notifications
  if (pendingConflicts.length === 0 && unreadCount === 0) {
    return null;
  }

  const handleShowConflicts = () => {
    if (pendingConflicts.length > 0) {
      setCurrentConflict(pendingConflicts[0]);
      setShowConflictDialog(true);
    }
  };

  const handleResolveConflictWrapper = async (
    conflictId: string, 
    resolution: 'accept_current' | 'accept_incoming' | 'manual_merge', 
    mergedContent?: any
  ) => {
    const success = await onResolveConflict(conflictId, resolution, mergedContent);
    if (success) {
      setCurrentConflict(null);
      setShowConflictDialog(false);
    }
  };

  const handleAutoResolveConflictWrapper = async (conflictId: string) => {
    const success = await onAutoResolveConflict(conflictId);
    if (success) {
      setCurrentConflict(null);
      setShowConflictDialog(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    // TODO: Implement mark as read functionality
    console.log('Mark notification as read:', notificationId);
  };

  const markAllNotificationsAsRead = async () => {
    // TODO: Implement mark all as read functionality
    console.log('Mark all notifications as read');
  };

  const deleteNotification = async (notificationId: string) => {
    // TODO: Implement delete notification functionality
    console.log('Delete notification:', notificationId);
  };

  return (
    <>
      <div className={cn(
        'bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2',
        'flex items-center justify-between',
        className
      )}>
        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Wifi className="h-4 w-4" />
            <span className="hidden sm:inline">Connected</span>
          </div>

          {/* Conflicts indicator */}
          {pendingConflicts.length > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-700 dark:text-orange-300">
                {pendingConflicts.length} conflict{pendingConflicts.length > 1 ? 's' : ''} detected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowConflicts}
                className="h-7 text-xs"
              >
                Resolve
              </Button>
            </div>
          )}

          {/* Active users count (placeholder) */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Users className="h-4 w-4" />
            <span>1 user online</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications */}
          <NotificationsPanel
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markNotificationAsRead}
            onMarkAllAsRead={markAllNotificationsAsRead}
            onDeleteNotification={deleteNotification}
          />

          {/* Auto-save status */}
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <Check className="h-4 w-4 inline mr-1" />
            Auto-save enabled
          </div>
        </div>
      </div>

      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        conflict={currentConflict}
        isOpen={showConflictDialog}
        onClose={() => {
          setShowConflictDialog(false);
          setCurrentConflict(null);
        }}
        onResolve={handleResolveConflictWrapper}
        onAutoResolve={handleAutoResolveConflictWrapper}
      />
    </>
  );
};

export default WorkspaceNotificationBar;
