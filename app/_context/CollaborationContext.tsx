'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { toast } from 'sonner';

// Types for collaboration features
export interface UserPresence {
  _id: string;
  fileId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userImageUrl?: string;
  isActive: boolean;
  lastSeen: number;
  cursor?: string;
  selection?: string;
  color: string;
}

export interface LiveCursor {
  _id: string;
  fileId: string;
  userId: string;
  userName: string;
  position: string;
  timestamp: number;
  color: string;
  isVisible: boolean;
}

export interface Comment {
  _id: string;
  fileId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userImageUrl?: string;
  content: string;
  position?: string;
  parentCommentId?: string;
  isResolved: boolean;
  createdAt: number;
  updatedAt?: number;
  mentions?: string[];
  replies?: Comment[];
}

export interface Notification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  fileId?: string;
  commentId?: string;
  fromUserId?: string;
  fromUserName?: string;
  isRead: boolean;
  createdAt: number;
  data?: string;
}

interface CollaborationContextType {
  // User Presence
  activeUsers: UserPresence[];
  updateUserPresence: (fileId: string, isActive: boolean, cursor?: string, selection?: string) => void;
  removeUserPresence: (fileId: string) => void;
  
  // Live Cursors
  liveCursors: LiveCursor[];
  updateLiveCursor: (fileId: string, position: { x: number; y: number; type: string; elementId?: string }) => void;
  hideLiveCursor: (fileId: string) => void;
  
  // Comments
  comments: Comment[];
  createComment: (fileId: string, content: string, position?: any, parentCommentId?: string, mentions?: string[]) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  toggleCommentResolution: (commentId: string, isResolved: boolean) => Promise<void>;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  
  // Collaboration state
  isCollaborationEnabled: boolean;
  setCollaborationEnabled: (enabled: boolean) => void;
  currentFileId: string | null;
  setCurrentFileId: (fileId: string | null) => void;
  userColor: string;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};

interface CollaborationProviderProps {
  children: ReactNode;
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({ children }) => {
  const { user } = useKindeBrowserClient();
  const [isCollaborationEnabled, setCollaborationEnabled] = useState(true);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [userColor, setUserColor] = useState('#FF6B6B');
  const [cursorUpdateTimeout, setCursorUpdateTimeout] = useState<NodeJS.Timeout | null>(null);

  // Convex mutations
  const updateUserPresenceMutation = useMutation(api.userPresence.updateUserPresence);
  const removeUserPresenceMutation = useMutation(api.userPresence.removeUserPresence);
  const updateLiveCursorMutation = useMutation(api.liveCursors.updateLiveCursor);
  const hideLiveCursorMutation = useMutation(api.liveCursors.hideLiveCursor);
  const createCommentMutation = useMutation(api.comments.createComment);
  const updateCommentMutation = useMutation(api.comments.updateComment);
  const deleteCommentMutation = useMutation(api.comments.deleteComment);
  const toggleCommentResolutionMutation = useMutation(api.comments.toggleCommentResolution);
  const markNotificationAsReadMutation = useMutation(api.notifications.markNotificationAsRead);
  const markAllNotificationsAsReadMutation = useMutation(api.notifications.markAllNotificationsAsRead);
  const assignUserColorMutation = useMutation(api.userPresence.assignUserColor);

  // Convex queries
  const activeUsers = useQuery(
    api.userPresence.getActiveUsers,
    currentFileId ? { fileId: currentFileId } : 'skip'
  ) || [];

  const liveCursors = useQuery(
    api.liveCursors.getLiveCursors,
    currentFileId && user ? { fileId: currentFileId, excludeUserId: user.id } : 'skip'
  ) || [];

  const comments = useQuery(
    api.comments.getComments,
    currentFileId ? { fileId: currentFileId, includeResolved: false } : 'skip'
  ) || [];

  const notifications = useQuery(
    api.notifications.getUserNotifications,
    user ? { userId: user.id, limit: 50 } : 'skip'
  ) || [];

  const unreadCount = useQuery(
    api.notifications.getUnreadNotificationCount,
    user ? { userId: user.id } : 'skip'
  ) || 0;

  // Assign user color when joining a file
  useEffect(() => {
    if (currentFileId && user && isCollaborationEnabled) {
      assignUserColorMutation({ fileId: currentFileId, userId: user.id })
        .then((color) => {
          if (color) {
            setUserColor(color);
          }
        })
        .catch((error) => {
          console.error('Failed to assign user color:', error);
        });
    }
  }, [currentFileId, user, isCollaborationEnabled, assignUserColorMutation]);

  // Update user presence when file changes
  const updateUserPresence = useCallback(async (
    fileId: string,
    isActive: boolean,
    cursor?: string,
    selection?: string
  ) => {
    if (!user || !isCollaborationEnabled) return;

    try {
      await updateUserPresenceMutation({
        fileId,
        userId: user.id,
        userName: user.given_name || user.family_name || 'Unknown User',
        userEmail: user.email || '',
        userImageUrl: user.picture || undefined,
        isActive,
        cursor,
        selection,
        color: userColor,
      });
    } catch (error) {
      console.error('Failed to update user presence:', error);
    }
  }, [user, isCollaborationEnabled, userColor, updateUserPresenceMutation]);

  // Remove user presence
  const removeUserPresence = useCallback(async (fileId: string) => {
    if (!user) return;

    try {
      await removeUserPresenceMutation({
        fileId,
        userId: user.id,
      });
    } catch (error) {
      console.error('Failed to remove user presence:', error);
    }
  }, [user, removeUserPresenceMutation]);

  // Update live cursor with debouncing
  const updateLiveCursor = useCallback((fileId: string, position: { x: number; y: number; type: string; elementId?: string }) => {
    if (!user || !isCollaborationEnabled) return;

    // Clear existing timeout
    if (cursorUpdateTimeout) {
      clearTimeout(cursorUpdateTimeout);
    }

    // Set new timeout for debounced update
    const timeout = setTimeout(async () => {
      try {
        await updateLiveCursorMutation({
          fileId,
          userId: user.id,
          userName: user.given_name || user.family_name || 'Unknown User',
          position: JSON.stringify(position),
          color: userColor,
          isVisible: true,
        });
      } catch (error) {
        console.error('Failed to update live cursor:', error);
      }
    }, 100); // 100ms debounce

    setCursorUpdateTimeout(timeout);
  }, [user, isCollaborationEnabled, userColor, updateLiveCursorMutation, cursorUpdateTimeout]);

  // Hide live cursor
  const hideLiveCursor = useCallback(async (fileId: string) => {
    if (!user) return;

    try {
      await hideLiveCursorMutation({
        fileId,
        userId: user.id,
      });
    } catch (error) {
      console.error('Failed to hide live cursor:', error);
    }
  }, [user, hideLiveCursorMutation]);

  // Create comment
  const createComment = useCallback(async (
    fileId: string,
    content: string,
    position?: any,
    parentCommentId?: string,
    mentions?: string[]
  ) => {
    if (!user) return;

    try {
      await createCommentMutation({
        fileId,
        userId: user.id,
        userName: user.given_name || user.family_name || 'Unknown User',
        userEmail: user.email || '',
        userImageUrl: user.picture || undefined,
        content,
        position: position ? JSON.stringify(position) : undefined,
        parentCommentId: parentCommentId as any,
        mentions,
      });
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Failed to create comment:', error);
      toast.error('Failed to add comment');
    }
  }, [user, createCommentMutation]);

  // Update comment
  const updateComment = useCallback(async (commentId: string, content: string) => {
    if (!user) return;

    try {
      await updateCommentMutation({
        commentId: commentId as any,
        content,
        userId: user.id,
      });
      toast.success('Comment updated successfully');
    } catch (error) {
      console.error('Failed to update comment:', error);
      toast.error('Failed to update comment');
    }
  }, [user, updateCommentMutation]);

  // Delete comment
  const deleteComment = useCallback(async (commentId: string) => {
    if (!user) return;

    try {
      await deleteCommentMutation({
        commentId: commentId as any,
        userId: user.id,
      });
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    }
  }, [user, deleteCommentMutation]);

  // Toggle comment resolution
  const toggleCommentResolution = useCallback(async (commentId: string, isResolved: boolean) => {
    if (!user) return;

    try {
      await toggleCommentResolutionMutation({
        commentId: commentId as any,
        isResolved,
        userId: user.id,
      });
      toast.success(isResolved ? 'Comment resolved' : 'Comment reopened');
    } catch (error) {
      console.error('Failed to toggle comment resolution:', error);
      toast.error('Failed to update comment status');
    }
  }, [user, toggleCommentResolutionMutation]);

  // Mark notification as read
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      await markNotificationAsReadMutation({
        notificationId: notificationId as any,
        userId: user.id,
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [user, markNotificationAsReadMutation]);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(async () => {
    if (!user) return;

    try {
      await markAllNotificationsAsReadMutation({
        userId: user.id,
      });
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  }, [user, markAllNotificationsAsReadMutation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cursorUpdateTimeout) {
        clearTimeout(cursorUpdateTimeout);
      }
      if (currentFileId && user) {
        removeUserPresence(currentFileId);
      }
    };
  }, [currentFileId, user, cursorUpdateTimeout, removeUserPresence]);

  // Update presence when file changes
  useEffect(() => {
    if (currentFileId && user && isCollaborationEnabled) {
      updateUserPresence(currentFileId, true);
      
      // Set up periodic presence updates
      const presenceInterval = setInterval(() => {
        updateUserPresence(currentFileId, true);
      }, 30000); // Update every 30 seconds

      return () => {
        clearInterval(presenceInterval);
        removeUserPresence(currentFileId);
      };
    }
  }, [currentFileId, user, isCollaborationEnabled, updateUserPresence, removeUserPresence]);

  const value: CollaborationContextType = {
    // User Presence
    activeUsers,
    updateUserPresence,
    removeUserPresence,
    
    // Live Cursors
    liveCursors,
    updateLiveCursor,
    hideLiveCursor,
    
    // Comments
    comments,
    createComment,
    updateComment,
    deleteComment,
    toggleCommentResolution,
    
    // Notifications
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    
    // Collaboration state
    isCollaborationEnabled,
    setCollaborationEnabled,
    currentFileId,
    setCurrentFileId,
    userColor,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

export default CollaborationProvider;