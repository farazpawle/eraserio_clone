import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new notification
export const createNotification = mutation({
  args: {
    userId: v.string(),
    type: v.string(), // 'comment', 'mention', 'file_shared', 'user_joined', 'file_updated', etc.
    title: v.string(),
    message: v.string(),
    fileId: v.optional(v.string()),
    commentId: v.optional(v.id("comments")),
    fromUserId: v.optional(v.string()),
    fromUserName: v.optional(v.string()),
    data: v.optional(v.string()), // JSON string for additional data
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      fileId: args.fileId,
      commentId: args.commentId,
      fromUserId: args.fromUserId,
      fromUserName: args.fromUserName,
      isRead: false,
      createdAt: now,
      data: args.data,
    });
  },
});

// Get notifications for a user
export const getUserNotifications = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    let notificationsQuery = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    if (args.unreadOnly) {
      notificationsQuery = notificationsQuery
        .filter((q) => q.eq(q.field("isRead"), false));
    }

    const notifications = await notificationsQuery
      .order("desc")
      .take(limit);

    return notifications;
  },
});

// Mark notification as read
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.string(), // Ensure user can only mark their own notifications
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== args.userId) {
      throw new Error("You can only mark your own notifications as read");
    }

    return await ctx.db.patch(args.notificationId, {
      isRead: true,
    });
  },
});

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => 
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    const updatePromises = unreadNotifications.map(notification => 
      ctx.db.patch(notification._id, { isRead: true })
    );

    await Promise.all(updatePromises);
    
    return { markedAsRead: unreadNotifications.length };
  },
});

// Get unread notification count
export const getUnreadNotificationCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => 
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    return unreadNotifications.length;
  },
});

// Delete notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== args.userId) {
      throw new Error("You can only delete your own notifications");
    }

    return await ctx.db.delete(args.notificationId);
  },
});

// Delete all notifications for a user
export const deleteAllNotifications = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const userNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const deletePromises = userNotifications.map(notification => 
      ctx.db.delete(notification._id)
    );

    await Promise.all(deletePromises);
    
    return { deleted: userNotifications.length };
  },
});

// Create notification for file sharing
export const notifyFileShared = mutation({
  args: {
    fileId: v.string(),
    fileName: v.string(),
    sharedWithUserId: v.string(),
    sharedByUserId: v.string(),
    sharedByUserName: v.string(),
    permissions: v.string(), // 'view', 'edit', 'comment'
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.insert("notifications", {
      userId: args.sharedWithUserId,
      type: "file_shared",
      title: "File shared with you",
      message: `${args.sharedByUserName} shared "${args.fileName}" with you (${args.permissions} access)`,
      fileId: args.fileId,
      fromUserId: args.sharedByUserId,
      fromUserName: args.sharedByUserName,
      isRead: false,
      createdAt: now,
      data: JSON.stringify({ permissions: args.permissions }),
    });
  },
});

// Create notification for user joining file
export const notifyUserJoined = mutation({
  args: {
    fileId: v.string(),
    fileName: v.string(),
    joinedUserId: v.string(),
    joinedUserName: v.string(),
    notifyUserIds: v.array(v.string()), // Users to notify
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const notificationPromises = args.notifyUserIds.map(userId => 
      ctx.db.insert("notifications", {
        userId: userId,
        type: "user_joined",
        title: "User joined file",
        message: `${args.joinedUserName} joined "${args.fileName}"`,
        fileId: args.fileId,
        fromUserId: args.joinedUserId,
        fromUserName: args.joinedUserName,
        isRead: false,
        createdAt: now,
      })
    );

    await Promise.all(notificationPromises);
    
    return { notified: args.notifyUserIds.length };
  },
});

// Create notification for file updates
export const notifyFileUpdated = mutation({
  args: {
    fileId: v.string(),
    fileName: v.string(),
    updatedByUserId: v.string(),
    updatedByUserName: v.string(),
    notifyUserIds: v.array(v.string()),
    updateType: v.string(), // 'document', 'whiteboard', 'name', etc.
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const notificationPromises = args.notifyUserIds
      .filter(userId => userId !== args.updatedByUserId) // Don't notify the person who made the update
      .map(userId => 
        ctx.db.insert("notifications", {
          userId: userId,
          type: "file_updated",
          title: "File updated",
          message: `${args.updatedByUserName} updated "${args.fileName}"`,
          fileId: args.fileId,
          fromUserId: args.updatedByUserId,
          fromUserName: args.updatedByUserName,
          isRead: false,
          createdAt: now,
          data: JSON.stringify({ updateType: args.updateType }),
        })
      );

    await Promise.all(notificationPromises);
    
    return { notified: notificationPromises.length };
  },
});

// Get notifications by type
export const getNotificationsByType = query({
  args: {
    userId: v.string(),
    type: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), args.type))
      .order("desc")
      .take(limit);

    return notifications;
  },
});

// Clean up old notifications (run periodically)
export const cleanupOldNotifications = mutation({
  args: {
    olderThanDays: v.optional(v.number()), // Default 30 days
  },
  handler: async (ctx, args) => {
    const days = args.olderThanDays || 30;
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const oldNotifications = await ctx.db
      .query("notifications")
      .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
      .collect();

    const deletePromises = oldNotifications.map(notification => 
      ctx.db.delete(notification._id)
    );

    await Promise.all(deletePromises);
    
    return { deleted: oldNotifications.length };
  },
});

// Get notification statistics
export const getNotificationStats = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const allNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const unreadCount = allNotifications.filter(n => !n.isRead).length;
    const totalCount = allNotifications.length;
    
    const typeStats = allNotifications.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalCount,
      unread: unreadCount,
      read: totalCount - unreadCount,
      byType: typeStats,
    };
  },
});