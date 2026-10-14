/**
 * Webhook Settings Management - Convex Functions
 * 
 * This module handles webhook configuration and delivery management.
 * Only admin users can manage webhook settings.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Admin check helper - validates admin password
 * Simple password-based authentication for admin access
 */
const validateAdminAccess = async (password: string | undefined) => {
  if (!password) {
    throw new Error("Unauthorized: No password provided");
  }
  
  // Hardcoded admin password - change this to your desired password
  const ADMIN_PASSWORD = "admin123";
  
  if (password !== ADMIN_PASSWORD) {
    throw new Error("Unauthorized: Invalid admin password");
  }
  
  return true;
};

/**
 * Query all webhook settings (admin only)
 */
export const getWebhookSettings = query({
  args: {
    adminPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await validateAdminAccess(args.adminPassword);
    
    return await ctx.db.query("webhookSettings").collect();
  },
});

/**
 * Query webhook settings by type
 */
export const getWebhookSettingsByType = query({
  args: {
    type: v.string(),
    adminPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await validateAdminAccess(args.adminPassword);
    
    return await ctx.db
      .query("webhookSettings")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();
  },
});

/**
 * Query active webhook settings for internal use
 */
export const getActiveWebhookSettings = query({
  args: {
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("webhookSettings").withIndex("by_active", (q) => q.eq("isActive", true));
    
    if (args.type) {
      // Filter by type after getting active ones
      const activeWebhooks = await query.collect();
      return activeWebhooks.filter(webhook => webhook.type === args.type);
    }
    
    return await query.collect();
  },
});

/**
 * Create new webhook setting (admin only)
 */
export const createWebhookSetting = mutation({
  args: {
    type: v.string(),
    url: v.string(),
    isActive: v.boolean(),
    secretKey: v.optional(v.string()),
    retryAttempts: v.number(),
    timeoutMs: v.number(),
    headers: v.optional(v.string()),
    description: v.optional(v.string()),
    adminPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await validateAdminAccess(args.adminPassword);
    
    // Validate URL format
    try {
      new URL(args.url);
    } catch {
      throw new Error("Invalid webhook URL format");
    }
    
    // Validate webhook type
    const validTypes = ['file_share', 'team_invitation', 'global'];
    if (!validTypes.includes(args.type)) {
      throw new Error(`Invalid webhook type. Must be one of: ${validTypes.join(', ')}`);
    }
    
    // Validate retry attempts
    if (args.retryAttempts < 0 || args.retryAttempts > 10) {
      throw new Error("Retry attempts must be between 0 and 10");
    }
    
    // Validate timeout
    if (args.timeoutMs < 1000 || args.timeoutMs > 30000) {
      throw new Error("Timeout must be between 1000ms and 30000ms");
    }
    
    // Validate headers JSON if provided
    if (args.headers) {
      try {
        JSON.parse(args.headers);
      } catch {
        throw new Error("Invalid headers JSON format");
      }
    }
    
    const now = Date.now();
    
    return await ctx.db.insert("webhookSettings", {
      type: args.type,
      url: args.url,
      isActive: args.isActive,
      secretKey: args.secretKey,
      retryAttempts: args.retryAttempts,
      timeoutMs: args.timeoutMs,
      headers: args.headers,
      description: args.description,
      createdBy: "admin", // since we're using password auth now
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update webhook setting (admin only)
 */
export const updateWebhookSetting = mutation({
  args: {
    webhookId: v.id("webhookSettings"),
    type: v.optional(v.string()),
    url: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    secretKey: v.optional(v.string()),
    retryAttempts: v.optional(v.number()),
    timeoutMs: v.optional(v.number()),
    headers: v.optional(v.string()),
    description: v.optional(v.string()),
    adminPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await validateAdminAccess(args.adminPassword);
    
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) {
      throw new Error("Webhook setting not found");
    }
    
    const updates: Partial<Doc<"webhookSettings">> = {
      updatedAt: Date.now(),
    };
    
    // Validate and update URL if provided
    if (args.url !== undefined) {
      try {
        new URL(args.url);
        updates.url = args.url;
      } catch {
        throw new Error("Invalid webhook URL format");
      }
    }
    
    // Validate and update type if provided
    if (args.type !== undefined) {
      const validTypes = ['file_share', 'team_invitation', 'global'];
      if (!validTypes.includes(args.type)) {
        throw new Error(`Invalid webhook type. Must be one of: ${validTypes.join(', ')}`);
      }
      updates.type = args.type;
    }
    
    // Validate and update retry attempts if provided
    if (args.retryAttempts !== undefined) {
      if (args.retryAttempts < 0 || args.retryAttempts > 10) {
        throw new Error("Retry attempts must be between 0 and 10");
      }
      updates.retryAttempts = args.retryAttempts;
    }
    
    // Validate and update timeout if provided
    if (args.timeoutMs !== undefined) {
      if (args.timeoutMs < 1000 || args.timeoutMs > 30000) {
        throw new Error("Timeout must be between 1000ms and 30000ms");
      }
      updates.timeoutMs = args.timeoutMs;
    }
    
    // Validate and update headers if provided
    if (args.headers !== undefined) {
      if (args.headers) {
        try {
          JSON.parse(args.headers);
        } catch {
          throw new Error("Invalid headers JSON format");
        }
      }
      updates.headers = args.headers;
    }
    
    // Update other optional fields
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.secretKey !== undefined) updates.secretKey = args.secretKey;
    if (args.description !== undefined) updates.description = args.description;
    
    await ctx.db.patch(args.webhookId, updates);
    
    return args.webhookId;
  },
});

/**
 * Delete webhook setting (admin only)
 */
export const deleteWebhookSetting = mutation({
  args: {
    webhookId: v.id("webhookSettings"),
    adminPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await validateAdminAccess(args.adminPassword);
    
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) {
      throw new Error("Webhook setting not found");
    }
    
    await ctx.db.delete(args.webhookId);
    
    return { success: true };
  },
});

/**
 * Test webhook endpoint (admin only)
 */
export const testWebhookEndpoint = mutation({
  args: {
    webhookId: v.id("webhookSettings"),
    adminPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await validateAdminAccess(args.adminPassword);
    
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) {
      throw new Error("Webhook setting not found");
    }
    
    // Create test payload
    const testPayload = {
      type: "test",
      timestamp: Date.now(),
      data: {
        message: "This is a test webhook delivery",
        webhookId: args.webhookId,
        testBy: "admin",
      },
    };
    
    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Eraser.io-Clone-Webhook/1.0',
      };
      
      // Add custom headers if configured
      if (webhook.headers) {
        const customHeaders = JSON.parse(webhook.headers);
        Object.assign(headers, customHeaders);
      }
      
      // Add HMAC signature if secret key is configured
      if (webhook.secretKey) {
        // Simple hash-based signature (not cryptographically secure HMAC, but functional)
        const timestamp = Date.now().toString();
        const combined = `${JSON.stringify(testPayload)}${webhook.secretKey}${timestamp}`;
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
          const char = combined.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        
        const signature = Math.abs(hash).toString(16);
        headers['X-Webhook-Signature'] = `sha256=${signature}`;
      }
      
      // Make the HTTP request
      const startTime = Date.now();
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(webhook.timeoutMs),
      });
      
      const duration = Date.now() - startTime;
      const responseText = await response.text();
      
      // Log the test delivery
      await ctx.db.insert("webhookDeliveries", {
        webhookSettingsId: args.webhookId,
        type: "test",
        payload: JSON.stringify(testPayload),
        httpStatus: response.status,
        responseBody: responseText.substring(0, 1000), // Limit response body size
        errorMessage: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        attemptNumber: 1,
        isSuccessful: response.ok,
        timestamp: Date.now(),
        relatedId: `test-${Date.now()}`,
        duration,
      });
      
      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        duration,
        responseBody: responseText.substring(0, 500), // Return limited response
      };
      
    } catch (error: any) {
      // Log the failed test delivery
      await ctx.db.insert("webhookDeliveries", {
        webhookSettingsId: args.webhookId,
        type: "test",
        payload: JSON.stringify(testPayload),
        httpStatus: undefined,
        responseBody: undefined,
        errorMessage: error.message || "Unknown error",
        attemptNumber: 1,
        isSuccessful: false,
        timestamp: Date.now(),
        relatedId: `test-${Date.now()}`,
        duration: undefined,
      });
      
      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  },
});

/**
 * Get webhook delivery logs (admin only)
 */
export const getWebhookDeliveries = query({
  args: {
    webhookId: v.optional(v.id("webhookSettings")),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
    adminPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await validateAdminAccess(args.adminPassword);
    
    let deliveries;
    
    if (args.webhookId !== undefined) {
      deliveries = await ctx.db
        .query("webhookDeliveries")
        .withIndex("by_webhook", (q) => q.eq("webhookSettingsId", args.webhookId!))
        .order("desc")
        .take(args.limit || 100);
    } else if (args.type !== undefined) {
      deliveries = await ctx.db
        .query("webhookDeliveries")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .order("desc")
        .take(args.limit || 100);
    } else {
      deliveries = await ctx.db
        .query("webhookDeliveries")
        .withIndex("by_timestamp")
        .order("desc")
        .take(args.limit || 100);
    }
    
    return deliveries;
  },
});
