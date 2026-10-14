import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new comment
export const createComment = mutation({
  args: {
    fileId: v.string(),
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    userImageUrl: v.optional(v.string()),
    content: v.string(),
    position: v.optional(v.string()), // JSON string of position data
    parentCommentId: v.optional(v.id("comments")),
    mentions: v.optional(v.array(v.string())), // array of mentioned user emails
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const commentId = await ctx.db.insert("comments", {
      fileId: args.fileId,
      userId: args.userId,
      userName: args.userName,
      userEmail: args.userEmail,
      userImageUrl: args.userImageUrl,
      content: args.content,
      position: args.position,
      parentCommentId: args.parentCommentId,
      isResolved: false,
      createdAt: now,
      mentions: args.mentions,
    });

    // Create notifications for mentioned users
    if (args.mentions && args.mentions.length > 0) {
      for (const mentionedEmail of args.mentions) {
        // Find the mentioned user
        const mentionedUser = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("email"), mentionedEmail))
          .first();

        if (mentionedUser) {
          await ctx.db.insert("notifications", {
            userId: mentionedUser._id,
            type: "mention",
            title: "You were mentioned in a comment",
            message: `${args.userName} mentioned you in a comment: "${args.content.substring(0, 100)}${args.content.length > 100 ? '...' : ''}"`,
            fileId: args.fileId,
            commentId: commentId,
            fromUserId: args.userId,
            fromUserName: args.userName,
            isRead: false,
            createdAt: now,
          });
        }
      }
    }

    // Create notification for parent comment author (if replying)
    if (args.parentCommentId) {
      const parentComment = await ctx.db.get(args.parentCommentId);
      if (parentComment && parentComment.userId !== args.userId) {
        await ctx.db.insert("notifications", {
          userId: parentComment.userId,
          type: "comment",
          title: "New reply to your comment",
          message: `${args.userName} replied to your comment: "${args.content.substring(0, 100)}${args.content.length > 100 ? '...' : ''}"`,
          fileId: args.fileId,
          commentId: commentId,
          fromUserId: args.userId,
          fromUserName: args.userName,
          isRead: false,
          createdAt: now,
        });
      }
    }

    return commentId;
  },
});

// Get comments for a file
export const getComments = query({
  args: {
    fileId: v.string(),
    includeResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let commentsQuery = ctx.db
      .query("comments")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId));

    if (!args.includeResolved) {
      commentsQuery = commentsQuery.filter((q) => q.eq(q.field("isResolved"), false));
    }

    const comments = await commentsQuery
      .order("asc")
      .collect();

    // Organize comments into threads
    const topLevelComments = comments.filter(comment => !comment.parentCommentId);
    const replies = comments.filter(comment => comment.parentCommentId);

    // Attach replies to their parent comments
    const commentsWithReplies = topLevelComments.map(comment => ({
      ...comment,
      replies: replies.filter(reply => reply.parentCommentId === comment._id)
        .sort((a, b) => a.createdAt - b.createdAt)
    }));

    return commentsWithReplies.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Update comment content
export const updateComment = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
    userId: v.string(), // Only allow author to edit
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.userId !== args.userId) {
      throw new Error("Only the comment author can edit this comment");
    }

    return await ctx.db.patch(args.commentId, {
      content: args.content,
      updatedAt: Date.now(),
    });
  },
});

// Resolve/unresolve a comment
export const toggleCommentResolution = mutation({
  args: {
    commentId: v.id("comments"),
    isResolved: v.boolean(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Allow comment author or file collaborators to resolve
    // For now, we'll allow anyone to resolve (can be restricted later)
    return await ctx.db.patch(args.commentId, {
      isResolved: args.isResolved,
      updatedAt: Date.now(),
    });
  },
});

// Delete a comment
export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.userId !== args.userId) {
      throw new Error("Only the comment author can delete this comment");
    }

    // Delete all replies to this comment first
    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parent", (q) => q.eq("parentCommentId", args.commentId))
      .collect();

    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    // Delete the comment
    return await ctx.db.delete(args.commentId);
  },
});

// Get comment by ID
export const getComment = query({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.commentId);
  },
});

// Get comments by position (for canvas elements)
export const getCommentsByPosition = query({
  args: {
    fileId: v.string(),
    position: v.string(), // JSON string to match
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .filter((q) => 
        q.and(
          q.eq(q.field("position"), args.position),
          q.eq(q.field("isResolved"), false)
        )
      )
      .collect();

    return comments.sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Get comment count for a file
export const getCommentCount = query({
  args: {
    fileId: v.string(),
    includeResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let commentsQuery = ctx.db
      .query("comments")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId));

    if (!args.includeResolved) {
      commentsQuery = commentsQuery.filter((q) => q.eq(q.field("isResolved"), false));
    }

    const comments = await commentsQuery.collect();
    return comments.length;
  },
});

// Get recent comments for a user
export const getRecentComments = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return comments;
  },
});

// Search comments by content
export const searchComments = query({
  args: {
    fileId: v.string(),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .collect();

    // Simple text search (can be enhanced with better search later)
    const searchResults = comments.filter(comment => 
      (comment.content && comment.content.toLowerCase().includes(args.searchTerm.toLowerCase())) ||
      (comment.userName && comment.userName.toLowerCase().includes(args.searchTerm.toLowerCase()))
    );

    return searchResults.sort((a, b) => b.createdAt - a.createdAt);
  },
});