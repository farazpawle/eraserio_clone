'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  X,
  MessageSquare,
  Share,
  UserPlus,
  FileText,
  AtSign,
  AlertTriangle,
  Info,
  Settings,
  Trash2,
} from 'lucide-react';
import { Notification } from '@/app/_context/CollaborationContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import moment from 'moment';
import { toast } from 'sonner';

interface NotificationsPanelProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification?: (notificationId: string) => void;
  className?: string;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  className,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isOpen, setIsOpen] = useState(false);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') {
      return !notification.isRead;
    }
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      case 'mention':
        return <AtSign className="h-4 w-4" />;
      case 'file_shared':
        return <Share className="h-4 w-4" />;
      case 'user_joined':
        return <UserPlus className="h-4 w-4" />;
      case 'file_updated':
        return <FileText className="h-4 w-4" />;
      case 'conflict':
      case 'conflict_resolved':
      case 'conflict_auto_resolved':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'comment':
      case 'mention':
        return 'text-blue-600 dark:text-blue-400';
      case 'file_shared':
        return 'text-green-600 dark:text-green-400';
      case 'user_joined':
        return 'text-purple-600 dark:text-purple-400';
      case 'file_updated':
        return 'text-orange-600 dark:text-orange-400';
      case 'conflict':
        return 'text-red-600 dark:text-red-400';
      case 'conflict_resolved':
      case 'conflict_auto_resolved':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification._id);
    }
    
    // Navigate to file if fileId is present
    if (notification.fileId) {
      // You can implement navigation logic here
      console.log('Navigate to file:', notification.fileId);
    }
  };

  const handleDeleteNotification = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onDeleteNotification) {
      onDeleteNotification(notificationId);
      toast.success('Notification deleted');
    }
  };

  const getUserInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatNotificationTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      return moment(timestamp).fromNow();
    } else if (diff < 86400000) { // Less than 1 day
      return moment(timestamp).format('h:mm A');
    } else {
      return moment(timestamp).format('MMM D');
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className={cn('w-80 max-h-96 p-0', className)}
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <Badge variant="secondary">
                {unreadCount} new
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Filter toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
              className="text-xs"
            >
              {filter === 'all' ? 'Show unread' : 'Show all'}
            </Button>
            
            {/* Mark all as read */}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Notifications list */}
        <ScrollArea className="max-h-80">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {filter === 'unread' ? (
                <>
                  <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No unread notifications</p>
                  <p className="text-xs mt-1">You're all caught up!</p>
                </>
              ) : (
                <>
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs mt-1">We'll notify you when something happens</p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={cn(
                    'p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors',
                    !notification.isRead && 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    {/* Notification icon */}
                    <div className={cn('flex-shrink-0 mt-1', getNotificationColor(notification.type))}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* From user avatar (if available) */}
                    {notification.fromUserId && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-gray-500 text-white text-xs">
                          {getUserInitials(notification.fromUserName || 'Unknown')}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    {/* Notification content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {formatNotificationTime(notification.createdAt)}
                          </p>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 ml-2">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkAsRead(notification._id);
                              }}
                              title="Mark as read"
                              className="h-6 w-6 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {onDeleteNotification && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteNotification(notification._id, e)}
                              title="Delete notification"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <DropdownMenuItem className="w-full justify-center text-sm text-gray-600 dark:text-gray-300">
                <Settings className="h-4 w-4 mr-2" />
                Notification Settings
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Notification toast component for real-time notifications
export const NotificationToast: React.FC<{
  notification: Notification;
  onDismiss: () => void;
  onClick?: () => void;
}> = ({ notification, onDismiss, onClick }) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-5 w-5" />;
      case 'mention':
        return <AtSign className="h-5 w-5" />;
      case 'file_shared':
        return <Share className="h-5 w-5" />;
      case 'user_joined':
        return <UserPlus className="h-5 w-5" />;
      case 'file_updated':
        return <FileText className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm cursor-pointer"
      onClick={onClick}
    >
      <div className="flex gap-3">
        <div className="text-blue-600 dark:text-blue-400 flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {notification.title}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {notification.message}
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default NotificationsPanel;