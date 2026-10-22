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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Link,
  Copy,
  Check,
  Eye,
  Edit,
  MessageSquare,
  Trash2,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { createShareLink, listShares, revokeShare, type Share, type SharePermission } from '@/lib/data/shares'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import moment from 'moment'
import { FILE } from '@/app/dashboard/_components/FileList'

interface FileShareModalProps {
  isOpen: boolean
  onClose: () => void
  file: FILE
}

const FileShareModal = ({ isOpen, onClose, file }: FileShareModalProps) => {
  const db = useMemo(() => createClient(), [])
  const [permission, setPermission] = useState<SharePermission>('view')
  const [hasExpiration, setHasExpiration] = useState(false)
  const [expirationDays, setExpirationDays] = useState(7)
  const [isLoading, setIsLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [shares, setShares] = useState<Share[]>([])

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

  const handleCreateShare = async () => {
    setIsLoading(true)
    try {
      const expiresAt = hasExpiration
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null
      await createShareLink(db, file.id, permission, expiresAt)
      toast.success('Share link created!')
      setPermission('view')
      setHasExpiration(false)
      setExpirationDays(7)
      await loadShares()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create share link')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeShare = async (shareId: string) => {
    try {
      await revokeShare(db, shareId)
      toast.success('Share link revoked')
      await loadShares()
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke share')
    }
  }

  const copyShareLink = async (token: string) => {
    const shareUrl = `${window.location.origin}/shared/${token}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedToken(token)
      toast.success('Share link copied to clipboard!')
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'edit':
        return <Edit className="h-4 w-4" />
      case 'comment':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Eye className="h-4 w-4" />
    }
  }

  const getPermissionBadgeColor = (permission: string) => {
    switch (permission) {
      case 'view':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'edit':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'comment':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Share: {file.name}
          </DialogTitle>
          <DialogDescription>
            Create links that give others access to this file. Only team owners and admins can manage links.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Share */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Create New Share Link</h3>

            {/* Permissions */}
            <div>
              <Label htmlFor="permissions">Permissions</Label>
              <Select value={permission} onValueChange={(v) => setPermission(v as SharePermission)}>
                <SelectTrigger id="permissions">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      View Only
                    </div>
                  </SelectItem>
                  <SelectItem value="comment">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Can Comment
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Can Edit
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Expiration Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="expiration">Set Expiration</Label>
                <Switch
                  id="expiration"
                  checked={hasExpiration}
                  onCheckedChange={setHasExpiration}
                />
              </div>
              {hasExpiration && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Expires in</span>
                  <Select
                    value={expirationDays.toString()}
                    onValueChange={(value) => setExpirationDays(parseInt(value))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Button onClick={handleCreateShare} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Creating Share...
                </>
              ) : (
                <>
                  <Link className="mr-2 h-4 w-4" />
                  Create Share Link
                </>
              )}
            </Button>
          </div>

          {/* Active Share Links */}
          {shares.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Active Links</h3>
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">Anyone with the link</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Created {moment(share.created_at).fromNow()}
                          {share.expires_at && (
                            <span> • Expires {moment(share.expires_at).fromNow()}</span>
                          )}
                        </p>
                      </div>
                      <Badge className={getPermissionBadgeColor(share.permission)}>
                        {getPermissionIcon(share.permission)}
                        <span className="ml-1">{share.permission}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label="Copy share link"
                        onClick={() => copyShareLink(share.token)}
                      >
                        {copiedToken === share.token ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label="Revoke share link"
                        onClick={() => handleRevokeShare(share.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

export default FileShareModal
