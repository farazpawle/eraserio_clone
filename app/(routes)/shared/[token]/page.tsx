"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { AlertCircle, Eye, Edit, MessageSquare, Lock, Globe, Users } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import WSHeader from "../../wokspace/_components/WSHeader";
import Editor from "../../wokspace/_components/Editor";
import WSCanvas from "../../wokspace/_components/WSCanvas";
import { ResizablePane } from "@/components/ui/resizable-pane";
import { toast } from "sonner";
import moment from "moment";

const SharedFilePage = () => {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [triggerSave, setTriggerSave] = useState(0);
  const [isReadOnly, setIsReadOnly] = useState(true);

  // Query to get file by share token
  const shareData = useQuery(api.fileShares.getFileByShareToken, { token });

  useEffect(() => {
    if (shareData === null) {
      // Share not found or invalid
      toast.error("Invalid or expired share link");
    } else if (shareData && 'expired' in shareData && shareData.expired) {
      // Share is expired
      toast.error("This share link has expired");
    } else if (shareData && 'file' in shareData && shareData.file) {
      // Set read-only based on permissions - allow editing for 'edit' and 'comment' permissions
      setIsReadOnly(shareData.permissions === 'view');
      
      if (shareData.permissions === 'edit') {
        toast.success("You have edit access to this file");
      } else if (shareData.permissions === 'comment') {
        toast.info("You have comment and edit access to this file");
      } else {
        toast.info("You have view-only access to this file");
      }
    }
  }, [shareData]);

  const handleSave = () => {
    if (isReadOnly) {
      toast.error("You don't have permission to save changes");
      return;
    }
    setTriggerSave(prev => prev + 1);
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'edit':
        return <Edit className="h-4 w-4" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      case 'view':
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getShareTypeIcon = (shareType: string) => {
    switch (shareType) {
      case 'public':
        return <Globe className="h-4 w-4" />;
      case 'team':
        return <Users className="h-4 w-4" />;
      case 'private':
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  // Loading state
  if (shareData === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading shared file...</p>
        </div>
      </div>
    );
  }

  // Error states
  if (shareData === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 p-4">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              This share link is invalid or has been revoked.
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (shareData && 'expired' in shareData && shareData.expired) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 p-4">
        <div className="max-w-md w-full">
          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              This share link has expired.
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Type guard to ensure we have the correct shareData structure
  if (!shareData || !('file' in shareData)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 p-4">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              The shared file could not be found.
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { file, permissions, shareType, sharedByUser } = shareData;

  if (!file) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 p-4">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              The shared file could not be found.
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasDocument = file.document && file.document.trim() !== '';
  const hasWhiteboard = file.whiteboard && file.whiteboard.trim() !== '';

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <WSHeader 
        onSave={handleSave} 
        fileName={file.fileName} 
        fileData={file}
      />
      
      {/* Share Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            {getShareTypeIcon(shareType)}
            <span className="text-sm text-blue-800 dark:text-blue-200">
              Shared by {sharedByUser?.name || 'Unknown'}
            </span>
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded-full">
              {getPermissionIcon(permissions)}
              <span className="text-xs font-medium text-blue-800 dark:text-blue-200 capitalize">
                {permissions} Access
              </span>
            </div>
          </div>
          {isReadOnly && (
            <div className="text-xs text-blue-600 dark:text-blue-400">
              Read-only mode
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {hasDocument && hasWhiteboard ? (
          // Both document and whiteboard - show resizable panes
          <ResizablePane
            leftPanel={
              <Editor 
                fileId={file._id} 
                fileData={file}
                triggerSave={triggerSave}
                readOnly={isReadOnly}
              />
            }
            rightPanel={
              <WSCanvas 
                fileId={file._id} 
                fileData={file}
                triggerSave={triggerSave}
                readOnly={isReadOnly}
              />
            }
            initialLeftWidth={50}
            minLeftWidth={30}
            maxLeftWidth={70}
          />
        ) : hasDocument ? (
          // Document only
          <Editor 
            fileId={file._id} 
            fileData={file}
            triggerSave={triggerSave}
            readOnly={isReadOnly}
          />
        ) : hasWhiteboard ? (
          // Whiteboard only
          <WSCanvas 
            fileId={file._id} 
            fileData={file}
            triggerSave={triggerSave}
            readOnly={isReadOnly}
          />
        ) : (
          // Empty file
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p>This file is empty.</p>
              {!isReadOnly && (
                <p className="text-sm mt-2">Start by adding some content!</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedFilePage;