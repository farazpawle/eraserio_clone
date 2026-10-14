'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { UserPresence } from '@/app/_context/CollaborationContext';
import { Users, Eye, Edit, MessageSquare } from 'lucide-react';
import moment from 'moment';

interface UserPresenceIndicatorProps {
  activeUsers: UserPresence[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showActivity?: boolean;
  className?: string;
}

const UserPresenceIndicator: React.FC<UserPresenceIndicatorProps> = ({
  activeUsers,
  maxVisible = 5,
  size = 'md',
  showActivity = true,
  className,
}) => {
  const visibleUsers = activeUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, activeUsers.length - maxVisible);

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  const getActivityIcon = (user: UserPresence) => {
    if (user.cursor) {
      return <Edit className="h-3 w-3" />;
    }
    if (user.selection) {
      return <MessageSquare className="h-3 w-3" />;
    }
    return <Eye className="h-3 w-3" />;
  };

  const getActivityText = (user: UserPresence) => {
    if (user.cursor) {
      return 'Currently editing';
    }
    if (user.selection) {
      return 'Has text selected';
    }
    return 'Viewing';
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (activeUsers.length === 0) {
    return (
      <div className={cn('flex items-center gap-2 text-gray-500 dark:text-gray-400', className)}>
        <Users className="h-4 w-4" />
        <span className="text-sm">No active users</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1', className)}>
        {/* Active user count */}
        <div className="flex items-center gap-1 mr-2">
          <Users className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {activeUsers.length}
          </span>
        </div>

        {/* User avatars */}
        <div className="flex -space-x-2">
          {visibleUsers.map((user, index) => (
            <Tooltip key={user._id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar
                    className={cn(
                      sizeClasses[size],
                      'border-2 border-white dark:border-gray-800 ring-2 transition-all hover:scale-110',
                      'cursor-pointer'
                    )}
                    style={{
                      '--ring-color': user.color,
                      zIndex: visibleUsers.length - index,
                    } as React.CSSProperties}
                  >
                    <AvatarImage src={user.userImageUrl} alt={user.userName} />
                    <AvatarFallback
                      className="text-white font-semibold"
                      style={{ backgroundColor: user.color }}
                    >
                      {getUserInitials(user.userName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Activity indicator */}
                  {showActivity && (
                    <div
                      className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-white"
                      style={{ backgroundColor: user.color }}
                    >
                      {getActivityIcon(user)}
                    </div>
                  )}
                  
                  {/* Online indicator */}
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <div className="font-semibold">{user.userName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user.userEmail}
                  </div>
                  {showActivity && (
                    <div className="flex items-center gap-1 text-xs">
                      {getActivityIcon(user)}
                      <span>{getActivityText(user)}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Last seen: {moment(user.lastSeen).fromNow()}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {/* Show hidden count */}
          {hiddenCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    sizeClasses[size],
                    'bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800',
                    'rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300',
                    'font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                  style={{ zIndex: 0 }}
                >
                  +{hiddenCount}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="text-sm">
                  {hiddenCount} more user{hiddenCount > 1 ? 's' : ''} active
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Activity summary */}
        {showActivity && activeUsers.length > 0 && (
          <div className="ml-3 flex items-center gap-1">
            <Badge variant="secondary" className="text-xs">
              {activeUsers.filter(u => u.cursor).length} editing
            </Badge>
            {activeUsers.filter(u => u.selection && !u.cursor).length > 0 && (
              <Badge variant="outline" className="text-xs">
                {activeUsers.filter(u => u.selection && !u.cursor).length} selecting
              </Badge>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default UserPresenceIndicator;