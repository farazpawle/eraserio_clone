'use client'

import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, Copy, Edit, Eye, Link as LinkIcon, MessageSquare, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import moment from 'moment'
import { createClient } from '@/lib/supabase/client'
import { sendInvitation, type InviteRole } from '@/lib/data/invitations'
import { createShareLink, listShares, revokeShare, type Share, type SharePermission } from '@/lib/data/shares'
import type { FILE } from '@/app/dashboard/_components/FileList'

interface FileShareModalProps {
  isOpen: boolean
  onClose: () => void
  file: FILE
  teamName?: string
}

const field =
  'h-10 w-full rounded-md border border-g-line-2 bg-g-panel-2 px-3 text-base text-g-text outline-none focus-visible:ring-2 focus-visible:ring-g-accent md:text-sm'
const label = 'text-xs text-g-muted'
const primary =
  'inline-flex h-10 flex-none items-center justify-center gap-2 rounded-md bg-g-accent px-4 text-sm font-semibold text-g-accent-ink hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent focus-visible:ring-offset-2 focus-visible:ring-offset-g-panel disabled:opacity-60'
const iconButton =
  'inline-flex h-9 w-9 items-center justify-center rounded-md border border-g-line-2 text-g-muted hover:bg-g-hover hover:text-g-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent max-md:h-11 max-md:w-11'

const PERMISSION_ICON = { edit: Edit, comment: MessageSquare, view: Eye } as const

const FileShareModal = ({ isOpen, onClose, file, teamName }: FileShareModalProps) => {
  const db = useMemo(() => createClient(), [])
  const team = teamName ?? 'your team'

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('viewer')
  const [inviteError, setInviteError] = useState('')
  const [isInviting, setIsInviting] = useState(false)

  const [permission, setPermission] = useState<SharePermission>('view')
  const [expiresInDays, setExpiresInDays] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [shares, setShares] = useState<Share[]>([])
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const loadShares = useCallback(async () => {
    try {
      setShares((await listShares(db, file.id)) ?? [])
    } catch (error: any) {
      toast.error(error.message || 'Failed to load share links')
    }
  }, [db, file.id])

  useEffect(() => {
    if (isOpen) loadShares()
  }, [isOpen, loadShares])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      toast.error('Failed to copy link')
      return false
    }
  }

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) {
      setInviteError('Enter an email address')
      return
    }
    setInviteError('')
    setIsInviting(true)
    try {
      const invitation = await sendInvitation(db, file.team_id, email, role)
      setEmail('')
      setRole('viewer')
      // No email is sent from here: the person gets the link from whoever invited them.
      if (invitation && (await copy(`${window.location.origin}/invite/${invitation.token}`))) {
        toast.success('Invitation created. Link copied, send it to them.')
      }
    } catch (error: any) {
      setInviteError(error.message || 'Failed to create invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const handleCreateLink = async () => {
    setIsCreating(true)
    try {
      const expiresAt = expiresInDays
        ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : null
      await createShareLink(db, file.id, permission, expiresAt)
      toast.success('Share link created!')
      setPermission('view')
      setExpiresInDays('')
      await loadShares()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create share link')
    } finally {
      setIsCreating(false)
    }
  }

  const handleRevoke = async (shareId: string) => {
    try {
      await revokeShare(db, shareId)
      toast.success('Share link revoked')
      await loadShares()
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke share')
    }
  }

  const handleCopyLink = async (token: string) => {
    if (!(await copy(`${window.location.origin}/shared/${token}`))) return
    setCopiedToken(token)
    toast.success('Share link copied to clipboard!')
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[440px] gap-0 overflow-y-auto border-g-line bg-g-panel p-0 text-g-text sm:rounded-2xl">
        <DialogHeader className="border-b border-g-line px-4 py-3.5 pr-12 text-left">
          <DialogTitle className="text-base">Share this file</DialogTitle>
          <DialogDescription className="truncate text-xs text-g-muted">{file.name}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 p-4">
          <form onSubmit={handleInvite} className="grid gap-3" noValidate>
            <div className="grid gap-1.5">
              <label htmlFor="invite-email" className={label}>
                Invite by email
              </label>
              <div className="flex gap-2">
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="off"
                  aria-invalid={!!inviteError}
                  aria-describedby="invite-help invite-error"
                  className={`${field} min-w-0 flex-1`}
                />
                <button type="submit" disabled={isInviting} className={primary}>
                  Invite
                </button>
              </div>
              {inviteError && (
                <p id="invite-error" role="alert" className="text-xs text-g-danger">
                  {inviteError}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="invite-role" className={label}>
                Team role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as InviteRole)}
                className={field}
              >
                <option value="viewer">Viewer: can view</option>
                <option value="member">Member: can edit</option>
              </select>
            </div>
            <p id="invite-help" className="text-xs text-g-muted">
              They will join {team} and see every file in it. An invitation link is copied for you to send.
            </p>
          </form>

          <section className="grid gap-3 border-t border-g-line pt-4" aria-labelledby="link-heading">
            <h3 id="link-heading" className="text-sm font-semibold">
              Anyone with the link
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <label htmlFor="link-permission" className={label}>
                  Permission
                </label>
                <select
                  id="link-permission"
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as SharePermission)}
                  className={field}
                >
                  <option value="view">Can view</option>
                  <option value="comment">Can comment</option>
                  <option value="edit">Can edit</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="link-expires" className={label}>
                  Expires
                </label>
                <select
                  id="link-expires"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className={field}
                >
                  <option value="">Never</option>
                  <option value="1">In 1 day</option>
                  <option value="7">In 7 days</option>
                  <option value="30">In 30 days</option>
                  <option value="90">In 90 days</option>
                </select>
              </div>
            </div>
            <button type="button" onClick={handleCreateLink} disabled={isCreating} className={`${primary} w-full`}>
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
              Create link
            </button>

            {shares.length > 0 && (
              <ul className="grid gap-2">
                {shares.map((share) => {
                  const Icon = PERMISSION_ICON[share.permission as SharePermission] ?? Eye
                  return (
                    <li
                      key={share.id}
                      data-testid={`share-link-${share.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-g-line p-2.5"
                    >
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-g-accent-soft px-2 py-0.5 text-xs font-medium capitalize text-g-accent">
                          <Icon className="h-3 w-3" aria-hidden="true" />
                          {share.permission}
                        </span>
                        <p className="mt-1 truncate text-xs text-g-muted">
                          Created {moment(share.created_at).fromNow()}
                          {share.expires_at && ` · Expires ${moment(share.expires_at).fromNow()}`}
                        </p>
                      </div>
                      <div className="flex flex-none gap-1.5">
                        <button
                          type="button"
                          aria-label="Copy share link"
                          onClick={() => handleCopyLink(share.token)}
                          className={iconButton}
                        >
                          {copiedToken === share.token ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          aria-label="Revoke share link"
                          onClick={() => handleRevoke(share.id)}
                          className={iconButton}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FileShareModal
