import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Update user presence when they join/leave a file
export const updateUserPresence = mutation({
  args: {
    fileId: v.string(),
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    userImageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    cursor: v.optional(v.string()),
    selection: v.optional(v.string()),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user presence already exists
    const existingPresence = await ctx.db
      .query("userPresence")
      .withIndex("by_file_user", (q) => 
        q.eq("fileId", args.fileId).eq("userId", args.userId)
      )
      .first();

    const now = Date.now();

    if (existingPresence) {
      // Update existing presence
      return await ctx.db.patch(existingPresence._id, {
        userName: args.userName,
        userEmail: args.userEmail,
        userImageUrl: args.userImageUrl,
        isActive: args.isActive,
        lastSeen: now,
        cursor: args.cursor,
        selection: args.selection,
        color: args.color,
      });
    } else {
      // Create new presence record
      return await ctx.db.insert("userPresence", {
        fileId: args.fileId,
        userId: args.userId,
        userName: args.userName,
        userEmail: args.userEmail,
        userImageUrl: args.userImageUrl,
        isActive: args.isActive,
        lastSeen: now,
        cursor: args.cursor,
        selection: args.selection,
        color: args.color,
      });
    }
  },
});

// Get all active users in a file
export const getActiveUsers = query({
  args: {
    fileId: v.string(),
  },
  handler: async (ctx, args) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000; // 5 minutes
    
    const activeUsers = await ctx.db
      .query("userPresence")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .filter((q) => 
        q.and(
          q.eq(q.field("isActive"), true),
          q.gt(q.field("lastSeen"), fiveMinutesAgo)
        )
      )
      .collect();

    return activeUsers;
  },
});

// Remove user presence when they leave
export const removeUserPresence = mutation({
  args: {
    fileId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query("userPresence")
      .withIndex("by_file_user", (q) => 
        q.eq("fileId", args.fileId).eq("userId", args.userId)
      )
      .first();

    if (presence) {
      await ctx.db.patch(presence._id, {
        isActive: false,
        lastSeen: Date.now(),
      });
    }
  },
});

// Clean up old presence records (run periodically)
export const cleanupOldPresence = mutation({
  args: {},
  handler: async (ctx, args) => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000; // 1 hour
    
    const oldPresence = await ctx.db
      .query("userPresence")
      .filter((q) => q.lt(q.field("lastSeen"), oneHourAgo))
      .collect();

    // Delete old presence records
    for (const presence of oldPresence) {
      await ctx.db.delete(presence._id);
    }

    return { deleted: oldPresence.length };
  },
});

// Update user cursor position
export const updateUserCursor = mutation({
  args: {
    fileId: v.string(),
    userId: v.string(),
    cursor: v.string(),
    selection: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query("userPresence")
      .withIndex("by_file_user", (q) => 
        q.eq("fileId", args.fileId).eq("userId", args.userId)
      )
      .first();

    if (presence) {
      await ctx.db.patch(presence._id, {
        cursor: args.cursor,
        selection: args.selection,
        lastSeen: Date.now(),
      });
    }
  },
});

// Get user presence by user ID
export const getUserPresence = query({
  args: {
    fileId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query("userPresence")
      .withIndex("by_file_user", (q) => 
        q.eq("fileId", args.fileId).eq("userId", args.userId)
      )
      .first();

    return presence;
  },
});

// Assign a unique color to a user for their cursor/selection
export const assignUserColor = mutation({
  args: {
    fileId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Predefined colors for user cursors
    const colors = [
      "#FF6B6B", // Red
      "#4ECDC4", // Teal
      "#45B7D1", // Blue
      "#96CEB4", // Green
      "#FFEAA7", // Yellow
      "#DDA0DD", // Plum
      "#98D8C8", // Mint
      "#F7DC6F", // Light Yellow
      "#BB8FCE", // Light Purple
      "#85C1E9", // Light Blue
    ];

    // Get existing users in the file to avoid color conflicts
    const existingUsers = await ctx.db
      .query("userPresence")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const usedColors = existingUsers.map(user => user.color);
    
    // Find an available color
    let assignedColor = colors.find(color => !usedColors.includes(color));
    
    // If all colors are used, use a random one
    if (!assignedColor) {
      assignedColor = colors[Math.floor(Math.random() * colors.length)];
    }

    return assignedColor;
  },
});