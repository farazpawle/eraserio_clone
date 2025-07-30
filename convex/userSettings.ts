import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// User settings interface
export interface UserSettings {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  keyboardShortcuts: any; // JSON string of keyboard shortcuts config
  preferences: any; // JSON string for other user preferences
  lastUpdated: number;
}

// Get user settings
export const getUserSettings = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    return result;
  },
});

// Create or update user settings
export const upsertUserSettings = mutation({
  args: {
    userId: v.string(),
    theme: v.optional(v.string()),
    keyboardShortcuts: v.optional(v.string()),
    preferences: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    const settingsData = {
      userId: args.userId,
      theme: args.theme || 'system',
      keyboardShortcuts: args.keyboardShortcuts || '{}',
      preferences: args.preferences || '{}',
      lastUpdated: Date.now(),
    };

    if (existing) {
      // Update existing settings
      const result = await ctx.db.patch(existing._id, {
        ...settingsData,
        theme: args.theme !== undefined ? args.theme : existing.theme,
        keyboardShortcuts: args.keyboardShortcuts !== undefined ? args.keyboardShortcuts : existing.keyboardShortcuts,
        preferences: args.preferences !== undefined ? args.preferences : existing.preferences,
      });
      return result;
    } else {
      // Create new settings
      const result = await ctx.db.insert("userSettings", settingsData);
      return result;
    }
  },
});

// Update theme setting
export const updateTheme = mutation({
  args: {
    userId: v.string(),
    theme: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        theme: args.theme,
        lastUpdated: Date.now(),
      });
    } else {
      return await ctx.db.insert("userSettings", {
        userId: args.userId,
        theme: args.theme,
        keyboardShortcuts: '{}',
        preferences: '{}',
        lastUpdated: Date.now(),
      });
    }
  },
});

// Update keyboard shortcuts setting
export const updateKeyboardShortcuts = mutation({
  args: {
    userId: v.string(),
    keyboardShortcuts: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        keyboardShortcuts: args.keyboardShortcuts,
        lastUpdated: Date.now(),
      });
    } else {
      return await ctx.db.insert("userSettings", {
        userId: args.userId,
        theme: 'system',
        keyboardShortcuts: args.keyboardShortcuts,
        preferences: '{}',
        lastUpdated: Date.now(),
      });
    }
  },
});

// Update general preferences
export const updatePreferences = mutation({
  args: {
    userId: v.string(),
    preferences: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        preferences: args.preferences,
        lastUpdated: Date.now(),
      });
    } else {
      return await ctx.db.insert("userSettings", {
        userId: args.userId,
        theme: 'system',
        keyboardShortcuts: '{}',
        preferences: args.preferences,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Delete user settings
export const deleteUserSettings = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      return await ctx.db.delete(existing._id);
    }
    return null;
  },
});