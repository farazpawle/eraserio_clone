'use client'

import * as React from 'react'
import { useState } from 'react'
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
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import moment from 'moment'

interface TeamInvitationModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
  teamName: string
}

interface PendingInvitation {
  _id: string
  email: string
  role: string
  invitedAt: number
  status: string
  token: string
}

interface TeamMember {
  _id: string
  email: string
  role: string
  joinedAt: number
  teamId: string
  userId: string
  invitedBy: string
  user: {
    _id: string
    _creationTime: number
    name: string
    email: string
    imageUrl: string
  } | null
}

const TeamInvitationModal = ({ isOpen, onClose, teamId, teamName }: TeamInvitationModalProps) => {
  const { user } = useKindeBrowserClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Mutations
  const sendInvitation = useMutation(api.teamInvitations.sendTeamInvitation)
  const cancelInvitation = useMutation(api.teamInvitations.cancelTeamInvitation)
  const removeTeamMember = useMutation(api.teamInvitations.removeTeamMember)
  const updateMemberRole = useMutation(api.teamInvitations.updateTeamMemberRole)

  // Queries
  const invitations = useQuery(api.teamInvitations.getTeamInvitations, { teamId })
  const teamMembers = useQuery(api.teamInvitations.getTeamMembers, { teamId })

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    if (!user?.email) {
      toast.error('User not authenticated')
      return
    }

    setIsLoading(true)
    try {
      const result = await sendInvitation({
        teamId,
        email: email.trim(),
        role,
        invitedBy: user.email,
      })

      toast.success('Invitation sent successfully!')
      setEmail('')
      setRole('member')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation({ invitationId: invitationId as any })
      toast.success('Invitation cancelled')
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel invitation')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeTeamMember({ memberId: memberId as any })
      toast.success('Member removed from team')
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove member')
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      await updateMemberRole({ memberId: memberId as any, role: newRole })
      toast.success('Member role updated')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role')
    }
  }

  const copyInvitationLink = async (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedToken(token)
      toast.success('Invitation link copied to clipboard!')
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
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
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
            <Button 
              onClick={handleSendInvitation} 
              disabled={isLoading || !email.trim()}
              className="w-full md:w-auto"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>

          {/* Pending Invitations */}
          {invitations && invitations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Pending Invitations</h3>
              <div className="space-y-2">
                {invitations
                  .filter((inv: PendingInvitation) => inv.status === 'pending')
                  .map((invitation: PendingInvitation) => (
                    <div
                      key={invitation._id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Invited {moment(invitation.invitedAt).fromNow()}
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
                          onClick={() => handleCancelInvitation(invitation._id)}
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
          {teamMembers && teamMembers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Team Members</h3>
              <div className="space-y-2">
                {teamMembers.map((member: TeamMember) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        {member.user?.imageUrl ? (
                          <img
                            src={member.user.imageUrl}
                            alt={member.user.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {member.email.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.user?.name || member.email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {member.email}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Joined {moment(member.joinedAt).fromNow()}
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
                          onValueChange={(newRole) => handleUpdateRole(member._id, newRole)}
                        >
                          <SelectTrigger className="w-24">
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
                          onClick={() => handleRemoveMember(member._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
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