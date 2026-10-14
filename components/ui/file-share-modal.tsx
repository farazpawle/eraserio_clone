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
import { Switch } from '@/components/ui/switch'
import { 
  Link, 
  Mail, 
  Copy, 
  Check, 
  Eye, 
  Edit, 
  MessageSquare, 
  Globe, 
  Users, 
  Lock,
  Trash2,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import moment from 'moment'
import { FILE } from '@/app/dashboard/_components/FileList'

interface FileShareModalProps {
  isOpen: boolean
  onClose: () => void
  file: FILE
}

interface FileShare {
  _id: string
  sharedWith?: string
  shareType: string
  permissions: string
  token: string
  createdAt: number
  expiresAt?: number
  isActive: boolean
}

const FileShareModal = ({ isOpen, onClose, file }: FileShareModalProps) => {
  const { user } = useKindeBrowserClient()
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState('view')
  const [shareType, setShareType] = useState('private')
  const [hasExpiration, setHasExpiration] = useState(false)
  const [expirationDays, setExpirationDays] = useState(7)
  const [isLoading, setIsLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  // Mutations
  const createFileShare = useMutation(api.fileShares.createFileShare)
  const createPublicShareLink = useMutation(api.fileShares.createPublicShareLink)
  const revokeFileShare = useMutation(api.fileShares.revokeFileShare)
  const updateFileShare = useMutation(api.fileShares.updateFileShare)

  // Queries
  const fileShares = useQuery(api.fileShares.getFileShares, { fileId: file._id })
  const publicShareLink = useQuery(api.fileShares.getPublicShareLink, { 
    fileId: file._id, 
    sharedBy: user?.email || '' 
  })

  const handleCreateShare = async () => {
    if (shareType === 'private' && !email.trim()) {
      toast.error('Please enter an email address for private sharing')
      return
    }

    if (shareType === 'private' && !isValidEmail(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    if (!user?.email) {
      toast.error('User not authenticated')
      return
    }

    setIsLoading(true)
    try {
      const expiresAt = hasExpiration 
        ? Date.now() + (expirationDays * 24 * 60 * 60 * 1000)
        : undefined

      if (shareType === 'public') {
        const result = await createPublicShareLink({
          fileId: file._id,
          sharedBy: user.email,
          permissions,
          expiresAt,
        })
        toast.success('Public share link created!')
      } else {
        const result = await createFileShare({
          fileId: file._id,
          sharedBy: user.email,
          sharedWith: email.trim(),
          shareType,
          permissions,
          expiresAt,
        })
        toast.success('File shared successfully!')
      }

      setEmail('')
      setPermissions('view')
      setShareType('private')
      setHasExpiration(false)
      setExpirationDays(7)
    } catch (error: any) {
      toast.error(error.message || 'Failed to share file')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeShare = async (shareId: string) => {
    try {
      await revokeFileShare({ shareId: shareId as any })
      toast.success('Share access revoked')
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
      case 'view':
        return <Eye className="h-4 w-4" />
      case 'edit':
        return <Edit className="h-4 w-4" />
      case 'comment':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Eye className="h-4 w-4" />
    }
  }

  const getShareTypeIcon = (type: string) => {
    switch (type) {
      case 'public':
        return <Globe className="h-4 w-4" />
      case 'team':
        return <Users className="h-4 w-4" />
      case 'private':
        return <Lock className="h-4 w-4" />
      default:
        return <Lock className="h-4 w-4" />
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
            Share: {file.fileName}
          </DialogTitle>
          <DialogDescription>
            Share this file with others and manage access permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Share */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Create New Share</h3>
            
            {/* Share Type Selection */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={shareType === 'private' ? 'default' : 'outline'}
                onClick={() => setShareType('private')}
                className="flex items-center gap-2"
              >
                <Lock className="h-4 w-4" />
                Private
              </Button>
              <Button
                variant={shareType === 'team' ? 'default' : 'outline'}
                onClick={() => setShareType('team')}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Team
              </Button>
              <Button
                variant={shareType === 'public' ? 'default' : 'outline'}
                onClick={() => setShareType('public')}
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Public
              </Button>
            </div>

            {/* Email Input for Private Sharing */}
            {shareType === 'private' && (
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            {/* Permissions */}
            <div>
              <Label htmlFor="permissions">Permissions</Label>
              <Select value={permissions} onValueChange={setPermissions}>
                <SelectTrigger>
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

            <Button 
              onClick={handleCreateShare} 
              disabled={isLoading || (shareType === 'private' && (!email.trim() || !isValidEmail(email)))}
              className="w-full"
            >
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

          {/* Public Share Link */}
          {publicShareLink && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Public Share Link</h3>
              <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium">Anyone with the link</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Created {moment(publicShareLink.createdAt).fromNow()}
                      </p>
                    </div>
                    <Badge className={getPermissionBadgeColor(publicShareLink.permissions)}>
                      {getPermissionIcon(publicShareLink.permissions)}
                      <span className="ml-1">{publicShareLink.permissions}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyShareLink(publicShareLink.token)}
                    >
                      {copiedToken === publicShareLink.token ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeShare(publicShareLink._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Existing Shares */}
          {fileShares && fileShares.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Shared With</h3>
              <div className="space-y-2">
                {fileShares
                  .filter((share: FileShare) => share.shareType !== 'public')
                  .map((share: FileShare) => (
                    <div
                      key={share._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getShareTypeIcon(share.shareType)}
                        <div>
                          <p className="font-medium">
                            {share.sharedWith || 'Team members'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Shared {moment(share.createdAt).fromNow()}
                            {share.expiresAt && (
                              <span> • Expires {moment(share.expiresAt).fromNow()}</span>
                            )}
                          </p>
                        </div>
                        <Badge className={getPermissionBadgeColor(share.permissions)}>
                          {getPermissionIcon(share.permissions)}
                          <span className="ml-1">{share.permissions}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
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
                          onClick={() => handleRevokeShare(share._id)}
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