'use client';

import { useEffect, useCallback, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { FILE } from '@/app/dashboard/_components/FileList';

interface UseWorkspaceCollaborationProps {
  fileId: string;
  fileData?: FILE;
  enabled?: boolean;
}

interface ConflictData {
  _id: string;
  fileId: string;
  conflictId: string;
  type: string;
  conflictData: string;
  involvedUsers: string[];
  status: string;
  createdAt: number;
}

export const useWorkspaceCollaboration = ({
  fileId,
  fileData,
  enabled = true,
}: UseWorkspaceCollaborationProps) => {
  const [lastKnownVersion, setLastKnownVersion] = useState<string>("");

  // Mutations
  const createConflict = useMutation(api.conflictResolution.createConflict);
  const resolveConflict = useMutation(api.conflictResolution.resolveConflict);
  const autoResolveConflict = useMutation(api.conflictResolution.autoResolveConflict);
  const createNotification = useMutation(api.notifications.createNotification);

  // Queries
  const pendingConflicts = useQuery(
    api.conflictResolution.getPendingConflicts,
    enabled && fileId ? { fileId } : "skip"
  );

  const userNotifications = useQuery(
    api.notifications.getUserNotifications,
    enabled ? { userId: "current-user-id", limit: 20 } : "skip" // TODO: Get actual user ID
  );

  // Track last known version
  useEffect(() => {
    if (fileData?.lastModified) {
      setLastKnownVersion(fileData.lastModified.toString());
    }
  }, [fileData]);

  // Check for conflicts before saving
  const checkForConflicts = useCallback((currentContent: string, contentType: 'document' | 'whiteboard') => {
    if (!fileData || !lastKnownVersion) return false;

    // Simple conflict detection based on modification time
    const hasConflict = fileData.lastModified && 
                       parseInt(lastKnownVersion) > 0 && 
                       fileData.lastModified > parseInt(lastKnownVersion);

    return hasConflict;
  }, [fileData, lastKnownVersion]);

  // Create conflict record
  const createConflictRecord = useCallback(async (
    currentContent: string, 
    contentType: 'document' | 'whiteboard'
  ) => {
    if (!fileData) return null;

    const conflictId = `${contentType}_conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const conflictRecordId = await createConflict({
        fileId: fileId,
        conflictId: conflictId,
        type: contentType,
        conflictData: JSON.stringify({
          serverContent: contentType === 'document' ? fileData.document : fileData.whiteboard,
          clientContent: currentContent,
          lastKnownVersion: lastKnownVersion,
          conflictTimestamp: Date.now(),
        }),
        involvedUsers: ["current-user-id"], // TODO: Get actual user IDs
      });

      toast.error(`${contentType === 'document' ? 'Document' : 'Canvas'} conflict detected!`, {
        description: 'Another user has modified this file. Please resolve the conflict.',
        duration: 5000,
      });

      return conflictRecordId;
    } catch (error) {
      console.error('Error creating conflict record:', error);
      return null;
    }
  }, [fileId, fileData, lastKnownVersion, createConflict]);

  // Send update notification
  const sendUpdateNotification = useCallback(async (contentType: 'document' | 'whiteboard') => {
    if (!fileData) return;

    try {
      await createNotification({
        userId: "team-members", // TODO: Get actual team member IDs  
        type: "file_updated",
        title: `${contentType === 'document' ? 'Document' : 'Canvas'} updated`,
        message: `${contentType === 'document' ? 'Document' : 'Canvas'} "${fileData.fileName || 'Untitled'}" has been updated`,
        fileId: fileId,
        fromUserId: "current-user-id", // TODO: Get actual current user ID
        fromUserName: "Current User", // TODO: Get actual current user name
      });
    } catch (error) {
      console.error('Error sending update notification:', error);
    }
  }, [fileId, fileData, createNotification]);

  // Update last known version after successful save
  const updateLastKnownVersion = useCallback(() => {
    setLastKnownVersion(Date.now().toString());
  }, []);

  // Resolve conflict
  const handleResolveConflict = useCallback(async (
    conflictId: string, 
    resolution: 'accept_current' | 'accept_incoming' | 'manual_merge', 
    mergedContent?: any
  ) => {
    try {
      let resolutionData: any = { type: resolution };
      
      if (resolution === 'manual_merge' && mergedContent) {
        resolutionData.mergedContent = mergedContent;
      }

      await resolveConflict({
        conflictRecordId: conflictId as Id<"conflictResolution">,
        resolution: JSON.stringify(resolutionData),
        resolvedBy: "current-user-id", // TODO: Get actual user ID
      });

      toast.success('Conflict resolved successfully');
      return true;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error('Failed to resolve conflict');
      return false;
    }
  }, [resolveConflict]);

  // Auto-resolve conflict
  const handleAutoResolveConflict = useCallback(async (conflictId: string) => {
    try {
      await autoResolveConflict({
        conflictRecordId: conflictId as Id<"conflictResolution">,
        autoResolutionData: JSON.stringify({ type: 'auto_merge', timestamp: Date.now() }),
      });

      toast.success('Conflict auto-resolved');
      return true;
    } catch (error) {
      console.error('Error auto-resolving conflict:', error);
      toast.error('Failed to auto-resolve conflict');
      return false;
    }
  }, [autoResolveConflict]);

  return {
    // State
    pendingConflicts: pendingConflicts || [],
    notifications: userNotifications || [],
    lastKnownVersion,
    
    // Functions
    checkForConflicts,
    createConflictRecord,
    sendUpdateNotification,
    updateLastKnownVersion,
    handleResolveConflict,
    handleAutoResolveConflict,
    
    // Utilities
    hasConflicts: (pendingConflicts?.length || 0) > 0,
    unreadNotifications: (userNotifications || []).filter(n => !n.isRead).length,
  };
};

export default useWorkspaceCollaboration;
