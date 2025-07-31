import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Generate a unique invitation token
function generateInvitationToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Send team invitation
export const sendTeamInvitation = mutation({
  args: {
    teamId: v.string(),
    email: v.string(),
    role: v.string(),
    invitedBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user is already a team member
    const existingMember = await ctx.db
      .query("teamMembers")
      .filter((q) => 
        q.and(
          q.eq(q.field("teamId"), args.teamId),
          q.eq(q.field("email"), args.email)
        )
      )
      .first();

    if (existingMember) {
      throw new Error("User is already a member of this team");
    }

    // Check if there's already a pending invitation
    const existingInvitation = await ctx.db
      .query("teamInvitations")
      .filter((q) => 
        q.and(
          q.eq(q.field("teamId"), args.teamId),
          q.eq(q.field("email"), args.email),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingInvitation) {
      throw new Error("Invitation already sent to this email");
    }

    const token = generateInvitationToken();
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    const result = await ctx.db.insert("teamInvitations", {
      teamId: args.teamId,
      email: args.email,
      role: args.role,
      invitedBy: args.invitedBy,
      invitedAt: Date.now(),
      status: "pending",
      token,
      expiresAt,
    });

    return { invitationId: result, token };
  },
});

// Get team invitations
export const getTeamInvitations = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const invitations = await ctx.db
      .query("teamInvitations")
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .order("desc")
      .collect();

    return invitations;
  },
});

// Get invitation by token
export const getInvitationByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("teamInvitations")
      .filter((q) => q.eq(q.field("token"), args.token))
      .first();

    if (!invitation) {
      return null;
    }

    // Check if invitation is expired
    if (invitation.expiresAt < Date.now()) {
      return { ...invitation, expired: true };
    }

    // Get team information
    const team = await ctx.db.get(invitation.teamId as Id<"teams">);
    
    return {
      ...invitation,
      team,
      expired: false,
    };
  },
});

// Accept team invitation
export const acceptTeamInvitation = mutation({
  args: {
    token: v.string(),
    userId: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("teamInvitations")
      .filter((q) => q.eq(q.field("token"), args.token))
      .first();

    if (!invitation) {
      throw new Error("Invalid invitation token");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer valid");
    }

    if (invitation.expiresAt < Date.now()) {
      throw new Error("Invitation has expired");
    }

    if (invitation.email !== args.userEmail) {
      throw new Error("Invitation email does not match user email");
    }

    // Check if user is already a team member
    const existingMember = await ctx.db
      .query("teamMembers")
      .filter((q) => 
        q.and(
          q.eq(q.field("teamId"), invitation.teamId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (existingMember) {
      throw new Error("User is already a member of this team");
    }

    // Add user to team
    await ctx.db.insert("teamMembers", {
      teamId: invitation.teamId,
      userId: args.userId,
      email: args.userEmail,
      role: invitation.role,
      joinedAt: Date.now(),
      invitedBy: invitation.invitedBy,
    });

    // Update invitation status
    await ctx.db.patch(invitation._id, {
      status: "accepted",
    });

    return { success: true, teamId: invitation.teamId };
  },
});

// Decline team invitation
export const declineTeamInvitation = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("teamInvitations")
      .filter((q) => q.eq(q.field("token"), args.token))
      .first();

    if (!invitation) {
      throw new Error("Invalid invitation token");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer valid");
    }

    // Update invitation status
    await ctx.db.patch(invitation._id, {
      status: "declined",
    });

    return { success: true };
  },
});

// Cancel team invitation
export const cancelTeamInvitation = mutation({
  args: {
    invitationId: v.id("teamInvitations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.invitationId);
    return { success: true };
  },
});

// Get team members
export const getTeamMembers = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("teamMembers")
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .collect();

    // Get user details for each member
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("email"), member.email))
          .first();
        
        return {
          ...member,
          user,
        };
      })
    );

    return membersWithDetails;
  },
});

// Remove team member
export const removeTeamMember = mutation({
  args: {
    memberId: v.id("teamMembers"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.memberId);
    return { success: true };
  },
});

// Update team member role
export const updateTeamMemberRole = mutation({
  args: {
    memberId: v.id("teamMembers"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memberId, {
      role: args.role,
    });
    return { success: true };
  },
});