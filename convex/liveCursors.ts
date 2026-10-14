import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Update live cursor position
export const updateLiveCursor = mutation({
  args: {
    fileId: v.string(),
    userId: v.string(),
    userName: v.string(),
    position: v.string(), // JSON string of {x, y, elementId?, type: 'canvas'|'document'}
    color: v.string(),
    isVisible: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if cursor already exists
    const existingCursor = await ctx.db
      .query("liveCursors")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    const now = Date.now();

    if (existingCursor) {
      // Update existing cursor
      return await ctx.db.patch(existingCursor._id, {
        userName: args.userName,
        position: args.position,
        timestamp: now,
        color: args.color,
        isVisible: args.isVisible,
      });
    } else {
      // Create new cursor
      return await ctx.db.insert("liveCursors", {
        fileId: args.fileId,
        userId: args.userId,
        userName: args.userName,
        position: args.position,
        timestamp: now,
        color: args.color,
        isVisible: args.isVisible,
      });
    }
  },
});

// Get all live cursors for a file
export const getLiveCursors = query({
  args: {
    fileId: v.string(),
    excludeUserId: v.optional(v.string()), // Exclude current user's cursor
  },
  handler: async (ctx, args) => {
    const thirtySecondsAgo = Date.now() - 30 * 1000; // 30 seconds
    
    let cursorsQuery = ctx.db
      .query("liveCursors")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .filter((q) => 
        q.and(
          q.eq(q.field("isVisible"), true),
          q.gt(q.field("timestamp"), thirtySecondsAgo)
        )
      );

    const cursors = await cursorsQuery.collect();

    // Filter out the current user's cursor if specified
    if (args.excludeUserId) {
      return cursors.filter(cursor => cursor.userId !== args.excludeUserId);
    }

    return cursors;
  },
});

// Hide cursor when user stops moving
export const hideLiveCursor = mutation({
  args: {
    fileId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const cursor = await ctx.db
      .query("liveCursors")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (cursor) {
      await ctx.db.patch(cursor._id, {
        isVisible: false,
        timestamp: Date.now(),
      });
    }
  },
});

// Remove cursor when user leaves
export const removeLiveCursor = mutation({
  args: {
    fileId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const cursor = await ctx.db
      .query("liveCursors")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (cursor) {
      await ctx.db.delete(cursor._id);
    }
  },
});

// Clean up old cursors (run periodically)
export const cleanupOldCursors = mutation({
  args: {},
  handler: async (ctx, args) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000; // 5 minutes
    
    const oldCursors = await ctx.db
      .query("liveCursors")
      .filter((q) => q.lt(q.field("timestamp"), fiveMinutesAgo))
      .collect();

    // Delete old cursors
    for (const cursor of oldCursors) {
      await ctx.db.delete(cursor._id);
    }

    return { deleted: oldCursors.length };
  },
});

// Batch update multiple cursors (for performance)
export const batchUpdateCursors = mutation({
  args: {
    updates: v.array(v.object({
      fileId: v.string(),
      userId: v.string(),
      userName: v.string(),
      position: v.string(),
      color: v.string(),
      isVisible: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const results = [];
    const now = Date.now();

    for (const update of args.updates) {
      const existingCursor = await ctx.db
        .query("liveCursors")
        .withIndex("by_file", (q) => q.eq("fileId", update.fileId))
        .filter((q) => q.eq(q.field("userId"), update.userId))
        .first();

      if (existingCursor) {
        const result = await ctx.db.patch(existingCursor._id, {
          userName: update.userName,
          position: update.position,
          timestamp: now,
          color: update.color,
          isVisible: update.isVisible,
        });
        results.push(result);
      } else {
        const result = await ctx.db.insert("liveCursors", {
          fileId: update.fileId,
          userId: update.userId,
          userName: update.userName,
          position: update.position,
          timestamp: now,
          color: update.color,
          isVisible: update.isVisible,
        });
        results.push(result);
      }
    }

    return results;
  },
});

// Get cursor by user ID
export const getUserCursor = query({
  args: {
    fileId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const cursor = await ctx.db
      .query("liveCursors")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    return cursor;
  },
});

// Get active cursor count for a file
export const getActiveCursorCount = query({
  args: {
    fileId: v.string(),
  },
  handler: async (ctx, args) => {
    const thirtySecondsAgo = Date.now() - 30 * 1000;
    
    const activeCursors = await ctx.db
      .query("liveCursors")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .filter((q) => 
        q.and(
          q.eq(q.field("isVisible"), true),
          q.gt(q.field("timestamp"), thirtySecondsAgo)
        )
      )
      .collect();

    return activeCursors.length;
  },
});