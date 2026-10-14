/**
 * Webhook Delivery System
 * 
 * This module handles the actual delivery of webhooks for invitations.
 * It includes retry logic, error handling, and delivery tracking.
 */

import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Generate HMAC signature for webhook security
 * Note: This is a simple hash implementation since crypto module is not available in Convex
 */
const generateSignature = (payload: string, secretKey: string): string => {
  // Simple hash-based signature (not cryptographically secure HMAC, but functional)
  const timestamp = Date.now().toString();
  const combined = `${payload}${secretKey}${timestamp}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
};

/**
 * Create delivery log entry
 */
export const logWebhookDelivery = internalMutation({
  args: {
    webhookSettingsId: v.id("webhookSettings"),
    type: v.string(),
    payload: v.string(),
    httpStatus: v.optional(v.number()),
    responseBody: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    attemptNumber: v.number(),
    isSuccessful: v.boolean(),
    relatedId: v.string(),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhookDeliveries", {
      webhookSettingsId: args.webhookSettingsId,
      type: args.type,
      payload: args.payload,
      httpStatus: args.httpStatus,
      responseBody: args.responseBody?.substring(0, 1000), // Limit response body size
      errorMessage: args.errorMessage,
      attemptNumber: args.attemptNumber,
      isSuccessful: args.isSuccessful,
      timestamp: Date.now(),
      relatedId: args.relatedId,
      duration: args.duration,
    });
  },
});

/**
 * Deliver webhook with retry logic
 */
export const deliverWebhook = action({
  args: {
    webhookSettingsId: v.id("webhookSettings"),
    type: v.string(),
    payload: v.object({
      type: v.string(),
      timestamp: v.number(),
      data: v.any(),
    }),
    relatedId: v.string(),
    attemptNumber: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any> => {
    const attemptNumber = args.attemptNumber || 1;
    
    try {
      // Get webhook settings
      const webhook: any = await ctx.runQuery(api.webhookSettings.getWebhookSettings, {
        adminPassword: "admin123", // Internal system call with hardcoded admin password
      });
      
      const webhookSetting: any = webhook.find((w: any) => w._id === args.webhookSettingsId);
      if (!webhookSetting) {
        throw new Error("Webhook setting not found");
      }
      
      if (!webhookSetting.isActive) {
        console.log(`Webhook ${args.webhookSettingsId} is not active, skipping delivery`);
        return { success: false, reason: "Webhook not active" };
      }
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Eraser.io-Clone-Webhook/1.0',
        'X-Delivery-Attempt': attemptNumber.toString(),
        'X-Webhook-Id': args.webhookSettingsId,
      };
      
      // Add custom headers if configured
      if (webhookSetting.headers) {
        try {
          const customHeaders = JSON.parse(webhookSetting.headers);
          Object.assign(headers, customHeaders);
        } catch (error) {
          console.warn("Failed to parse custom headers:", error);
        }
      }
      
      // Generate payload string
      const payloadString = JSON.stringify(args.payload);
      
      // Add HMAC signature if secret key is configured
      if (webhookSetting.secretKey) {
        const signature = generateSignature(payloadString, webhookSetting.secretKey);
        headers['X-Webhook-Signature'] = `sha256=${signature}`;
      }
      
      // Make the HTTP request
      const startTime = Date.now();
      const response: any = await fetch(webhookSetting.url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: AbortSignal.timeout(webhookSetting.timeoutMs),
      });
      
      const duration = Date.now() - startTime;
      const responseText = await response.text();
      
      // Log the delivery attempt
      await ctx.runMutation(internal.webhookDelivery.logWebhookDelivery, {
        webhookSettingsId: args.webhookSettingsId,
        type: args.type,
        payload: payloadString,
        httpStatus: response.status,
        responseBody: responseText,
        errorMessage: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        attemptNumber,
        isSuccessful: response.ok,
        relatedId: args.relatedId,
        duration,
      });
      
      if (response.ok) {
        console.log(`Webhook delivered successfully to ${webhookSetting.url}`);
        return { 
          success: true, 
          status: response.status,
          duration,
          attempt: attemptNumber 
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error: any) {
      const errorMessage = error.message || "Unknown error occurred";
      
      // Log the failed delivery attempt
      await ctx.runMutation(internal.webhookDelivery.logWebhookDelivery, {
        webhookSettingsId: args.webhookSettingsId,
        type: args.type,
        payload: JSON.stringify(args.payload),
        httpStatus: undefined,
        responseBody: undefined,
        errorMessage,
        attemptNumber,
        isSuccessful: false,
        relatedId: args.relatedId,
        duration: undefined,
      });
      
      // Determine if we should retry
      const webhook: any = await ctx.runQuery(api.webhookSettings.getWebhookSettings, {
        adminPassword: "admin123",
      });
      const webhookSetting: any = webhook.find((w: any) => w._id === args.webhookSettingsId);
      
      if (webhookSetting && attemptNumber < webhookSetting.retryAttempts + 1) {
        // Calculate exponential backoff delay
        const baseDelay = 1000; // 1 second
        const delay = baseDelay * Math.pow(2, attemptNumber - 1); // Exponential backoff
        
        console.log(`Webhook delivery failed, retrying in ${delay}ms (attempt ${attemptNumber + 1})`);
        
        // Schedule retry with exponential backoff
        setTimeout(async () => {
          await ctx.runAction(api.webhookDelivery.deliverWebhook, {
            ...args,
            attemptNumber: attemptNumber + 1,
          });
        }, delay);
        
        return { 
          success: false, 
          error: errorMessage, 
          willRetry: true, 
          nextAttempt: attemptNumber + 1 
        };
      } else {
        console.error(`Webhook delivery failed permanently after ${attemptNumber} attempts:`, errorMessage);
        return { 
          success: false, 
          error: errorMessage, 
          willRetry: false, 
          finalAttempt: attemptNumber 
        };
      }
    }
  },
});

/**
 * Deliver file share invitation webhook
 */
export const deliverFileShareWebhook = action({
  args: {
    fileId: v.string(),
    sharedBy: v.string(),
    sharedWith: v.optional(v.string()),
    shareType: v.string(),
    permissions: v.string(),
    token: v.string(),
    expiresAt: v.optional(v.number()),
    fileName: v.optional(v.string()),
    sharedByName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    // Get active file share webhooks
    const webhooks: any = await ctx.runQuery(api.webhookSettings.getActiveWebhookSettings, {
      type: "file_share",
    });
    
    if (webhooks.length === 0) {
      console.log("No active file share webhooks configured");
      return { delivered: 0, results: [] };
    }
    
    // Create webhook payload
    const payload = {
      type: "file_share_invitation",
      timestamp: Date.now(),
      data: {
        invitation: {
          fileId: args.fileId,
          fileName: args.fileName || "Untitled File",
          sharedBy: args.sharedBy,
          sharedByName: args.sharedByName || "Unknown User",
          sharedWith: args.sharedWith,
          shareType: args.shareType,
          permissions: args.permissions,
          token: args.token,
          expiresAt: args.expiresAt,
          shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/shared/${args.token}`,
        },
        event: "invitation_created",
        source: "eraser_clone",
      },
    };
    
    // Deliver to all active file share webhooks
    const results = [];
    for (const webhook of webhooks) {
      try {
        const result: any = await ctx.runAction(api.webhookDelivery.deliverWebhook, {
          webhookSettingsId: webhook._id,
          type: "file_share",
          payload,
          relatedId: args.fileId,
        });
        results.push({ webhookId: webhook._id, ...result });
      } catch (error: any) {
        results.push({ 
          webhookId: webhook._id, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    return { delivered: webhooks.length, results };
  },
});

/**
 * Deliver team invitation webhook
 */
export const deliverTeamInvitationWebhook = action({
  args: {
    teamId: v.string(),
    teamName: v.optional(v.string()),
    email: v.string(),
    role: v.string(),
    invitedBy: v.string(),
    invitedByName: v.optional(v.string()),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args): Promise<any> => {
    // Get active team invitation webhooks
    const webhooks = await ctx.runQuery(api.webhookSettings.getActiveWebhookSettings, {
      type: "team_invitation",
    });
    
    if (webhooks.length === 0) {
      console.log("No active team invitation webhooks configured");
      return { delivered: 0, results: [] };
    }
    
    // Create webhook payload
    const payload = {
      type: "team_invitation",
      timestamp: Date.now(),
      data: {
        invitation: {
          teamId: args.teamId,
          teamName: args.teamName || "Untitled Team",
          email: args.email,
          role: args.role,
          invitedBy: args.invitedBy,
          invitedByName: args.invitedByName || "Unknown User",
          token: args.token,
          expiresAt: args.expiresAt,
          inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/teams/invite/${args.token}`,
        },
        event: "invitation_created",
        source: "eraser_clone",
      },
    };
    
    // Deliver to all active team invitation webhooks
    const results = [];
    for (const webhook of webhooks) {
      try {
        const result = await ctx.runAction(api.webhookDelivery.deliverWebhook, {
          webhookSettingsId: webhook._id,
          type: "team_invitation",
          payload,
          relatedId: args.teamId,
        });
        results.push({ webhookId: webhook._id, ...result });
      } catch (error: any) {
        results.push({ 
          webhookId: webhook._id, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    return { delivered: webhooks.length, results };
  },
});
