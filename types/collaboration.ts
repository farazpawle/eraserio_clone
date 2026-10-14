/**
 * TypeScript interfaces for Real-time Collaboration features
 * Includes types for conflict resolution, notifications, user presence, and live cursors
 */

// ==================== CONFLICT RESOLUTION TYPES ====================

export type ConflictStatus = "pending" | "resolved" | "auto_resolved";
export type ConflictType = "document" | "whiteboard" | "edit_conflict" | "version_mismatch";

export interface ConflictResolution {
  _id: string;
  fileId: string;
  conflictId: string;
  type: ConflictType;
  description?: string;
  involvedUsers: string[];
  conflictData: string; // JSON string containing conflict details
  status: ConflictStatus;
  resolvedBy?: string;
  resolvedAt?: number;
  createdAt: number;
  resolution?: string; // JSON string of resolution data
  _creationTime: number;
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  message: string;
  lastModified?: number;
  conflictData?: {
    serverContent: string;
    clientContent: string;
    lastKnownVersion: string;
  };
}

export interface ConflictStats {
  total: number;
  pending: number;
  resolved: number;
  autoResolved: number;
  byType: Record<string, number>;
}

// ==================== NOTIFICATION TYPES ====================

export type NotificationType = 
  | "comment" 
  | "mention" 
  | "file_shared" 
  | "user_joined" 
  | "file_updated"
  | "conflict"
  | "conflict_resolved"
  | "conflict_auto_resolved"
  | "team_invite"
  | "file_deleted"
  | "permission_changed";

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: string; // JSON string for additional data
  isRead: boolean;
  createdAt: number;
  fileId?: string;
  teamId?: string;
  commentId?: string;
  fromUserId?: string;
  fromUserName?: string;
  _creationTime: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  byType: Record<string, number>;
}

export interface NotificationCreateArgs {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  fileId?: string;
  commentId?: string;
  fromUserId?: string;
  fromUserName?: string;
  data?: string;
}

// ==================== USER PRESENCE TYPES ====================

export interface UserPresence {
  _id: string;
  fileId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userImageUrl?: string;
  isActive: boolean;
  lastSeen: number;
  cursor?: string; // JSON string of cursor position
  selection?: string; // JSON string of selection
  color: string;
  _creationTime: number;
}

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
  type: "canvas" | "document";
}

export interface Selection {
  start: number;
  end: number;
  elementId?: string;
}

export interface UserPresenceUpdateArgs {
  fileId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userImageUrl?: string;
  isActive: boolean;
  cursor?: string;
  selection?: string;
  color: string;
}

// ==================== LIVE CURSOR TYPES ====================

export interface LiveCursor {
  _id: string;
  fileId: string;
  userId: string;
  userName: string;
  position: string; // JSON string of cursor position
  timestamp: number;
  color: string;
  isVisible: boolean;
  _creationTime: number;
}

export interface LiveCursorPosition {
  x: number;
  y: number;
  elementId?: string;
  type: "canvas" | "document";
}

export interface LiveCursorUpdateArgs {
  fileId: string;
  userId: string;
  userName: string;
  position: string;
  color: string;
  isVisible: boolean;
}

export interface BatchCursorUpdate {
  fileId: string;
  userId: string;
  userName: string;
  position: string;
  color: string;
  isVisible: boolean;
}

// ==================== COLLABORATION CONTEXT TYPES ====================

export interface CollaborationState {
  activeUsers: UserPresence[];
  liveCursors: LiveCursor[];
  pendingConflicts: ConflictResolution[];
  unreadNotifications: Notification[];
  currentUserColor?: string;
}

export interface FileCollaborationInfo {
  fileId: string;
  activeUserCount: number;
  hasConflicts: boolean;
  lastActivity: number;
  collaborators: {
    userId: string;
    userName: string;
    color: string;
    isActive: boolean;
  }[];
}

// ==================== API RESPONSE TYPES ====================

export interface ConflictResolutionResponse {
  success: boolean;
  conflictId?: string;
  message: string;
  data?: ConflictResolution;
}

export interface NotificationResponse {
  success: boolean;
  notificationId?: string;
  message: string;
  data?: Notification;
}

export interface PresenceResponse {
  success: boolean;
  message: string;
  data?: UserPresence;
}

// ==================== HOOK TYPES ====================

export interface UseCollaborationReturn {
  // State
  activeUsers: UserPresence[];
  liveCursors: LiveCursor[];
  pendingConflicts: ConflictResolution[];
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;

  // Actions
  updatePresence: (args: UserPresenceUpdateArgs) => Promise<void>;
  updateCursor: (position: LiveCursorPosition) => Promise<void>;
  sendNotification: (args: NotificationCreateArgs) => Promise<void>;
  resolveConflict: (conflictId: string, resolution: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  
  // Cleanup
  cleanup: () => void;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseConflictResolutionReturn {
  conflicts: ConflictResolution[];
  isLoading: boolean;
  resolveConflict: (conflictId: string, resolution: string) => Promise<void>;
  autoResolveConflict: (conflictId: string, autoResolutionData: string) => Promise<void>;
  checkForConflicts: (fileId: string, lastKnownVersion: string, content: string) => Promise<ConflictDetectionResult>;
}

// ==================== COMPONENT PROP TYPES ====================

export interface ConflictDialogProps {
  conflict: ConflictResolution;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: string) => Promise<void>;
  onAutoResolve: () => Promise<void>;
}

export interface NotificationPanelProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (notificationId: string) => void;
  isLoading?: boolean;
}

export interface LiveCursorDisplayProps {
  cursors: LiveCursor[];
  currentUserId: string;
  containerRef: React.RefObject<HTMLElement>;
}

export interface UserPresenceIndicatorProps {
  activeUsers: UserPresence[];
  maxDisplay?: number;
  showDetails?: boolean;
}

// ==================== EVENT TYPES ====================

export interface CollaborationEvent {
  type: "user_joined" | "user_left" | "conflict_detected" | "conflict_resolved" | "notification_received";
  data: any;
  timestamp: number;
  fileId: string;
  userId?: string;
}

export interface ConflictEvent extends CollaborationEvent {
  type: "conflict_detected" | "conflict_resolved";
  data: {
    conflictId: string;
    involvedUsers: string[];
    conflictType: ConflictType;
    resolution?: string;
  };
}

export interface NotificationEvent extends CollaborationEvent {
  type: "notification_received";
  data: {
    notification: Notification;
  };
}

// ==================== UTILITY TYPES ====================

export interface CollaborationConfig {
  enableRealTimeCursors: boolean;
  enableConflictDetection: boolean;
  enableNotifications: boolean;
  cursorUpdateInterval: number; // milliseconds
  presenceUpdateInterval: number; // milliseconds
  conflictCheckInterval: number; // milliseconds
  maxActiveUsers: number;
  notificationTypes: NotificationType[];
}

export interface CollaborationPermissions {
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canResolveConflicts: boolean;
  canDeleteNotifications: boolean;
}

// ==================== ERROR TYPES ====================

export interface CollaborationError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
}

export type ConflictResolutionError = CollaborationError & {
  conflictId?: string;
  conflictType?: ConflictType;
};

export type NotificationError = CollaborationError & {
  notificationId?: string;
  notificationType?: NotificationType;
};

export type PresenceError = CollaborationError & {
  userId?: string;
  fileId?: string;
};
