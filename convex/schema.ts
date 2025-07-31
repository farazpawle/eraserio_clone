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
});