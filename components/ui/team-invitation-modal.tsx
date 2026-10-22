'use client'

import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Mail, Users, Trash2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  cancelInvitation,
  changeMemberRole,
  listInvitations,
  listMembers,
  removeMember,
  sendInvitation,
  type Invitation,
  type InviteRole,
  type Member,
} from '@/lib/data/invitations'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import moment from 'moment'

interface TeamInvitationModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
  teamName: string
}

const TeamInvitationModal = ({ isOpen, onClose, teamId, teamName }: TeamInvitationModalProps) => {
  const db = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('member')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [teamMembers, setTeamMembers] = useState<Member[]>([])

  const load = useCallback(async () => {
    try {
      const [inv, members] = await Promise.all([listInvitations(db, teamId), listMembers(db, teamId)])
      setInvitations(inv ?? [])
      setTeamMembers(members ?? [])
    } catch (error: any) {
      toast.error(error.message || 'Failed to load team')
    }
  }, [db, teamId])

  useEffect(() => {
    if (isOpen) load()
  }, [isOpen, load])

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    setIsLoading(true)
    try {
      const invitation = await sendInvitation(db, teamId, email, role)
      setEmail('')
      setRole('member')
      await load()
      if (invitation) await copyInvitationLink(invitation.token, 'Invitation created. Link copied, send it to them.')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(db, invitationId)
      toast.success('Invitation cancelled')
      await load()
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel invitation')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember(db, teamId, userId)
      toast.success('Member removed from team')
      await load()
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove member')
    }
  }

  const handleUpdateRole = async (userId: string, newRole: InviteRole) => {
    try {
      await changeMemberRole(db, teamId, userId, newRole)
      toast.success('Member role updated')
      await load()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role')
    }
  }

  const copyInvitationLink = async (token: string, message = 'Invitation link copied to clipboard!') => {
    const inviteUrl = `${window.location.origin}/invite/${token}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedToken(token)
      toast.success(message)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'member':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const pending = invitations.filter(
    (inv) => inv.status === 'pending' && new Date(inv.expires_at) > new Date()
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Team: {teamName}
          </DialogTitle>
          <DialogDescription>
            Invite new members to your team and manage existing members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite New Member */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Invite New Member</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendInvitation()}
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as InviteRole)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No email is sent. Copy the link and send it to them yourself.
            </p>
            <Button
              onClick={handleSendInvitation}
              disabled={isLoading || !email.trim()}
              className="w-full md:w-auto"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Create Invite Link
                </>
              )}
            </Button>
          </div>

          {/* Pending Invitations */}
          {pending.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Pending Invitations</h3>
              <div className="space-y-2">
                {pending.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Invited {moment(invitation.created_at).fromNow()}
                        </p>
                      </div>
                      <Badge className={getRoleBadgeColor(invitation.role)}>
                        {invitation.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label="Copy invitation link"
                        onClick={() => copyInvitationLink(invitation.token)}
                      >
                        {copiedToken === invitation.token ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label="Cancel invitation"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Members */}
          {teamMembers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Team Members</h3>
              <div className="space-y-2">
                {teamMembers.map((member) => {
                  const displayName = member.profile?.full_name || member.profile?.email || 'Unknown'
                  return (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          {member.profile?.avatar_url ? (
                            <img
                              src={member.profile.avatar_url}
                              alt={displayName}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-medium">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{displayName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {member.profile?.email}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Joined {moment(member.joined_at).fromNow()}
                          </p>
                        </div>
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {member.role}
                        </Badge>
                      </div>
                      {member.role !== 'owner' && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(newRole) => handleUpdateRole(member.user_id, newRole as InviteRole)}
                          >
                            <SelectTrigger className="w-24" aria-label="Change member role">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label="Remove member"
                            onClick={() => handleRemoveMember(member.user_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TeamInvitationModal
