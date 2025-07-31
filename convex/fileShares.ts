import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Generate a unique share token
function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Create file share
export const createFileShare = mutation({
  args: {
    fileId: v.string(),
    sharedBy: v.string(),
    sharedWith: v.optional(v.string()),
    shareType: v.string(), // 'public', 'private', 'team'
    permissions: v.string(), // 'view', 'edit', 'comment'
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if file exists
    const file = await ctx.db.get(args.fileId as Id<"files">);
    if (!file) {
      throw new Error("File not found");
    }

    // If sharing with specific user, check if share already exists
    if (args.sharedWith) {
      const existingShare = await ctx.db
        .query("fileShares")
        .filter((q) => 
          q.and(
            q.eq(q.field("fileId"), args.fileId),
            q.eq(q.field("sharedWith"), args.sharedWith),
            q.eq(q.field("isActive"), true)
          )
        )
        .first();

      if (existingShare) {
        throw new Error("File is already shared with this user");
      }
    }

    const token = generateShareToken();
    
    const result = await ctx.db.insert("fileShares", {
      fileId: args.fileId,
      sharedBy: args.sharedBy,
      sharedWith: args.sharedWith,
      shareType: args.shareType,
      permissions: args.permissions,
      token,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
      isActive: true,
    });

    return { shareId: result, token };
  },
});

// Get file shares
export const getFileShares = query({
  args: {
    fileId: v.string(),
  },
  handler: async (ctx, args) => {
    const shares = await ctx.db
      .query("fileShares")
      .filter((q) => 
        q.and(
          q.eq(q.field("fileId"), args.fileId),
          q.eq(q.field("isActive"), true)
        )
      )
      .order("desc")
      .collect();

    return shares;
  },
});

// Get shared files for user
export const getSharedFiles = query({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const shares = await ctx.db
      .query("fileShares")
      .filter((q) => 
        q.and(
          q.eq(q.field("sharedWith"), args.userEmail),
          q.eq(q.field("isActive"), true)
        )
      )
      .order("desc")
      .collect();

    // Get file details for each share
    const sharedFiles = await Promise.all(
      shares.map(async (share) => {
        const file = await ctx.db.get(share.fileId as Id<"files">);
        const sharedByUser = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("email"), share.sharedBy))
          .first();
        
        return {
          ...share,
          file,
          sharedByUser,
        };
      })
    );

    return sharedFiles;
  },
});

// Get file by share token
export const getFileByShareToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("fileShares")
      .filter((q) => q.eq(q.field("token"), args.token))
      .first();

    if (!share || !share.isActive) {
      return null;
    }

    // Check if share is expired
    if (share.expiresAt && share.expiresAt < Date.now()) {
      return { expired: true };
    }

    // Get file information
    const file = await ctx.db.get(share.fileId as Id<"files">);
    const sharedByUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), share.sharedBy))
      .first();
    
    return {
      ...share,
      file,
      sharedByUser,
      expired: false,
    };
  },
});

// Update file share
export const updateFileShare = mutation({
  args: {
    shareId: v.id("fileShares"),
    permissions: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updateData: any = {};
    
    if (args.permissions) {
      updateData.permissions = args.permissions;
    }
    
    if (args.expiresAt !== undefined) {
      updateData.expiresAt = args.expiresAt;
    }

    await ctx.db.patch(args.shareId, updateData);
    return { success: true };
  },
});

// Revoke file share
export const revokeFileShare = mutation({
  args: {
    shareId: v.id("fileShares"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.shareId, {
      isActive: false,
    });
    return { success: true };
  },
});

// Delete file share
export const deleteFileShare = mutation({
  args: {
    shareId: v.id("fileShares"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.shareId);
    return { success: true };
  },
});

// Get public share link
export const getPublicShareLink = query({
  args: {
    fileId: v.string(),
    sharedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const publicShare = await ctx.db
      .query("fileShares")
      .filter((q) => 
        q.and(
          q.eq(q.field("fileId"), args.fileId),
          q.eq(q.field("sharedBy"), args.sharedBy),
          q.eq(q.field("shareType"), "public"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    return publicShare;
  },
});

// Create or get public share link
export const createPublicShareLink = mutation({
  args: {
    fileId: v.string(),
    sharedBy: v.string(),
    permissions: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if public share already exists
    const existingShare = await ctx.db
      .query("fileShares")
      .filter((q) => 
        q.and(
          q.eq(q.field("fileId"), args.fileId),
          q.eq(q.field("sharedBy"), args.sharedBy),
          q.eq(q.field("shareType"), "public"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (existingShare) {
      return { shareId: existingShare._id, token: existingShare.token };
    }

    // Create new public share
    const token = generateShareToken();
    
    const result = await ctx.db.insert("fileShares", {
      fileId: args.fileId,
      sharedBy: args.sharedBy,
      shareType: "public",
      permissions: args.permissions,
      token,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
      isActive: true,
    });

    return { shareId: result, token };
  },
});