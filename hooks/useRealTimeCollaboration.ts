'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useCollaboration } from '@/app/_context/CollaborationContext';
import { toast } from 'sonner';
import { debounce } from 'lodash';

interface UseRealTimeCollaborationProps {
  fileId: Id<'files'>;
  userId?: Id<'users'>;
  userName?: string;
  userEmail?: string;
  enablePresence?: boolean;
  enableCursors?: boolean;
  enableComments?: boolean;
  enableNotifications?: boolean;
  enableConflictResolution?: boolean;
  autoSaveInterval?: number; // in milliseconds
}

interface CursorPosition {
  x: number;
  y: number;
  selection?: {
    start: number;
    end: number;
  };
}

interface CollaborationState {
  isActive: boolean;
  activeUsers: any[];
  liveCursors: any[];
  comments: any[];
  notifications: any[];
  conflicts: any[];
  lastSaved: number | null;
  hasUnsavedChanges: boolean;
}

export const useRealTimeCollaboration = ({
  fileId,
  userId,
  userName,
  userEmail,
  enablePresence = true,
  enableCursors = true,
  enableComments = true,
  enableNotifications = true,
  enableConflictResolution = true,
  autoSaveInterval = 2000,
}: UseRealTimeCollaborationProps) => {
  const { isAuthenticated } = useConvexAuth();
  const {
    activeUsers,
    liveCursors,
    comments,
    notifications,
  } = useCollaboration();

  // Mock values for missing properties
  const conflicts: any[] = [];
  const isConnected = true;
  const lastSaved = null;

  // Mutations
  const updatePresence = useMutation(api.userPresence.updateUserPresence);
  const removePresence = useMutation(api.userPresence.removeUserPresence);
  const updateCursor = useMutation(api.liveCursors.updateLiveCursor);
  const hideCursor = useMutation(api.liveCursors.hideLiveCursor);
  const createComment = useMutation(api.comments.createComment);
  const markNotificationRead = useMutation(api.notifications.markNotificationAsRead);
  const checkConflicts = useQuery(api.conflictResolution.checkForConflicts, 'skip');
  const saveFile = useMutation(api.files.putFile);
  const saveWhiteboard = useMutation(api.files.putWhiteboard);

  // Queries
  const fileActiveUsers = useQuery(
    api.userPresence.getActiveUsers,
    enablePresence && fileId ? { fileId } : 'skip'
  );
  const fileLiveCursors = useQuery(
    api.liveCursors.getLiveCursors,
    enableCursors && fileId ? { fileId } : 'skip'
  );
  const fileComments = useQuery(
    api.comments.getComments,
    enableComments && fileId ? { fileId } : 'skip'
  );
  const userNotifications = useQuery(
    api.notifications.getUserNotifications,
    enableNotifications && userId ? { userId } : 'skip'
  );
  const pendingConflicts = useQuery(
    api.conflictResolution.getPendingConflicts,
    enableConflictResolution && fileId ? { fileId } : 'skip'
  );

  // State
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentContent, setCurrentContent] = useState<any>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition | null>(null);
  
  // Refs
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveContentRef = useRef<any>(null);
  const isActiveRef = useRef(true);

  // Debounced functions
  const debouncedUpdateCursor = useCallback(
    debounce(async (position: CursorPosition) => {
      if (!enableCursors || !userId || !fileId || !isAuthenticated) return;
      
      try {
        await updateCursor({
          fileId,
          userId,
          userName: userName || 'Anonymous',
          color: '#3B82F6',
          position: JSON.stringify(position),
          isVisible: true,
        });
      } catch (error) {
        console.error('Failed to update cursor:', error);
      }
    }, 100),
    [updateCursor, enableCursors, userId, fileId, isAuthenticated]
  );

  const debouncedAutoSave = useCallback(
    debounce(async (content: any) => {
      if (!fileId || !userId || !hasUnsavedChanges || isAutoSaving) return;
      
      setIsAutoSaving(true);
      try {
        // Determine file type and save accordingly
        if (content.type === 'whiteboard') {
          await saveWhiteboard({
            _id: fileId,
            whiteboard: content.data,
          });
        } else {
          await saveFile({
            _id: fileId,
            document: content.data,
          });
        }
        
        lastSaveContentRef.current = content;
        setHasUnsavedChanges(false);
        toast.success('Auto-saved', { duration: 1000 });
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast.error('Auto-save failed');
      } finally {
        setIsAutoSaving(false);
      }
    }, autoSaveInterval),
    [fileId, userId, hasUnsavedChanges, isAutoSaving, enableConflictResolution, checkConflicts, saveFile, saveWhiteboard, autoSaveInterval]
  );

  // Initialize presence
  const initializePresence = useCallback(async () => {
    if (!enablePresence || !userId || !fileId || !userName || !isAuthenticated) return;
    
    try {
      await updatePresence({
        fileId,
        userId,
        userName,
        userEmail: userEmail || '',
        isActive: true,
        color: '#3B82F6', // Default blue color
      });
      
      // Set up periodic presence updates
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
      
      presenceIntervalRef.current = setInterval(async () => {
        if (isActiveRef.current) {
          try {
            await updatePresence({
              fileId,
              userId,
              userName,
              userEmail: userEmail || '',
              isActive: true,
              color: '#3B82F6', // Default blue color
            });
          } catch (error) {
            console.error('Failed to update presence:', error);
          }
        }
      }, 30000); // Update every 30 seconds
    } catch (error) {
      console.error('Failed to initialize presence:', error);
    }
  }, [enablePresence, userId, fileId, userName, userEmail, isAuthenticated, updatePresence, hasUnsavedChanges]);

  // Cleanup presence
  const cleanupPresence = useCallback(async () => {
    if (!enablePresence || !userId || !fileId) return;
    
    try {
      await removePresence({ fileId, userId });
    } catch (error) {
      console.error('Failed to cleanup presence:', error);
    }
    
    if (presenceIntervalRef.current) {
      clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = null;
    }
  }, [enablePresence, userId, fileId, removePresence]);

  // Update cursor position
  const updateCursorPosition = useCallback((position: CursorPosition) => {
    setCursorPosition(position);
    debouncedUpdateCursor(position);
  }, [debouncedUpdateCursor]);

  // Hide cursor
  const hideCursorPosition = useCallback(async () => {
    if (!enableCursors || !userId || !fileId) return;
    
    try {
      await hideCursor({ fileId, userId });
      setCursorPosition(null);
    } catch (error) {
      console.error('Failed to hide cursor:', error);
    }
  }, [enableCursors, userId, fileId, hideCursor]);

  // Update content and trigger auto-save
  const updateContent = useCallback((newContent: any) => {
    setCurrentContent(newContent);
    
    // Check if content actually changed
    const hasChanged = JSON.stringify(newContent) !== JSON.stringify(lastSaveContentRef.current);
    setHasUnsavedChanges(hasChanged);
    
    if (hasChanged) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new auto-save timeout
      autoSaveTimeoutRef.current = setTimeout(() => {
        debouncedAutoSave(newContent);
      }, autoSaveInterval);
    }
  }, [debouncedAutoSave, autoSaveInterval]);

  // Manual save
  const saveNow = useCallback(async () => {
    if (!currentContent || !hasUnsavedChanges) return;
    
    // Cancel auto-save and save immediately
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    await debouncedAutoSave(currentContent);
  }, [currentContent, hasUnsavedChanges, debouncedAutoSave]);

  // Add comment
  const addComment = useCallback(async (content: string, position?: { x: number; y: number }) => {
    if (!enableComments || !userId || !fileId || !userName) return;
    
    try {
      await createComment({
        fileId,
        userId,
        userName,
        userEmail: userEmail || '',
        content,
        position: position ? JSON.stringify(position) : undefined,
      });
      toast.success('Comment added');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    }
  }, [enableComments, userId, fileId, userName, createComment]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: Id<'notifications'>) => {
    if (!enableNotifications) return;
    
    try {
      await markNotificationRead({ notificationId, userId: userId || '' });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [enableNotifications, markNotificationRead]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden;
      
      if (document.hidden) {
        hideCursorPosition();
      } else {
        initializePresence();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hideCursorPosition, initializePresence]);

  // Initialize on mount
  useEffect(() => {
    if (isAuthenticated && fileId && userId) {
      initializePresence();
    }
    
    return () => {
      cleanupPresence();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [isAuthenticated, fileId, userId, initializePresence, cleanupPresence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPresence();
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [cleanupPresence]);

  // Collaboration state
  const collaborationState: CollaborationState = {
    isActive: isAuthenticated && isConnected,
    activeUsers: fileActiveUsers || [],
    liveCursors: fileLiveCursors || [],
    comments: fileComments || [],
    notifications: userNotifications || [],
    conflicts: pendingConflicts || [],
    lastSaved,
    hasUnsavedChanges,
  };

  return {
    // State
    ...collaborationState,
    isAutoSaving,
    cursorPosition,
    currentContent,
    
    // Actions
    updateCursorPosition,
    hideCursorPosition,
    updateContent,
    saveNow,
    addComment,
    markAsRead,
    
    // Utilities
    initializePresence,
    cleanupPresence,
  };
};

export default useRealTimeCollaboration;