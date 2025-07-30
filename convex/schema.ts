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

  // Files table
  files: defineTable({
    fileName: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
    archive: v.optional(v.boolean()),
    document: v.optional(v.string()),
    whiteboard: v.optional(v.string()),
  }),

  // User Settings table
  userSettings: defineTable({
    userId: v.string(),
    theme: v.string(), // 'light' | 'dark' | 'system'
    keyboardShortcuts: v.string(), // JSON string of keyboard shortcuts config
    preferences: v.string(), // JSON string for other user preferences
    lastUpdated: v.number(), // timestamp
  }).index("by_user", ["userId"]),
});