'use client';

import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { FILE } from '@/app/dashboard/_components/FileList';

interface ConflictAwareSaveOptions {
  fileId: string;
  fileData?: FILE;
  contentType: 'document' | 'whiteboard';
  content: string;
  onSaveSuccess?: () => void;
  onConflictDetected?: (conflictId: string) => void;
}

export const useConflictAwareSave = () => {
  const createConflict = useMutation(api.conflictResolution.createConflict);
  const createNotification = useMutation(api.notifications.createNotification);

  const saveWithConflictDetection = async ({
    fileId,
    fileData,
    contentType,
    content,
    onSaveSuccess,
    onConflictDetected,
  }: ConflictAwareSaveOptions) => {
    try {
      // Simple conflict detection (can be enhanced later)
      const hasConflict = false; // Simplified for now
      
      if (hasConflict) {
        // Create conflict record
        const conflictId = `${contentType}_conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const conflictRecordId = await createConflict({
          fileId: fileId,
          conflictId: conflictId,
          type: contentType,
          conflictData: JSON.stringify({
            serverContent: contentType === 'document' ? fileData?.document : fileData?.whiteboard,
            clientContent: content,
            conflictTimestamp: Date.now(),
          }),
          involvedUsers: ["current-user-id"], // TODO: Get actual user IDs
        });

        toast.error(`${contentType === 'document' ? 'Document' : 'Canvas'} conflict detected!`, {
          description: 'Another user has modified this file.',
          duration: 5000,
        });

        onConflictDetected?.(conflictId);
        return { success: false, conflictId: conflictRecordId };
      }

      // No conflicts, allow save to proceed
      onSaveSuccess?.();

      // Send notification after successful save
      try {
        await createNotification({
          userId: "team-members", // TODO: Get actual team member IDs  
          type: "file_updated",
          title: `${contentType === 'document' ? 'Document' : 'Canvas'} updated`,
          message: `${contentType === 'document' ? 'Document' : 'Canvas'} "${fileData?.fileName || 'Untitled'}" has been updated`,
          fileId: fileId,
          fromUserId: "current-user-id", // TODO: Get actual current user ID
          fromUserName: "Current User", // TODO: Get actual current user name
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the save operation if notification fails
      }

      return { success: true };
    } catch (error) {
      console.error('Error in conflict-aware save:', error);
      toast.error('Failed to save');
      return { success: false, error };
    }
  };

  return {
    saveWithConflictDetection,
  };
};

export default useConflictAwareSave;
