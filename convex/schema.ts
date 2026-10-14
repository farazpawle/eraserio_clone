import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table
  users: defineTable({
    email: v.string(),
    imageUrl: v.string(),
    name: v.string(),
  }),

  // Teams table
  teams: defineTable({
    teamName: v.string(),
    createdBy: v.string(),
    archive: v.optional(v.boolean()),
  }),

  // Team Members table
  teamMembers: defineTable({
    teamId: v.string(),
    userId: v.string(),
    email: v.string(),
    role: v.string(), // 'owner', 'admin', 'member', 'viewer'
    joinedAt: v.number(),
    invitedBy: v.string(),
  }).index("by_team", ["teamId"]).index("by_user", ["userId"]).index("by_email", ["email"]),

  // Team Invitations table
  teamInvitations: defineTable({
    teamId: v.string(),
    email: v.string(),
    role: v.string(), // 'admin', 'member', 'viewer'
    invitedBy: v.string(),
    invitedAt: v.number(),
    status: v.string(), // 'pending', 'accepted', 'declined', 'expired'
    token: v.string(), // unique invitation token
    expiresAt: v.number(),
  }).index("by_team", ["teamId"]).index("by_email", ["email"]).index("by_token", ["token"]),

  // Files table
  files: defineTable({
    fileName: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
    archive: v.optional(v.boolean()),
    document: v.optional(v.string()),
    whiteboard: v.optional(v.string()),
    lastModified: v.optional(v.number()), // timestamp for when file was last edited
  }),

  // File Shares table
  fileShares: defineTable({
    fileId: v.string(),
    sharedBy: v.string(),
    sharedWith: v.optional(v.string()), // email of specific user, null for public link
    shareType: v.string(), // 'public', 'private', 'team'
    permissions: v.string(), // 'view', 'edit', 'comment'
    token: v.string(), // unique share token
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
  }).index("by_file", ["fileId"]).index("by_token", ["token"]).index("by_shared_with", ["sharedWith"]),

  // User Settings table
  userSettings: defineTable({
    userId: v.string(),
    theme: v.string(), // 'light' | 'dark' | 'system'
    keyboardShortcuts: v.string(), // JSON string of keyboard shortcuts config
    preferences: v.string(), // JSON string for other user preferences
    lastUpdated: v.number(), // timestamp
  }).index("by_user", ["userId"]),

  // Todos table
  todos: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("in-progress"), v.literal("completed")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    dueDate: v.optional(v.number()), // timestamp
    fileId: v.id("files"),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    order: v.number(), // for custom ordering
    tags: v.optional(v.array(v.string())),
  }).index("by_file", ["fileId"])
    .index("by_user", ["createdBy"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

  // Comments table
  comments: defineTable({
    fileId: v.string(),
    x: v.optional(v.number()), // x position (optional for text comments)
    y: v.optional(v.number()), // y position (optional for text comments)
    text: v.optional(v.string()), // legacy field for compatibility
    content: v.optional(v.string()), // for text content
    authorId: v.optional(v.string()), // legacy field for compatibility
    authorName: v.optional(v.string()), // legacy field for compatibility
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()), // user email who created the comment
    userImageUrl: v.optional(v.string()), // user profile image
    userId: v.string(), // user ID who created the comment
    timestamp: v.optional(v.number()), // legacy field for compatibility
    createdAt: v.number(), // creation timestamp
    updatedAt: v.optional(v.number()), // update timestamp
    resolved: v.optional(v.boolean()),
    isResolved: v.optional(v.boolean()),
    parentCommentId: v.optional(v.id("comments")), // for nested replies
    position: v.optional(v.string()), // canvas position identifier
    mentions: v.optional(v.array(v.string())), // array of mentioned user emails
    replies: v.optional(v.array(v.object({
      text: v.string(),
      authorId: v.string(),
      authorName: v.string(),
      timestamp: v.number(),
    }))),
  }).index("by_file", ["fileId"]).index("by_author", ["authorId"]).index("by_user", ["userId"]).index("by_parent", ["parentCommentId"]),

  // Conflict Resolution table
  conflictResolution: defineTable({
    fileId: v.string(),
    conflictId: v.string(), // unique identifier for the conflict
    type: v.string(), // type of conflict (e.g., 'edit_conflict', 'version_mismatch')
    description: v.string(), // description of the conflict
    involvedUsers: v.array(v.string()), // user IDs involved in the conflict
    conflictData: v.string(), // serialized conflict data
    status: v.string(), // 'pending', 'resolved', 'auto_resolved'
    resolvedBy: v.optional(v.string()), // user ID who resolved it
    resolvedAt: v.optional(v.number()), // timestamp
    createdAt: v.number(),
    resolution: v.optional(v.string()), // how the conflict was resolved
  }).index("by_file", ["fileId"]).index("by_status", ["status"]),

  // Live Cursors table
  liveCursors: defineTable({
    fileId: v.string(),
    userId: v.string(),
    userName: v.string(),
    position: v.optional(v.string()), // cursor position data as string
    timestamp: v.number(),
    isVisible: v.boolean(),
    color: v.optional(v.string()), // cursor color
  }).index("by_file", ["fileId"]).index("by_user", ["userId"]),

  // Notifications table
  notifications: defineTable({
    userId: v.string(),
    type: v.string(), // 'mention', 'comment', 'share', 'team_invite', 'file_update', etc.
    title: v.string(),
    message: v.string(),
    data: v.optional(v.string()), // JSON string for additional data
    isRead: v.boolean(),
    createdAt: v.number(),
    fileId: v.optional(v.string()), // related file if applicable
    teamId: v.optional(v.string()), // related team if applicable
    commentId: v.optional(v.id("comments")), // related comment if applicable
    fromUserId: v.optional(v.string()), // user who triggered the notification
    fromUserName: v.optional(v.string()), // name of user who triggered the notification
  }).index("by_user", ["userId"]).index("by_user_unread", ["userId", "isRead"]),

  // User Presence table
  userPresence: defineTable({
    fileId: v.string(),
    userId: v.string(),
    userName: v.string(),
    userEmail: v.optional(v.string()), // user email for presence
    userImageUrl: v.optional(v.string()), // user profile image for presence
    color: v.string(), // user's presence color
    cursor: v.optional(v.string()), // cursor position as string for compatibility
    selection: v.optional(v.string()), // user selection data
    lastSeen: v.number(), // timestamp
    isActive: v.boolean(), // whether user is currently active
  }).index("by_file", ["fileId"]).index("by_file_user", ["fileId", "userId"]),

  // Webhook Settings table
  webhookSettings: defineTable({
    type: v.string(), // 'file_share' | 'team_invitation' | 'global'
    url: v.string(), // webhook endpoint URL
    isActive: v.boolean(), // whether webhook is enabled
    secretKey: v.optional(v.string()), // HMAC secret for webhook security
    retryAttempts: v.number(), // number of retry attempts for failed webhooks
    timeoutMs: v.number(), // timeout in milliseconds for webhook requests
    headers: v.optional(v.string()), // JSON string of custom headers
    createdBy: v.string(), // admin user who created the webhook
    createdAt: v.number(), // creation timestamp
    updatedAt: v.number(), // last update timestamp
    description: v.optional(v.string()), // optional description of the webhook
  }).index("by_type", ["type"]).index("by_active", ["isActive"]),

  // Webhook Delivery Logs table
  webhookDeliveries: defineTable({
    webhookSettingsId: v.id("webhookSettings"),
    type: v.string(), // 'file_share' | 'team_invitation'
    payload: v.string(), // JSON string of the sent payload
    httpStatus: v.optional(v.number()), // HTTP response status code
    responseBody: v.optional(v.string()), // response from webhook endpoint
    errorMessage: v.optional(v.string()), // error message if delivery failed
    attemptNumber: v.number(), // current attempt number (1-based)
    isSuccessful: v.boolean(), // whether delivery was successful
    timestamp: v.number(), // when delivery was attempted
    relatedId: v.string(), // ID of related file share or team invitation
    duration: v.optional(v.number()), // request duration in milliseconds
  }).index("by_webhook", ["webhookSettingsId"])
    .index("by_type", ["type"])
    .index("by_success", ["isSuccessful"])
    .index("by_related", ["relatedId"])
    .index("by_timestamp", ["timestamp"]),
});