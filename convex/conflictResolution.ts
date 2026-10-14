import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a conflict when simultaneous edits are detected
export const createConflict = mutation({
  args: {
    fileId: v.string(),
    conflictId: v.string(), // unique identifier for this conflict
    type: v.string(), // 'document', 'whiteboard'
    conflictData: v.string(), // JSON string of conflict details
    involvedUsers: v.array(v.string()), // array of user IDs involved
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if conflict already exists
    const existingConflict = await ctx.db
      .query("conflictResolution")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .filter((q) => 
        q.and(
          q.eq(q.field("conflictId"), args.conflictId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingConflict) {
      // Update existing conflict with new data
      return await ctx.db.patch(existingConflict._id, {
        conflictData: args.conflictData,
        involvedUsers: args.involvedUsers,
      });
    }

    // Create new conflict
    const conflictRecordId = await ctx.db.insert("conflictResolution", {
      fileId: args.fileId,
      conflictId: args.conflictId,
      type: args.type,
      description: `Conflict of type ${args.type} detected`,
      conflictData: args.conflictData,
      involvedUsers: args.involvedUsers,
      status: "pending",
      createdAt: now,
    });

    // Notify involved users about the conflict
    for (const userId of args.involvedUsers) {
      await ctx.db.insert("notifications", {
        userId: userId,
        type: "conflict",
        title: "Edit conflict detected",
        message: `A conflict was detected in your recent edits. Please review and resolve.`,
        fileId: args.fileId,
        isRead: false,
        createdAt: now,
        data: JSON.stringify({ conflictId: args.conflictId, conflictRecordId }),
      });
    }

    return conflictRecordId;
  },
});

// Get pending conflicts for a file
export const getPendingConflicts = query({
  args: {
    fileId: v.string(),
  },
  handler: async (ctx, args) => {
    const conflicts = await ctx.db
      .query("conflictResolution")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .collect();

    return conflicts;
  },
});

// Resolve a conflict
export const resolveConflict = mutation({
  args: {
    conflictRecordId: v.id("conflictResolution"),
    resolution: v.string(), // JSON string of resolution data
    resolvedBy: v.string(), // user ID who resolved it
  },
  handler: async (ctx, args) => {
    const conflict = await ctx.db.get(args.conflictRecordId);
    
    if (!conflict) {
      throw new Error("Conflict not found");
    }

    if (conflict.status !== "pending") {
      throw new Error("Conflict is already resolved");
    }

    const now = Date.now();
    
    // Update conflict status
    await ctx.db.patch(args.conflictRecordId, {
      status: "resolved",
      resolution: args.resolution,
      resolvedAt: now,
      resolvedBy: args.resolvedBy,
    });

    // Get resolver's name for notifications
    const resolver = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.resolvedBy))
      .first();

    const resolverName = resolver?.name || "Unknown User";

    // Notify involved users about resolution
    for (const userId of conflict.involvedUsers) {
      if (userId !== args.resolvedBy) {
        await ctx.db.insert("notifications", {
          userId: userId,
          type: "conflict_resolved",
          title: "Conflict resolved",
          message: `${resolverName} resolved the edit conflict in your file.`,
          fileId: conflict.fileId,
          fromUserId: args.resolvedBy,
          fromUserName: resolverName,
          isRead: false,
          createdAt: now,
          data: JSON.stringify({ conflictId: conflict.conflictId }),
        });
      }
    }

    return conflict;
  },
});

// Auto-resolve conflicts using operational transformation
export const autoResolveConflict = mutation({
  args: {
    conflictRecordId: v.id("conflictResolution"),
    autoResolutionData: v.string(), // JSON string of auto-resolution result
  },
  handler: async (ctx, args) => {
    const conflict = await ctx.db.get(args.conflictRecordId);
    
    if (!conflict) {
      throw new Error("Conflict not found");
    }

    if (conflict.status !== "pending") {
      throw new Error("Conflict is already resolved");
    }

    const now = Date.now();
    
    // Update conflict status
    await ctx.db.patch(args.conflictRecordId, {
      status: "auto_resolved",
      resolution: args.autoResolutionData,
      resolvedAt: now,
      resolvedBy: "system",
    });

    // Notify involved users about auto-resolution
    for (const userId of conflict.involvedUsers) {
      await ctx.db.insert("notifications", {
        userId: userId,
        type: "conflict_auto_resolved",
        title: "Conflict auto-resolved",
        message: `An edit conflict was automatically resolved using smart merging.`,
        fileId: conflict.fileId,
        isRead: false,
        createdAt: now,
        data: JSON.stringify({ conflictId: conflict.conflictId }),
      });
    }

    return conflict;
  },
});

// Get conflict by ID
export const getConflict = query({
  args: {
    conflictRecordId: v.id("conflictResolution"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conflictRecordId);
  },
});

// Get conflicts by status
export const getConflictsByStatus = query({
  args: {
    status: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    const conflicts = await ctx.db
      .query("conflictResolution")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .take(limit);

    return conflicts;
  },
});

// Get user's conflicts
export const getUserConflicts = query({
  args: {
    userId: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allConflicts = args.status && args.status.trim() !== ''
      ? await ctx.db.query("conflictResolution")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("conflictResolution").collect();
    
    // Filter conflicts where user is involved
    const userConflicts = allConflicts.filter(conflict => 
      conflict.involvedUsers.includes(args.userId)
    );

    return userConflicts.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Check for potential conflicts before saving
export const checkForConflicts = query({
  args: {
    fileId: v.string(),
    lastKnownVersion: v.string(), // timestamp or version identifier
    currentContent: v.string(), // current content being saved
  },
  handler: async (ctx, args) => {
    // Get the current file data
    const fileData = await ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("_id"), args.fileId))
      .first();

    if (!fileData) {
      return { hasConflict: false, message: "File not found" };
    }

    // Check if file was modified after the last known version
    const lastModified = fileData.lastModified || 0;
    const lastKnownTimestamp = parseInt(args.lastKnownVersion);

    if (lastModified > lastKnownTimestamp) {
      // Potential conflict detected
      return {
        hasConflict: true,
        message: "File was modified by another user",
        lastModified: lastModified,
        conflictData: {
          serverContent: fileData.document || fileData.whiteboard,
          clientContent: args.currentContent,
          lastKnownVersion: args.lastKnownVersion,
        },
      };
    }

    return { hasConflict: false, message: "No conflicts detected" };
  },
});

// Clean up old resolved conflicts
export const cleanupOldConflicts = mutation({
  args: {
    olderThanDays: v.optional(v.number()), // Default 7 days
  },
  handler: async (ctx, args) => {
    const days = args.olderThanDays || 7;
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const oldConflicts = await ctx.db
      .query("conflictResolution")
      .filter((q) => 
        q.and(
          q.neq(q.field("status"), "pending"),
          q.lt(q.field("resolvedAt"), cutoffTime)
        )
      )
      .collect();

    const deletePromises = oldConflicts.map(conflict => 
      ctx.db.delete(conflict._id)
    );

    await Promise.all(deletePromises);
    
    return { deleted: oldConflicts.length };
  },
});

// Get conflict statistics
export const getConflictStats = query({
  args: {
    fileId: v.optional(v.string()),
    timeRange: v.optional(v.number()), // days to look back
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || 30; // Default 30 days
    const cutoffTime = Date.now() - (timeRange * 24 * 60 * 60 * 1000);
    
    let conflictsQuery = ctx.db.query("conflictResolution")
      .filter((q) => q.gt(q.field("createdAt"), cutoffTime));

    if (args.fileId) {
      conflictsQuery = conflictsQuery
        .filter((q) => q.eq(q.field("fileId"), args.fileId));
    }

    const conflicts = await conflictsQuery.collect();
    
    const stats = {
      total: conflicts.length,
      pending: conflicts.filter(c => c.status === "pending").length,
      resolved: conflicts.filter(c => c.status === "resolved").length,
      autoResolved: conflicts.filter(c => c.status === "auto_resolved").length,
      byType: conflicts.reduce((acc, conflict) => {
        acc[conflict.type] = (acc[conflict.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return stats;
  },
});